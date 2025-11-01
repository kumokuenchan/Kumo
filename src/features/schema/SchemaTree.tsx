import { useState, useMemo, useEffect } from 'react';
import { useDatabases, useTables } from '../../hooks/useSchema';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import TreeNode from './TreeNode';
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

  // Custom groups: { groupName: ["db.table", ...] }
  const [customGroups, setCustomGroups] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(customGroups)); } catch {}
  }, [customGroups, storageKey]);

  // Reload custom groups whenever the storage key (scope/connection) changes
  useEffect(() => {
    try {
      let raw = localStorage.getItem(storageKey);
      if (!raw) {
        // Fallback migration: earlier sessions might have saved under a placeholder key
        const scope = onlyDatabase || 'all';
        const fallback1 = `schemaTree_customGroups:conn:${scope}`;
        const fallback2 = `schemaTree_customGroups:conn:all`;
        raw = localStorage.getItem(fallback1) || localStorage.getItem(fallback2);
        if (raw) {
          // Migrate to the scoped key
          try { localStorage.setItem(storageKey, raw); } catch {}
        }
      }
      if (raw) {
        setCustomGroups(JSON.parse(raw));
      } else {
        setCustomGroups({});
      }
    } catch {
      // ignore corrupt data
    }
  }, [storageKey, onlyDatabase]);

  // Auto-expand the current database if limited
  useEffect(() => {
    if (onlyDatabase) {
      const id = `db:${onlyDatabase}`;
      setExpandedNodes((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    }
  }, [onlyDatabase]);

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

  const handleAddToCustomGroup = (database: string, table: string) => {
    const name = window.prompt('Add to Custom Group\nEnter group name:');
    if (!name) return;
    const group = name.trim();
    if (!group) return;
    const key = `${database}.${table}`;
    setCustomGroups((prev) => {
      const next = { ...prev } as Record<string, string[]>;
      const list = next[group] ? [...next[group]] : [];
      if (!list.includes(key)) list.push(key);
      next[group] = list;
      return next;
    });
    if (grouping !== 'custom') setGrouping('custom');
  };

  const handleNodeSelect = (node: TreeNodeData) => {
    onNodeSelect?.(node);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!connectionId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Please connect to a database to view schema</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Not connected. Click "Connect" on the selected connection to load schema.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error loading databases:</p>
        <p className="text-sm mt-1">{error.message}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with search and refresh */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">Database Schema</h3>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100 rounded"
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
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as any)}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700"
            title="Group tables"
          >
            <option value="none">No Group</option>
            <option value="type">By Type</option>
            <option value="letter">A–Z</option>
            <option value="custom">Custom Groups</option>
          </select>
          <button
            onClick={() => setGrouping('custom')}
            className={`px-2 py-1.5 text-sm rounded ${grouping === 'custom' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            title="Show Custom Groups"
          >
            Custom
          </button>
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? 'No databases match your search' : 'No databases found'}
          </div>
        ) : (
          <div className="space-y-1">
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
              restrictTableActions={restrictTableActions}
              groupingMode={grouping}
              customGroups={customGroups}
              onAddToCustomGroup={handleAddToCustomGroup}
              searchQuery={searchQuery}
            />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-2 border-t border-gray-200 text-xs text-gray-500">
        {filteredNodes.length} database{filteredNodes.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}










