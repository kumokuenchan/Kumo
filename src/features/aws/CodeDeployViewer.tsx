import { useState } from 'react';
import { RefreshCw, Package, Server, Clock, Activity, Settings, FileText, AlertTriangle, Copy, ExternalLink, ChevronRight, ChevronDown, RotateCcw, BarChart3 } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Application {
  applicationId: string;
  applicationName: string;
  computePlatform: string;
  createTime: string;
  linkedToGitHub: boolean;
  gitHubAccountName?: string;
}

interface DeploymentGroup {
  deploymentGroupId: string;
  deploymentGroupName: string;
  applicationName: string;
  deploymentConfigName: string;
  serviceRoleArn: string;
  targetRevision?: string;
  ec2TagFilters?: Array<{
    Key?: string;
    Value?: string;
    Type?: string;
  }>;
  onPremisesInstanceTagFilters?: Array<{
    Key?: string;
    Value?: string;
    Type?: string;
  }>;
  autoScalingGroups?: Array<{
    name: string;
    region: string;
  }>;
  deploymentStyle?: {
    deploymentType: string;
    deploymentOption: string;
  };
  triggerConfigurations?: Array<{
    triggerName: string;
    triggerTargetArn: string;
    triggerEvents: string[];
  }>;
  alarmConfiguration?: {
    enabled: boolean;
    ignorePollAlarmFailure: boolean;
    alarms: Array<{
      name: string;
    }>;
  };
  autoRollbackConfiguration?: {
    enabled: boolean;
    events: string[];
  };
  deploymentStatus: string;
  lastDeploymentInfo?: {
    description: string;
    deploymentGroups: string[];
    errorInformation: {
      code: string;
      message: string;
    };
    status: string;
    startTime: string;
    completeTime: string;
  };
}

interface Deployment {
  deploymentId: string;
  applicationName: string;
  deploymentGroupName: string;
  deploymentConfigName: string;
  deploymentStatus: string;
  statusMessage?: string;
  createTime: string;
  completeTime?: string;
  creator: 'user' | 'autoscaling' | 'cloudFormation';
  computePlatform: string;
  externalId?: string;
  relatedDeployments?: any;
  revision: {
    revisionType: string;
    s3Location?: {
      bucket: string;
      key: string;
      bundleType: string;
      version?: string;
      eTag?: string;
    };
    gitHubLocation?: {
      repository: string;
      commitId: string;
    };
    string?: {
      content: string;
      sha256: string;
    };
  };
  deploymentOverview: {
    Pending: number;
    InProgress: number;
    Succeeded: number;
    Failed: number;
    Skipped: number;
    Ready: number;
  };
}

