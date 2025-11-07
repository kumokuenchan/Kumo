import { useMemo, useEffect, useState, useRef } from 'react';
import { Copy, Check, Download, Eye, FileText, Code, Terminal, FilePlus2, Zap, Activity, ArrowLeftRight, Maximize2, Minimize2 } from 'lucide-react';
import type { ApiResponse, ApiRequest } from '../../api/apiTester';
import VariableExtractor from './VariableExtractor';
import ResponseTimeHistory from './ResponseTimeHistory';
import ResponseCompare from './ResponseCompare';
import { environmentStorage } from '../../services/environmentStorage';

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
  const [showVariableExtractor, setShowVariableExtractor] = useState(false);
  const [showResponseTimeHistory, setShowResponseTimeHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Track environment changes to refresh resolved URL in-place
  const [envVersion, setEnvVersion] = useState(0);
  useEffect(() => {
    const handler = () => setEnvVersion(v => v + 1);
    window.addEventListener('apiTester:environmentChanged', handler as any);
    return () => window.removeEventListener('apiTester:environmentChanged', handler as any);
  }, []);
  const previousResponseRef = useRef<ApiResponse | null>(null);

  // Store previous response for comparison
  useEffect(() => {
    if (response && previousResponseRef.current !== response) {
      // Only update if it's a different response object
      if (previousResponseRef.current) {
        // Keep the previous one for comparison
      } else {
        previousResponseRef.current = response;
      }
    }
  }, [response]);

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

  // Compute resolved URL for display (env + path params + query)
  const resolvedUrl = useMemo(() => {
    try {
      if (!request) return '';
      const replaceVars = (text: string) => environmentStorage.replaceVariables(text);
      let urlStr = replaceVars(request.url || '');
      const qp: Record<string, string> = Object.fromEntries(
        Object.entries(request.params || {}).map(([k, v]) => [k, replaceVars(String(v))])
      );
      if (urlStr) {
        const used = new Set<string>();
        urlStr = urlStr.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
          if (qp[key] != null) {
            used.add(key);
            return encodeURIComponent(String(qp[key]));
          }
          const envVal = environmentStorage.getVariable(key);
          return envVal != null ? encodeURIComponent(String(envVal)) : m;
        });
        used.forEach(k => delete (qp as any)[k]);
      }
      try {
        const u = new URL(urlStr || 'http://localhost');
        Object.entries(qp).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, String(v)); });
        if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          urlStr = u.toString();
        } else {
          const qs = new URLSearchParams(qp || {}).toString();
          urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
        }
      } catch {
        const qs = new URLSearchParams(qp || {}).toString();
        urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
      }
      return urlStr;
    } catch {
      return request?.url || '';
    }
  }, [request, envVersion]);

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
    const resolveUrlForDisplay = (r: ApiRequest): string => {
      const replaceVars = (text: string) => environmentStorage.replaceVariables(text);
      let urlStr = replaceVars(r.url || '');
      const qp: Record<string, string> = Object.fromEntries(
        Object.entries(r.params || {}).map(([k, v]) => [k, replaceVars(String(v))])
      );
      if (urlStr) {
        const used = new Set<string>();
        urlStr = urlStr.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
          if (qp[key] != null) {
            used.add(key);
            return encodeURIComponent(String(qp[key]));
          }
          const envVal = environmentStorage.getVariable(key);
          return envVal != null ? encodeURIComponent(String(envVal)) : m;
        });
        used.forEach(k => delete qp[k]);
      }
      try {
        const u = new URL(urlStr || 'http://localhost');
        Object.entries(qp).forEach(([k, v]) => {
          if (v != null) u.searchParams.set(k, String(v));
        });
        if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          urlStr = u.toString();
        } else {
          const qs = new URLSearchParams(qp || {}).toString();
          urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
        }
      } catch {
        const qs = new URLSearchParams(qp || {}).toString();
        urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
      }
      return urlStr;
    };
    const url = resolveUrlForDisplay(req);
    const method = req.method;
    const hasParams = !!(req.params && Object.keys(req.params).length);
    const paramsStr = hasParams ? JSON.stringify(req.params, null, 2) : '';
    const hasReqHeaders = !!(req.headers && Object.keys(req.headers).length);
    const headersStr = hasReqHeaders ? JSON.stringify(req.headers, null, 2) : '';
    let reqBodyStr = '—';
    if (req.body !== undefined && req.body !== null) {
      try {
        reqBodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
      } catch { reqBodyStr = String(req.body); }
    }
    const hasReqBody = reqBodyStr !== '—' && reqBodyStr.trim() !== '';
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

    const parts: string[] = [];
    parts.push('API Test Result');
    parts.push('');
    parts.push(`When: ${ts}`);
    parts.push('');
    parts.push(`Endpoint: ${method} ${url}`);
    parts.push(`Status: ${res.status} ${res.statusText} | Time: ${res.duration}ms | Size: ${formatBytes(res.size)}\nContent-Type: ${ct}`);
    parts.push('');
    if (hasParams) {
      parts.push('Params:');
      parts.push(paramsStr);
      parts.push('');
    }
    if (hasReqHeaders) {
      parts.push('Request Headers:');
      parts.push(headersStr);
      parts.push('');
    }
    if (hasReqBody) {
      parts.push('Request Body:');
      parts.push(reqBodyStr);
      parts.push('');
    }
    parts.push('Response Body:');
    parts.push(resBodyStr);
    parts.push('');
    return parts.join('\n');
  };

  const handleCopySummary = (req?: ApiRequest, res?: ApiResponse | null) => {
    const text = buildSummary(req, res);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
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

  // JSON syntax highlighting
  const highlightJson = (json: string): string => {
    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

    // Regex to match JSON tokens
    const regex = /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;

    return escapeHtml(json).replace(regex, (match, str, colon, bool, num) => {
      if (str) {
        // Property key (followed by colon) or string value
        if (colon) {
          return `<span class="text-blue-600 dark:text-blue-400 font-semibold">${str}</span>${colon}`;
        }
        return `<span class="text-emerald-600 dark:text-emerald-400">${str}</span>`;
      }
      if (bool) {
        // Boolean values
        return `<span class="text-purple-600 dark:text-purple-400 font-semibold">${bool}</span>`;
      }
      if (num) {
        // Numbers
        return `<span class="text-orange-600 dark:text-orange-400">${num}</span>`;
      }
      return match;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Error Banner for network/request failures */}
      {response.status === 0 && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Request Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {response.statusText || 'The request could not be completed. This might be due to network issues, CORS errors, or server problems.'}
              </p>
            </div>
          </div>
        </div>
      )}

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
          {previousResponseRef.current && previousResponseRef.current !== response && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
              title="Compare with previous response"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Compare
            </button>
          )}

          <button
            onClick={() => setShowResponseTimeHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="View response time history and performance trends"
          >
            <Activity className="w-4 h-4" />
            History
          </button>

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

          {isLikelyJson && (
            <button
              onClick={() => setShowVariableExtractor(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors"
              title="Extract variables from response"
            >
              <Zap className="w-4 h-4" />
              Extract Vars
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="View response in fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
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
      {resolvedUrl && (
        <div className="px-4 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800" role="note" aria-label="Resolved URL">
            <span className="font-semibold">URL:</span>
            <span className="font-mono font-semibold break-all">{resolvedUrl}</span>
          </div>
        </div>
      )}

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
                {bodyMode === 'json' && isLikelyJson ? (
                  <code
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                          const jsonStr = JSON.stringify(data, null, 2);
                          return highlightJson(jsonStr);
                        } catch {
                          return String(response.data);
                        }
                      })()
                    }}
                  />
                ) : (
                  <code className="text-gray-900 dark:text-gray-100">
                    {(() => {
                      if (typeof response.data === 'string') return response.data;
                      if (bodyMode === 'text') return String(response.data);
                      return JSON.stringify(response.data);
                    })()}
                  </code>
                )}
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

      {/* Variable Extractor */}
      {showVariableExtractor && (
        <VariableExtractor
          response={response}
          onClose={() => setShowVariableExtractor(false)}
        />
      )}

      {/* Response Time History */}
      {showResponseTimeHistory && (
        <ResponseTimeHistory
          onClose={() => setShowResponseTimeHistory(false)}
          currentUrl={request?.url}
          currentMethod={request?.method}
        />
      )}

      {/* Response Compare */}
      {showCompare && previousResponseRef.current && response && (
        <ResponseCompare
          response1={previousResponseRef.current}
          response2={response}
          onClose={() => {
            setShowCompare(false);
            // Update previous response after closing comparison
            previousResponseRef.current = response;
          }}
        />
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
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
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
              Exit Fullscreen
            </button>
          </div>

          {/* Fullscreen Tabs */}
          <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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

            {activeTab === 'body' && (
              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => setBodyMode('json')}
                  disabled={!isLikelyJson}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'json' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'} ${!isLikelyJson ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isLikelyJson ? 'View as pretty JSON' : 'Response is not JSON'}
                >
                  <Code className="w-3.5 h-3.5" /> JSON
                </button>
                <button
                  onClick={() => setBodyMode('text')}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'text' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text
                </button>
                <button
                  onClick={() => setBodyMode('raw')}
                  className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'raw' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <Terminal className="w-3.5 h-3.5" /> Raw
                </button>
                {contentType.includes('text/html') && (
                  <button
                    onClick={() => setBodyMode('preview')}
                    className={`px-2 py-1.5 text-xs rounded flex items-center gap-1 ${bodyMode === 'preview' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
              </div>
            )}
          </div>

          {resolvedUrl && (
            <div className="px-6 pt-4 bg-gray-50 dark:bg-gray-800">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700" role="note" aria-label="Resolved URL">
                <span className="font-semibold">URL:</span>
                <span className="font-mono font-semibold break-all">{resolvedUrl}</span>
              </div>
            </div>
          )}

          {/* Fullscreen Content */}
          <div className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-black">
            {activeTab === 'body' && (
              <div className="flex flex-col gap-3">
                {bodyMode !== 'preview' ? (
                  <pre className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-4 overflow-auto text-sm font-mono">
                    {bodyMode === 'json' && isLikelyJson ? (
                      <code
                        className="language-json"
                        dangerouslySetInnerHTML={{
                          __html: highlightJson(JSON.stringify(typeof response.data === 'string' ? JSON.parse(response.data) : response.data, null, 2))
                        }}
                      />
                    ) : (
                      <code className="text-gray-900 dark:text-gray-100">
                        {(() => {
                          if (typeof response.data === 'string') return response.data;
                          if (bodyMode === 'text') return String(response.data);
                          return JSON.stringify(response.data);
                        })()}
                      </code>
                    )}
                  </pre>
                ) : (
                  <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
                    <iframe
                      title="response-preview-fullscreen"
                      className="w-full h-full bg-white"
                      sandbox="allow-same-origin"
                      srcDoc={typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Header
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
      )}
    </div>
  );
}
