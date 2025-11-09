import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDatabases } from '../../hooks/useSchema';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import TreeNode from './TreeNode';
import AddToGroupModal from './AddToGroupModal';
import { Database } from '../../api/schema';

interface SchemaTreeProps {
  connectionId: string | null;
  onNodeSelect?: (node: TreeNodeData) => void;
  selectedNode?: TreeNodeData | null;
  onViewData?: (database: string, table: string) => void;
  onCreateTable?: (database: string) => void;
  onEditTable?: (database: string, table: string) => void;
  onDropTable?: (database: string, table: string) => void;
  onExportSchema?: (database: string, table?: string) => void;
  onShowCreateTable?: (database: string, table: string) => void;
  onGenerateQuery?: (database: string, table: string) => void;
  onDumpSQL?: (database: string, table: string) => void;
  onEmptyTable?: (database: string, table: string) => void;
  onTruncateTable?: (database: string, table: string) => void;
  onRenameTable?: (database: string, table: string) => void;
  onDuplicateTable?: (database: string, table: string, includeData: boolean) => void;
  onBackupDatabase?: (database: string) => void;
  onRestoreDatabase?: (database: string) => void;
  onAnalyzeTable?: (database: string, table: string) => void;
  // When provided, only show this database's tables and hide others
  onlyDatabase?: string;
  // Restrict destructive/DDL actions for table nodes (used in Query tab)
  restrictTableActions?: boolean;
}

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'database' | 'table' | 'column' | 'index' | 'foreign-key' | 'view' | 'routine' | 'trigger' | 'fields' | 'group';
  parent?: string;
  metadata?: any;
}