interface DeploymentInstance {
  instanceId: string;
  status: string;
  lastUpdatedAt?: string;
  lifecycleEvents?: Array<{
    lifecycleEventName: string;
    startTime?: string;
    endTime?: string;
    status: string;
    diagnostics?: {
      errorCode: string;
      scriptName: string;
      message: string;
      logTail: string;
    };
  }>;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function CodeDeployViewer() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // CodeDeploy Data
  const [applications, setApplications] = useState<Application[]>([]);
  const [deploymentGroups, setDeploymentGroups] = useState<DeploymentGroup[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deploymentInstances, setDeploymentInstances] = useState<DeploymentInstance[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedDeploymentGroup, setSelectedDeploymentGroup] = useState<DeploymentGroup | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'applications' | 'groups' | 'deployments' | 'details' | 'instances'>('applications');
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
      const response = await fetch('/api/aws/codedeploy/applications', {
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

  const fetchDeploymentGroups = async (applicationName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/codedeploy/deployment-groups', {
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
        throw new Error(error.message || 'Failed to fetch deployment groups');
      }

      const data = await response.json();
      setDeploymentGroups(data.deploymentGroups || []);
      showToast(`Found ${data.deploymentGroups?.length || 0} deployment groups in ${applicationName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch deployment groups', 'error');
      setDeploymentGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployments = async (applicationName: string, deploymentGroupName?: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/codedeploy/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          applicationName,
          deploymentGroupName: deploymentGroupName || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch deployments');
      }

      const data = await response.json();
      setDeployments(data.deployments || []);
      showToast(`Found ${data.deployments?.length || 0} deployments`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch deployments', 'error');
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeploymentInstances = async (deploymentId: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/codedeploy/deployment-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          deploymentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch deployment instances');
      }

      const data = await response.json();
      setDeploymentInstances(data.instances || []);
      showToast(`Found ${data.instances?.length || 0} instances in deployment`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch deployment instances', 'error');
      setDeploymentInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSelect = (application: Application) => {
    setSelectedApplication(application);
    setSelectedDeploymentGroup(null);
    setSelectedDeployment(null);
    fetchDeploymentGroups(application.applicationName);
  };

  const handleDeploymentGroupSelect = (deploymentGroup: DeploymentGroup) => {
    setSelectedDeploymentGroup(deploymentGroup);
    setSelectedDeployment(null);
    if (selectedApplication) {
      fetchDeployments(selectedApplication.applicationName, deploymentGroup.deploymentGroupName);
    }
  };

  const handleDeploymentSelect = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    fetchDeploymentInstances(deployment.deploymentId);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter applications based on search query
  const filteredApplications = applications.filter(app => 
    app.applicationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.computePlatform.toLowerCase().includes(searchQuery.toLowerCase())
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
                    key={application.applicationId}
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
                          {application.computePlatform} | {application.deploymentGroups?.length || 0} groups
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Created: {new Date(application.createTime).toLocaleDateString()}
                    </div>
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
              {/* Application Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      {selectedApplication.applicationName}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Platform: {selectedApplication.computePlatform}</span>
                      <span>Created: {new Date(selectedApplication.createTime).toLocaleString()}</span>
                      {selectedApplication.linkedToGitHub && (
                        <span className="flex items-center gap-1">
                          <span className="text-blue-600 dark:text-blue-400">GitHub</span>
                          {selectedApplication.gitHubAccountName && `(${selectedApplication.gitHubAccountName})`}
                        </span>
                      )}
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
                    onClick={() => setActiveView('groups')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'groups'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Deployment Groups ({deploymentGroups.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('deployments');
                      fetchDeployments(selectedApplication.applicationName);
                    }}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'deployments'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Deployments ({deployments.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('details');
                      if (selectedDeployment) {
                        fetchDeploymentInstances(selectedDeployment.deploymentId);
                      }
                    }}
                    disabled={!selectedDeployment}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'details'
                        ? 'bg-blue-600 text-white'
                        : selectedDeployment
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Deployment Details
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
                          <span className="text-gray-600 dark:text-gray-400">Application ID:</span>
                          <div className="mt-1 font-mono text-sm break-all">{selectedApplication.applicationId}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Compute Platform:</span>
                          <div className="mt-1">{selectedApplication.computePlatform}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <div className="mt-1">{new Date(selectedApplication.createTime).toLocaleString()}</div>
                        </div>
                      </div>
                      {selectedApplication.linkedToGitHub && (
                        <div className="mt-4">
                          <span className="text-gray-600 dark:text-gray-400">GitHub Integration:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <span>Enabled</span>
                            {selectedApplication.gitHubAccountName && (
                              <span className="text-sm text-blue-600 dark:text-blue-400">
                                ({selectedApplication.gitHubAccountName})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'groups' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Deployment Groups ({deploymentGroups.length})
                    </h3>
                    {deploymentGroups.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading deployment groups...' : 'No deployment groups found in this application'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deploymentGroups.map(deploymentGroup => (
                          <div
                            key={deploymentGroup.deploymentGroupId}
                            className={`bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 cursor-pointer ${
                              selectedDeploymentGroup?.deploymentGroupName === deploymentGroup.deploymentGroupName
                                ? 'ring-2 ring-blue-500'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                            }`}
                            onClick={() => handleDeploymentGroupSelect(deploymentGroup)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Server className="w-4 h-4" />
                                  {deploymentGroup.deploymentGroupName}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Config: {deploymentGroup.deploymentConfigName}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                deploymentGroup.deploymentStatus === 'Ready' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {deploymentGroup.deploymentStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Config:</span>
                                <span className="ml-2">{deploymentGroup.deploymentConfigName}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                                <span className="ml-2">{selectedApplication.computePlatform}</span>
                              </div>
                            </div>
                            {deploymentGroup.autoScalingGroups && deploymentGroup.autoScalingGroups.length > 0 && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Auto Scaling Groups:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {deploymentGroup.autoScalingGroups.map((asg, idx) => (
                                    <span key={idx} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                      {asg.name}
                                    </span>
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

                {activeView === 'deployments' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Deployments ({deployments.length})
                    </h3>
                    {deployments.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading deployments...' : 'No deployments found for this application/group'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deployments.map(deployment => (
                          <div
                            key={deployment.deploymentId}
                            className={`bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 cursor-pointer ${
                              selectedDeployment?.deploymentId === deployment.deploymentId
                                ? 'ring-2 ring-blue-500'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                            }`}
                            onClick={() => handleDeploymentSelect(deployment)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <RotateCcw className="w-4 h-4" />
                                  {deployment.deploymentId}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Group: {deployment.deploymentGroupName}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                deployment.deploymentStatus === 'Succeeded' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : deployment.deploymentStatus === 'Failed' 
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                    : deployment.deploymentStatus === 'InProgress' 
                                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                              }`}>
                                {deployment.deploymentStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <span className="ml-2">{deployment.statusMessage || deployment.deploymentStatus}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                                <span className="ml-2">{new Date(deployment.createTime).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Creator:</span>
                                <span className="ml-2 capitalize">{deployment.creator}</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="text-xs font-semibold mb-1">Deployment Overview</div>
                              <div className="flex gap-3 text-xs">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                  Pending: {deployment.deploymentOverview.Pending}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                  In Progress: {deployment.deploymentOverview.InProgress}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  Succeeded: {deployment.deploymentOverview.Succeeded}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  Failed: {deployment.deploymentOverview.Failed}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'details' && selectedDeployment && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Deployment Details: {selectedDeployment.deploymentId}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Deployment ID:</span>
                          <div className="mt-1 font-mono text-sm break-all">{selectedDeployment.deploymentId}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              selectedDeployment.deploymentStatus === 'Succeeded' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : selectedDeployment.deploymentStatus === 'Failed' 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                  : selectedDeployment.deploymentStatus === 'InProgress' 
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                            }`}>
                              {selectedDeployment.deploymentStatus}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Application:</span>
                          <div className="mt-1">{selectedDeployment.applicationName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Group:</span>
                          <div className="mt-1">{selectedDeployment.deploymentGroupName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <div className="mt-1">{new Date(selectedDeployment.createTime).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Complete:</span>
                          <div className="mt-1">{selectedDeployment.completeTime ? new Date(selectedDeployment.completeTime).toLocaleString() : 'In progress'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Creator:</span>
                          <div className="mt-1 capitalize">{selectedDeployment.creator}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                          <div className="mt-1">{selectedDeployment.computePlatform}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Deployment Overview
                      </h3>
                      <div className="grid grid-cols-6 gap-4 text-center">
                        <div>
                          <div className="text-xl font-bold text-gray-700 dark:text-gray-300">{selectedDeployment.deploymentOverview.Pending}</div>
                          <div className="text-xs text-gray-500">Pending</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-yellow-600">{selectedDeployment.deploymentOverview.InProgress}</div>
                          <div className="text-xs text-gray-500">In Progress</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-600">{selectedDeployment.deploymentOverview.Succeeded}</div>
                          <div className="text-xs text-gray-500">Succeeded</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-red-600">{selectedDeployment.deploymentOverview.Failed}</div>
                          <div className="text-xs text-gray-500">Failed</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-blue-600">{selectedDeployment.deploymentOverview.Skipped}</div>
                          <div className="text-xs text-gray-500">Skipped</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-purple-600">{selectedDeployment.deploymentOverview.Ready}</div>
                          <div className="text-xs text-gray-500">Ready</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Revision Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Revision Type:</span>
                          <div className="mt-1">{selectedDeployment.revision.revisionType}</div>
                        </div>
                        {selectedDeployment.revision.s3Location && (
                          <>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">S3 Bucket:</span>
                              <div className="mt-1 font-mono">{selectedDeployment.revision.s3Location.bucket}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">S3 Key:</span>
                              <div className="mt-1 font-mono text-sm break-all">{selectedDeployment.revision.s3Location.key}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Bundle Type:</span>
                              <div className="mt-1">{selectedDeployment.revision.s3Location.bundleType}</div>
                            </div>
                            {selectedDeployment.revision.s3Location.version && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                                <div className="mt-1 font-mono">{selectedDeployment.revision.s3Location.version}</div>
                              </div>
                            )}
                          </>
                        )}
                        {selectedDeployment.revision.gitHubLocation && (
                          <>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">GitHub Repository:</span>
                              <div className="mt-1 font-mono">{selectedDeployment.revision.gitHubLocation.repository}</div>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Commit ID:</span>
                              <div className="mt-1 font-mono">{selectedDeployment.revision.gitHubLocation.commitId}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Deployment Instances ({deploymentInstances.length})
                      </h3>
                      {deploymentInstances.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                          {loading ? 'Loading instances...' : 'No deployment instances found'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {deploymentInstances.map((instance, idx) => (
                            <div
                              key={instance.instanceId}
                              className="border dark:border-slate-700 rounded p-3"
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-mono text-sm">{instance.instanceId}</div>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  instance.status === 'Succeeded' 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                    : instance.status === 'Failed' 
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                      : instance.status === 'InProgress' 
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                                }`}>
                                  {instance.status}
                                </span>
                              </div>
                              {instance.lastUpdatedAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Last updated: {new Date(instance.lastUpdatedAt).toLocaleString()}
                                </div>
                              )}
                              {instance.lifecycleEvents && instance.lifecycleEvents.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-semibold mb-1">Lifecycle Events:</div>
                                  <div className="space-y-1">
                                    {instance.lifecycleEvents.map((event, eIdx) => (
                                      <div key={eIdx} className="text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded">
                                        <div className="flex justify-between">
                                          <span>{event.lifecycleEventName}</span>
                                          <span className={`px-1 rounded ${
                                            event.status === 'Succeeded' 
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                              : event.status === 'Failed' 
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                                : event.status === 'Pending' 
                                                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400' 
                                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                          }`}>
                                            {event.status}
                                          </span>
                                        </div>
                                        {event.startTime && (
                                          <div className="text-xs text-gray-500">
                                            Start: {new Date(event.startTime).toLocaleString()}
                                            {event.endTime && ` | End: ${new Date(event.endTime).toLocaleString()}`}
                                          </div>
                                        )}
                                        {event.diagnostics && (
                                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            Error: {event.diagnostics.message}
                                          </div>
                                        )}
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
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an application from the sidebar to view CodeDeploy resources
            </div>
          )}
        </div>
      </div>
    </>
  );
}