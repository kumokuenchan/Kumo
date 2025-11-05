import { useState } from 'react';
import { Send, Plus, Trash2, Save, X, Copy } from 'lucide-react';
import { apiTesterApi, type ApiRequest, type ApiResponse, type ApiAuth } from '../../api/apiTester';
import { apiTesterStorage, type Collection } from '../../services/apiTesterStorage';
import ResponseViewer from './ResponseViewer';
import Toast from '../../components/Toast';

interface RequestEditorProps {
  request: ApiRequest;
  response: ApiResponse | null;
  onRequestChange: (request: ApiRequest) => void;
  onResponseChange: (response: ApiResponse) => void;
}

type RequestTab = 'params' | 'headers' | 'body' | 'auth';

export default function RequestEditor({
  request,
  response,
  onRequestChange,
  onResponseChange,
}: RequestEditorProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const [isLoading, setIsLoading] = useState(false);
  const [bodyType, setBodyType] = useState<'json' | 'form' | 'raw'>('json');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveRequestName, setSaveRequestName] = useState('');
  const [saveRequestDescription, setSaveRequestDescription] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  // Local editing state to keep key inputs stable while typing
  const [editingParamKeys, setEditingParamKeys] = useState<Record<string, string>>({});
  const [editingHeaderKeys, setEditingHeaderKeys] = useState<Record<string, string>>({});

  const methods: ApiRequest['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // ===== Auth management =====
  const initialAuth: ApiAuth = request.auth || { type: 'none' };
  const [auth, setAuth] = useState<ApiAuth>(initialAuth);

  const applyAuthToRequest = (nextAuth: ApiAuth, base: ApiRequest): ApiRequest => {
    // Create copies to avoid mutation
    let headers: Record<string, string> = { ...(base.headers || {}) };
    let params: Record<string, string> = { ...(base.params || {}) };

    // Clean previous auth artifacts
    // Authorization header
    if (headers['Authorization']) delete headers['Authorization'];
    // Potential API key header from prior state
    if (base.auth?.type === 'apikey' && base.auth.apiKeyName && base.auth.apiKeyIn === 'header') {
      delete headers[base.auth.apiKeyName];
    }
    // Potential API key query param from prior state
    if (base.auth?.type === 'apikey' && base.auth.apiKeyName && base.auth.apiKeyIn === 'query') {
      delete params[base.auth.apiKeyName];
    }

    // Apply new auth
    if (nextAuth.type === 'bearer' && nextAuth.bearerToken) {
      headers['Authorization'] = `Bearer ${nextAuth.bearerToken}`;
    } else if (nextAuth.type === 'basic' && nextAuth.username != null) {
      const raw = `${nextAuth.username}:${nextAuth.password || ''}`;
      try {
        // btoa may not exist in some environments; fallback to raw
        // In Electron/Browser it exists
        // @ts-ignore
        const encoded = typeof btoa !== 'undefined' ? btoa(raw) : raw;
        headers['Authorization'] = `Basic ${encoded}`;
      } catch {
        headers['Authorization'] = `Basic ${raw}`;
      }
    } else if (nextAuth.type === 'apikey' && nextAuth.apiKey && nextAuth.apiKeyName) {
      if (nextAuth.apiKeyIn === 'query') {
        params[nextAuth.apiKeyName] = nextAuth.apiKey;
      } else {
        headers[nextAuth.apiKeyName] = nextAuth.apiKey;
      }
    }

    const updated: ApiRequest = {
      ...base,
      headers: Object.keys(headers).length ? headers : undefined,
      params: Object.keys(params).length ? params : undefined,
      auth: nextAuth,
    };
    return updated;
  };

  // ===== Copy as cURL =====
  const buildCurlCommand = (req: ApiRequest): string => {
    const escape = (s: string) => String(s).replace(/'/g, "'\\''");

    // Build final URL including params
    let urlStr = req.url || '';
    try {
      const u = new URL(urlStr || 'http://localhost');
      const params = req.params || {};
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) u.searchParams.set(k, String(v));
      });
      // If original had no protocol and failed, keep raw
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        urlStr = u.toString();
      } else {
        // For non-absolute, rebuild naive query append
        const qs = new URLSearchParams(req.params || {}).toString();
        urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
      }
    } catch {
      const qs = new URLSearchParams(req.params || {}).toString();
      urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
    }

    // Headers
    const headers = { ...(req.headers || {}) } as Record<string, string>;

    // Body
    let dataFlag = '';
    if (req.body !== undefined && req.body !== null && req.method !== 'GET' && req.method !== 'HEAD') {
      let bodyStr: string;
      if (typeof req.body === 'string') {
        bodyStr = req.body;
      } else if (req.body instanceof Blob) {
        bodyStr = '[binary]';
      } else {
        bodyStr = JSON.stringify(req.body);
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      }
      dataFlag = ` \\\n+  --data-raw '${escape(bodyStr)}'`;
    }

    const headerFlags = Object.entries(headers)
      .map(([k, v]) => ` \\\n+  -H '${escape(k)}: ${escape(v)}'`)
      .join('');

    const methodFlag = req.method && req.method !== 'GET' ? `-X ${req.method} ` : '';

    const curl = `curl ${methodFlag}'${escape(urlStr)}'${headerFlags}${dataFlag}`;
    return curl;
  };

  const copyAsCurl = async () => {
    try {
      const cmd = buildCurlCommand(request);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cmd);
      } else {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setToast({ message: 'Copied as cURL', type: 'success' });
    } catch (err: any) {
      console.error('Copy as cURL failed:', err);
      setToast({ message: 'Failed to copy cURL', type: 'error' });
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      const res = await apiTesterApi.executeRequest(request);
      onResponseChange(res);

      // Save to history
      apiTesterStorage.addToHistory(request, res);
    } catch (error: any) {
      console.error('Request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMethod = (method: ApiRequest['method']) => {
    onRequestChange({ ...request, method });
  };

  const updateUrl = (url: string) => {
    onRequestChange({ ...request, url });
  };

  const addParam = () => {
    onRequestChange({
      ...request,
      params: { ...request.params, '': '' },
    });
  };

  const updateParam = (oldKey: string, newKey: string, value: string) => {
    const params = { ...request.params };
    delete params[oldKey];
    if (newKey) params[newKey] = value;
    onRequestChange({ ...request, params });
  };

  const removeParam = (key: string) => {
    const params = { ...request.params };
    delete params[key];
    onRequestChange({ ...request, params });
  };

  const addHeader = () => {
    onRequestChange({
      ...request,
      headers: { ...request.headers, '': '' },
    });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...request.headers };
    delete headers[oldKey];
    if (newKey) headers[newKey] = value;
    onRequestChange({ ...request, headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...request.headers };
    delete headers[key];
    onRequestChange({ ...request, headers });
  };

  const updateBody = (body: any) => {
    onRequestChange({ ...request, body });
  };

  // Auto-beautify JSON on paste in body textarea when JSON mode is active
  const handleJsonPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (bodyType !== 'json') return;
    try {
      const text = e.clipboardData.getData('text');
      if (!text) return;
      const parsed = JSON.parse(text);
      e.preventDefault();
      // Store as object so the textarea renders pretty JSON via JSON.stringify with spacing
      updateBody(parsed);
    } catch {
      // If not valid JSON, allow normal paste
    }
  };

  const openSaveDialog = () => {
    const allCollections = apiTesterStorage.getCollections();
    setCollections(allCollections);

    // Pre-fill request name from URL if available
    if (request.url) {
      try {
        const url = new URL(request.url);
        setSaveRequestName(`${request.method} ${url.pathname}`);
      } catch {
        setSaveRequestName(`${request.method} Request`);
      }
    }

    setShowSaveDialog(true);
  };

  const handleSaveToCollection = () => {
    let collectionId = selectedCollectionId;

    // Create new collection if needed
    if (isCreatingNewCollection && newCollectionName.trim()) {
      const newCollection = apiTesterStorage.createCollection(newCollectionName);
      collectionId = newCollection.id;
    }

    if (collectionId && saveRequestName.trim()) {
      apiTesterStorage.addRequestToCollection(
        collectionId,
        saveRequestName,
        request,
        saveRequestDescription || undefined
      );

      // Reset dialog state
      setShowSaveDialog(false);
      setSaveRequestName('');
      setSaveRequestDescription('');
      setSelectedCollectionId('');
      setNewCollectionName('');
      setIsCreatingNewCollection(false);
    }
  };

  const closeSaveDialog = () => {
    setShowSaveDialog(false);
    setSaveRequestName('');
    setSaveRequestDescription('');
    setSelectedCollectionId('');
    setNewCollectionName('');
    setIsCreatingNewCollection(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Request Section */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
        {/* Method & URL */}
        <div className="flex gap-2 mb-4">
          <select
            value={request.method}
            onChange={(e) => updateMethod(e.target.value as ApiRequest['method'])}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={request.url}
            onChange={(e) => updateUrl(e.target.value)}
            placeholder="Enter request URL (e.g., https://api.example.com/users)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />

          <button
            onClick={openSaveDialog}
            disabled={!request.url}
            className="px-4 py-2 bg-gray-600 dark:bg-slate-600 text-white rounded hover:bg-gray-700 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            title="Save to collection"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          <button
            onClick={copyAsCurl}
            disabled={!request.url}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            title="Copy as cURL"
          >
            <Copy className="w-4 h-4" />
            Copy as cURL
          </button>

          <button
            onClick={handleExecute}
            disabled={isLoading || !request.url}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>

        {/* Request Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
          {(['params', 'headers', 'body', 'auth'] as RequestTab[]).map((tab) => (
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
              {tab === 'params' && request.params && Object.keys(request.params).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  {Object.keys(request.params).length}
                </span>
              )}
              {tab === 'headers' && request.headers && Object.keys(request.headers).length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  {Object.keys(request.headers).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* Query Params */}
          {activeTab === 'params' && (
            <div className="space-y-2">
              {request.params && Object.entries(request.params).map(([key, value], idx) => {
                const displayKey = Object.prototype.hasOwnProperty.call(editingParamKeys, key)
                  ? editingParamKeys[key]
                  : key;
                const commitKey = () => {
                  const newKey = (Object.prototype.hasOwnProperty.call(editingParamKeys, key) ? editingParamKeys[key] : key) || '';
                  if (newKey !== key) {
                    updateParam(key, newKey, value);
                  }
                  setEditingParamKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                const cancelEdit = () => {
                  setEditingParamKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                return (
                  <div key={`${key}_${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={displayKey}
                      onChange={(e) =>
                        setEditingParamKeys(prev => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={commitKey}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitKey();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="Key"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateParam(key, key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <button
                      onClick={() => removeParam(key)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addParam}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Plus className="w-4 h-4" />
                Add Parameter
              </button>
            </div>
          )}

          {/* Headers */}
          {activeTab === 'headers' && (
            <div className="space-y-2">
              {request.headers && Object.entries(request.headers).map(([key, value], idx) => {
                const displayKey = Object.prototype.hasOwnProperty.call(editingHeaderKeys, key)
                  ? editingHeaderKeys[key]
                  : key;
                const commitKey = () => {
                  const newKey = (Object.prototype.hasOwnProperty.call(editingHeaderKeys, key) ? editingHeaderKeys[key] : key) || '';
                  if (newKey !== key) {
                    updateHeader(key, newKey, value);
                  }
                  setEditingHeaderKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                const cancelEdit = () => {
                  setEditingHeaderKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                return (
                  <div key={`${key}_${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={displayKey}
                      onChange={(e) =>
                        setEditingHeaderKeys(prev => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={commitKey}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitKey();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="Header"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addHeader}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Plus className="w-4 h-4" />
                Add Header
              </button>
            </div>
          )}

          {/* Body */}
          {activeTab === 'body' && (
            <div>
              <div className="flex gap-2 mb-2">
                {(['json', 'form', 'raw'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBodyType(type)}
                    className={`px-3 py-1 text-sm rounded ${
                      bodyType === type
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                value={
                  typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body || {}, null, 2)
                }
                onChange={(e) => {
                  try {
                    if (bodyType === 'json') {
                      updateBody(JSON.parse(e.target.value));
                    } else {
                      updateBody(e.target.value);
                    }
                  } catch {
                    updateBody(e.target.value);
                  }
                }}
                onPaste={handleJsonPaste}
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
                className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono"
              />
            </div>
          )}

          {/* Auth */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              {/* Type selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auth Type</label>
                <select
                  value={auth.type}
                  onChange={(e) => {
                    const type = e.target.value as ApiAuth['type'];
                    const next: ApiAuth = type === 'none' ? { type } : { type, apiKeyIn: 'header' } as ApiAuth;
                    setAuth(next);
                    onRequestChange(applyAuthToRequest(next, request));
                  }}
                  className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>

              {/* Bearer */}
              {auth.type === 'bearer' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Token</label>
                  <input
                    type="text"
                    value={auth.bearerToken || ''}
                    onChange={(e) => {
                      const next = { ...auth, bearerToken: e.target.value } as ApiAuth;
                      setAuth(next);
                      onRequestChange(applyAuthToRequest(next, request));
                    }}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              )}

              {/* Basic */}
              {auth.type === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input
                      type="text"
                      value={auth.username || ''}
                      onChange={(e) => {
                        const next = { ...auth, username: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <input
                      type="password"
                      value={auth.password || ''}
                      onChange={(e) => {
                        const next = { ...auth, password: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* API Key */}
              {auth.type === 'apikey' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Key Name</label>
                    <input
                      type="text"
                      value={auth.apiKeyName || ''}
                      onChange={(e) => {
                        const next = { ...auth, apiKeyName: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      placeholder="e.g., X-API-Key"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                    <input
                      type="text"
                      value={auth.apiKey || ''}
                      onChange={(e) => {
                        const next = { ...auth, apiKey: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add To</label>
                    <select
                      value={auth.apiKeyIn || 'header'}
                      onChange={(e) => {
                        const next = { ...auth, apiKeyIn: e.target.value as 'header' | 'query' } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="header">Header</option>
                      <option value="query">Query Params</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <div className="font-medium mb-1">Applied Auth Preview</div>
                <pre className="bg-gray-50 dark:bg-slate-900 p-2 rounded overflow-auto">
{JSON.stringify({
  headers: request.headers || {},
  params: request.params || {},
}, null, 2)}
                </pre>
                <div className="mt-2 text-gray-500 dark:text-gray-400">Edit headers or params directly in their tabs to override.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response Section */}
      <div className="flex-1 overflow-auto">
        <ResponseViewer response={response} />
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Save to Collection Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Save to Collection
              </h3>
              <button
                onClick={closeSaveDialog}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-4 space-y-4">
              {/* Request Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Request Name *
                </label>
                <input
                  type="text"
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  placeholder="e.g., Get User Profile"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Request Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={saveRequestDescription}
                  onChange={(e) => setSaveRequestDescription(e.target.value)}
                  placeholder="Add a description for this request"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Collection Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection *
                </label>

                {!isCreatingNewCollection ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a collection...</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name} ({collection.requests.length} {collection.requests.length === 1 ? 'request' : 'requests'})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsCreatingNewCollection(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Collection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        setIsCreatingNewCollection(false);
                        setNewCollectionName('');
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      ← Back to existing collections
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={closeSaveDialog}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToCollection}
                disabled={
                  !saveRequestName.trim() ||
                  (!selectedCollectionId && (!isCreatingNewCollection || !newCollectionName.trim()))
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                Save Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
