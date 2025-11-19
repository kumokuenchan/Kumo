import { useState } from 'react';
import { RefreshCw, Server, Activity, Scale, FileText, Eye, Copy, ExternalLink, ChevronRight, ChevronDown, Play, Square, RotateCcw } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Cluster {
  clusterArn: string;
  clusterName: string;
  status: string;
  registeredContainerInstancesCount: number;
  runningTasksCount: number;
  pendingTasksCount: number;
  activeServicesCount: number;
  createdAt: string;
}

interface Service {
  serviceArn: string;
  serviceName: string;
  status: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  taskDefinition: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  taskArn: string;
  taskDefinitionArn: string;
  containerInstanceArn: string;
  clusterArn: string;
  group: string;
  startedBy: string;
  startedAt: string;
  cpu: string;
  memory: string;
  lastStatus: string;
  containers: Container[];
}

interface Container {
  containerArn: string;
  taskArn: string;
  name: string;
  image: string;
  lastStatus: string;
  exitCode?: number;
  reason?: string;
  cpu: string;
  memory: string;
  memoryReservation: string;
  logConfiguration?: {
    logDriver: string;
    options: Record<string, string>;
  };
}

interface TaskDefinition {
  taskDefinitionArn: string;
  family: string;
  revision: number;
  status: string;
  taskRoleArn?: string;
  executionRoleArn?: string;
  networkMode: string;
  containerDefinitions: ContainerDefinition[];
  volumes: Volume[];
  requiresCompatibilities: string[];
  cpu?: string;
  memory?: string;
  revisionArn: string;
  registeredAt: string;
  registeredBy: string;
}

interface ContainerDefinition {
  name: string;
  image: string;
  cpu: number;
  memory: number;
  memoryReservation: number;
  portMappings: PortMapping[];
  essential: boolean;
  environment: Array<{ name: string; value: string }>;
  logConfiguration?: {
    logDriver: string;
    options: Record<string, string>;
  };
}

interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol: string;
}

interface Volume {
  name: string;
  host?: {
    sourcePath: string;
  };
}

