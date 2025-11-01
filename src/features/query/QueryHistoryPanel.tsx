import { useState } from 'react';
import {
  useQueryHistory,
  useSearchQueryHistory,
  useDeleteQueryHistory,
  useClearConnectionHistory,
} from '../../hooks/useQuery';
import { QueryHistoryEntry } from '../../api/query';

interface QueryHistoryPanelProps {
  connectionId: string;
  onSelectQuery: (sql: string, queryName?: string) => void;
}

export default function QueryHistoryPanel({
  connectionId,
  onSelectQuery,
}: QueryHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data: history = [], isLoading } = useQueryHistory(connectionId, 50);
  const { data: searchResults = [] } = useSearchQueryHistory(
    searchQuery,
    connectionId,
    50
  );
  const deleteMutation = useDeleteQueryHistory();
  const clearMutation = useClearConnectionHistory();

  const displayedHistory = searchQuery ? searchResults : history;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this query from history?')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const handleClearHistory = async () => {
    await clearMutation.mutateAsync({ connectionId });
    setShowClearConfirm(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateSQL = (sql: string, maxLength: number = 100) => {
    if (sql.length <= maxLength) return sql;
    return sql.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Query History</h3>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            title="Clear History"
          >
            Clear All
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search queries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading history...</div>
        ) : displayedHistory.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery ? 'No matching queries found' : 'No query history yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayedHistory.map((entry: QueryHistoryEntry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                onClick={() => onSelectQuery(entry.sql)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className={`text-xs font-semibold ${
                      entry.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {entry.success ? '✓ Success' : '✗ Failed'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {truncateSQL(entry.sql)}
                </pre>

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{entry.executionTime}ms</span>
                  {entry.rowCount !== undefined && (
                    <span>
                      {entry.rowCount} {entry.rowCount === 1 ? 'row' : 'rows'}
                    </span>
                  )}
                </div>

                {!entry.success && entry.error && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {entry.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Clear Query History?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This will permanently delete all query history for this connection. This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
