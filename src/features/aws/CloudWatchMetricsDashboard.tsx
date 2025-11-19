import { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, Clock, AlertTriangle, Download, Search, TrendingUp, Eye, EyeOff } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Metric {
  id: string;
  namespace: string;
  metricName: string;
  dimensions?: Array<{ name: string; value: string }>;
  description?: string;
  unit: string;
  statistic: string;
}

interface MetricDataPoint {
  timestamp: string;
  value: number;
  min?: number;
  max?: number;
  average?: number;
  sampleCount?: number;
}

interface Alarm {
  id: string;
  name: string;
  metricName: string;
  namespace: string;
  state: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
  description?: string;
  alarmActions?: string[];
  stateReason?: string;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function CloudWatchMetricsDashboard() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>([]);
  const [metricData, setMetricData] = useState<Record<string, MetricDataPoint[]>>({});
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  });
  const [customTimeRange, setCustomTimeRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16)
  });
  const [activeView, setActiveView] = useState<'metrics' | 'alarms' | 'graphs' | 'export'>('metrics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('AWS/EC2');
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const namespaces = [
    'AWS/EC2',
    'AWS/S3',
    'AWS/Lambda',
    'AWS/RDS',
    'AWS/DynamoDB',
    'AWS/ELB',
    'AWS/ApplicationELB',
    'AWS/NetworkELB',
    'AWS/ApiGateway',
    'AWS/SQS',
    'AWS/SNS',
    'AWS/ECS',
    'AWS/EFS',
    'AWS/CloudFront',
    'AWS/Redshift',
    'AWS/ElastiCache',
  ];

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchMetrics = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/cloudwatch/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          namespace: selectedNamespace,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics || []);
      showToast(`Found ${data.metrics?.length || 0} metrics in ${selectedNamespace}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch metrics', 'error');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricData = async (metric: Metric) => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/cloudwatch/metric-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          namespace: metric.namespace,
          metricName: metric.metricName,
          dimensions: metric.dimensions,
          startTime: timeRange.start.toISOString(),
          endTime: timeRange.end.toISOString(),
          period: 300, // 5 minutes
          statistic: metric.statistic || 'Average',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch metric data');
      }

      const data = await response.json();
      setMetricData(prev => ({
        ...prev,
        [metric.id]: data.dataPoints || []
      }));
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch metric data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlarms = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/cloudwatch/alarms', {
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
        throw new Error(error.message || 'Failed to fetch alarms');
      }

      const data = await response.json();
      setAlarms(data.alarms || []);
      showToast(`Found ${data.alarms?.length || 0} alarms`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch alarms', 'error');
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  };

  const addMetricToComparison = (metric: Metric) => {
    if (!selectedMetrics.find(m => m.id === metric.id)) {
      setSelectedMetrics([...selectedMetrics, metric]);
      fetchMetricData(metric);
    }
  };

  const removeMetricFromComparison = (metricId: string) => {
    setSelectedMetrics(selectedMetrics.filter(m => m.id !== metricId));
    setMetricData(prev => {
      const newData = { ...prev };
      delete newData[metricId];
      return newData;
    });
  };

  const handleTimeRangeChange = (range: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom') => {
    const now = new Date();
    
    if (range === 'custom') {
      const start = new Date(customTimeRange.start);
      const end = new Date(customTimeRange.end);
      setTimeRange({ start, end });
    } else {
      let start: Date;
      switch (range) {
        case '1h': start = new Date(Date.now() - 1 * 60 * 60 * 1000); break;
        case '6h': start = new Date(Date.now() - 6 * 60 * 60 * 1000); break;
        case '24h': start = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
        case '7d': start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
        default: start = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
      }
      
      setTimeRange({ start, end: now });
    }
  };

  const exportMetricData = () => {
    const dataToExport = {
      timeRange: timeRange,
      selectedMetrics: selectedMetrics,
      metricData: metricData,
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cloudwatch-metrics-${new Date().toISOString().slice(0, 19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Metric data exported successfully', 'success');
  };

  // Filter metrics based on search query
  const filteredMetrics = metrics.filter(metric => 
    metric.metricName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (metric.description && metric.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get unique namespaces from metrics
  const metricNamespaces = [...new Set(metrics.map(m => m.namespace))];

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
        {/* Sidebar - AWS Credentials and Namespace Selection */}
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

            <div className="mb-3">
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Namespace</label>
              <select
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {namespaces.map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Metrics'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search metrics..."
                  className="flex-1 px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {filteredMetrics.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading metrics...' : 'No metrics found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMetrics.slice(0, showAllMetrics ? undefined : 20).map((metric) => (
                  <div
                    key={metric.id}
                    className="bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{metric.metricName}</div>
                        <div className="text-[10px] text-gray-500 truncate">{metric.namespace}</div>
                        {metric.description && (
                          <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate mt-1">{metric.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => addMetricToComparison(metric)}
                        disabled={selectedMetrics.find(m => m.id === metric.id)}
                        className={`ml-2 px-2 py-1 text-[10px] rounded ${
                          selectedMetrics.find(m => m.id === metric.id)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        {selectedMetrics.find(m => m.id === metric.id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                    {metric.dimensions && metric.dimensions.length > 0 && (
                      <div className="mt-1 text-[10px] text-gray-500">
                        Dimensions: {metric.dimensions.map(d => `${d.name}=${d.value}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
                {filteredMetrics.length > 20 && (
                  <button
                    onClick={() => setShowAllMetrics(!showAllMetrics)}
                    className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                  >
                    {showAllMetrics ? 'Show Less' : `Show More (${filteredMetrics.length - 20})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Controls */}
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Time Range:</span>
                </div>
                <div className="flex gap-1">
                  {['1h', '6h', '24h', '7d', '30d', 'custom'].map(range => (
                    <button
                      key={range}
                      onClick={() => handleTimeRangeChange(range as any)}
                      className={`px-2 py-1 text-xs rounded ${
                        timeRange.start.getTime() === (range === 'custom' ? 
                          new Date(customTimeRange.start).getTime() : 
                          new Date(Date.now() - (range === '1h' ? 1 : range === '6h' ? 6 : range === '24h' ? 24 : range === '7d' ? 7 * 24 : 30 * 24) * 60 * 60 * 1000).getTime())
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportMetricData}
                  disabled={Object.keys(metricData).length === 0}
                  className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export Data
                </button>
                <button
                  onClick={fetchAlarms}
                  disabled={loading}
                  className="px-2 py-1 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Load Alarms
                </button>
              </div>
            </div>

            {selectedMetrics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {selectedMetrics.map(metric => (
                  <div 
                    key={metric.id} 
                    className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center gap-1"
                  >
                    <span>{metric.metricName}</span>
                    <button 
                      onClick={() => removeMetricFromComparison(metric.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('metrics')}
                className={`px-3 py-1.5 text-xs rounded ${
                  activeView === 'metrics'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                Metrics ({metrics.length})
              </button>
              <button
                onClick={() => setActiveView('alarms')}
                className={`px-3 py-1.5 text-xs rounded ${
                  activeView === 'alarms'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                Alarms ({alarms.length})
              </button>
              <button
                onClick={() => setActiveView('graphs')}
                disabled={selectedMetrics.length === 0}
                className={`px-3 py-1.5 text-xs rounded ${
                  activeView === 'graphs'
                    ? 'bg-blue-600 text-white'
                    : selectedMetrics.length > 0 
                      ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600' 
                      : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                Graphs
              </button>
              <button
                onClick={() => setActiveView('export')}
                disabled={Object.keys(metricData).length === 0}
                className={`px-3 py-1.5 text-xs rounded ${
                  activeView === 'export'
                    ? 'bg-blue-600 text-white'
                    : Object.keys(metricData).length > 0 
                      ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600' 
                      : 'bg-gray-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                Export
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4">
            {activeView === 'metrics' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Selected Metrics ({selectedMetrics.length})
                  </h3>
                  {selectedMetrics.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Select metrics from the sidebar to add them to the comparison
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMetrics.map(metric => (
                        <div key={metric.id} className="p-3 border dark:border-slate-700 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{metric.metricName}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{metric.namespace}</p>
                            </div>
                            <button
                              onClick={() => removeMetricFromComparison(metric.id)}
                              className="text-gray-500 hover:text-red-500"
                            >
                              Remove
                            </button>
                          </div>
                          {metric.dimensions && metric.dimensions.length > 0 && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Dimensions: {metric.dimensions.map(d => `${d.name}=${d.value}`).join(', ')}
                            </div>
                          )}
                          {metric.description && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">{metric.description}</p>
                          )}
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">Last Data Point:</div>
                            {metricData[metric.id] && metricData[metric.id].length > 0 ? (
                              <div className="text-sm">
                                {metricData[metric.id][metricData[metric.id].length - 1].value} {metric.unit}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No data available</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'alarms' && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alarms ({alarms.length})
                </h3>
                {alarms.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {loading ? 'Loading alarms...' : 'No alarms found. Click "Load Alarms" to fetch them.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alarms.map(alarm => (
                      <div
                        key={alarm.id}
                        className={`bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4 ${
                          alarm.state === 'ALARM' ? 'border-red-300 dark:border-red-700' :
                          alarm.state === 'INSUFFICIENT_DATA' ? 'border-yellow-300 dark:border-yellow-700' :
                          'border-green-300 dark:border-green-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{alarm.name}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                alarm.state === 'ALARM' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                alarm.state === 'INSUFFICIENT_DATA' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              }`}>
                                {alarm.state}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alarm.namespace} / {alarm.metricName}
                            </div>
                            {alarm.description && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{alarm.description}</p>
                            )}
                            {alarm.stateReason && (
                              <p className="text-xs text-gray-500 mt-1">{alarm.stateReason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeView === 'graphs' && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Metric Graphs
                </h3>
                {selectedMetrics.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No metrics selected for graphing. Add metrics to compare.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMetrics.map(metric => (
                      <div key={metric.id} className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold">{metric.metricName}</h4>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{metric.unit}</span>
                        </div>
                        {metricData[metric.id] && metricData[metric.id].length > 0 ? (
                          <div className="h-64 flex items-center justify-center">
                            {/* Placeholder for chart - in a real implementation, this would be a charting library */}
                            <div className="text-center">
                              <div className="text-gray-500 mb-2">Chart visualization for {metric.metricName}</div>
                              <div className="text-sm text-gray-400">
                                Data points: {metricData[metric.id].length} | 
                                Min: {Math.min(...metricData[metric.id].map(d => d.value)).toFixed(2)} | 
                                Max: {Math.max(...metricData[metric.id].map(d => d.value)).toFixed(2)} | 
                                Avg: {(metricData[metric.id].reduce((sum, d) => sum + d.value, 0) / metricData[metric.id].length).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-64 flex items-center justify-center text-gray-500">
                            Loading or no data available for {metric.metricName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeView === 'export' && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Data
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Export Summary</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Time Range:</span>
                        <span className="ml-2">{timeRange.start.toLocaleString()} to {timeRange.end.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Metrics Selected:</span>
                        <span className="ml-2">{selectedMetrics.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Data Points:</span>
                        <span className="ml-2">{Object.values(metricData).reduce((sum, data) => sum + data.length, 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={exportMetricData}
                      className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement CSV export
                        showToast('CSV export coming soon', 'info');
                      }}
                      className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Data Preview</h4>
                    <div className="bg-gray-50 dark:bg-slate-900 rounded p-2 max-h-60 overflow-auto">
                      <JsonView value={{ 
                        timeRange: timeRange,
                        selectedMetrics: selectedMetrics,
                        metricData: Object.keys(metricData).length > 0 ? metricData : 'No data loaded'
                      }} collapsed={1} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}