import { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, Search, Download, Filter } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';

interface LogEvent {
  timestamp: number;
  message: string;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function LambdaLogsTailer() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [functions, setFunctions] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'>('all');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchFunctions = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/lambda/functions', {
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
        throw new Error(error.message || 'Failed to fetch Lambda functions');
      }

      const data = await response.json();
      setFunctions(data.functions || []);
      showToast(`Found ${data.functions?.length || 0} functions`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch Lambda functions', 'error');
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (isInitial: boolean = true) => {
    if (!functionName) {
      showToast('Please select a Lambda function', 'error');
      return;
    }

    try {
      const response = await fetch('/api/aws/lambda/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          functionName,
          limit: 100,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch logs');
      }

      const data = await response.json();
      const newLogs = data.logs || [];

      if (isInitial) {
        setLogs(newLogs);
      } else {
        // Only add new logs that we don't already have
        setLogs(prevLogs => {
          const existingTimestamps = new Set(prevLogs.map(l => l.timestamp));
          const uniqueNewLogs = newLogs.filter((l: LogEvent) => !existingTimestamps.has(l.timestamp));
          return [...prevLogs, ...uniqueNewLogs];
        });
      }
    } catch (error: any) {
      if (isInitial) {
        showToast(error.message || 'Failed to fetch logs', 'error');
      }
      setLogs([]);
    }
  };

  const startStreaming = () => {
    fetchLogs(true);
    setIsStreaming(true);
    intervalRef.current = setInterval(() => {
      fetchLogs(false);
    }, 5000); // Fetch every 5 seconds
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearLogs = () => {
    setLogs([]);
    showToast('Logs cleared', 'info');
  };

  const exportLogs = () => {
    const logsText = filteredLogs
      .map(log => `[${new Date(log.timestamp).toISOString()}] ${log.level || 'LOG'}: ${log.message}`)
      .join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lambda-logs-${functionName}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Logs exported successfully', 'success');
  };

  const detectLogLevel = (message: string): 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | undefined => {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('error') || lowerMsg.includes('exception') || lowerMsg.includes('failed')) return 'ERROR';
    if (lowerMsg.includes('warn') || lowerMsg.includes('warning')) return 'WARN';
    if (lowerMsg.includes('debug')) return 'DEBUG';
    if (lowerMsg.includes('info')) return 'INFO';
    return undefined;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery || log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const logLevel = log.level || detectLogLevel(log.message);
    const matchesLevel = levelFilter === 'all' || logLevel === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'WARN': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'DEBUG': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'INFO': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
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

      <div className="h-full flex flex-col">
        {/* Configuration Panel */}
        <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
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
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Access Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Lambda Function</label>
              <div className="flex gap-2">
                <select
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  disabled={functions.length === 0}
                >
                  <option value="">Select function...</option>
                  {functions.map(fn => (
                    <option key={fn} value={fn}>{fn}</option>
                  ))}
                </select>
                <button
                  onClick={fetchFunctions}
                  disabled={loading}
                  className="px-3 py-2 text-sm rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  title="Refresh functions"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                disabled={!functionName}
                className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Streaming
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Streaming
              </button>
            )}
            <button
              onClick={clearLogs}
              className="px-4 py-2 text-sm rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Clear
            </button>
            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2 text-sm rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-10 pr-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="px-3 py-2 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="all">All Levels</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Display */}
        <div className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {!functionName ? 'Select a Lambda function and click "Start Streaming"' : 'No logs available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => {
                const level = log.level || detectLogLevel(log.message);
                return (
                  <div
                    key={index}
                    className={`p-2 rounded ${getLevelColor(level)}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs opacity-75 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {level && (
                        <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded bg-black/10">
                          {level}
                        </span>
                      )}
                      <span className="flex-1 break-all">{log.message}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>
            {isStreaming && <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />}
            {isStreaming ? 'Streaming logs...' : 'Stopped'}
          </span>
          <span>{filteredLogs.length} log entries</span>
        </div>
      </div>
    </>
  );
}
