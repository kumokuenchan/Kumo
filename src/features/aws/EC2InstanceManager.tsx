import { useState } from 'react';
import { RefreshCw, Server, Play, Square, RotateCcw, Activity, BarChart3, Key, Filter, Copy, ExternalLink, ChevronRight, ChevronDown, MapPin, Hash, Tag, Network, Cpu, MemoryStick, Wifi } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Instance {
  instanceId: string;
  instanceName?: string;
  instanceType: string;
  state: 'pending' | 'running' | 'shutting-down' | 'terminated' | 'stopping' | 'stopped';
  stateTransitionReason?: string;
  platform?: string;
  architecture?: string;
  virtualizationType?: string;
  hypervisor?: string;
  kernelId?: string;
  rootDeviceType: string;
  rootDeviceName?: string;
  blockDeviceMappings?: Array<{
    deviceName: string;
    ebs: {
      volumeId: string;
      status: string;
      deleteOnTermination: boolean;
      volumeType: string;
      iops?: number;
      throughput?: number;
      encrypted?: boolean;
    };
  }>;
  imageId: string;
  privateIpAddress?: string;
  privateDnsName?: string;
  publicIpAddress?: string;
  publicDnsName?: string;
  vpcId?: string;
  subnetId?: string;
  availabilityZone: string;
  keyName?: string;
  securityGroups: Array<{
    groupName: string;
    groupId: string;
  }>;
  tags: Array<{
    key: string;
    value: string;
  }>;
  launchTime: string;
  iamInstanceProfile?: {
    arn: string;
    id: string;
  };
  monitoring: {
    state: 'disabled' | 'enabled' | 'pending';
  };
}

interface InstanceMetric {
  instanceId: string;
  cpuUtilization: number;
  memoryUtilization?: number;
  networkIn: number;
  networkOut: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  timestamp: string;
}

interface FilterOptions {
  state: string[];
  tagFilters: Array<{ key: string; value: string }>;
  instanceType: string;
  availabilityZone: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function EC2InstanceManager() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // EC2 Data
  const [instances, setInstances] = useState<Instance[]>([]);
  const [metrics, setMetrics] = useState<InstanceMetric[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'instances' | 'details' | 'metrics' | 'ssh'>('instances');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    state: [],
    tagFilters: [],
    instanceType: '',
    availabilityZone: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchInstances = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ec2/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          filters: filters,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch instances');
      }

