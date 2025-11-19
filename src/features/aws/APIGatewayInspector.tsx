import { useState } from 'react';
import { RefreshCw, Globe, Key, Settings, Activity, Copy, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface RestAPI {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  apiKeySource?: string;
  endpointConfiguration?: {
    types: string[];
  };
}

interface HttpAPI {
  apiId: string;
  name: string;
  description?: string;
  createdDate: string;
  apiEndpoint: string;
  protocolType: string;
}

interface Stage {
  stageName: string;
  deploymentId?: string;
  description?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  cacheClusterEnabled?: boolean;
  cacheClusterSize?: string;
  throttleSettings?: {
    burstLimit?: number;
    rateLimit?: number;
  };
  variables?: Record<string, string>;
}

interface Deployment {
  id: string;
  description?: string;
  createdDate: string;
}

interface APIKey {
  id: string;
  name?: string;
  value?: string;
  description?: string;
  enabled: boolean;
  createdDate: string;
  lastUpdatedDate?: string;
  stageKeys?: string[];
}

interface UsagePlan {
  id: string;
  name: string;
  description?: string;
  apiStages?: Array<{
    apiId: string;
    stage: string;
    throttle?: Record<string, any>;
  }>;
  throttle?: {
    burstLimit?: number;
    rateLimit?: number;
  };
  quota?: {
    limit?: number;
    period?: string;
    offset?: number;
  };
}

interface LogEvent {
  timestamp: number;
  message: string;
  requestId?: string;
  status?: number;
  method?: string;
  path?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function APIGatewayInspector() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [apiType, setApiType] = useState<'rest' | 'http'>('rest');

  // REST APIs
  const [restApis, setRestApis] = useState<RestAPI[]>([]);
  const [selectedRestApi, setSelectedRestApi] = useState<RestAPI | null>(null);

  // HTTP APIs
  const [httpApis, setHttpApis] = useState<HttpAPI[]>([]);
  const [selectedHttpApi, setSelectedHttpApi] = useState<HttpAPI | null>(null);

  // Stages & Deployments
  const [stages, setStages] = useState<Stage[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  // API Keys & Usage Plans
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [usagePlans, setUsagePlans] = useState<UsagePlan[]>([]);
  const [showApiKeyValues, setShowApiKeyValues] = useState<Record<string, boolean>>({});

  // Logs
  const [logs, setLogs] = useState<LogEvent[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'stages' | 'keys' | 'usage' | 'logs'>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchRestAPIs = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/rest-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch REST APIs');
      }

      const data = await response.json();
      setRestApis(data.apis || []);
      showToast(`Found ${data.apis?.length || 0} REST APIs`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch REST APIs', 'error');
      setRestApis([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHttpAPIs = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/http-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch HTTP APIs');
      }

      const data = await response.json();
      setHttpApis(data.apis || []);
      showToast(`Found ${data.apis?.length || 0} HTTP APIs`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch HTTP APIs', 'error');
      setHttpApis([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async (apiId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          apiId,
          apiType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch stages');
      }

      const data = await response.json();
      setStages(data.stages || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch stages', 'error');
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployments = async (apiId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          apiId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch deployments');
      }

      const data = await response.json();
      setDeployments(data.deployments || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch deployments', 'error');
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch API keys', 'error');
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsagePlans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/usage-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch usage plans');
      }

      const data = await response.json();
      setUsagePlans(data.plans || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch usage plans', 'error');
      setUsagePlans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (apiId: string, stageName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/aws/apigateway/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          apiId,
          stageName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch logs', 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestApiSelect = (api: RestAPI) => {
    setSelectedRestApi(api);
    setSelectedHttpApi(null);
    fetchStages(api.id);
    fetchDeployments(api.id);
  };

  const handleHttpApiSelect = (api: HttpAPI) => {
    setSelectedHttpApi(api);
    setSelectedRestApi(null);
    fetchStages(api.apiId);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedApi = selectedRestApi || selectedHttpApi;
  const selectedApiId = selectedRestApi?.id || selectedHttpApi?.apiId;

  return (
    <>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="h-full flex">
        {/* Sidebar - API List */}
        <div className="w-80 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-2 mb-3">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Access Key ID</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Access Key</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setApiType('rest')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  apiType === 'rest'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                REST API
              </button>
              <button
                onClick={() => setApiType('http')}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                  apiType === 'http'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                HTTP API
              </button>
            </div>

            <button
              onClick={apiType === 'rest' ? fetchRestAPIs : fetchHttpAPIs}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load APIs'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {apiType === 'rest' ? (
              restApis.length === 0 ? (
                <div className="text-xs text-gray-500 text-center mt-4">
                  No REST APIs loaded
                </div>
              ) : (
                <div className="space-y-1">
                  {restApis.map((api) => (
                    <button
                      key={api.id}
                      onClick={() => handleRestApiSelect(api)}
                      className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                        selectedRestApi?.id === api.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{api.name}</div>
                          {api.description && (
                            <div className="text-[10px] text-gray-500 truncate">{api.description}</div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(api.createdDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              httpApis.length === 0 ? (
                <div className="text-xs text-gray-500 text-center mt-4">
                  No HTTP APIs loaded
                </div>
              ) : (
                <div className="space-y-1">
                  {httpApis.map((api) => (
                    <button
                      key={api.apiId}
                      onClick={() => handleHttpApiSelect(api)}
                      className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                        selectedHttpApi?.apiId === api.apiId
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{api.name}</div>
                          {api.description && (
                            <div className="text-[10px] text-gray-500 truncate">{api.description}</div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(api.createdDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedApi ? (
            <>
              {/* API Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      {selectedApi.name}
                    </h2>
                    {selectedApi.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedApi.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>ID: {selectedApiId}</span>
                      <span>Created: {new Date(selectedApi.createdDate).toLocaleString()}</span>
                      {selectedHttpApi && (
                        <button
                          onClick={() => copyToClipboard(selectedHttpApi.apiEndpoint, 'Endpoint')}
                          className="flex items-center gap-1 hover:text-blue-600"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {selectedHttpApi.apiEndpoint}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('overview')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'overview'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveView('stages')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'stages'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Stages & Deployments
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('keys');
                      fetchAPIKeys();
                    }}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'keys'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    API Keys
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('usage');
                      fetchUsagePlans();
                    }}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'usage'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Usage Plans
                  </button>
                  <button
                    onClick={() => setActiveView('logs')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'logs'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Logs
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'overview' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">API Details</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">API Type:</span>
                          <span className="ml-2 font-medium">{apiType.toUpperCase()}</span>
                        </div>
                        {selectedRestApi && selectedRestApi.apiKeySource && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">API Key Source:</span>
                            <span className="ml-2 font-medium">{selectedRestApi.apiKeySource}</span>
                          </div>
                        )}
                        {selectedRestApi && selectedRestApi.endpointConfiguration && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Endpoint Type:</span>
                            <span className="ml-2 font-medium">
                              {selectedRestApi.endpointConfiguration.types.join(', ')}
                            </span>
                          </div>
                        )}
                        {selectedHttpApi && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Protocol:</span>
                            <span className="ml-2 font-medium">{selectedHttpApi.protocolType}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Quick Stats</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{stages.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Stages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{deployments.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Deployments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{apiKeys.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">API Keys</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'stages' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Stages ({stages.length})</h3>
                      {stages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No stages found</div>
                      ) : (
                        <div className="space-y-2">
                          {stages.map((stage) => (
                            <div
                              key={stage.stageName}
                              className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden"
                            >
                              <div
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                                onClick={() => toggleSection(`stage-${stage.stageName}`)}
                              >
                                <div className="flex items-center gap-2">
                                  {expandedSections[`stage-${stage.stageName}`] ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                  <span className="font-semibold">{stage.stageName}</span>
                                  {stage.description && (
                                    <span className="text-sm text-gray-500">- {stage.description}</span>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedApiId) {
                                      fetchLogs(selectedApiId, stage.stageName);
                                      setActiveView('logs');
                                    }
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                >
                                  View Logs
                                </button>
                              </div>
                              {expandedSections[`stage-${stage.stageName}`] && (
                                <div className="px-4 py-3 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    {stage.deploymentId && (
                                      <div>
                                        <span className="text-gray-600 dark:text-gray-400">Deployment:</span>
                                        <span className="ml-2 font-mono text-xs">{stage.deploymentId}</span>
                                      </div>
                                    )}
                                    {stage.cacheClusterEnabled !== undefined && (
                                      <div>
                                        <span className="text-gray-600 dark:text-gray-400">Cache:</span>
                                        <span className="ml-2">
                                          {stage.cacheClusterEnabled ? `Enabled (${stage.cacheClusterSize})` : 'Disabled'}
                                        </span>
                                      </div>
                                    )}
                                    {stage.throttleSettings && (
                                      <>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Rate Limit:</span>
                                          <span className="ml-2">{stage.throttleSettings.rateLimit} req/sec</span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600 dark:text-gray-400">Burst Limit:</span>
                                          <span className="ml-2">{stage.throttleSettings.burstLimit} req</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {stage.variables && Object.keys(stage.variables).length > 0 && (
                                    <div className="mt-3">
                                      <div className="text-sm font-semibold mb-2">Stage Variables</div>
                                      <div className="bg-white dark:bg-slate-800 rounded p-2">
                                        <JsonView value={stage.variables} collapsed={1} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Deployments ({deployments.length})</h3>
                      {deployments.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No deployments found</div>
                      ) : (
                        <div className="space-y-2">
                          {deployments.map((deployment) => (
                            <div
                              key={deployment.id}
                              className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 px-4 py-3"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-mono text-sm">{deployment.id}</div>
                                  {deployment.description && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">{deployment.description}</div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(deployment.createdDate).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'keys' && (
                  <div>
                    <h3 className="font-semibold mb-3">API Keys ({apiKeys.length})</h3>
                    {apiKeys.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading API keys...' : 'No API keys found'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {apiKeys.map((key) => (
                          <div
                            key={key.id}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 px-4 py-3"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Key className="w-4 h-4" />
                                  <span className="font-semibold">{key.name || key.id}</span>
                                  <span className={`px-2 py-0.5 text-xs rounded ${
                                    key.enabled
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {key.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                {key.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{key.description}</p>
                                )}
                              </div>
                            </div>
                            {key.value && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 rounded border dark:border-slate-600 font-mono text-sm">
                                  {showApiKeyValues[key.id] ? key.value : '••••••••••••••••••••••••••••••••'}
                                </div>
                                <button
                                  onClick={() => setShowApiKeyValues(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                  title={showApiKeyValues[key.id] ? 'Hide' : 'Show'}
                                >
                                  {showApiKeyValues[key.id] ? '👁️' : '🔒'}
                                </button>
                                <button
                                  onClick={() => key.value && copyToClipboard(key.value, 'API Key')}
                                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                  title="Copy"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Created: {new Date(key.createdDate).toLocaleString()}
                              {key.lastUpdatedDate && ` • Updated: ${new Date(key.lastUpdatedDate).toLocaleString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'usage' && (
                  <div>
                    <h3 className="font-semibold mb-3">Usage Plans ({usagePlans.length})</h3>
                    {usagePlans.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading usage plans...' : 'No usage plans found'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {usagePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 px-4 py-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-4 h-4" />
                              <span className="font-semibold">{plan.name}</span>
                            </div>
                            {plan.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{plan.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {plan.throttle && (
                                <>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Rate Limit:</span>
                                    <span className="ml-2 font-medium">{plan.throttle.rateLimit} req/sec</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Burst Limit:</span>
                                    <span className="ml-2 font-medium">{plan.throttle.burstLimit} req</span>
                                  </div>
                                </>
                              )}
                              {plan.quota && (
                                <>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Quota Limit:</span>
                                    <span className="ml-2 font-medium">{plan.quota.limit} requests</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Quota Period:</span>
                                    <span className="ml-2 font-medium">{plan.quota.period}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {plan.apiStages && plan.apiStages.length > 0 && (
                              <div className="mt-3">
                                <div className="text-sm font-semibold mb-2">Associated APIs</div>
                                <div className="space-y-1">
                                  {plan.apiStages.map((stage, idx) => (
                                    <div key={idx} className="text-xs bg-gray-50 dark:bg-slate-900 px-2 py-1 rounded">
                                      {stage.apiId} - {stage.stage}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'logs' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Request/Response Logs</h3>
                      {selectedStage && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Stage: {selectedStage.stageName}
                        </span>
                      )}
                    </div>
                    {logs.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading logs...' : 'Select a stage from the Stages tab to view logs'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 px-4 py-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                {log.method && (
                                  <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                                    log.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                    log.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    log.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                    log.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                    'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                                  }`}>
                                    {log.method}
                                  </span>
                                )}
                                {log.path && <span className="font-mono text-sm">{log.path}</span>}
                                {log.status && (
                                  <span className={`px-2 py-0.5 text-xs rounded ${
                                    log.status >= 200 && log.status < 300 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    log.status >= 400 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                    'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                                  }`}>
                                    {log.status}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {log.requestId && (
                              <div className="text-xs text-gray-500 mb-1">Request ID: {log.requestId}</div>
                            )}
                            <div className="text-sm bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded font-mono">
                              {log.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an API from the sidebar to view details
            </div>
          )}
        </div>
      </div>
    </>
  );
}
