import { useState } from 'react';
import { RefreshCw, Server, Activity, Package, Settings, FileText, AlertTriangle, Download, Copy, ExternalLink, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Application {
  applicationName: string;
  applicationArn: string;
  description?: string;
  dateCreated: string;
  dateUpdated: string;
  versions: string[];
  configurations: string[];
  resourceLifecycleConfig?: {
    serviceRole: string;
    versionLifecycleConfig?: {
      maxCountRule?: {
        enabled: boolean;
        maxCount: number;
        deleteSourceFromS3: boolean;
      };
      maxAgeRule?: {
        enabled: boolean;
        maxAgeInDays: number;
        deleteSourceFromS3: boolean;
      };
    };
  };
}

interface Environment {
  environmentName: string;
  environmentId: string;
  applicationName: string;
  versionLabel?: string;
  solutionStackName?: string;
  platformArn?: string;
  cname?: string;
  dateCreated: string;
  dateUpdated: string;
  status: 'Launching' | 'Updating' | 'Ready' | 'Terminating' | 'Terminated';
  health: 'Green' | 'Yellow' | 'Red' | 'Grey';
  healthStatus: 'Ok' | 'Info' | 'Warning' | 'Degraded' | 'Severe' | 'Unknown';
  tier: {
    name: string;
    type: string;
    version: string;
  };
  environmentLinks?: EnvironmentLink[];
}

interface EnvironmentLink {
  linkName: string;
  environmentName: string;
}

interface Deployment {
  versionLabel: string;
  deploymentId: number;
  status: 'Successful' | 'Failed';
  deploymentDate: string;
  deploymentTime: string;
}

interface EnvironmentVariable {
  key: string;
  value: string;
  secured?: boolean;
}

interface LogEvent {
  timestamp: number;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function ElasticBeanstalkManager() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Elastic Beanstalk Data
  const [applications, setApplications] = useState<Application[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  
  // Selections
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'applications' | 'environments' | 'health' | 'deployments' | 'variables' | 'logs'>('applications');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchApplications = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/elasticbeanstalk/applications', {
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
        throw new Error(error.message || 'Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
      showToast(`Found ${data.applications?.length || 0} applications`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch applications', 'error');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironments = async (applicationName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/elasticbeanstalk/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          applicationName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch environments');
      }

      const data = await response.json();
      setEnvironments(data.environments || []);
      showToast(`Found ${data.environments?.length || 0} environments in ${applicationName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch environments', 'error');
      setEnvironments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployments = async (environmentName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/elasticbeanstalk/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          environmentName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch deployments');
      }

      const data = await response.json();
      setDeployments(data.deployments || []);
      showToast(`Found ${data.deployments?.length || 0} deployments for ${environmentName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch deployments', 'error');
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironmentVariables = async (environmentName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/elasticbeanstalk/environment-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          environmentName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch environment variables');
      }

      const data = await response.json();
      setEnvironmentVariables(data.variables || []);
      showToast(`Fetched ${data.variables?.length || 0} environment variables for ${environmentName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch environment variables', 'error');
      setEnvironmentVariables([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (environmentName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/elasticbeanstalk/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          environmentName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      showToast(`Fetched logs for ${environmentName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch logs', 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSelect = (application: Application) => {
    setSelectedApplication(application);
    setSelectedEnvironment(null);
    fetchEnvironments(application.applicationName);
  };

  const handleEnvironmentSelect = (environment: Environment) => {
    setSelectedEnvironment(environment);
    fetchDeployments(environment.environmentName);
    fetchEnvironmentVariables(environment.environmentName);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openEnvironmentConsole = (environmentId: string) => {
    window.open(`https://${region}.console.aws.amazon.com/elasticbeanstalk/home?region=${region}#/environment/dashboard?applicationName=${selectedApplication?.applicationName}&environmentId=${environmentId}`, '_blank');
  };

  // Filter applications based on search query
  const filteredApplications = applications.filter(app => 
    app.applicationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        {/* Sidebar - AWS Credentials and Application List */}
        <div className="w-80 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-3 mb-4">
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

            <button
              onClick={fetchApplications}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Applications'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            <div className="mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="w-full px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>

            {filteredApplications.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading applications...' : 'No applications found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredApplications.map((application) => (
                  <div
                    key={application.applicationArn}
                    className={`bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs cursor-pointer ${
                      selectedApplication?.applicationName === application.applicationName
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleApplicationSelect(application)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {application.applicationName}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {application.environments?.length || 0} environments
                        </div>
                      </div>
                    </div>
                    {application.description && (
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {application.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedApplication ? (
            <>
              {/* Environment Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {selectedApplication.applicationName}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Environments: {environments.length}</span>
                      <span>Created: {new Date(selectedApplication.dateCreated).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('applications')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'applications'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Applications
                  </button>
                  <button
                    onClick={() => setActiveView('environments')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'environments'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Environments ({environments.length})
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEnvironment) {
                        setActiveView('health');
                      }
                    }}
                    disabled={!selectedEnvironment}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'health'
                        ? 'bg-blue-600 text-white'
                        : selectedEnvironment
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Health
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEnvironment) {
                        setActiveView('deployments');
                        fetchDeployments(selectedEnvironment.environmentName);
                      }
                    }}
                    disabled={!selectedEnvironment}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'deployments'
                        ? 'bg-blue-600 text-white'
                        : selectedEnvironment
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Deployments
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEnvironment) {
                        setActiveView('variables');
                        fetchEnvironmentVariables(selectedEnvironment.environmentName);
                      }
                    }}
                    disabled={!selectedEnvironment}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'variables'
                        ? 'bg-blue-600 text-white'
                        : selectedEnvironment
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Variables
                  </button>
                  <button
                    onClick={() => {
                      if (selectedEnvironment) {
                        setActiveView('logs');
                        fetchLogs(selectedEnvironment.environmentName);
                      }
                    }}
                    disabled={!selectedEnvironment}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'logs'
                        ? 'bg-blue-600 text-white'
                        : selectedEnvironment
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Logs
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'applications' && (
                  <div>
                    <h3 className="font-semibold mb-3">Application Details</h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Application Name:</span>
                          <div className="mt-1 font-medium">{selectedApplication.applicationName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Application ARN:</span>
                          <div className="mt-1 font-mono text-sm break-all">{selectedApplication.applicationArn}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <div className="mt-1">{new Date(selectedApplication.dateCreated).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                          <div className="mt-1">{new Date(selectedApplication.dateUpdated).toLocaleString()}</div>
                        </div>
                      </div>
                      {selectedApplication.description && (
                        <div className="mt-4">
                          <span className="text-gray-600 dark:text-gray-400">Description:</span>
                          <p className="mt-1">{selectedApplication.description}</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <span className="text-gray-600 dark:text-gray-400">Versions:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedApplication.versions.slice(0, 5).map((version, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {version}
                            </span>
                          ))}
                          {selectedApplication.versions.length > 5 && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400">
                              +{selectedApplication.versions.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'environments' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Environments ({environments.length})
                    </h3>
                    {environments.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading environments...' : 'No environments found in this application'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {environments.map(environment => (
                          <div
                            key={environment.environmentId}
                            className={`bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 cursor-pointer ${
                              selectedEnvironment?.environmentId === environment.environmentId
                                ? 'ring-2 ring-blue-500'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                            }`}
                            onClick={() => handleEnvironmentSelect(environment)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Server className="w-4 h-4" />
                                  {environment.environmentName}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{environment.applicationName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  environment.health === 'Green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                  environment.health === 'Yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                  environment.health === 'Red' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                  'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                                }`}>
                                  {environment.health}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEnvironmentConsole(environment.environmentId);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                  title="Open in AWS Console"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className="ml-2">{environment.status}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Health Status:</span>
                                <span className="ml-2">{environment.healthStatus}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                                <span className="ml-2 text-xs truncate">{environment.platformArn?.split('/').pop()}</span>
                              </div>
                            </div>
                            {environment.versionLabel && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <span className="ml-2 font-mono">{environment.versionLabel}</span>
                              </div>
                            )}
                            {environment.cname && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">CNAME:</span>
                                <span className="ml-2 font-mono">{environment.cname}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'health' && selectedEnvironment && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Environment Health: {selectedEnvironment.environmentName}
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${
                            selectedEnvironment.health === 'Green' ? 'text-green-600' :
                            selectedEnvironment.health === 'Yellow' ? 'text-yellow-600' :
                            selectedEnvironment.health === 'Red' ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {selectedEnvironment.health}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Health Status</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${
                            selectedEnvironment.healthStatus === 'Ok' ? 'text-green-600' :
                            selectedEnvironment.healthStatus === 'Warning' ? 'text-yellow-600' :
                            selectedEnvironment.healthStatus === 'Severe' ? 'text-red-600' :
                            selectedEnvironment.healthStatus === 'Degraded' ? 'text-orange-600' :
                            'text-gray-500'
                          }`}>
                            {selectedEnvironment.healthStatus}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Health Status</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">{environments.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Environments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">{selectedApplication.versions.length}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Application Versions</div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Environment Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Environment Name:</span>
                            <div className="mt-1">{selectedEnvironment.environmentName}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Environment ID:</span>
                            <div className="mt-1 font-mono text-sm break-all">{selectedEnvironment.environmentId}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Application:</span>
                            <div className="mt-1">{selectedEnvironment.applicationName}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <div className="mt-1">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                selectedEnvironment.status === 'Ready' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                selectedEnvironment.status === 'Updating' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                selectedEnvironment.status === 'Launching' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                selectedEnvironment.status === 'Terminating' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                              }`}>
                                {selectedEnvironment.status}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                            <div className="mt-1">{selectedEnvironment.platformArn?.split('/').slice(0, 3).join('/')}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Solution Stack:</span>
                            <div className="mt-1">{selectedEnvironment.solutionStackName?.split(' ').slice(0, 3).join(' ')}</div>
                          </div>
                        </div>
                      </div>

                      {selectedEnvironment.environmentLinks && selectedEnvironment.environmentLinks.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3">Environment Links</h4>
                          <div className="space-y-2">
                            {selectedEnvironment.environmentLinks.map((link, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 border dark:border-slate-700 rounded">
                                <span>{link.linkName}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{link.environmentName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'deployments' && selectedEnvironment && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" />
                        Deployment History: {selectedEnvironment.environmentName}
                      </h3>
                      <button
                        onClick={() => fetchDeployments(selectedEnvironment.environmentName)}
                        disabled={loading}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    {deployments.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading deployments...' : 'No deployment history found for this environment'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deployments.map((deployment, idx) => (
                          <div
                            key={deployment.deploymentId}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-semibold">Deployment #{deployment.deploymentId}</div>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                deployment.status === 'Successful' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {deployment.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <span className="ml-2 font-mono">{deployment.versionLabel}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                <span className="ml-2">{new Date(deployment.deploymentDate).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'variables' && selectedEnvironment && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Environment Variables: {selectedEnvironment.environmentName}
                      </h3>
                      <button
                        onClick={() => fetchEnvironmentVariables(selectedEnvironment.environmentName)}
                        disabled={loading}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    {environmentVariables.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading variables...' : 'No environment variables found for this environment'}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-hidden">
                        <div className="overflow-auto max-h-96">
                          <table className="min-w-full divide-y dark:divide-slate-700">
                            <thead className="bg-gray-50 dark:bg-slate-800">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                              {environmentVariables.map((variable, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-900'}>
                                  <td className="px-4 py-2 text-sm font-mono">{variable.key}</td>
                                  <td className="px-4 py-2 text-sm font-mono">
                                    {variable.secured ? '••••••••' : variable.value}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    <button
                                      onClick={() => copyToClipboard(variable.value, `Variable ${variable.key}`)}
                                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                      <Copy className="w-3 h-3" />
                                      Copy
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'logs' && selectedEnvironment && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Logs: {selectedEnvironment.environmentName}
                      </h3>
                      <button
                        onClick={() => fetchLogs(selectedEnvironment.environmentName)}
                        disabled={loading}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    {logs.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading logs...' : 'No logs found for this environment'}
                      </div>
                    ) : (
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                        {logs.map((log, idx) => (
                          <div key={idx} className="mb-1 last:mb-0">
                            <span className={`mr-3 ${
                              log.level === 'ERROR' ? 'text-red-400' :
                              log.level === 'WARN' ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span>{log.message}</span>
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
              Select an application from the sidebar to view environments
            </div>
          )}
        </div>
      </div>
    </>
  );
}