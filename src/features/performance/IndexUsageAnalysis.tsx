import { useIndexUsageStats } from '../../hooks/usePerformance';
import { List, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface IndexUsageAnalysisProps {
  connectionId: string;
  database?: string;
}

export default function IndexUsageAnalysis({ connectionId, database }: IndexUsageAnalysisProps) {
  const { data: indexStats, isLoading, error, refetch } = useIndexUsageStats(connectionId, database);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading index usage statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <List className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400">Failed to load index statistics</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Group by table
  const groupedStats = indexStats?.reduce((acc, stat) => {
    const key = `${stat.table_schema}.${stat.table_name}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(stat);
    return acc;
  }, {} as Record<string, typeof indexStats>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Index Usage Analysis
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {indexStats?.length || 0} {indexStats?.length === 1 ? 'index' : 'indexes'} analyzed
            {database && ` in ${database}`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      {indexStats && indexStats.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            No index usage data available. Make sure the Performance Schema is enabled and queries have been executed.
          </p>
        </div>
      )}

      {/* Index Usage by Table */}
      {groupedStats && Object.keys(groupedStats).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedStats).map(([tableName, indexes]) => {
            const totalReads = indexes.reduce((sum, idx) => sum + idx.rows_read, 0);
            return (
              <div
                key={tableName}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                {/* Table Header */}
                <div className="bg-gray-50 dark:bg-slate-900 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tableName}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {indexes.length} {indexes.length === 1 ? 'index' : 'indexes'} • {totalReads.toLocaleString()} total reads
                    </span>
                  </div>
                </div>

                {/* Index List */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Index Name
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Rows Read
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Avg Rows Read
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Usage %
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                      {indexes.map((index, idx) => {
                        const usagePercent = totalReads > 0 ? (index.rows_read / totalReads) * 100 : 0;
                        const isHighUsage = usagePercent > 50;
                        const isMediumUsage = usagePercent > 20 && usagePercent <= 50;

                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {index.index_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                              {index.rows_read.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                              {index.rows_read_avg.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      isHighUsage
                                        ? 'bg-green-600 dark:bg-green-400'
                                        : isMediumUsage
                                        ? 'bg-yellow-600 dark:bg-yellow-400'
                                        : 'bg-red-600 dark:bg-red-400'
                                    }`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 w-12 text-right">
                                  {usagePercent.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {isHighUsage ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                  <TrendingUp className="w-3 h-3" />
                                  Well Used
                                </span>
                              ) : isMediumUsage ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                                  Moderate
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                  <TrendingDown className="w-3 h-3" />
                                  Underused
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Index Optimization Tips:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Indexes with very low usage (&lt;1%) might be candidates for removal</li>
            <li>Removing unused indexes can improve write performance (INSERT/UPDATE/DELETE)</li>
            <li>Monitor index usage over time before making changes</li>
            <li>Consider composite indexes for frequently queried column combinations</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
