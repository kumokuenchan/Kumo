import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check, FileText, Code, Terminal, Table } from 'lucide-react';

interface CopyModalProps {
  documents: any[];
  collectionName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

type CopyFormat = 'json' | 'javascript' | 'mongosh' | 'csv';

export default function CopyModal({ documents, collectionName, onClose, onSuccess }: CopyModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<CopyFormat>('json');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [includeId, setIncludeId] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Get all available fields from documents
  const getAvailableFields = () => {
    if (documents.length === 0) return [];
    
    const allFields = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allFields.add(key));
    });
    
    return Array.from(allFields).sort();
  };

  const availableFields = getAvailableFields();

  const formatData = (format: CopyFormat) => {
    let data = documents;

    // Filter by selected fields
    if (selectedFields.length > 0) {
      data = data.map(doc => {
        const filtered: any = {};
        selectedFields.forEach(field => {
          if (includeId || field !== '_id') {
            filtered[field] = doc[field];
          }
        });
        return filtered;
      });
    } else if (!includeId) {
      data = data.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      });
    }

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'javascript':
        return `// ${collectionName} documents
const ${collectionName} = ${JSON.stringify(data, null, 2)};

export default ${collectionName};`;
      
      case 'mongosh':
        return `// MongoDB shell commands for ${collectionName}
use ${collectionName}

// Insert documents
${data.map((doc, index) => {
  const { _id, ...rest } = doc;
  return `db.${collectionName}.insertOne(${JSON.stringify(rest, null, 2)});`;
}).join('\n')}`;
      
      case 'csv':
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = includeId ? ['_id', ...headers.filter(h => h !== '_id')] : headers.filter(h => h !== '_id');
        
        const csvRows = data.map(doc => {
          const row: any[] = [];
          csvHeaders.forEach(header => {
            let value = doc[header];
            if (value === null || value === undefined) {
              row.push('');
            } else if (typeof value === 'object') {
              row.push(JSON.stringify(value));
            } else {
              row.push(String(value));
            }
          });
          return row;
        });
        
        return [csvHeaders.join(','), ...csvRows.map(row => row.map(cell => {
          const cellStr = String(cell);
          return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
        }).join(','))].join('\n');
      
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  const handleCopy = async () => {
    try {
      const formattedData = formatData(selectedFormat);
      await navigator.clipboard.writeText(formattedData);
      setIsCopied(true);
      onSuccess(`Copied ${documents.length} document${documents.length !== 1 ? 's' : ''} as ${selectedFormat.toUpperCase()}`);
      
      setTimeout(() => {
        setIsCopied(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to copy data:', error);
      onSuccess('Failed to copy data', 'error');
    }
  };

  const copyFormats = [
    {
      id: 'json' as CopyFormat,
      name: 'JSON',
      icon: FileText,
      description: 'Standard JSON format'
    },
    {
      id: 'javascript' as CopyFormat,
      name: 'JavaScript',
      icon: Code,
      description: 'ES6 module format'
    },
    {
      id: 'mongosh' as CopyFormat,
      name: 'MongoSH',
      icon: Terminal,
      description: 'MongoDB shell commands'
    },
    {
      id: 'csv' as CopyFormat,
      name: 'CSV',
      icon: Table,
      description: 'Comma-separated values'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Copy Documents</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''} from {collectionName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Copy Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {copyFormats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedFormat === format.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{format.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          {availableFields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Fields to Include (optional)
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeId}
                    onChange={(e) => setIncludeId(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">Include _id field</span>
                </label>
                {availableFields.filter(field => field !== '_id').map(field => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields([...selectedFields, field]);
                        } else {
                          setSelectedFields(selectedFields.filter(f => f !== field));
                        }
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                {formatData(selectedFormat).substring(0, 200)}
                {formatData(selectedFormat).length > 200 && '...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={isCopied}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy {documents.length} Document{documents.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
