import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ApiResponse } from '../../api/apiTester';

interface ResponseViewerProps {
  response: ApiResponse | null;
}

type ResponseTab = 'body' | 'headers';

export default function ResponseViewer({ response }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [copied, setCopied] = useState(false);

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No response yet</p>
          <p className="text-xs mt-1">Send a request to see the response here</p>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    const content = activeTab === 'body'
      ? JSON.stringify(response.data, null, 2)
      : JSON.stringify(response.headers, null, 2);

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (status >= 400 && status < 500) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`px-2 py-1 text-sm font-semibold rounded ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {response.duration}ms
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Size:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatBytes(response.size)}
            </span>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Response Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {(['body', 'headers'] as ResponseTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Response Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'body' && (
          <pre className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-4 text-sm font-mono overflow-auto">
            <code className="text-gray-900 dark:text-gray-100">
              {typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data, null, 2)}
            </code>
          </pre>
        )}

        {activeTab === 'headers' && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Header
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {key}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
