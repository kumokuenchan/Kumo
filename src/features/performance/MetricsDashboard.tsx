import { useState } from 'react';
import { useDatabaseMetrics } from '../../hooks/usePerformance';
import { Activity, Database, Cpu, Clock, RefreshCw, Zap } from 'lucide-react';

interface MetricsDashboardProps {
  connectionId: string;
}

export default function MetricsDashboard({ connectionId }: MetricsDashboardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const { data: metrics, isLoading, error, refetch } = useDatabaseMetrics(
    connectionId,
    autoRefresh ? refreshInterval : undefined
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400">Failed to load metrics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Real-time Database Metrics
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            Auto-refresh
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          )}
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connections Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">Connections</h4>
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {metrics.connections.current}
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400">
                of {metrics.connections.max}
              </span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {metrics.connections.running} running
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                style={{
                  width: `${(metrics.connections.current / metrics.connections.max) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-300">Buffer Pool</h4>
            <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {metrics.memory.percentage.toFixed(1)}%
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-400">used</span>
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">
              {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
              <div
                className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all"
                style={{ width: `${metrics.memory.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cache Hit Rate Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-300">Cache Hit Rate</h4>
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metrics.cache.hitRate.toFixed(2)}%
              </span>
              <span className="text-xs text-green-700 dark:text-green-400">hit rate</span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">
              {formatBytes(metrics.cache.size)} cache
            </div>
            <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
              <div
                className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(metrics.cache.hitRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Queries Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-orange-900 dark:text-orange-300">Queries</h4>
            <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {metrics.queries.perSecond}
              </span>
              <span className="text-xs text-orange-700 dark:text-orange-400">per second</span>
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              {metrics.queries.total.toLocaleString()} total
            </div>
          </div>
        </div>
      </div>

      {/* Uptime Card */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Server Uptime</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatUptime(metrics.uptime)}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Tip:</strong> A cache hit rate above 95% indicates good performance. If the buffer pool is full, consider increasing innodb_buffer_pool_size.
        </p>
      </div>
    </div>
  );
}
