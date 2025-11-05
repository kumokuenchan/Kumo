import { useState } from 'react';
import { useSlowQueries } from '../../hooks/usePerformance';
import { Zap, RefreshCw, AlertCircle } from 'lucide-react';

interface SlowQueryViewerProps {
  connectionId: string;
}

export default function SlowQueryViewer({ connectionId }: SlowQueryViewerProps) {
  const [limit, setLimit] = useState(100);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  const { data: slowQueries, isLoading, error, refetch } = useSlowQueries(connectionId, limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading slow queries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Zap className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400">Failed to load slow queries</p>
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
            Slow Query Log
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {slowQueries?.length || 0} slow {slowQueries?.length === 1 ? 'query' : 'queries'} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
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

      {/* Info Banner */}
      {slowQueries && slowQueries.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">No slow queries found</p>
              <p>
                Either your queries are performing well, or the slow query log is not enabled.
                To enable it, set <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">slow_query_log = ON</code> and <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">long_query_time = 1</code> in your MySQL configuration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slow Queries List */}
      {slowQueries && slowQueries.length > 0 && (
        <div className="space-y-3">
          {slowQueries.map((query, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              {/* Query Stats */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Query Time:</span>
                    <span className={`text-sm font-bold ${
                      query.query_time > 10
                        ? 'text-red-600 dark:text-red-400'
                        : query.query_time > 5
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {query.query_time.toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Lock Time:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {query.lock_time.toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Rows Examined:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {query.rows_examined.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Rows Sent:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {query.rows_sent.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {query.start_time}
                </span>
              </div>

              {/* SQL Query */}
              <div className="relative">
                <pre className="text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-3 overflow-x-auto">
                  <code className="text-gray-800 dark:text-gray-200">{query.sql_text}</code>
                </pre>
                <button
                  onClick={() => setSelectedQuery(selectedQuery === query.sql_text ? null : query.sql_text)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
                >
                  {selectedQuery === query.sql_text ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {/* Performance Indicator */}
              <div className="mt-3 flex items-center gap-2">
                {query.query_time > 10 && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                    Critical - Very Slow
                  </span>
                )}
                {query.query_time > 5 && query.query_time <= 10 && (
                  <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                    Warning - Slow
                  </span>
                )}
                {query.query_time <= 5 && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                    Moderate
                  </span>
                )}
                {query.rows_examined > query.rows_sent * 10 && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    Inefficient - Consider Indexing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Optimization Tips:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Queries with high "Rows Examined" but low "Rows Sent" may benefit from better indexes</li>
            <li>Use EXPLAIN to analyze query execution plans</li>
            <li>Consider query caching for frequently executed queries</li>
            <li>Review queries with lock time &gt; 1s for potential deadlocks</li>
          </ul>
        </p>
      </div>
    </div>
  );
}
