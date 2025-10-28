import { useState, useRef, useEffect } from 'react';
import {
  importCSV,
  importJSON,
  getImportProgress,
  cancelImport,
  type ImportProgress,
} from '../../api/importExport';

interface ImportDialogProps {
  connectionId: string;
  database: string;
  table: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDialog({
  connectionId,
  database,
  table,
  isOpen,
  onClose,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [truncateFirst, setTruncateFirst] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for progress updates
  useEffect(() => {
    if (jobId && importing) {
      progressIntervalRef.current = setInterval(async () => {
        try {
          const progressData = await getImportProgress(jobId);
          setProgress(progressData);

          if (progressData.status === 'completed') {
            setImporting(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            onSuccess();
          } else if (progressData.status === 'error' || progressData.status === 'cancelled') {
            setImporting(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            setError(progressData.errorMessages[0]?.message || 'Import failed');
          }
        } catch (err: any) {
          console.error('Error polling progress:', err);
        }
      }, 1000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [jobId, importing, onSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);

      // Auto-detect format from file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        setFormat('csv');
      } else if (ext === 'json') {
        setFormat('json');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setError(null);
    setImporting(true);
    setProgress(null);

    try {
      let response;
      if (format === 'csv') {
        response = await importCSV(connectionId, database, table, file, {
          delimiter,
          hasHeaders,
          truncateFirst,
        });
      } else {
        response = await importJSON(connectionId, database, table, file, {
          truncateFirst,
        });
      }

      setJobId(response.jobId);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setImporting(false);
    }
  };

  const handleCancel = async () => {
    if (jobId && importing) {
      try {
        await cancelImport(jobId);
        setImporting(false);
        setProgress(null);
        setJobId(null);
      } catch (err: any) {
        console.error('Error cancelling import:', err);
      }
    }
  };

  const handleClose = () => {
    if (importing) {
      handleCancel();
    }
    setFile(null);
    setError(null);
    setProgress(null);
    setJobId(null);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Import Data</h3>

        {!importing ? (
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {/* CSV-specific options */}
            {format === 'csv' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delimiter
                  </label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasHeaders"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="hasHeaders" className="text-sm text-gray-700">
                    First row contains headers
                  </label>
                </div>
              </>
            )}

            {/* Truncate option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="truncateFirst"
                checked={truncateFirst}
                onChange={(e) => setTruncateFirst(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="truncateFirst" className="text-sm text-gray-700">
                Truncate table before import (delete all existing data)
              </label>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Warning for truncate */}
            {truncateFirst && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                ⚠️ Warning: This will delete all existing data in the table before importing.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            {progress && (
              <>
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>
                      Progress: {progress.processed} / {progress.total} rows
                    </span>
                    <span>
                      {progress.total > 0
                        ? Math.round((progress.processed / progress.total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {progress.errors > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                    {progress.errors} error(s) encountered
                  </div>
                )}

                {progress.errorMessages.length > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                    <div className="space-y-1">
                      {progress.errorMessages.slice(0, 10).map((err, i) => (
                        <p key={i} className="text-xs text-red-600">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                      {progress.errorMessages.length > 10 && (
                        <p className="text-xs text-gray-500">
                          ... and {progress.errorMessages.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!progress && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">Starting import...</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={importing}
          >
            {importing ? 'Close' : 'Cancel'}
          </button>
          {importing ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel Import
            </button>
          ) : (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!file}
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
