import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { parseCurlCommand } from '../../utils/curlParser';
import type { ApiRequest } from '../../api/apiTester';

interface CurlImporterProps {
  onImport: (request: ApiRequest) => void;
  onClose: () => void;
}

export default function CurlImporter({ onImport, onClose }: CurlImporterProps) {
  const [curlText, setCurlText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    if (!curlText.trim()) {
      setError('Please paste a cURL command');
      return;
    }

    const request = parseCurlCommand(curlText);

    if (!request) {
      setError('Failed to parse cURL command. Make sure it\'s a valid cURL command.');
      return;
    }

    onImport(request);
    onClose();
  };

  const exampleCurl = `curl 'https://api.example.com/users' \\
  -H 'Authorization: Bearer token123' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"name":"John Doe"}'`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import cURL Command
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste your cURL command here:
            </label>
            <textarea
              value={curlText}
              onChange={(e) => {
                setCurlText(e.target.value);
                setError(null);
              }}
              placeholder="curl 'https://api.example.com/endpoint' -H 'Authorization: Bearer token' --data '{...}'"
              className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          {/* Example */}
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Example cURL command:
            </div>
            <pre className="p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-xs font-mono overflow-x-auto">
              <code className="text-gray-800 dark:text-gray-200">{exampleCurl}</code>
            </pre>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Supported features:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>URL and query parameters</li>
              <li>HTTP methods (-X, --request)</li>
              <li>Headers (-H, --header)</li>
              <li>Request body (-d, --data, --data-raw)</li>
              <li>Basic authentication (-u, --user)</li>
              <li>Bearer token (via Authorization header)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!curlText.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
