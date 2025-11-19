import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogEntry, ApiCall } from '../LogViewerPage';
import { AlertTriangle, Clock } from 'lucide-react';

interface ErrorFrequencyChartProps {
  logEntries: LogEntry[];
  slowApiCalls: ApiCall[];
}

export default function ErrorFrequencyChart({ logEntries, slowApiCalls }: ErrorFrequencyChartProps) {
  const stats = useMemo(() => {
    const errorCount = logEntries.filter((e) => e.level === 'ERROR').length;
    const warnCount = logEntries.filter((e) => e.level === 'WARN').length;
    const infoCount = logEntries.filter((e) => e.level === 'INFO').length;
    const debugCount = logEntries.filter((e) => e.level === 'DEBUG').length;

    return {
      errorCount,
      warnCount,
      infoCount,
      debugCount,
      total: logEntries.length
    };
  }, [logEntries]);

  const chartData = [
    { name: 'ERROR', count: stats.errorCount, fill: '#ef4444' },
    { name: 'WARN', count: stats.warnCount, fill: '#f59e0b' },
    { name: 'INFO', count: stats.infoCount, fill: '#3b82f6' },
    { name: 'DEBUG', count: stats.debugCount, fill: '#6b7280' }
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Analytics</h3>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-900/20 border border-red-900/50 rounded p-2">
          <div className="text-xs text-red-400">Errors</div>
          <div className="text-xl font-bold text-red-500">{stats.errorCount}</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-900/50 rounded p-2">
          <div className="text-xs text-yellow-400">Warnings</div>
          <div className="text-xl font-bold text-yellow-500">{stats.warnCount}</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-900/50 rounded p-2">
          <div className="text-xs text-blue-400">Info</div>
          <div className="text-xl font-bold text-blue-500">{stats.infoCount}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded p-2">
          <div className="text-xs text-gray-400">Debug</div>
          <div className="text-xl font-bold text-gray-500">{stats.debugCount}</div>
        </div>
      </div>

      {/* Chart */}
      {stats.total > 0 && (
        <div className="bg-gray-900 rounded p-3">
          <p className="text-xs text-gray-400 mb-2">Log Level Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '10px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Slow API Calls */}
      {slowApiCalls.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-900/50 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <h4 className="text-xs font-semibold text-orange-400">Slow API Calls</h4>
          </div>
          <div className="space-y-2 max-h-40 overflow-auto">
            {slowApiCalls.slice(0, 5).map((call, i) => (
              <div key={i} className="text-xs bg-gray-900 rounded p-2">
                <div className="text-gray-300 font-mono truncate" title={call.endpoint}>
                  {call.endpoint}
                </div>
                <div className="text-orange-400 font-bold">{call.duration}ms</div>
              </div>
            ))}
            {slowApiCalls.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{slowApiCalls.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Indicator */}
      <div className="bg-gray-900 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-400">Log Health</h4>
        </div>
        <div className="text-xs text-gray-500">
          {stats.errorCount === 0 && stats.warnCount === 0 ? (
            <span className="text-green-400">✓ No errors or warnings detected</span>
          ) : (
            <div className="space-y-1">
              {stats.errorCount > 0 && (
                <div className="text-red-400">⚠ {stats.errorCount} errors found</div>
              )}
              {stats.warnCount > 0 && (
                <div className="text-yellow-400">⚠ {stats.warnCount} warnings found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
