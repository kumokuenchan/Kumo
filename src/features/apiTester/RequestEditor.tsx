import { useState } from 'react';
import { Send, Plus, Trash2, Save, X } from 'lucide-react';
import { apiTesterApi, type ApiRequest, type ApiResponse } from '../../api/apiTester';
import { apiTesterStorage, type Collection } from '../../services/apiTesterStorage';
import ResponseViewer from './ResponseViewer';

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

  const methods: ApiRequest['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

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
              {request.params && Object.entries(request.params).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateParam(key, e.target.value, value)}
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
              ))}
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
              {request.headers && Object.entries(request.headers).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateHeader(key, e.target.value, value)}
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
              ))}
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
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
                className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono"
              />
            </div>
          )}

          {/* Auth */}
          {activeTab === 'auth' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Add authentication headers in the Headers tab:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Basic Auth: Authorization: Basic &lt;credentials&gt;</li>
                <li>Bearer Token: Authorization: Bearer &lt;token&gt;</li>
                <li>API Key: Add custom header with your API key</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Response Section */}
      <div className="flex-1 overflow-auto">
        <ResponseViewer response={response} />
      </div>

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
