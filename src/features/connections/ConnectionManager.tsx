import { useState } from 'react';
import { MySQLConnection } from '../../types/connection';
import {
  useConnections,
  useDeleteConnection,
  useConnectToDatabase,
  useDisconnectFromDatabase,
} from '../../hooks/useConnections';
import ConnectionForm from './ConnectionForm';
import ConnectionListItem from './ConnectionListItem';
import ConfirmDialog from '../../components/ConfirmDialog';
import PasswordPrompt from '../../components/PasswordPrompt';

interface ConnectionManagerProps {
  activeConnection: string | null;
  onConnectionSelect: (connectionId: string) => void;
}

type View = 'list' | 'create' | 'edit';

export default function ConnectionManager({
  activeConnection,
  onConnectionSelect,
}: ConnectionManagerProps) {
  const [view, setView] = useState<View>('list');
  const [editingConnection, setEditingConnection] = useState<MySQLConnection | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MySQLConnection | null>(null);
  const [connectedConnections, setConnectedConnections] = useState<Set<string>>(new Set());
  const [passwordPromptFor, setPasswordPromptFor] = useState<MySQLConnection | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const { data: connections = [], isLoading, error } = useConnections();
  const deleteMutation = useDeleteConnection();
  const connectMutation = useConnectToDatabase();
  const disconnectMutation = useDisconnectFromDatabase();

  const handleCreate = () => {
    setView('create');
    setEditingConnection(null);
  };

  const handleEdit = (connection: MySQLConnection) => {
    setEditingConnection(connection);
    setView('edit');
  };

  const handleDeleteClick = (connection: MySQLConnection) => {
    setDeleteConfirm(connection);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);

      // If the deleted connection was active, clear it
      if (activeConnection === deleteConfirm.id) {
        onConnectionSelect('');
      }

      // Remove from connected set
      setConnectedConnections((prev) => {
        const next = new Set(prev);
        next.delete(deleteConfirm.id);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const handleConnect = async (connection: MySQLConnection) => {
    setConnectError(null);
    // If we don't have a password (not persisted), prompt for it
    if (!connection.password) {
      setPasswordPromptFor(connection);
      return;
    }

    try {
      await connectMutation.mutateAsync({
        id: connection.id,
        password: connection.password,
      });

      setConnectedConnections((prev) => new Set(prev).add(connection.id));
      onConnectionSelect(connection.id);
    } catch (error: any) {
      console.error('Failed to connect:', error);
      setConnectError(error?.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await disconnectMutation.mutateAsync(connectionId);
      setConnectedConnections((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleFormSuccess = () => {
    setView('list');
    setEditingConnection(null);
  };

  const handleCancel = () => {
    setView('list');
    setEditingConnection(null);
  };

  // Sort connections: connected first, then by last used
  const sortedConnections = [...connections].sort((a, b) => {
    const aConnected = connectedConnections.has(a.id);
    const bConnected = connectedConnections.has(b.id);

    if (aConnected && !bConnected) return -1;
    if (!aConnected && bConnected) return 1;

    // Sort by last used
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    if (a.lastUsed) return -1;
    if (b.lastUsed) return 1;

    return 0;
  });

  // Get recent connections (last 3 used)
  const recentConnections = sortedConnections
    .filter((c) => c.lastUsed)
    .slice(0, 3);

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {view === 'list' ? 'Connections' : view === 'create' ? 'New Connection' : 'Edit Connection'}
        </h2>
        {view === 'list' && (
          <button
            onClick={handleCreate}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            New
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' ? (
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8 text-gray-500">Loading connections...</div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                Failed to load connections: {error.message}
              </div>
            )}

            {/* Recent Connections */}
            {recentConnections.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                  Recent
                </h3>
                <div className="space-y-2">
                  {recentConnections.map((connection) => (
                    <ConnectionListItem
                      key={connection.id}
                      connection={connection}
                      isActive={activeConnection === connection.id}
                      isConnected={connectedConnections.has(connection.id)}
                      onSelect={() => onConnectionSelect(connection.id)}
                      onEdit={() => handleEdit(connection)}
                      onDelete={() => handleDeleteClick(connection)}
                      onConnect={() => handleConnect(connection)}
                      onDisconnect={() => handleDisconnect(connection.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Connections */}
            {connections.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                  All Connections
                </h3>
                <div className="space-y-2">
                  {sortedConnections.map((connection) => (
                    <ConnectionListItem
                      key={connection.id}
                      connection={connection}
                      isActive={activeConnection === connection.id}
                      isConnected={connectedConnections.has(connection.id)}
                      onSelect={() => onConnectionSelect(connection.id)}
                      onEdit={() => handleEdit(connection)}
                      onDelete={() => handleDeleteClick(connection)}
                      onConnect={() => handleConnect(connection)}
                      onDisconnect={() => handleDisconnect(connection.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && connections.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No connections yet</p>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create First Connection
                </button>
              </div>
            )}
          </>
        ) : (
          /* Form View */
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <ConnectionForm
              connection={editingConnection || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Connection"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={deleteMutation.isPending}
      />

      {/* Connect Error */}
      {connectError && (
        <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">
          {connectError}
        </div>
      )}

      {/* Password Prompt for Connect */}
      <PasswordPrompt
        isOpen={passwordPromptFor !== null}
        title="Database Password Required"
        message={
          passwordPromptFor
            ? `Enter password for ${passwordPromptFor.username}@${passwordPromptFor.host}:${passwordPromptFor.port}`
            : undefined
        }
        isLoading={connectMutation.isPending}
        onCancel={() => setPasswordPromptFor(null)}
        onSubmit={async (password) => {
          if (!passwordPromptFor) return;
          try {
            await connectMutation.mutateAsync({ id: passwordPromptFor.id, password });
            setConnectedConnections((prev) => new Set(prev).add(passwordPromptFor.id));
            onConnectionSelect(passwordPromptFor.id);
          } catch (error: any) {
            console.error('Failed to connect:', error);
            setConnectError(error?.message || 'Failed to connect');
          } finally {
            setPasswordPromptFor(null);
          }
        }}
      />
    </div>
  );
}
