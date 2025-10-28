import { useState } from 'react';
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Export Data</h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`px-4 py-3 border rounded-lg text-center transition-colors ${
                  format === 'csv'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">CSV</div>
                <div className="text-xs text-gray-500">Comma-separated</div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-4 py-3 border rounded-lg text-center transition-colors ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">JSON</div>
                <div className="text-xs text-gray-500">JavaScript Object</div>
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`px-4 py-3 border rounded-lg text-center transition-colors ${
                  format === 'excel'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Excel</div>
                <div className="text-xs text-gray-500">XLSX spreadsheet</div>
              </button>
            </div>
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
                  id="includeHeaders"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="includeHeaders" className="text-sm text-gray-700">
                  Include column headers
                </label>
              </div>
            </>
          )}

          {/* JSON-specific options */}
          {format === 'json' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pretty"
                checked={pretty}
                onChange={(e) => setPretty(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="pretty" className="text-sm text-gray-700">
                Pretty print (formatted with indentation)
              </label>
            </div>
          )}

          {/* Active filters info */}
          {whereClause && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
              <p className="font-medium mb-1">Active Filter</p>
              <p className="text-xs">
                Only rows matching your current search will be exported: "{whereClause}"
              </p>
            </div>
          )}

          {/* Export info */}
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded text-sm">
            <p className="font-medium mb-1">Export Information</p>
            <ul className="text-xs space-y-1">
              <li>• Table: {database}.{table}</li>
              <li>• Format: {format.toUpperCase()}</li>
              {format === 'csv' && (
                <li>
                  • Options: Delimiter={delimiter === '\t' ? 'Tab' : delimiter},{' '}
                  {includeHeaders ? 'With headers' : 'No headers'}
                </li>
              )}
              {format === 'json' && (
                <li>• Options: {pretty ? 'Pretty printed' : 'Minified'}</li>
              )}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Exporting indicator */}
          {exporting && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Exporting data...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
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
  );
}
