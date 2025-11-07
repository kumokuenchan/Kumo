import { useState } from 'react';
import { X, TrendingUp, Clock, Activity, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { responseTimeStorage, type ResponseTimeEntry } from '../../services/responseTimeStorage';
import { apiTesterStorage } from '../../services/apiTesterStorage';

interface ResponseTimeHistoryProps {
  onClose: () => void;
  currentUrl?: string;
  currentMethod?: string;
}

export default function ResponseTimeHistory({ onClose, currentUrl, currentMethod }: ResponseTimeHistoryProps) {
  const endpoints = responseTimeStorage.getEndpoints();
  const [selectedEndpoint, setSelectedEndpoint] = useState<{ url: string; method: string } | null>(
    currentUrl && currentMethod ? { url: currentUrl, method: currentMethod } : null
  );

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all response time history?')) {
      responseTimeStorage.clearAll();
      setSelectedEndpoint(null);
      onClose();
    }
  };

  const handleClearEndpoint = (url: string, method: string) => {
    if (confirm(`Clear history for ${method} ${url}?`)) {
      responseTimeStorage.clearEndpoint(url, method);
      if (selectedEndpoint?.url === url && selectedEndpoint?.method === method) {
        setSelectedEndpoint(null);
      }
      // Force re-render by re-getting endpoints
      window.location.reload();
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'POST': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'PUT': case 'PATCH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'DELETE': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Response Time History
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track and analyze API response times and performance trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            {endpoints.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Endpoints */}
          <div className="w-80 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Endpoints ({endpoints.length})
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {endpoints.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No history yet. Send some requests to see performance data.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {endpoints.map(({ url, method, count }) => {
                    const recentWithTitle = apiTesterStorage.getHistory().find(h => h.request.url === url && h.request.method === method && h.title);
                    const title = recentWithTitle?.title as string | undefined;
                    const stats = responseTimeStorage.getEndpointStats(url, method);
                    const isSelected = selectedEndpoint?.url === url && selectedEndpoint?.method === method;

                    return (
                      <div
                        key={`${method}-${url}`}
                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent'
                        }`}
                        onClick={() => setSelectedEndpoint({ url, method })}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getMethodColor(method)}`}>
                            {method}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearEndpoint(url, method);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
                            title="Clear history for this endpoint"
                          >
                            <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                        {title ? (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white font-medium mb-0.5 break-all" title={title}>
                              {title}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 break-all" title={url}>
                              {url}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-900 dark:text-white font-medium mb-1 break-all" title={url}>
                            {url}
                          </div>
                        )}
                        {stats && (
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <span>{count} requests</span>
                            <span>Avg: {stats.avgDuration.toFixed(0)}ms</span>
                            <span className={stats.successRate === 100 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                              {stats.successRate.toFixed(0)}% OK
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Chart and Stats */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEndpoint ? (
              <EndpointDetails
                url={selectedEndpoint.url}
                method={selectedEndpoint.method}
                formatBytes={formatBytes}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">Select an endpoint to view performance details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EndpointDetails({ url, method, formatBytes }: { url: string; method: string; formatBytes: (bytes: number) => string }) {
  const entries = responseTimeStorage.getEntriesForEndpoint(url, method);
  const stats = responseTimeStorage.getEndpointStats(url, method);

  if (!stats || entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Requests"
          value={stats.count.toString()}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Response Time"
          value={`${stats.avgDuration.toFixed(0)}ms`}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Min / Max"
          value={`${stats.minDuration}ms / ${stats.maxDuration}ms`}
          color="emerald"
        />
        <StatCard
          icon={stats.successRate === 100 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          color={stats.successRate === 100 ? 'green' : 'orange'}
        />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Response Time Trend</h4>
        <ResponseTimeChart entries={entries} />
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Requests</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {entries.slice(-20).reverse().map((entry, idx) => {
                const isSuccess = entry.status >= 200 && entry.status < 300;
                return (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        isSuccess
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-mono">
                      {entry.duration}ms
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {formatBytes(entry.size)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  }[color];

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses}`}>
        {icon}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function ResponseTimeChart({ entries }: { entries: ResponseTimeEntry[] }) {
  if (entries.length === 0) return null;

  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxDuration = Math.max(...entries.map(e => e.duration));
  const minDuration = Math.min(...entries.map(e => e.duration));
  const durationRange = maxDuration - minDuration || 1;

  // Calculate points for the line
  const points = entries.map((entry, idx) => {
    const x = padding.left + (idx / (entries.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((entry.duration - minDuration) / durationRange) * chartHeight;
    return { x, y, entry };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Grid lines (horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + chartHeight * (1 - ratio);
    const value = minDuration + durationRange * ratio;
    return { y, value };
  });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {gridLines.map(({ y, value }, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-200 dark:text-slate-700"
              strokeDasharray="2,2"
            />
            <text
              x={padding.left - 5}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {value.toFixed(0)}ms
            </text>
          </g>
        ))}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-600 dark:text-blue-400"
        />

        {/* Points */}
        {points.map((p, idx) => {
          const isSuccess = p.entry.status >= 200 && p.entry.status < 300;
          return (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="3"
              className={isSuccess ? 'fill-green-500' : 'fill-red-500'}
            >
              <title>
                {new Date(p.entry.timestamp).toLocaleString()}
                {'\n'}Status: {p.entry.status}
                {'\n'}Duration: {p.entry.duration}ms
              </title>
            </circle>
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-slate-600"
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-slate-600"
        />

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-xs fill-gray-500 dark:fill-gray-400"
        >
          Request Sequence →
        </text>
      </svg>
    </div>
  );
}