interface LogEvent {
  timestamp: number;
  message: string;
  ingestionTime: number;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function ECSTaskManager() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // ECS Data
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDefinitions, setTaskDefinitions] = useState<TaskDefinition[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  
  // Selections
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskDefinition, setSelectedTaskDefinition] = useState<TaskDefinition | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'clusters' | 'services' | 'tasks' | 'logs' | 'definitions' | 'scaling'>('clusters');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [newDesiredCount, setNewDesiredCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchClusters = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/clusters', {
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
        throw new Error(error.message || 'Failed to fetch clusters');
      }

      const data = await response.json();
      setClusters(data.clusters || []);
      showToast(`Found ${data.clusters?.length || 0} clusters`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch clusters', 'error');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (clusterName: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          cluster: clusterName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch services');
      }

      const data = await response.json();
      setServices(data.services || []);
      showToast(`Found ${data.services?.length || 0} services in ${clusterName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch services', 'error');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (clusterName: string, serviceName?: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          cluster: clusterName,
          serviceName: serviceName || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      showToast(`Found ${data.tasks?.length || 0} tasks in ${serviceName ? serviceName : clusterName}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch tasks', 'error');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDefinition = async (taskDefinitionArn: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/task-definition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          taskDefinition: taskDefinitionArn,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch task definition');
      }

      const data = await response.json();
      setTaskDefinitions(prev => [...prev, data.taskDefinition]);
      setSelectedTaskDefinition(data.taskDefinition);
      showToast(`Fetched task definition: ${data.taskDefinition.family}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch task definition', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskLogs = async (task: Task) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/task-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          taskArn: task.taskArn,
          taskDefinitionArn: task.taskDefinitionArn,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch task logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      showToast(`Fetched logs for task ${task.taskArn.split('/').pop()}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch task logs', 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const scaleService = async (clusterName: string, serviceName: string, desiredCount: number) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/scale-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          cluster: clusterName,
          service: serviceName,
          desiredCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to scale service');
      }

      const data = await response.json();
      showToast(`Service scaled to ${desiredCount} tasks`, 'success');
      
      // Refresh service details
      fetchServices(clusterName);
    } catch (error: any) {
      showToast(error.message || 'Failed to scale service', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startTask = async (clusterName: string, taskDefinition: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/start-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          cluster: clusterName,
          taskDefinition,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start task');
      }

      const data = await response.json();
      showToast(`Task started: ${data.taskArn}`, 'success');
      
      // Refresh tasks
      fetchTasks(clusterName);
    } catch (error: any) {
      showToast(error.message || 'Failed to start task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stopTask = async (clusterName: string, taskArn: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ecs/stop-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          cluster: clusterName,
          task: taskArn,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to stop task');
      }

      const data = await response.json();
      showToast(`Task stopped: ${taskArn.split('/').pop()}`, 'success');
      
      // Refresh tasks
      fetchTasks(clusterName);
    } catch (error: any) {
      showToast(error.message || 'Failed to stop task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const handleClusterSelect = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setSelectedService(null);
    setSelectedTask(null);
    setSelectedTaskDefinition(null);
    fetchServices(cluster.clusterName);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedTask(null);
    setSelectedTaskDefinition(null);
    if (selectedCluster) {
      fetchTasks(selectedCluster.clusterName, service.serviceName);
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setSelectedTaskDefinition(null);
  };

  const handleTaskDefinitionSelect = (taskDef: TaskDefinition) => {
    setSelectedTaskDefinition(taskDef);
  };

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
        {/* Sidebar - AWS Credentials and Cluster List */}
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
              onClick={fetchClusters}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Clusters'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {clusters.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading clusters...' : 'No clusters found'}
              </div>
            ) : (
              <div className="space-y-1">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.clusterArn}
                    className={`bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs cursor-pointer ${
                      selectedCluster?.clusterArn === cluster.clusterArn
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleClusterSelect(cluster)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {cluster.clusterName}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Status: {cluster.status} | {cluster.runningTasksCount} running
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Services: {cluster.activeServicesCount} | 
                      Instances: {cluster.registeredContainerInstancesCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedCluster ? (
            <>
              {/* Service/Task Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      {selectedCluster.clusterName}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Status: {selectedCluster.status}</span>
                      <span>Tasks: {selectedCluster.runningTasksCount} running</span>
                      <span>Services: {selectedCluster.activeServicesCount}</span>
                    </div>
                  </div>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveView('clusters');
                      fetchClusters();
                    }}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'clusters'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Clusters
                  </button>
                  <button
                    onClick={() => setActiveView('services')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'services'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Services ({services.length})
                  </button>
                  <button
                    onClick={() => setActiveView('tasks')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'tasks'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Tasks ({tasks.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('definitions');
                      if (selectedTask && !taskDefinitions.some(td => td.taskDefinitionArn === selectedTask.taskDefinitionArn)) {
                        fetchTaskDefinition(selectedTask.taskDefinitionArn);
                      }
                    }}
                    disabled={!selectedTask}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'definitions'
                        ? 'bg-blue-600 text-white'
                        : selectedTask 
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600' 
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Task Definition
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('logs');
                      if (selectedTask) {
                        fetchTaskLogs(selectedTask);
                      }
                    }}
                    disabled={!selectedTask}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'logs'
                        ? 'bg-blue-600 text-white'
                        : selectedTask 
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600' 
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => setActiveView('scaling')}
                    disabled={!selectedService}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'scaling'
                        ? 'bg-blue-600 text-white'
                        : selectedService 
                          ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600' 
                          : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Scaling
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'clusters' && (
                  <div>
                    <h3 className="font-semibold mb-3">All Clusters</h3>
                    <div className="space-y-2">
                      {clusters.map(cluster => (
                        <div
                          key={cluster.clusterArn}
                          className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold flex items-center gap-2">
                                <Server className="w-4 h-4" />
                                {cluster.clusterName}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cluster.clusterArn}</p>
                            </div>
                            <button
                              onClick={() => handleClusterSelect(cluster)}
                              className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                            >
                              View
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Status:</span>
                              <span className="ml-2 font-medium">{cluster.status}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Running Tasks:</span>
                              <span className="ml-2 font-medium">{cluster.runningTasksCount}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Active Services:</span>
                              <span className="ml-2 font-medium">{cluster.activeServicesCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeView === 'services' && (
                  <div>
                    <h3 className="font-semibold mb-3">Services ({services.length})</h3>
                    {services.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading services...' : 'No services found in this cluster'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {services.map(service => (
                          <div
                            key={service.serviceArn}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50"
                            onClick={() => handleServiceSelect(service)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{service.serviceName}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{service.status}</p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleServiceSelect(service);
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                >
                                  View
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveView('scaling');
                                    setSelectedService(service);
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 flex items-center gap-1"
                                >
                                  <Scale className="w-3 h-3" />
                                  Scale
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Desired:</span>
                                <span className="ml-2 font-medium">{service.desiredCount}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Running:</span>
                                <span className="ml-2 font-medium">{service.runningCount}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                                <span className="ml-2 font-medium">{service.pendingCount}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Task Def:</span>
                                <span className="ml-2 font-mono text-xs truncate">{service.taskDefinition.split('/').pop()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'tasks' && (
                  <div>
                    <h3 className="font-semibold mb-3">Tasks ({tasks.length})</h3>
                    {tasks.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading tasks...' : 'No tasks found in this service/cluster'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map(task => (
                          <div
                            key={task.taskArn}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50"
                            onClick={() => handleTaskSelect(task)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  {task.taskArn.split('/').pop()}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  Status: <span className={`
                                    ${task.lastStatus === 'RUNNING' ? 'text-green-600 dark:text-green-400' :
                                    task.lastStatus === 'PENDING' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'}
                                  `}>
                                    {task.lastStatus}
                                  </span>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskSelect(task);
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                >
                                  View
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedCluster) {
                                      stopTask(selectedCluster.clusterName, task.taskArn);
                                    }
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1"
                                >
                                  <Square className="w-3 h-3" />
                                  Stop
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Started:</span>
                                <span className="ml-2 font-medium">{new Date(task.startedAt).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Started By:</span>
                                <span className="ml-2 font-mono text-xs">{task.startedBy}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                                <span className="ml-2 font-medium">{task.cpu}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                                <span className="ml-2 font-medium">{task.memory}</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="text-xs font-semibold mb-2">Containers:</div>
                              <div className="flex flex-wrap gap-2">
                                {task.containers.map((container, idx) => (
                                  <div 
                                    key={container.containerArn} 
                                    className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-slate-700"
                                  >
                                    {container.name} ({container.lastStatus})
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'definitions' && selectedTaskDefinition && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Task Definition: {selectedTaskDefinition.family}:{selectedTaskDefinition.revision}
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">Definition Details</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTaskDefinition.taskDefinitionArn}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <span className="ml-2 font-medium">{selectedTaskDefinition.status}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Network Mode:</span>
                            <span className="ml-2 font-medium">{selectedTaskDefinition.networkMode}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Compatibility:</span>
                            <span className="ml-2 font-medium">{selectedTaskDefinition.requiresCompatibilities.join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">Container Definitions ({selectedTaskDefinition.containerDefinitions.length})</h4>
                          <button
                            onClick={() => toggleSection('containerDefs')}
                            className="flex items-center gap-1 text-sm"
                          >
                            {expandedSections['containerDefs'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {expandedSections['containerDefs'] ? 'Show Less' : 'Show All'}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {selectedTaskDefinition.containerDefinitions.map((container, idx) => (
                            <div 
                              key={idx} 
                              className="border dark:border-slate-700 rounded p-3"
                            >
                              <div className="flex justify-between">
                                <h5 className="font-medium">{container.name}</h5>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  container.essential 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                                }`}>
                                  {container.essential ? 'Essential' : 'Optional'}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Image:</span>
                                  <span className="ml-2 font-mono text-xs break-all">{container.image}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                                  <span className="ml-2">{container.cpu}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                                  <span className="ml-2">{container.memory} MB</span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Memory Reservation:</span>
                                  <span className="ml-2">{container.memoryReservation} MB</span>
                                </div>
                              </div>
                              {container.portMappings && container.portMappings.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm font-semibold mb-1">Port Mappings:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {container.portMappings.map((port, pIdx) => (
                                      <div key={pIdx} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                        {port.containerPort} → {port.hostPort || port.containerPort} ({port.protocol})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {container.environment && container.environment.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm font-semibold mb-1">Environment Variables:</div>
                                  <div className="text-xs font-mono bg-gray-50 dark:bg-slate-900 p-2 rounded">
                                    {container.environment.map(env => `${env.name}=${env.value}`).join('\n')}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                        <h4 className="font-semibold mb-3">Volumes ({selectedTaskDefinition.volumes.length})</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedTaskDefinition.volumes.map((volume, idx) => (
                            <div key={idx} className="border dark:border-slate-700 rounded p-3">
                              <div className="font-medium">{volume.name}</div>
                              {volume.host && (
                                <div className="text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Source:</span> {volume.host.sourcePath}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'logs' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Task Logs
                      </h3>
                      {selectedTask && (
                        <button
                          onClick={() => selectedTask && fetchTaskLogs(selectedTask)}
                          disabled={loading}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      )}
                    </div>
                    {logs.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        {loading ? 'Loading logs...' : (selectedTask ? 'No logs available for this task' : 'Select a task to view logs')}
                      </div>
                    ) : (
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                        {logs.map((log, idx) => (
                          <div key={idx} className="mb-1 last:mb-0">
                            <span className="text-gray-500 mr-3">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'scaling' && selectedService && selectedCluster && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Scale Service: {selectedService.serviceName}
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-semibold mb-1">Current Status</div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Desired:</span>
                              <span className="ml-2 font-medium">{selectedService.desiredCount}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Running:</span>
                              <span className="ml-2 font-medium">{selectedService.runningCount}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                              <span className="ml-2 font-medium">{selectedService.pendingCount}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold mb-1">Scale Service</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={newDesiredCount}
                              onChange={(e) => setNewDesiredCount(parseInt(e.target.value) || 0)}
                              min="0"
                              placeholder="New count"
                              className="flex-1 px-3 py-1.5 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                            />
                            <button
                              onClick={() => scaleService(selectedCluster.clusterName, selectedService.serviceName, newDesiredCount)}
                              disabled={loading}
                              className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Scale
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2">Task Definition</div>
                        <div className="text-sm font-mono bg-gray-50 dark:bg-slate-900 p-2 rounded">
                          {selectedService.taskDefinition}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a cluster from the sidebar to view ECS resources
            </div>
          )}
        </div>
      </div>
    </>
  );
}
