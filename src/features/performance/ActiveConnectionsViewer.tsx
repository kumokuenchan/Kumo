import { useState } from 'react';
import { useActiveConnections, useKillQuery } from '../../hooks/usePerformance';
import { Database, X, RefreshCw, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';

interface ActiveConnectionsViewerProps {
  connectionId: string;
}

export default function ActiveConnectionsViewer({ connectionId }: ActiveConnectionsViewerProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [killProcessId, setKillProcessId] = useState<number | null>(null);

  const { data: connections, isLoading, error, refetch } = useActiveConnections(
    connectionId,
    autoRefresh ? 3000 : undefined
  );

  const killMutation = useKillQuery();

  const handleKillQuery = async (processId: number) => {
    try {
      await killMutation.mutateAsync({ connectionId, processId });
      setKillProcessId(null);
    } catch (error) {
      console.error('Failed to kill query:', error);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Database className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400">Failed to load connections</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const activeConnections = connections?.filter(c => c.command !== 'Sleep') || [];
  const sleepingConnections = connections?.filter(c => c.command === 'Sleep') || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Connections
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {connections?.length || 0} total ({activeConnections.length} active, {sleepingConnections.length} sleeping)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            Auto-refresh (3s)
          </label>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Active Connections Table */}
      {activeConnections.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Active Queries ({activeConnections.length})
          </h4>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Database
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Command
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {activeConnections.map((conn) => (
                    <tr key={conn.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {conn.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {conn.user}
                        <div className="text-xs text-gray-500 dark:text-gray-400">{conn.host}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {conn.db || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {conn.command}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        <span className={conn.time > 60 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                          {formatTime(conn.time)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {conn.state || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-md">
                        <div className="truncate" title={conn.info || ''}>
                          {conn.info || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => setKillProcessId(conn.id)}
                          disabled={killMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          Kill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sleeping Connections */}
      {sleepingConnections.length > 0 && (
        <details className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
            Sleeping Connections ({sleepingConnections.length})
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Database
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {sleepingConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{conn.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {conn.user}
                      <div className="text-xs text-gray-500 dark:text-gray-400">{conn.host}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{conn.db || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatTime(conn.time)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setKillProcessId(conn.id)}
                        disabled={killMutation.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-3 h-3" />
                        Kill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Empty State */}
      {connections && connections.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No active connections</p>
        </div>
      )}

      {/* Kill Confirmation Dialog */}
      {killProcessId !== null && (
        <ConfirmDialog
          isOpen={true}
          title="Kill Connection"
          message={`Are you sure you want to kill connection ${killProcessId}? This will terminate the running query.`}
          confirmLabel="Kill Connection"
          onConfirm={() => handleKillQuery(killProcessId)}
          onCancel={() => setKillProcessId(null)}
          isLoading={killMutation.isPending}
        />
      )}
    </div>
  );
}
