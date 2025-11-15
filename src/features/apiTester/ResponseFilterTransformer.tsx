import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Filter, 
  ArrowRightLeft, 
  Code, 
  Download, 
  Copy,
  Check,
  Eye,
  Hash,
  Type,
  Calendar,
  Boolean,
  Database,
  Plus,
  Trash2,
  Play
} from 'lucide-react';
import type { ApiResponse } from '../../api/apiTester';
import EnhancedJsonSyntaxHighlighter from '../../components/EnhancedJsonSyntaxHighlighter';

interface ResponseFilterTransformerProps {
  isOpen: boolean;
  onClose: () => void;
  response: ApiResponse;
  onApplyFilter: (filteredResponse: ApiResponse) => void;
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: string;
}

interface TransformRule {
  id: string;
  operation: 'include' | 'exclude' | 'rename' | 'compute';
  field: string;
  newValue?: string;
}

export default function ResponseFilterTransformer({
  isOpen,
  onClose,
  response,
  onApplyFilter,
  onToast
}: ResponseFilterTransformerProps) {
  const [filters, setFilters] = useState<FilterRule[]>([
    { id: '1', field: '', operator: 'equals', value: '' }
  ]);
  const [transforms, setTransforms] = useState<TransformRule[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'filters' | 'transforms'>('filters');
  const [copied, setCopied] = useState<string | null>(null);

  // Extract available fields from response
  const availableFields = useMemo(() => {
    if (!response || !response.data) return [];

    const fields = new Set<string>();
    
    const extractFields = (obj: any, prefix: string = ''): void => {
      if (typeof obj !== 'object' || obj === null) return;
      
      if (Array.isArray(obj) && obj.length > 0) {
        // If it's an array, get fields from the first element
        extractFields(obj[0], prefix);
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          const fieldPath = prefix ? `${prefix}.${key}` : key;
          fields.add(fieldPath);
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            extractFields(value, fieldPath);
          }
        });
      }
    };

    extractFields(response.data);
    return Array.from(fields).sort();
  }, [response]);

  // Apply filters and transformations to response data
  const applyFiltersAndTransforms = (data: any) => {
    let result = JSON.parse(JSON.stringify(data)); // Deep clone

    // Handle array of objects
    if (Array.isArray(result)) {
      // Apply filters
      const filtered = result.filter(item => {
        return filters.every(filter => {
          if (!filter.field) return true;
          
          // Get the value at the field path
          const fieldPath = filter.field.split('.');
          let value = item;
          for (const segment of fieldPath) {
            if (value && typeof value === 'object') {
              value = value[segment];
            } else {
              value = undefined;
              break;
            }
          }
          
          if (value === undefined) return true; // If field doesn't exist, skip filter
          
          switch (filter.operator) {
            case 'equals':
              return String(value) === filter.value;
            case 'notEquals':
              return String(value) !== filter.value;
            case 'contains':
              return String(value).toLowerCase().includes(filter.value.toLowerCase());
            case 'notContains':
              return !String(value).toLowerCase().includes(filter.value.toLowerCase());
            case 'greaterThan':
              return Number(value) > Number(filter.value);
            case 'lessThan':
              return Number(value) < Number(filter.value);
            case 'in':
              return filter.value.split(',').map(v => v.trim()).includes(String(value));
            case 'notIn':
              return !filter.value.split(',').map(v => v.trim()).includes(String(value));
            default:
              return true;
          }
        });
      });
      
      // Apply transforms
      let transformed = filtered.map(item => {
        let newItem = { ...item };
        
        transforms.forEach(transform => {
          if (!transform.field) return;
          
          switch (transform.operation) {
            case 'exclude':
              delete newItem[transform.field];
              break;
            case 'rename':
              if (transform.newValue && newItem.hasOwnProperty(transform.field)) {
                newItem[transform.newValue] = newItem[transform.field];
                delete newItem[transform.field];
              }
              break;
            case 'compute':
              // For now, just set a computed value
              if (transform.newValue) {
                newItem[transform.field] = transform.newValue;
              }
              break;
          }
        });
        
        // Handle 'include' transforms - only keep specified fields
        const includeFields = transforms
          .filter(t => t.operation === 'include')
          .map(t => t.field);
        
        if (includeFields.length > 0) {
          const tempItem: any = {};
          includeFields.forEach(field => {
            if (newItem.hasOwnProperty(field)) {
              tempItem[field] = newItem[field];
            }
          });
          newItem = tempItem;
        }
        
        return newItem;
      });
      
      return transformed;
    } 
    // Handle single object
    else if (typeof result === 'object' && result !== null) {
      // Apply transforms to single object
      let transformed = { ...result };
      
      transforms.forEach(transform => {
        if (!transform.field) return;
        
        switch (transform.operation) {
          case 'exclude':
            delete transformed[transform.field];
            break;
          case 'rename':
            if (transform.newValue && transformed.hasOwnProperty(transform.field)) {
              transformed[transform.newValue] = transformed[transform.field];
              delete transformed[transform.field];
            }
            break;
          case 'compute':
            if (transform.newValue) {
              transformed[transform.field] = transform.newValue;
            }
            break;
        }
      });
      
      // Handle 'include' transforms for single object
      const includeFields = transforms
        .filter(t => t.operation === 'include')
        .map(t => t.field);
      
      if (includeFields.length > 0) {
        const tempItem: any = {};
        includeFields.forEach(field => {
          if (transformed.hasOwnProperty(field)) {
            tempItem[field] = transformed[field];
          }
        });
        transformed = tempItem;
      }
      
      return transformed;
    }
    
    return result;
  };

  // Generate preview of filtered data
  const generatePreview = () => {
    if (!response || !response.data) return;
    
    const filteredData = applyFiltersAndTransforms(response.data);
    setPreview(filteredData);
  };

  // Add new filter rule
  const addFilter = () => {
    const newId = Date.now().toString();
    setFilters([...filters, { id: newId, field: '', operator: 'equals', value: '' }]);
  };

  // Remove filter rule
  const removeFilter = (id: string) => {
    if (filters.length <= 1) return;
    setFilters(filters.filter(filter => filter.id !== id));
  };

  // Update filter rule
  const updateFilter = (id: string, field: string, value: any) => {
    setFilters(filters.map(filter => 
      filter.id === id ? { ...filter, [field]: value } : filter
    ));
  };

  // Add new transform rule
  const addTransform = () => {
    const newId = Date.now().toString();
    setTransforms([...transforms, { id: newId, operation: 'exclude', field: '', newValue: '' }]);
  };

  // Remove transform rule
  const removeTransform = (id: string) => {
    setTransforms(transforms.filter(transform => transform.id !== id));
  };

  // Update transform rule
  const updateTransform = (id: string, field: string, value: any) => {
    setTransforms(transforms.map(transform => 
      transform.id === id ? { ...transform, [field]: value } : transform
    ));
  };

  // Apply the filters and transformations to the response
  const handleApply = () => {
    if (!response || !response.data) return;
    
    const filteredData = applyFiltersAndTransforms(response.data);
    const newResponse: ApiResponse = {
      ...response,
      data: filteredData,
      size: JSON.stringify(filteredData).length
    };
    
    onApplyFilter(newResponse);
    onToast('Filters and transformations applied successfully!', 'success');
    onClose();
  };

  // Copy filtered data to clipboard
  const handleCopy = () => {
    if (preview) {
      navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
      setCopied('filtered');
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // Download filtered data as JSON
  const handleDownload = () => {
    if (!preview) return;
    
    const dataStr = JSON.stringify(preview, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `filtered_response_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Filter className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Response Filter & Transform</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Filter and transform your API response data
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'filters'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setActiveTab('transforms')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'transforms'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transforms
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Main content with filters/transforms and preview */}
          <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Filters/Transforms panel */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {activeTab === 'filters' ? 'Data Filters' : 'Data Transforms'}
                </h3>
                
                {activeTab === 'filters' ? (
                  <div className="space-y-4">
                    {filters.map((filter) => (
                      <div key={filter.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <select
                          value={filter.field}
                          onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select field</option>
                          {availableFields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(filter.id, 'operator', e.target.value as any)}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="equals">Equals</option>
                          <option value="notEquals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="notContains">Not Contains</option>
                          <option value="greaterThan">Greater Than</option>
                          <option value="lessThan">Less Than</option>
                          <option value="in">In (comma separated)</option>
                          <option value="notIn">Not In (comma separated)</option>
                        </select>
                        
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        />
                        
                        {filters.length > 1 && (
                          <button
                            onClick={() => removeFilter(filter.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Remove filter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      onClick={addFilter}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Filter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transforms.map((transform) => (
                      <div key={transform.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <select
                          value={transform.operation}
                          onChange={(e) => updateTransform(transform.id, 'operation', e.target.value as any)}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="exclude">Exclude Field</option>
                          <option value="include">Include Only Fields</option>
                          <option value="rename">Rename Field</option>
                          <option value="compute">Compute Field</option>
                        </select>
                        
                        <select
                          value={transform.field}
                          onChange={(e) => updateTransform(transform.id, 'field', e.target.value)}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select field</option>
                          {availableFields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                        
                        {(transform.operation === 'rename' || transform.operation === 'compute') && (
                          <input
                            type="text"
                            value={transform.newValue || ''}
                            onChange={(e) => updateTransform(transform.id, 'newValue', e.target.value)}
                            placeholder={transform.operation === 'rename' ? "New name" : "Computed value"}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                          />
                        )}
                        
                        <button
                          onClick={() => removeTransform(transform.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Remove transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      onClick={addTransform}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                      Add Transform
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={generatePreview}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Eye className="w-4 h-4" />
                  Preview Result
                </button>
                
                <button
                  onClick={handleApply}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  <Play className="w-4 h-4" />
                  Apply to Response
                </button>
              </div>
            </div>
            
            {/* Preview panel */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Preview
              </h3>
              
              <div className="h-full flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Filtered Result
                  </span>
                  <div className="flex gap-2">
                    {preview && (
                      <>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-700/80 rounded transition"
                        >
                          {copied === 'filtered' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-700/80 rounded transition"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-white dark:bg-gray-900 p-4">
                  {preview ? (
                    <EnhancedJsonSyntaxHighlighter data={preview} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <Filter className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Apply filters and transforms to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}