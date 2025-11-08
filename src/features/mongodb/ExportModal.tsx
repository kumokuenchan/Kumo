import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, FileJson, FileText, Code, Database } from 'lucide-react';

interface ExportModalProps {
  documents: any[];
  collectionName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  currentFilters?: {
    searchField?: string;
    searchTerm?: string;
    isSearchActive?: boolean;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  };
  totalCount?: number;
}

type ExportFormat = 'json' | 'csv' | 'xml' | 'sql';

export default function ExportModal({ 
  documents, 
  collectionName, 
  onClose, 
  onSuccess, 
  currentFilters,
  totalCount 
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const handleExport = () => {
    try {
      let exportedCount = 0;
      
      switch (format) {
        case 'json':
          exportAsJSON();
          exportedCount = documents.length;
          break;
        case 'csv':
          exportAsCSV();
          exportedCount = documents.length;
          break;
        case 'xml':
          exportAsXML();
          exportedCount = documents.length;
          break;
        case 'sql':
          exportAsSQL();
          exportedCount = documents.length;
          break;
        default:
          exportAsJSON();
      }
      
      const filterInfo = currentFilters?.isSearchActive ? 
        ` (filtered from ${totalCount || exportedCount} total)` : 
        '';
      
      onSuccess(`Exported ${exportedCount} documents as ${format.toUpperCase()}${filterInfo}`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      onSuccess('Export failed', 'error');
    }
  };

  const exportAsJSON = () => {
    const jsonString = JSON.stringify(documents, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    if (documents.length === 0) return;

    // Get all unique keys from all documents
    const allKeys = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Helper function to flatten nested objects
    const flattenValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };

    // Create CSV content
    const csvRows = [];

    // Add header row
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // Add data rows
    documents.forEach(doc => {
      const row = headers.map(header => {
        const value = doc[header];
        const flatValue = flattenValue(value);
        // Escape quotes and wrap in quotes
        return `"${flatValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsXML = () => {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const rootElement = `<${collectionName}>\n`;
    
    const xmlItems = documents.map(doc => {
      const itemElement = '  <document>\n';
      const fields = Object.entries(doc).map(([key, value]) => {
        const escapedValue = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        return `    <${key}>${escapedValue}</${key}>`;
      }).join('\n');
      
      return `${itemElement}${fields}\n  </document>`;
    }).join('\n');
    
    const xmlFooter = `</${collectionName}>`;
    const xmlContent = xmlHeader + rootElement + xmlItems + '\n' + xmlFooter;
    
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}_export_${Date.now()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsSQL = () => {
    const sqlStatements = documents.map((doc, index) => {
      const fields = Object.entries(doc);
      const columns = fields.map(([key]) => `\`${key}\``).join(', ');
      const values = fields.map(([, value]) => {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return `'${String(value).replace(/'/g, "''")}'`;
      }).join(', ');
      
      return `INSERT INTO \`${collectionName}\` (${columns}) VALUES (${values});`;
    }).join('\n');
    
    const blob = new Blob([sqlStatements], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}_export_${Date.now()}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAvailableFields = () => {
    if (documents.length === 0) return [];
    const allFields = new Set<string>();
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => allFields.add(key));
    });
    return Array.from(allFields).sort();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export Documents</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {documents.length} documents from {collectionName}
                {currentFilters?.isSearchActive && totalCount && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {' '}(filtered from {totalCount} total)
                  </span>
                )}
              </p>
              {currentFilters?.isSearchActive && (
                <div className="mt-1 text-xs text-gray-400">
                  Active filter: {currentFilters.searchField} = "{currentFilters.searchTerm}"
                  {currentFilters.sortField && (
                    <span> • Sorted by {currentFilters.sortField} ({currentFilters.sortDirection})</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Export Format
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setFormat('json')}
              className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                format === 'json'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                format === 'json'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <FileJson className={`w-5 h-5 ${
                  format === 'json'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${
                  format === 'json'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  JSON Format
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Preserves data structure and types
                </div>
              </div>
              {format === 'json' && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            <button
              onClick={() => setFormat('csv')}
              className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                format === 'csv'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                format === 'csv'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <FileText className={`w-5 h-5 ${
                  format === 'csv'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${
                  format === 'csv'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  CSV Format
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Compatible with Excel and spreadsheets
                </div>
              </div>
              {format === 'csv' && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            <button
              onClick={() => setFormat('xml')}
              className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                format === 'xml'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                format === 'xml'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <FileText className={`w-5 h-5 ${
                  format === 'xml'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${
                  format === 'xml'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  XML Format
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Structured markup for web services
                </div>
              </div>
              {format === 'xml' && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            <button
              onClick={() => setFormat('sql')}
              className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition ${
                format === 'sql'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                format === 'sql'
                  ? 'bg-green-100 dark:bg-green-900/40'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Database className={`w-5 h-5 ${
                  format === 'sql'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${
                  format === 'sql'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  SQL Format
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  INSERT statements for database import
                </div>
              </div>
              {format === 'sql' && (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
          >
            <Download className="w-4 h-4" />
            Export {format.toUpperCase()}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
