import { useMemo, useEffect, useState } from 'react';
import { Copy, Check, Download, Eye, FileText, Code, Terminal, FilePlus2 } from 'lucide-react';
import type { ApiResponse, ApiRequest } from '../../api/apiTester';

interface ResponseViewerProps {
  response: ApiResponse | null;
  request?: ApiRequest;
}

type ResponseTab = 'body' | 'headers';
type BodyViewMode = 'json' | 'text' | 'raw' | 'preview';

export default function ResponseViewer({ response, request }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [copied, setCopied] = useState(false);
  const [bodyMode, setBodyMode] = useState<BodyViewMode>('json');

  const headersLc = useMemo(() => {
    const map: Record<string, string> = {};
    if (response?.headers) {
      Object.entries(response.headers).forEach(([k, v]) => (map[k.toLowerCase()] = String(v)));
    }
    return map;
  }, [response]);

  const contentType = headersLc['content-type'] || '';
  const isLikelyJson = useMemo(() => {
    if (!response) return false;
    if (typeof response.data !== 'string') return true;
    if (contentType.includes('application/json')) return true;
    try { JSON.parse(response.data); return true; } catch { return false; }
  }, [response, contentType]);

  // Initialize mode heuristically when response changes
  useEffect(() => {
    if (!response) return;
    if (contentType.includes('text/html')) setBodyMode('preview');
    else if (isLikelyJson) setBodyMode('json');
    else if (contentType.startsWith('text/')) setBodyMode('text');
    else setBodyMode('raw');
  }, [response, contentType, isLikelyJson]);

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
    let content = '';
    if (activeTab === 'headers') {
      content = JSON.stringify(response.headers, null, 2);
    } else {
      if (bodyMode === 'json' && isLikelyJson) {
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        content = JSON.stringify(data, null, 2);
      } else if (typeof response.data === 'string') {
        content = response.data;
      } else {
        content = JSON.stringify(response.data);
      }
    }

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyJson = () => {
    if (!response) return;
    try {
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      const str = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(str);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const guessExtension = () => {
    if (contentType.includes('application/json')) return 'json';
    if (contentType.includes('text/html')) return 'html';
    if (contentType.includes('text/plain')) return 'txt';
    if (contentType.includes('xml')) return 'xml';
    return 'bin';
  };

  const handleSaveToFile = () => {
    if (!response) return;
    try {
      const ext = guessExtension();
      let dataStr: string | ArrayBuffer;
      if (typeof response.data === 'string') {
        dataStr = response.data;
      } else {
        // Serialize non-string bodies
        dataStr = isLikelyJson ? JSON.stringify(response.data, null, 2) : String(response.data);
      }
      const blob = new Blob([dataStr as any], { type: contentType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `response_${response.status}_${ts}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const buildSummary = (req?: ApiRequest, res?: ApiResponse | null): string => {
    if (!res || !req) {
      return `API Test Result\n- No request/response available.`;
    }
    const ts = new Date().toLocaleString();
    const url = req.url;
    const method = req.method;
    const paramsStr = req.params && Object.keys(req.params).length ? JSON.stringify(req.params, null, 2) : '—';
    const headersStr = req.headers && Object.keys(req.headers).length ? JSON.stringify(req.headers, null, 2) : '—';
    let reqBodyStr = '—';
    if (req.body !== undefined && req.body !== null) {
      try {
        reqBodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      } catch { reqBodyStr = String(req.body); }
    }
    const ct = headersLc['content-type'] || '—';
    let resBodyStr = '';
    try {
      if (typeof res.data === 'string') {
        resBodyStr = isLikelyJson ? JSON.stringify(JSON.parse(res.data), null, 2) : res.data;
      } else {
        resBodyStr = JSON.stringify(res.data, null, 2);
      }
    } catch {
      resBodyStr = String(res.data);
    }
    // Truncate large bodies to keep tickets readable
    const truncate = (s: string, max = 4000) => (s.length > max ? s.slice(0, max) + '\n... (truncated)' : s);

    return (
`API Test Result\n
When: ${ts}\n
Endpoint: ${method} ${url}\nStatus: ${res.status} ${res.statusText} | Time: ${res.duration}ms | Size: ${formatBytes(res.size)}\nContent-Type: ${ct}\n
Params:\n${paramsStr}\n
Request Headers:\n${headersStr}\n
Request Body:\n${truncate(reqBodyStr)}\n
Response Body:\n${truncate(resBodyStr)}\n`);
  };

  const handleCopySummary = (req?: ApiRequest, res?: ApiResponse | null) => {
    const text = buildSummary(req, res);
    navigator.clipboard.writeText(text);
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

        <div className="flex items-center gap-2">
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
          <button
            onClick={() => handleCopySummary(request, response)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="Copy ticket-friendly test summary"
          >
            <FilePlus2 className="w-4 h-4" />
            Summary
          </button>
        </div>
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
          <div className="flex flex-col gap-3">
            {/* Body tools */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBodyMode('json')}
                  disabled={!isLikelyJson}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'json' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'} ${!isLikelyJson ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isLikelyJson ? 'View as pretty JSON' : 'Response is not JSON'}
                >
                  <Code className="w-3.5 h-3.5" /> JSON
                </button>
                <button
                  onClick={() => setBodyMode('text')}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'text' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  title="View as text"
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  onClick={() => setBodyMode('raw')}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'raw' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  title="View raw"
                >
                  <Terminal className="w-3.5 h-3.5" /> Raw
                </button>
                <button
                  onClick={() => setBodyMode('preview')}
                  disabled={!contentType.includes('text/html')}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'preview' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'} ${!contentType.includes('text/html') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={contentType.includes('text/html') ? 'Preview HTML' : 'Preview available for HTML only'}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
              </div>
              <div className="flex items-center gap-2">
                {isLikelyJson && (
                  <button
                    onClick={handleCopyJson}
                    className="px-2 py-1.5 text-xs rounded flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Copy as JSON"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                )}
                <button
                  onClick={handleSaveToFile}
                  className="px-2 py-1.5 text-xs rounded flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Save to file"
                >
                  <Download className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>

            {/* Body content */}
            {bodyMode !== 'preview' ? (
              <pre className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-4 text-sm font-mono overflow-auto">
                <code className="text-gray-900 dark:text-gray-100">
                  {(() => {
                    if (bodyMode === 'json' && isLikelyJson) {
                      try {
                        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                        return JSON.stringify(data, null, 2);
                      } catch {
                        return String(response.data);
                      }
                    }
                    if (typeof response.data === 'string') return response.data;
                    if (bodyMode === 'text') return String(response.data);
                    return JSON.stringify(response.data);
                  })()}
                </code>
              </pre>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded overflow-hidden h-[480px]">
                <iframe
                  title="response-preview"
                  className="w-full h-full bg-white"
                  sandbox="allow-same-origin"
                  srcDoc={typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}
                />
              </div>
            )}
          </div>
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