export default function SchemaTree({
  connectionId,
  onNodeSelect,
  selectedNode,
  onViewData,
  onCreateTable,
  onEditTable,
  onDropTable,
  onExportSchema,
  onShowCreateTable,
  onGenerateQuery,
  onDumpSQL,
  onEmptyTable,
  onTruncateTable,
  onRenameTable,
  onDuplicateTable,
  onBackupDatabase,
  onRestoreDatabase,
  onAnalyzeTable,
  onlyDatabase,
  restrictTableActions,
}: SchemaTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('schemaTree_expandedNodes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [grouping, setGrouping] = useState<'none' | 'type' | 'letter' | 'custom'>(() => {
    try {
      const saved = localStorage.getItem('schemaTree_grouping');
      return (saved === 'type' || saved === 'letter' || saved === 'custom') ? (saved as any) : 'none';
    } catch { return 'none'; }
  });
  // Custom groups storage key (per-connection and per-scope)
  const storageKey = useMemo(() => {
    const scope = onlyDatabase || 'all';
    const conn = connectionId || 'conn';
    return `schemaTree_customGroups:${conn}:${scope}`;
  }, [connectionId, onlyDatabase]);

  const globalKey = useMemo(() => {
    const scope = onlyDatabase || 'all';
    return `schemaTree_customGroups:global:${scope}`;
  }, [onlyDatabase]);

  // Custom groups: { groupName: ["db.table", ...] }
  const [customGroups, setCustomGroups] = useState<Record<string, string[]>>(() => {
    try {
      // Attempt primary
      let raw = localStorage.getItem(storageKey);
      if (!raw) {
        // Fallback to global scope
        raw = localStorage.getItem(globalKey) || undefined;
      }
      if (!raw) {
        // As a last resort, search any matching keys for this scope
        const scope = onlyDatabase || 'all';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('schemaTree_customGroups:') && k.endsWith(`:${scope}`)) {
            raw = localStorage.getItem(k) || undefined;
            if (raw) break;
          }
        }
      }
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Track which storageKey has been loaded to avoid overwriting with empty
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (loadedKey !== storageKey) return; // don't save until current key is loaded
    try {
      const payload = JSON.stringify(customGroups);
      localStorage.setItem(storageKey, payload);
      // Also keep a global copy so groups persist even if connectionId changes
      localStorage.setItem(globalKey, payload);
    } catch {}
  }, [customGroups, storageKey, globalKey, loadedKey]);

  // Reload custom groups whenever the storage key (scope/connection) changes
  useEffect(() => {
    try {
      let raw = localStorage.getItem(storageKey);
      if (!raw) {
        // Prefer global scope when specific connection key not present
        raw = localStorage.getItem(globalKey) || undefined;
      }
      if (!raw) {
        // Fallback migration: earlier sessions might have saved under a placeholder key
        const scope = onlyDatabase || 'all';
        const fallback1 = `schemaTree_customGroups:conn:${scope}`;
        const fallback2 = `schemaTree_customGroups:conn:all`;
        raw = localStorage.getItem(fallback1) || localStorage.getItem(fallback2) || undefined;
        if (raw) {
          // Migrate to the scoped key
          try { localStorage.setItem(storageKey, raw); } catch {}
        }
      }
      if (!raw) {
        // As a last resort, search any matching keys for this scope
        const scope = onlyDatabase || 'all';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('schemaTree_customGroups:') && k.endsWith(`:${scope}`)) {
            raw = localStorage.getItem(k) || undefined;
            if (raw) break;
          }
        }
      }
      setCustomGroups(raw ? JSON.parse(raw) : {});
      setLoadedKey(storageKey);
    } catch {
      // ignore corrupt data
    }
  }, [storageKey, globalKey, onlyDatabase]);

  // Reset loaded guard when key changes (before load effect runs)
  useEffect(() => { setLoadedKey(null); }, [storageKey]);

  // Auto-expand the current database if limited
  useEffect(() => {
    if (onlyDatabase) {
      const id = `db:${onlyDatabase}`;
      setExpandedNodes((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    }
  }, [onlyDatabase]);

  const queryClient = useQueryClient();

  const { data: connectionStatus } = useConnectionStatus(connectionId);
  const isConnected = !!connectionStatus?.isConnected;

  const { data: databases = [], isLoading, error, refetch } = useDatabases(
    isConnected ? connectionId : null
  );

  // Persist expanded nodes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('schemaTree_expandedNodes', JSON.stringify(Array.from(expandedNodes)));
    } catch (error) {
      console.error('Failed to save expanded nodes:', error);
    }
  }, [expandedNodes]);

  useEffect(() => {
    try { localStorage.setItem('schemaTree_grouping', grouping); } catch {}
  }, [grouping]);

  // Convert databases to tree node data
  const databaseNodes: TreeNodeData[] = useMemo(() => {
    const nodes = databases.map((db: Database) => ({
      id: `db:${db.name}`,
      name: db.name,
      type: 'database' as const,
      metadata: { charset: db.charset, collation: db.collation },
    }));
    if (onlyDatabase) {
      const match = nodes.find(n => n.name === onlyDatabase);
      if (match) return [match];
      // Fallback: fabricate a node so tables can still lazy-load
      return [{ id: `db:${onlyDatabase}`, name: onlyDatabase, type: 'database' as const } as TreeNodeData];
    }
    return nodes;
  }, [databases, onlyDatabase]);
  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  // Filter nodes based on search (table filtering is handled in TreeNode; here we just pass databases)
  const filteredNodes = useMemo(() => {
    return databaseNodes;
  }, [databaseNodes]);
  // Modal state for adding to a group
  const [pendingAdd, setPendingAdd] = useState<{ database: string; table: string } | null>(null);

  const handleAddToCustomGroup = (database: string, table: string) => {
    setPendingAdd({ database, table });
  };

  const commitAddToCustomGroup = (group: string) => {
    if (!pendingAdd) return;
    const { database, table } = pendingAdd;
    const groupName = (group || '').trim();
    if (!groupName) { setPendingAdd(null); return; }
    const key = `${database}.${table}`;
    setCustomGroups((prev) => {
      const next = { ...prev } as Record<string, string[]>;
      const list = next[groupName] ? [...next[groupName]] : [];
      if (!list.includes(key)) list.push(key);
      next[groupName] = list;
      try {
        const payload = JSON.stringify(next);
        localStorage.setItem(storageKey, payload);
        localStorage.setItem(globalKey, payload);
      } catch {}
      setLoadedKey(storageKey);
      return next;
    });
    setPendingAdd(null);
    if (grouping !== 'custom') setGrouping('custom');
  };

  const handleRemoveFromCustomGroup = (database: string, table: string, groupName: string) => {
    const key = `${database}.${table}`;
    setCustomGroups((prev) => {
      const next: Record<string, string[]> = { ...prev };
      const list = (next[groupName] || []).filter((k) => k !== key);
      if (list.length > 0) {
        next[groupName] = list;
      } else {
        delete next[groupName];
      }
      try {
        const payload = JSON.stringify(next);
        localStorage.setItem(storageKey, payload);
        localStorage.setItem(globalKey, payload);
      } catch {}
      setLoadedKey(storageKey);
      return next;
    });
  };

  const handleNodeSelect = (node: TreeNodeData) => {
    onNodeSelect?.(node);
  };

  const handleRefresh = () => {
    // Refetch databases
    refetch();

    // Invalidate all table queries to ensure fresh data after restore/update
    if (connectionId) {
      queryClient.invalidateQueries({
        queryKey: ['tables', connectionId]
      });
      queryClient.invalidateQueries({
        queryKey: ['columns', connectionId]
      });
      queryClient.invalidateQueries({
        queryKey: ['indexes', connectionId]
      });
      queryClient.invalidateQueries({
        queryKey: ['foreignKeys', connectionId]
      });
    }
  };

  if (!connectionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Please connect to a database to view schema</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-3">Not connected to database</p>
          <p className="text-xs text-gray-500">Click "Connect" on the selected connection to load schema</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Error loading databases</h3>
          <p className="text-xs text-gray-600 mb-3">{error.message}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Clean search and controls bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as any)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            title="Group tables"
          >
            <option value="none">No Group</option>
            <option value="type">By Type</option>
            <option value="letter">A–Z</option>
            <option value="custom">Custom</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            title="Refresh schema"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto">
        {filteredNodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                {searchQuery ? 'No databases match your search' : 'No databases found'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-gray-500">Try refreshing the connection</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2">
            {filteredNodes.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                connectionId={connectionId}
                isExpanded={expandedNodes.has(node.id)}
                isSelected={selectedNode?.id === node.id}
                onToggleExpand={handleToggleExpand}
                onSelect={handleNodeSelect}
                expandedNodes={expandedNodes}
                onViewData={onViewData}
                onCreateTable={onCreateTable}
                onEditTable={onEditTable}
                onDropTable={onDropTable}
                onExportSchema={onExportSchema}
                onShowCreateTable={onShowCreateTable}
                onGenerateQuery={onGenerateQuery}
                onDumpSQL={onDumpSQL}
                onEmptyTable={onEmptyTable}
                onTruncateTable={onTruncateTable}
                onRenameTable={onRenameTable}
              onDuplicateTable={onDuplicateTable}
              onBackupDatabase={onBackupDatabase}
              onRestoreDatabase={onRestoreDatabase}
              onAnalyzeTable={onAnalyzeTable}
              restrictTableActions={restrictTableActions}
              groupingMode={grouping}
              customGroups={customGroups}
              onAddToCustomGroup={handleAddToCustomGroup}
              onRemoveFromCustomGroup={handleRemoveFromCustomGroup}
              searchQuery={searchQuery}
            />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
        {filteredNodes.length} database{filteredNodes.length !== 1 ? 's' : ''}
      </div>

      {/* Add To Custom Group Modal */}
      <AddToGroupModal
        isOpen={!!pendingAdd}
        tableFullName={pendingAdd ? `${pendingAdd.database}.${pendingAdd.table}` : ''}
        existingGroups={Object.keys(customGroups)}
        onCancel={() => setPendingAdd(null)}
        onSubmit={(groupName) => commitAddToCustomGroup(groupName)}
      />
    </div>
  );
}










