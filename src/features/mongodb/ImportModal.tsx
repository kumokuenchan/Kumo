import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileJson, FileText, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  collectionName: string;
  onImport: (documents: any[]) => Promise<void>;
  onClose: () => void;
}

type ImportFormat = 'json' | 'csv';

export default function ImportModal({ collectionName, onImport, onClose }: ImportModalProps) {
  const [format, setFormat] = useState<ImportFormat>('json');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      let documents: any[] = [];

      if (format === 'json') {
        documents = parseJSON(text);
      } else {
        documents = parseCSV(text);
      }

      if (documents.length === 0) {
        throw new Error('No documents found in file');
      }

      await onImport(documents);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseJSON = (text: string): any[] => {
    try {
      const parsed = JSON.parse(text);

      // If it's an array, return it
      if (Array.isArray(parsed)) {
        return parsed;
      }

      // If it's a single object, wrap it in an array
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }

      throw new Error('Invalid JSON format. Expected an array or object.');
    } catch (err) {
      throw new Error('Failed to parse JSON: ' + (err as Error).message);
    }
  };

  const parseCSV = (text: string): any[] => {
    try {
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      // Parse header
      const headers = parseCSVLine(lines[0]);

      // Parse data rows
      const documents: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        if (values.length !== headers.length) {
          console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}, skipping`);
          continue;
        }

        const doc: any = {};
        headers.forEach((header, index) => {
          const value = values[index];

          // Try to parse as JSON for nested objects/arrays
          if (value.startsWith('{') || value.startsWith('[')) {
            try {
              doc[header] = JSON.parse(value);
            } catch {
              doc[header] = value;
            }
          }
          // Try to parse as number
          else if (value !== '' && !isNaN(Number(value))) {
            doc[header] = Number(value);
          }
          // Try to parse as boolean
          else if (value === 'true' || value === 'false') {
            doc[header] = value === 'true';
          }
          // Keep as string
          else {
            doc[header] = value === '' ? null : value;
          }
        });

        documents.push(doc);
      }

      return documents;
    } catch (err) {
      throw new Error('Failed to parse CSV: ' + (err as Error).message);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Push the last value
    values.push(current);

    return values;
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
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import Documents</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Import to {collectionName}</p>
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
        <div className="p-6 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select File Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setFormat('json');
                  setFile(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <FileJson className={`w-4 h-4 ${
                  format === 'json'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  format === 'json'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  JSON
                </span>
              </button>
              <button
                onClick={() => {
                  setFormat('csv');
                  setFile(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                  format === 'csv'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <FileText className={`w-4 h-4 ${
                  format === 'csv'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  format === 'csv'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  CSV
                </span>
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={format === 'json' ? '.json' : '.csv'}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {file ? file.name : `Click to select ${format.toUpperCase()} file`}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Import Error</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {format === 'json'
                ? 'Upload a JSON file containing an array of documents or a single document object.'
                : 'Upload a CSV file with headers in the first row. Nested objects should be JSON-formatted.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Documents
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
