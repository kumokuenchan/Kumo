import { useState } from 'react';
import { useQueryStats } from '../../hooks/usePerformance';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface QueryStatsViewerProps {
  connectionId: string;
}

export default function QueryStatsViewer({ connectionId }: QueryStatsViewerProps) {
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<'count' | 'time' | 'rows'>('count');

  const { data: queryStats, isLoading, error, refetch } = useQueryStats(connectionId, limit);

  // Sort query stats based on selected criteria
  const sortedStats = queryStats?.slice().sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return b.count_star - a.count_star;
      case 'time':
        return b.avg_timer_wait - a.avg_timer_wait;
      case 'rows':
        return b.sum_rows_examined - a.sum_rows_examined;
      default:
        return 0;
    }
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}µs`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading query statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400">Failed to load query statistics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Query Execution Statistics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Top {sortedStats?.length || 0} most executed query patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'count' | 'time' | 'rows')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="count">Sort by Execution Count</option>
            <option value="time">Sort by Avg Time</option>
            <option value="rows">Sort by Rows Examined</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Query Stats Table */}
      {sortedStats && sortedStats.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Query Pattern
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Executions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rows Examined
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rows Sent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {sortedStats.map((stat, index) => {
                  const efficiency = stat.sum_rows_examined > 0
                    ? (stat.sum_rows_sent / stat.sum_rows_examined) * 100
                    : 100;

                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-2xl">
                        <div className="truncate font-mono text-xs" title={stat.digest_text}>
                          {stat.digest_text}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {stat.count_star.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          stat.avg_timer_wait > 5
                            ? 'text-red-600 dark:text-red-400'
                            : stat.avg_timer_wait > 1
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {formatDuration(stat.avg_timer_wait)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        {stat.sum_rows_examined.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-gray-700 dark:text-gray-300">
                            {stat.sum_rows_sent.toLocaleString()}
                          </span>
                          {efficiency < 10 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                              Low Efficiency
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        <div>{new Date(stat.first_seen).toLocaleDateString()}</div>
                        <div>to {new Date(stat.last_seen).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            No query statistics available. Make sure the Performance Schema is enabled and queries have been executed.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {sortedStats && sortedStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              Total Executions
            </h4>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {sortedStats.reduce((sum, s) => sum + s.count_star, 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
              Avg Query Time
            </h4>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatDuration(
                sortedStats.reduce((sum, s) => sum + s.avg_timer_wait, 0) / sortedStats.length
              )}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
              Total Rows Examined
            </h4>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {sortedStats.reduce((sum, s) => sum + s.sum_rows_examined, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Performance Tips:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Focus on queries with high execution counts and long average times</li>
            <li>Queries with "Low Efficiency" examine many rows but return few - consider optimization</li>
            <li>Use EXPLAIN on frequently executed slow queries to identify optimization opportunities</li>
            <li>Monitor trends over time to catch performance degradation early</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
