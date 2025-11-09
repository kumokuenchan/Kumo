import { useState } from 'react';
import { createPortal } from 'react-dom';
import { exportCSV, exportJSON, exportExcel } from '../../api/importExport';

interface ExportDataDialogProps {
  connectionId: string;
  database: string;
  table: string;
  isOpen: boolean;
  onClose: () => void;
  whereClause?: string;
}

export default function ExportDataDialog({
  connectionId,
  database,
  table,
  isOpen,
  onClose,
  whereClause,
}: ExportDataDialogProps) {
  const [format, setFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [delimiter, setDelimiter] = useState(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [pretty, setPretty] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    setExporting(true);

    try {
      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'csv':
          blob = await exportCSV(connectionId, database, table, {
            delimiter,
            includeHeaders,
            whereClause,
          });
          filename = `${table}_export.csv`;
          break;

        case 'json':
          blob = await exportJSON(connectionId, database, table, {
            whereClause,
            pretty,
          });
          filename = `${table}_export.json`;
          break;

        case 'excel':
          blob = await exportExcel(connectionId, database, table, {
            whereClause,
          });
          filename = `${table}_export.xlsx`;
          break;

        default:
          throw new Error('Invalid format');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Close dialog on success
      setTimeout(() => {
        onClose();
        setExporting(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-2xl border border-gray-200/60 dark:border-gray-800/60 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Export Data</h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`px-4 py-4 border rounded-xl text-center transition-all duration-200 ${
                  format === 'csv'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-md'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-semibold">CSV</div>
                <div className="text-xs opacity-70">Comma-separated</div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-4 py-4 border rounded-xl text-center transition-all duration-200 ${
                  format === 'json'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-md'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-semibold">JSON</div>
                <div className="text-xs opacity-70">JavaScript Object</div>
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`px-4 py-4 border rounded-xl text-center transition-all duration-200 ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 shadow-md'
                    : 'border-gray-200/60 dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/60 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-semibold">Excel</div>
                <div className="text-xs opacity-70">XLSX spreadsheet</div>
              </button>
            </div>
          </div>

          {/* CSV-specific options */}
          {format === 'csv' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Delimiter
                </label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="," className="bg-white dark:bg-gray-900">Comma (,)</option>
                  <option value=";" className="bg-white dark:bg-gray-900">Semicolon (;)</option>
                  <option value="\t" className="bg-white dark:bg-gray-900">Tab</option>
                  <option value="|" className="bg-white dark:bg-gray-900">Pipe (|)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                <input
                  type="checkbox"
                  id="includeHeaders"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <label htmlFor="includeHeaders" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include column headers
                </label>
              </div>
            </>
          )}

          {/* JSON-specific options */}
          {format === 'json' && (
            <div className="flex items-center gap-3 p-3 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <input
                type="checkbox"
                id="pretty"
                checked={pretty}
                onChange={(e) => setPretty(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <label htmlFor="pretty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pretty print (formatted with indentation)
              </label>
            </div>
          )}

          {/* Active filters info */}
          {whereClause && (
            <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
              <p className="font-semibold mb-1">Active Filter</p>
              <p className="text-xs">
                Only rows matching your current search will be exported: "{whereClause}"
              </p>
            </div>
          )}

          {/* Export info */}
          <div className="bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
            <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Export Information</p>
            <ul className="text-xs space-y-1.5">
              <li>• Table: <span className="font-medium">{database}.{table}</span></li>
              <li>• Format: <span className="font-medium">{format.toUpperCase()}</span></li>
              {format === 'csv' && (
                <li>
                  • Options: Delimiter=<span className="font-medium">{delimiter === '\t' ? 'Tab' : delimiter}</span>,{' '}
                  <span className="font-medium">{includeHeaders ? 'With headers' : 'No headers'}</span>
                </li>
              )}
              {format === 'json' && (
                <li>• Options: <span className="font-medium">{pretty ? 'Pretty printed' : 'Minified'}</span></li>
              )}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 text-red-800 dark:text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Exporting indicator */}
          {exporting && (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">Exporting data...</span>
            </div>
          )}
        </div>

        {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 border border-gray-300/60 dark:border-gray-600/60 bg-white/60 dark:bg-gray-800/60 hover:bg-gray-50/80 dark:hover:bg-gray-700/80 rounded-xl text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 backdrop-blur-sm"
              disabled={exporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={exporting}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