      const data = await response.json();
      setInstances(data.instances || []);
      showToast(`Found ${data.instances?.length || 0} instances`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch instances', 'error');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (instanceId: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ec2/instance-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(prev => [...prev, data.metric]);
      showToast(`Fetched metrics for ${instanceId}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startInstance = async (instanceId: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ec2/start-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start instance');
      }

      const data = await response.json();
      showToast(`Instance ${instanceId} starting`, 'success');
      
      // Update the instance in the list
      setInstances(prev => prev.map(instance => 
        instance.instanceId === instanceId ? { ...instance, state: 'pending' } : instance
      ));
      
      if (selectedInstance && selectedInstance.instanceId === instanceId) {
        setSelectedInstance({ ...selectedInstance, state: 'pending' });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to start instance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stopInstance = async (instanceId: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ec2/stop-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to stop instance');
      }

      const data = await response.json();
      showToast(`Instance ${instanceId} stopping`, 'success');
      
      // Update the instance in the list
      setInstances(prev => prev.map(instance => 
        instance.instanceId === instanceId ? { ...instance, state: 'stopping' } : instance
      ));
      
      if (selectedInstance && selectedInstance.instanceId === instanceId) {
        setSelectedInstance({ ...selectedInstance, state: 'stopping' });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to stop instance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const restartInstance = async (instanceId: string) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ec2/restart-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to restart instance');
      }

      const data = await response.json();
      showToast(`Instance ${instanceId} restarting`, 'success');
      
      // Update the instance in the list
      setInstances(prev => prev.map(instance => 
        instance.instanceId === instanceId ? { ...instance, state: 'pending' } : instance
      ));
      
      if (selectedInstance && selectedInstance.instanceId === instanceId) {
        setSelectedInstance({ ...selectedInstance, state: 'pending' });
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to restart instance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    fetchMetrics(instance.instanceId);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTagFilterChange = (index: number, key: string, value: string) => {
    const newTagFilters = [...filters.tagFilters];
    newTagFilters[index] = { key, value };
    setFilters(prev => ({ ...prev, tagFilters: newTagFilters }));
  };

  const addTagFilter = () => {
    setFilters(prev => ({
      ...prev,
      tagFilters: [...prev.tagFilters, { key: '', value: '' }]
    }));
  };

  const removeTagFilter = (index: number) => {
    const newTagFilters = [...filters.tagFilters];
    newTagFilters.splice(index, 1);
    setFilters(prev => ({ ...prev, tagFilters: newTagFilters }));
  };

  // Filter instances based on search query and filters
  const filteredInstances = instances.filter(instance => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      instance.instanceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (instance.instanceName && instance.instanceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (instance.privateIpAddress && instance.privateIpAddress.includes(searchQuery)) ||
      (instance.publicIpAddress && instance.publicIpAddress.includes(searchQuery));
    
    // State filter
    const matchesState = filters.state.length === 0 || filters.state.includes(instance.state);
    
    // Instance type filter
    const matchesType = filters.instanceType === '' || instance.instanceType.includes(filters.instanceType);
    
    // Availability zone filter
    const matchesAZ = filters.availabilityZone === '' || instance.availabilityZone.includes(filters.availabilityZone);
    
    // Tag filters
    const matchesTags = filters.tagFilters.every(tagFilter => 
      instance.tags.some(tag => 
        tag.key.toLowerCase().includes(tagFilter.key.toLowerCase()) && 
        tag.value.toLowerCase().includes(tagFilter.value.toLowerCase())
      )
    );
    
    return matchesSearch && matchesState && matchesType && matchesAZ && matchesTags;
  });

  // Get unique instance types and availability zones for filters
  const instanceTypes = [...new Set(instances.map(i => i.instanceType))];
  const availabilityZones = [...new Set(instances.map(i => i.availabilityZone))];

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
        {/* Sidebar - AWS Credentials and Instance List */}
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
              onClick={fetchInstances}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Instances'}
            </button>
          </div>

          <div className="px-2 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-semibold">Filters</div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 dark:text-blue-400"
              >
                {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
            
            {showFilters && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">State</label>
                  <div className="flex flex-wrap gap-1">
                    {['running', 'stopped', 'pending', 'stopping', 'terminated'].map(state => (
                      <button
                        key={state}
                        onClick={() => {
                          if (filters.state.includes(state)) {
                            setFilters(prev => ({
                              ...prev,
                              state: prev.state.filter(s => s !== state)
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              state: [...prev.state, state]
                            }));
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          filters.state.includes(state)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Instance Type</label>
                  <select
                    value={filters.instanceType}
                    onChange={(e) => setFilters(prev => ({ ...prev, instanceType: e.target.value }))}
                    className="w-full px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">All Types</option>
                    {instanceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Availability Zone</label>
                  <select
                    value={filters.availabilityZone}
                    onChange={(e) => setFilters(prev => ({ ...prev, availabilityZone: e.target.value }))}
                    className="w-full px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">All Zones</option>
                    {availabilityZones.map(az => (
                      <option key={az} value={az}>{az}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tags</label>
                    <button
                      onClick={addTagFilter}
                      className="text-xs text-blue-600 dark:text-blue-400"
                    >
                      + Add
                    </button>
                  </div>
                  {filters.tagFilters.map((tagFilter, index) => (
                    <div key={index} className="flex gap-1 mb-1">
                      <input
                        type="text"
                        value={tagFilter.key}
                        onChange={(e) => handleTagFilterChange(index, e.target.value, tagFilter.value)}
                        placeholder="Key"
                        className="flex-1 px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={tagFilter.value}
                        onChange={(e) => handleTagFilterChange(index, tagFilter.key, e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                      />
                      <button
                        onClick={() => removeTagFilter(index)}
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-2">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search instances..."
                  className="flex-1 px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {filteredInstances.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading instances...' : 'No instances found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredInstances.map((instance) => (
                  <div
                    key={instance.instanceId}
                    className={`bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs cursor-pointer ${
                      selectedInstance?.instanceId === instance.instanceId
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleInstanceSelect(instance)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {instance.instanceName || instance.instanceId}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {instance.instanceType} | {instance.state}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          instance.state === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          instance.state === 'stopped' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          instance.state === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          instance.state === 'stopping' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                        }`}>
                          {instance.state}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {instance.privateIpAddress || 'No IP'} | {instance.availabilityZone}
                    </div>
                    {instance.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {instance.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="px-1 py-0.5 text-[10px] rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 truncate max-w-[80px]">
                            {tag.key}={tag.value}
                          </span>
                        ))}
                        {instance.tags.length > 2 && (
                          <span className="px-1 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400">
                            +{instance.tags.length - 2}
                          </span>
                        )}
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
          {selectedInstance ? (
            <>
              {/* Instance Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      {selectedInstance.instanceName || selectedInstance.instanceId}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        selectedInstance.state === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        selectedInstance.state === 'stopped' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        selectedInstance.state === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        selectedInstance.state === 'stopping' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                      }`}>
                        {selectedInstance.state}
                      </span>
                      <span>Instance Type: {selectedInstance.instanceType}</span>
                      <span>Zone: {selectedInstance.availabilityZone}</span>
                    </div>
                  </div>
                </div>

                {/* Instance Actions */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => startInstance(selectedInstance.instanceId)}
                    disabled={loading || selectedInstance.state === 'running' || selectedInstance.state === 'pending'}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                      selectedInstance.state === 'running' || selectedInstance.state === 'pending'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    Start
                  </button>
                  <button
                    onClick={() => stopInstance(selectedInstance.instanceId)}
                    disabled={loading || selectedInstance.state !== 'running'}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                      selectedInstance.state !== 'running'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <Square className="w-3 h-3" />
                    Stop
                  </button>
                  <button
                    onClick={() => restartInstance(selectedInstance.instanceId)}
                    disabled={loading || selectedInstance.state !== 'running'}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                      selectedInstance.state !== 'running'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restart
                  </button>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('instances')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'instances'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveView('details')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'details'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('metrics');
                      fetchMetrics(selectedInstance.instanceId);
                    }}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'metrics'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => setActiveView('ssh')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'ssh'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    SSH Info
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'instances' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Instance Overview</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Instance ID:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-sm break-all">{selectedInstance.instanceId}</span>
                            <button
                              onClick={() => copyToClipboard(selectedInstance.instanceId, 'Instance ID')}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">State:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              selectedInstance.state === 'running' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : selectedInstance.state === 'stopped' 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                  : selectedInstance.state === 'pending' 
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                                    : selectedInstance.state === 'stopping' 
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                            }`}>
                              {selectedInstance.state}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Instance Type:</span>
                          <div className="mt-1">{selectedInstance.instanceType}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                          <div className="mt-1">{selectedInstance.platform || 'Linux'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Availability Zone:</span>
                          <div className="mt-1">{selectedInstance.availabilityZone}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Launch Time:</span>
                          <div className="mt-1">{new Date(selectedInstance.launchTime).toLocaleString()}</div>
                        </div>
                      </div>
                      {selectedInstance.instanceName && (
                        <div className="mt-4">
                          <span className="text-gray-600 dark:text-gray-400">Instance Name:</span>
                          <div className="mt-1">{selectedInstance.instanceName}</div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Network Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedInstance.privateIpAddress && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Private IP:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono">{selectedInstance.privateIpAddress}</span>
                              <button
                                onClick={() => copyToClipboard(selectedInstance.privateIpAddress!, 'Private IP')}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedInstance.publicIpAddress && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Public IP:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono">{selectedInstance.publicIpAddress}</span>
                              <button
                                onClick={() => copyToClipboard(selectedInstance.publicIpAddress!, 'Public IP')}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedInstance.vpcId && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">VPC ID:</span>
                            <div className="mt-1 font-mono text-sm">{selectedInstance.vpcId}</div>
                          </div>
                        )}
                        {selectedInstance.subnetId && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Subnet ID:</span>
                            <div className="mt-1 font-mono text-sm">{selectedInstance.subnetId}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Security Groups</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedInstance.securityGroups.map((sg, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            {sg.groupName} ({sg.groupId})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Tags</h3>
                      {selectedInstance.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedInstance.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {tag.key}={tag.value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500">No tags available</div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'details' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Instance Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Instance Type:</span>
                          <div className="mt-1">{selectedInstance.instanceType}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Architecture:</span>
                          <div className="mt-1">{selectedInstance.architecture}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Virtualization Type:</span>
                          <div className="mt-1">{selectedInstance.virtualizationType}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Hypervisor:</span>
                          <div className="mt-1">{selectedInstance.hypervisor}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">AMI ID:</span>
                          <div className="mt-1 font-mono">{selectedInstance.imageId}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Key Name:</span>
                          <div className="mt-1">{selectedInstance.keyName || 'None'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Storage Information</h3>
                      <div className="space-y-3">
                        {selectedInstance.blockDeviceMappings?.map((device, idx) => (
                          <div key={idx} className="border dark:border-slate-700 rounded p-3">
                            <div className="font-medium">Device: {device.deviceName}</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Volume ID:</span>
                                <div className="font-mono">{device.ebs.volumeId}</div>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                <div>{device.ebs.status}</div>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                                <div>{device.ebs.volumeType}</div>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Encrypted:</span>
                                <div>{device.ebs.encrypted ? 'Yes' : 'No'}</div>
                              </div>
                              {device.ebs.iops && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">IOPS:</span>
                                  <div>{device.ebs.iops}</div>
                                </div>
                              )}
                              {device.ebs.throughput && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Throughput:</span>
                                  <div>{device.ebs.throughput} MB/s</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <h3 className="font-semibold mb-3">Additional Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Monitoring:</span>
                          <div className="mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              selectedInstance.monitoring.state === 'enabled'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                            }`}>
                              {selectedInstance.monitoring.state}
                            </span>
                          </div>
                        </div>
                        {selectedInstance.iamInstanceProfile && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">IAM Profile:</span>
                            <div className="mt-1 font-mono text-sm break-all">{selectedInstance.iamInstanceProfile.arn}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Root Device Type:</span>
                          <div className="mt-1">{selectedInstance.rootDeviceType}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Root Device Name:</span>
                          <div className="mt-1">{selectedInstance.rootDeviceName}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'metrics' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Instance Metrics: {selectedInstance.instanceId}
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        {metrics
                          .filter(m => m.instanceId === selectedInstance.instanceId)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-3xl font-bold text-blue-600">{metric.cpuUtilization}%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">CPU Utilization</div>
                            </div>
                          ))}
                        {metrics
                          .filter(m => m.instanceId === selectedInstance.instanceId)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-3xl font-bold text-green-600">{metric.memoryUtilization || 0}%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Memory Utilization</div>
                            </div>
                          ))}
                        {metrics
                          .filter(m => m.instanceId === selectedInstance.instanceId)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-3xl font-bold text-purple-600">{(metric.networkIn / (1024 * 1024)).toFixed(2)} MB</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Network In</div>
                            </div>
                          ))}
                        {metrics
                          .filter(m => m.instanceId === selectedInstance.instanceId)
                          .map((metric, idx) => (
                            <div key={idx} className="text-center">
                              <div className="text-3xl font-bold text-yellow-600">{(metric.networkOut / (1024 * 1024)).toFixed(2)} MB</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Network Out</div>
                            </div>
                          ))}
                      </div>

                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Detailed Metrics</h4>
                        <div className="space-y-2">
                          {metrics
                            .filter(m => m.instanceId === selectedInstance.instanceId)
                            .map((metric, idx) => (
                              <div key={idx} className="p-3 border dark:border-slate-700 rounded">
                                <div className="grid grid-cols-6 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                                    <span className="ml-2 font-medium">{metric.cpuUtilization}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                                    <span className="ml-2 font-medium">{metric.memoryUtilization || 0}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Net In:</span>
                                    <span className="ml-2">{(metric.networkIn / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Net Out:</span>
                                    <span className="ml-2">{(metric.networkOut / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Disk Read:</span>
                                    <span className="ml-2">{(metric.diskReadBytes / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Disk Write:</span>
                                    <span className="ml-2">{(metric.diskWriteBytes / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  Updated: {new Date(metric.timestamp).toLocaleString()}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'ssh' && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      SSH Connection Information: {selectedInstance.instanceId}
                    </h3>
                    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Connection Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Public IP:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono">{selectedInstance.publicIpAddress || 'No Public IP'}</span>
                              {selectedInstance.publicIpAddress && (
                                <button
                                  onClick={() => copyToClipboard(selectedInstance.publicIpAddress!, 'Public IP')}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Private IP:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono">{selectedInstance.privateIpAddress}</span>
                              <button
                                onClick={() => copyToClipboard(selectedInstance.privateIpAddress!, 'Private IP')}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">SSH Command</h4>
                        <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm flex items-center justify-between">
                          <div>
                            ssh -i /path/to/{selectedInstance.keyName || 'your-key-pair'}.pem 
                            {selectedInstance.platform === 'windows' ? 'Administrator' : 'ec2-user'}@
                            {selectedInstance.publicIpAddress || selectedInstance.privateIpAddress}
                          </div>
                          <button
                            onClick={() => copyToClipboard(
                              `ssh -i /path/to/${selectedInstance.keyName || 'your-key-pair'}.pem ${
                                selectedInstance.platform === 'windows' ? 'Administrator' : 'ec2-user'
                              }@${selectedInstance.publicIpAddress || selectedInstance.privateIpAddress}`,
                              'SSH Command'
                            )}
                            className="p-1 rounded hover:bg-gray-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Session Manager (if SSM enabled)</h4>
                        <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm flex items-center justify-between">
                          <div>
                            aws ssm start-session --target {selectedInstance.instanceId}
                          </div>
                          <button
                            onClick={() => copyToClipboard(
                              `aws ssm start-session --target ${selectedInstance.instanceId}`,
                              'SSM Session Command'
                            )}
                            className="p-1 rounded hover:bg-gray-700"
                          >
                            <Copy className="w-4 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Key Pair Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Key Name:</span>
                            <div className="mt-1">{selectedInstance.keyName || 'No key pair assigned'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                            <div className="mt-1">{selectedInstance.platform || 'Linux'}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Security Groups (Ports)</h4>
                        <div className="space-y-2">
                          {selectedInstance.securityGroups.map((sg, idx) => (
                            <div key={idx} className="p-2 border dark:border-slate-700 rounded">
                              <div className="font-medium">{sg.groupName}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {sg.groupId} - SSH access typically allowed on port 22
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an instance from the sidebar to view details
            </div>
          )}
        </div>
      </div>
    </>
  );
}