import { useState, useEffect, useMemo } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent, useDroppable, useDraggable, pointerWithin } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { MySQLConnection } from '../../types/connection';
import {
  useConnections,
  useDeleteConnection,
  useConnectToDatabase,
  useDisconnectFromDatabase,
  useUpdateConnection,
} from '../../hooks/useConnections';
import ConnectionForm from './ConnectionForm';
import ConnectionListItem from './ConnectionListItem';
import ConfirmDialog from '../../components/ConfirmDialog';
import PasswordPrompt from '../../components/PasswordPrompt';
import ProductionWarningDialog from '../../components/ProductionWarningDialog';

interface ConnectionManagerProps {
  activeConnection: string | null;
  onConnectionSelect: (connectionId: string) => void;
  triggerNew?: number;
  onPasswordCached?: (connectionId: string, password: string) => void;
  actualConnectionStatus?: boolean;
  onBeforeDisconnect?: (connectionId: string) => void;
}

export default function ConnectionManager({
  activeConnection,
  onConnectionSelect,
  triggerNew,
  onPasswordCached,
  actualConnectionStatus,
  onBeforeDisconnect,
}: ConnectionManagerProps) {
  const [editingConnection, setEditingConnection] = useState<MySQLConnection | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MySQLConnection | null>(null);
  const [connectedConnections, setConnectedConnections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('connectedConnections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [passwordPromptFor, setPasswordPromptFor] = useState<MySQLConnection | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [productionWarningFor, setProductionWarningFor] = useState<{
    connection: MySQLConnection;
    password?: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: connections = [], isLoading, error } = useConnections();

  // Group connections by folder name
  const groups = useMemo(() => {
    const map = new Map<string, MySQLConnection[]>();
    for (const c of connections) {
      const g = (c as any).group || 'Ungrouped';
      const list = map.get(g) || [];
      list.push(c);
      map.set(g, list);
    }
    // Sort connections in a group by name
    for (const [k, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      map.set(k, list);
    }
    // Sort groups: Production, Staging, Development first if present, then alphabetical, Ungrouped last
    const order = ['Production', 'Staging', 'Development'];
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const [ga] = a;
      const [gb] = b;
      const ia = ga === 'Ungrouped' ? Infinity : order.indexOf(ga);
      const ib = gb === 'Ungrouped' ? Infinity : order.indexOf(gb);
      const ra = ia === -1 ? Infinity : ia;
      const rb = ib === -1 ? Infinity : ib;
      if (ra !== rb) return ra - rb;
      if (ga === 'Ungrouped') return 1;
      if (gb === 'Ungrouped') return -1;
      return ga.localeCompare(gb);
    });
    return entries;
  }, [connections]);

  // DnD helpers
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (!aid.startsWith('conn:')) return;
    const connId = aid.slice('conn:'.length);
    let newGroup: string | undefined;
    if (oid.startsWith('group:')) {
      newGroup = oid.slice('group:'.length);
    } else if (oid.startsWith('preset:')) {
      newGroup = oid.slice('preset:'.length);
    } else {
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: connId, data: { group: newGroup === 'Ungrouped' ? undefined : newGroup } });
      await queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch (e) {
      console.error('Failed to move connection', e);
    }
  };

  function DroppableGroup({ id, children }: { id: string; children: any }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div ref={setNodeRef} className={isOver ? 'bg-blue-50' : undefined}>
        {children}
      </div>
    );
  }

  function DraggableConn({ id, children }: { id: string; children: any }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id });
    return (
      <div ref={setNodeRef} {...attributes} {...listeners}>
        {children}
      </div>
    );
  }
  const deleteMutation = useDeleteConnection();
  const connectMutation = useConnectToDatabase();
  const disconnectMutation = useDisconnectFromDatabase();
  const updateMutation = useUpdateConnection();

  // Collapsed groups state (persisted)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('connectionGroupsCollapsed');
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const toggleGroupCollapsed = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
      try { localStorage.setItem('connectionGroupsCollapsed', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
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

  const handleConnect = async (connection: MySQLConnection, password?: string) => {
    setConnectError(null);

    // Determine which password to use
    const connectionPassword = password || connection.password;

    // If we don't have a password, prompt for it
    if (!connectionPassword) {
      setPasswordPromptFor(connection);
      return;
    }

    // Check if this is a production connection and show warning
    if (connection.environment === 'production') {
      setProductionWarningFor({ connection, password: connectionPassword });
      return;
    }

    // Proceed with connection
    await performConnect(connection, connectionPassword);
  };

  const performConnect = async (connection: MySQLConnection, password: string) => {
    try {
      // Backend will decrypt password if needed
      await connectMutation.mutateAsync({
        id: connection.id,
        password: password,
      });

      setConnectedConnections((prev) => new Set(prev).add(connection.id));
      onConnectionSelect(connection.id);

      // Cache password in memory for auto-reconnect
      if (onPasswordCached && password) {
        onPasswordCached(connection.id, password);
      }

      // Invalidate connection status to update UI
      await queryClient.invalidateQueries({ queryKey: ['connectionStats', connection.id] });
    } catch (error: any) {
      console.error('Failed to connect:', error);
      setConnectError(error?.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      // Notify parent that this is an intentional disconnect
      if (onBeforeDisconnect) {
        onBeforeDisconnect(connectionId);
      }

      await disconnectMutation.mutateAsync(connectionId);
      setConnectedConnections((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });

      // Invalidate connection status to update UI
      await queryClient.invalidateQueries({ queryKey: ['connectionStats', connectionId] });
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

  // Sync actual connection status with local state for active connection
  useEffect(() => {
    if (!activeConnection) return;

    // If we have the actual connection status from the backend
    if (actualConnectionStatus !== undefined) {
      const isLocallyConnected = connectedConnections.has(activeConnection);

      // If backend says disconnected but local state says connected, sync it
      if (!actualConnectionStatus && isLocallyConnected) {
        setConnectedConnections((prev) => {
          const next = new Set(prev);
          next.delete(activeConnection);
          return next;
        });
      }
      // If backend says connected but local state says disconnected, sync it
      else if (actualConnectionStatus && !isLocallyConnected) {
        setConnectedConnections((prev) => {
          const next = new Set(prev);
          next.add(activeConnection);
          return next;
        });
      }
    }
  }, [activeConnection, actualConnectionStatus, connectedConnections]);

  // Auto-reconnect on page load - DISABLED
  // Note: Auto-reconnect on page load is disabled because passwords are no longer
  // returned from the API for security reasons. Users will need to manually reconnect
  // after refreshing the page. Auto-reconnect during the session still works.

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
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

            {/* Grouped Connections with drag-and-drop + collapse */}
            {connections.length > 0 && (
              <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={pointerWithin}>
                {/* Quick preset drop targets */}
                <div className="px-3 mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 overflow-x-hidden">
                  <span>Presets:</span>
                  {['Production', 'Staging', 'Development'].map((g) => (
                    <DroppableGroup key={g} id={`preset:${g}`}>
                      <span className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 cursor-move select-none inline-flex items-center justify-center min-w-[80px]">{g}</span>
                    </DroppableGroup>
                  ))}
                  <DroppableGroup id={`preset:Ungrouped`}>
                    <span className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 cursor-move select-none inline-flex items-center justify-center min-w-[80px]">Ungrouped</span>
                  </DroppableGroup>
                </div>

                <div>
                  {groups.map(([groupName, list]) => (
                    <DroppableGroup key={groupName} id={`group:${groupName}`}>
                      <div className="mb-3">
                        <div className="px-3 py-1 flex items-center justify-between">
                          <button
                            className="text-xs font-semibold text-gray-500 uppercase inline-flex items-center gap-1"
                            onClick={() => toggleGroupCollapsed(groupName)}
                          >
                            <svg className={`w-3 h-3 transition-transform ${collapsedGroups.has(groupName) ? '' : 'rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 6L14 10L6 14V6Z"/>
                            </svg>
                            {groupName}
                          </button>
                        </div>
                        {!collapsedGroups.has(groupName) ? (
                          <div>
                            {list.map((connection) => (
                              <DraggableConn key={connection.id} id={`conn:${connection.id}`}>
                                <ConnectionListItem
                                  connection={connection}
                                  isActive={activeConnection === connection.id}
                                  isConnected={connectedConnections.has(connection.id)}
                                  onSelect={() => onConnectionSelect(connection.id)}
                                  onEdit={() => handleEditClick(connection)}
                                  onDelete={() => handleDeleteClick(connection)}
                                  onConnect={() => handleConnect(connection)}
                                  onDisconnect={() => handleDisconnect(connection.id)}
                                />
                              </DraggableConn>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-400">Collapsed — drag a connection here to move to this group.</div>
                        )}
                      </div>
                    </DroppableGroup>
                  ))}
                </div>
              </DndContext>
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
          const connection = passwordPromptFor;
          setPasswordPromptFor(null);

          // Check if this is a production connection and show warning
          if (connection.environment === 'production') {
            setProductionWarningFor({ connection, password });
            return;
          }

          // Otherwise proceed with connection
          await performConnect(connection, password);
        }}
      />

      {/* Production Warning Dialog */}
      {productionWarningFor && (
        <ProductionWarningDialog
          connectionName={productionWarningFor.connection.name}
          onConfirm={async () => {
            const { connection, password } = productionWarningFor;
            setProductionWarningFor(null);
            if (password) {
              await performConnect(connection, password);
            }
          }}
          onCancel={() => setProductionWarningFor(null)}
        />
      )}

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
