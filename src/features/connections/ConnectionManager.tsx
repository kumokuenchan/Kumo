import { useState, useEffect } from 'react';
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
  triggerNew?: number;
}

export default function ConnectionManager({
  activeConnection,
  onConnectionSelect,
  triggerNew,
}: ConnectionManagerProps) {
  const [editingConnection, setEditingConnection] = useState<MySQLConnection | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MySQLConnection | null>(null);
  const [connectedConnections, setConnectedConnections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('connectedConnections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
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

  const [showModal, setShowModal] = useState(false);

  // Watch for external trigger to open new connection form
  useEffect(() => {
    if (triggerNew && triggerNew > 0) {
      handleCreateClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNew]);

  // Persist connected connections to localStorage
  useEffect(() => {
    localStorage.setItem('connectedConnections', JSON.stringify(Array.from(connectedConnections)));
  }, [connectedConnections]);

  // Auto-reconnect on page load
  useEffect(() => {
    if (!connections || connections.length === 0) return;

    // Only run auto-reconnect once on initial load
    const hasAutoReconnected = sessionStorage.getItem('hasAutoReconnected');
    if (hasAutoReconnected) return;

    // Get connections that should be reconnected
    const connectionsToReconnect = connections.filter(
      (conn) => connectedConnections.has(conn.id) && conn.password
    );

    console.log('Auto-reconnect check:', {
      totalConnections: connections.length,
      connectedConnectionsSet: Array.from(connectedConnections),
      connectionsWithPasswords: connections.filter(c => c.password).map(c => c.id),
      toReconnect: connectionsToReconnect.length,
    });

    if (connectionsToReconnect.length === 0) {
      sessionStorage.setItem('hasAutoReconnected', 'true');
      console.log('No connections to auto-reconnect');
      return;
    }

    // Reconnect all previously connected connections that have saved passwords
    const reconnectAll = async () => {
      console.log(`Auto-reconnecting ${connectionsToReconnect.length} connection(s)...`);
      for (const connection of connectionsToReconnect) {
        try {
          console.log(`Connecting to ${connection.name}...`);
          await connectMutation.mutateAsync({
            id: connection.id,
            password: connection.password,
          });
          console.log(`Successfully reconnected to ${connection.name}`);
        } catch (error) {
          console.error(`Failed to auto-reconnect to ${connection.name}:`, error);
          // Remove from connected set if auto-reconnect fails
          setConnectedConnections((prev) => {
            const next = new Set(prev);
            next.delete(connection.id);
            return next;
          });
        }
      }
      sessionStorage.setItem('hasAutoReconnected', 'true');
    };

    reconnectAll();
  }, [connections, connectedConnections, connectMutation]);

  const handleCreateClick = () => {
    setEditingConnection(null);
    setShowModal(true);
  };

  const handleEditClick = (connection: MySQLConnection) => {
    setEditingConnection(connection);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConnection(null);
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingConnection(null);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Connections</h2>
          <button
            onClick={handleCreateClick}
            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          <>
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8 text-gray-500 text-sm">Loading connections...</div>
            )}

            {/* Error State */}
            {error && (
              <div className="mx-3 p-3 bg-red-50 text-red-700 rounded text-sm">
                Failed to load connections: {error.message}
              </div>
            )}

            {/* Active Connections */}
            {recentConnections.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1 px-3">
                  Active
                </h3>
                <div>
                  {recentConnections.map((connection) => (
                    <ConnectionListItem
                      key={connection.id}
                      connection={connection}
                      isActive={activeConnection === connection.id}
                      isConnected={connectedConnections.has(connection.id)}
                      onSelect={() => onConnectionSelect(connection.id)}
                      onEdit={() => handleEditClick(connection)}
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1 px-3">
                  All Connections
                </h3>
                <div>
                  {sortedConnections.map((connection) => (
                    <ConnectionListItem
                      key={connection.id}
                      connection={connection}
                      isActive={activeConnection === connection.id}
                      isConnected={connectedConnections.has(connection.id)}
                      onSelect={() => onConnectionSelect(connection.id)}
                      onEdit={() => handleEditClick(connection)}
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
                  onClick={handleCreateClick}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create First Connection
                </button>
              </div>
            )}
          </>
        </div>

        {/* Connect Error */}
        {connectError && (
          <div className="mx-3 mb-3 p-3 bg-red-50 text-red-700 rounded text-sm">
            {connectError}
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

      {/* Connection Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingConnection ? 'Edit Connection' : 'New Connection'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">MySQL</span>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <ConnectionForm
                connection={editingConnection || undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
