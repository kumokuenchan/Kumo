import { useState, useMemo } from 'react';
import { useDatabases } from '../../hooks/useSchema';
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
}

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'database' | 'table' | 'column' | 'index' | 'foreign-key' | 'view' | 'routine' | 'trigger' | 'fields';
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
}: SchemaTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { data: connectionStatus } = useConnectionStatus(connectionId);
  const isConnected = !!connectionStatus?.isConnected;

  const { data: databases = [], isLoading, error, refetch } = useDatabases(
    isConnected ? connectionId : null
  );

  // Convert databases to tree node data
  const databaseNodes: TreeNodeData[] = useMemo(() => {
    return databases.map((db: Database) => ({
      id: `db:${db.name}`,
      name: db.name,
      type: 'database' as const,
      metadata: { charset: db.charset, collation: db.collation },
    }));
  }, [databases]);

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return databaseNodes;

    const query = searchQuery.toLowerCase();
    return databaseNodes.filter((node) =>
      node.name.toLowerCase().includes(query)
    );
  }, [databaseNodes, searchQuery]);

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

        <input
          type="text"
          placeholder="Search databases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
