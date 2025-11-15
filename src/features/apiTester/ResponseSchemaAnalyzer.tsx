import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Code, 
  FileJson, 
  ArrowRight, 
  Type, 
  Hash,
  Calendar,
  Database,
  Eye,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  Square
} from 'lucide-react';
import type { ApiResponse } from '../../api/apiTester';

interface ResponseSchemaAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  response: ApiResponse;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  example?: any;
  description?: string;
  fields?: SchemaField[];
  count?: number;
}

interface ResponseSchema {
  type: 'object' | 'array';
  fields: SchemaField[];
  totalFields: number;
  sampleSize: number;
}

export default function ResponseSchemaAnalyzer({
  isOpen,
  onClose,
  response,
  onToast
}: ResponseSchemaAnalyzerProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Analyze the response to extract schema
  const schema: ResponseSchema | null = useMemo(() => {
    if (!response || !response.data) return null;

    const data = response.data;
    
    // Helper function to determine type of a value
    const getType = (value: any): string => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      if (typeof value === 'object') return 'object';
      if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return 'date-time';
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
        return 'string';
      }
      if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
      if (typeof value === 'boolean') return 'boolean';
      return 'unknown';
    };

    // Helper function to extract fields from an object
    const extractFields = (obj: any, isRoot = false): SchemaField[] => {
      if (typeof obj !== 'object' || obj === null) return [];

      return Object.entries(obj).map(([key, value]) => {
        const type = getType(value);
        const field: SchemaField = {
          name: key,
          type,
          required: isRoot, // For top-level fields, consider them required
          example: value
        };

        if (type === 'object' && value !== null) {
          field.fields = extractFields(value);
        } else if (type === 'array' && Array.isArray(value) && value.length > 0) {
          // For arrays, analyze the first element to get the type of items
          const firstItem = value[0];
          if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
            field.fields = extractFields(firstItem);
          }
          field.count = value.length;
        }

        return field;
      });
    };

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return {
          type: 'array',
          fields: [],
          totalFields: 0,
          sampleSize: 0
        };
      }

      // Analyze the first item in the array to infer schema
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
        return {
          type: 'array',
          fields: extractFields(firstItem),
          totalFields: Object.keys(firstItem).length,
          sampleSize: data.length
        };
      } else {
        // For arrays of primitives
        return {
          type: 'array',
          fields: [{
            name: 'items',
            type: getType(firstItem),
            required: true,
            example: firstItem,
            count: data.length
          }],
          totalFields: 1,
          sampleSize: data.length
        };
      }
    } else if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        fields: extractFields(data, true),
        totalFields: Object.keys(data).length,
        sampleSize: 1
      };
    } else {
      // For primitive values
      return {
        type: 'object',
        fields: [{
          name: 'value',
          type: getType(data),
          required: true,
          example: data
        }],
        totalFields: 1,
        sampleSize: 1
      };
    }
  }, [response]);

  // Flatten fields for search
  const flattenedFields = useMemo(() => {
    if (!schema) return [];

    const flatten = (fields: SchemaField[], path: string = ''): SchemaField[] => {
      let result: SchemaField[] = [];
      for (const field of fields) {
        const currentPath = path ? `${path}.${field.name}` : field.name;
        result.push({ ...field, name: currentPath });
        if (field.fields && field.fields.length > 0) {
          result = result.concat(flatten(field.fields, currentPath));
        }
      }
      return result;
    };

    return flatten(schema.fields);
  }, [schema]);

  // Filter fields based on search query
  const filteredFields = useMemo(() => {
    if (!searchQuery) return flattenedFields;
    const query = searchQuery.toLowerCase();
    return flattenedFields.filter(field => 
      field.name.toLowerCase().includes(query) || 
      field.type.toLowerCase().includes(query)
    );
  }, [flattenedFields, searchQuery]);

  const handleCopySchema = () => {
    if (!schema) return;
    
    // Create a JSON Schema representation
    const jsonSchema = {
      type: schema.type,
      properties: schema.fields.reduce((acc, field) => {
        acc[field.name] = {
          type: field.type,
          example: field.example
        };
        return acc;
      }, {} as Record<string, any>)
    };

    navigator.clipboard.writeText(JSON.stringify(jsonSchema, null, 2));
    setCopied('schema');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyOpenAPI = () => {
    if (!schema) return;
    
    // Create an OpenAPI schema representation
    const openApiSchema = {
      type: schema.type,
      properties: schema.fields.reduce((acc, field) => {
        acc[field.name] = {
          type: field.type,
          example: field.example,
          description: `Field: ${field.name}`
        };
        return acc;
      }, {} as Record<string, any>)
    };

    navigator.clipboard.writeText(JSON.stringify(openApiSchema, null, 2));
    setCopied('openapi');
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type className="w-4 h-4 text-blue-500" />;
      case 'number': return <Hash className="w-4 h-4 text-green-500" />;
      case 'integer': return <Hash className="w-4 h-4 text-green-500" />;
      case 'boolean': return <Type className="w-4 h-4 text-yellow-500" />;
      case 'object': return <Database className="w-4 h-4 text-purple-500" />;
      case 'array': return <Square className="w-4 h-4 text-indigo-500" />;
      case 'date': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'date-time': return <Calendar className="w-4 h-4 text-orange-500" />;
      default: return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderFields = (fields: SchemaField[], depth = 0) => (
    <div className="space-y-1">
      {fields.map((field, index) => (
        <div key={index} className="space-y-1">
          <div className={`flex items-center gap-2 p-2 rounded-lg ${depth > 0 ? 'bg-gray-50/50 dark:bg-gray-800/50 ml-4' : ''}`}>
            <div className="flex items-center gap-1">
              {getTypeIcon(field.type)}
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                {field.name}
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              {field.type}
            </span>
            {!field.required && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                optional
              </span>
            )}
            {field.count !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                {field.count} items
              </span>
            )}
          </div>
          
          {field.example !== undefined && (
            <div className={`ml-8 text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800/30 rounded p-2 border-l-2 border-gray-300 dark:border-gray-600 ${depth > 0 ? 'ml-12' : ''}`}>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Example:</span> 
              {' '}
              <span className="truncate max-w-xs inline-block">
                {typeof field.example === 'string' 
                  ? field.example.length > 50 
                    ? field.example.substring(0, 50) + '...' 
                    : field.example
                  : JSON.stringify(field.example)}
              </span>
            </div>
          )}
          
          {field.fields && field.fields.length > 0 && (
            <div className="ml-2 border-l border-gray-200 dark:border-gray-700 pl-2">
              {renderFields(field.fields, depth + 1)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <FileJson className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Response Schema Analyzer</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {schema 
                  ? `${schema.totalFields} fields in ${schema.type}, sample size: ${schema.sampleSize}` 
                  : 'Analyzing response structure...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySchema}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition"
              >
                {copied === 'schema' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy Schema
              </button>
              <button
                onClick={handleCopyOpenAPI}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition"
              >
                {copied === 'openapi' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                OpenAPI
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {schema ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-800 dark:text-purple-200">Schema Overview</h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      This API response has a <span className="font-medium">{schema.type}</span> structure with{' '}
                      <span className="font-medium">{schema.totalFields}</span> fields. 
                      {schema.sampleSize > 1 && ` Sample size: ${schema.sampleSize} items.`}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Response Structure</h3>
                
                {searchQuery ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Found {filteredFields.length} field{filteredFields.length !== 1 ? 's' : ''} matching "{searchQuery}"
                    </p>
                    {filteredFields.map((field, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(field.type)}
                          <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                            {field.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {field.type}
                          </span>
                        </div>
                        {field.example !== undefined && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800/30 rounded p-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Example:</span> 
                            {' '}
                            {typeof field.example === 'string' 
                              ? field.example.length > 100 
                                ? field.example.substring(0, 100) + '...' 
                                : field.example
                              : JSON.stringify(field.example)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {renderFields(schema.fields)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileJson className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Response Data</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Send a request to analyze the response structure.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}