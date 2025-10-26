import { useState, useRef, useEffect } from 'react';
import { useTables, useColumns } from '../../hooks/useSchema';
import { TreeNodeData } from './SchemaTree';
import ContextMenu from './ContextMenu';

interface TreeNodeProps {
  node: TreeNodeData;
  connectionId: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelect: (node: TreeNodeData) => void;
  expandedNodes: Set<string>;
  level?: number;
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
  searchQuery?: string;
}

export default function TreeNode({
  node,
  connectionId,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  expandedNodes,
  level = 0,
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
  searchQuery = '',
}: TreeNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Lazy load tables when database is expanded
  const shouldLoadTables = node.type === 'database' && isExpanded;
  const { data: tables = [], isLoading: tablesLoading } = useTables(
    shouldLoadTables ? connectionId : null,
    shouldLoadTables ? node.name : null
  );

  // Lazy load columns when fields node is expanded
  const shouldLoadColumns = node.type === 'fields' && isExpanded;
  // For fields node, parent is the table name and we need to extract database from metadata
  const parentDatabase = node.type === 'fields' ? node.metadata?.database : node.parent;
  const tableName = node.type === 'fields' ? node.parent : node.name;
  const { data: columns = [], isLoading: columnsLoading } = useColumns(
    shouldLoadColumns ? connectionId : null,
    shouldLoadColumns ? parentDatabase || null : null,
    shouldLoadColumns ? tableName || null : null
  );

  const handleClick = () => {
    onSelect(node);
    if (hasChildren()) {
      onToggleExpand(node.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(node);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenu) {
      const handleClickOutside = () => setContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const hasChildren = () => {
    return node.type === 'database' || node.type === 'table' || node.type === 'fields';
  };

  const getIcon = () => {
    switch (node.type) {
      case 'database':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
        );
      case 'table':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        );
      case 'fields':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        );
      case 'column':
        // Key icon for primary keys, regular icon for other columns
        if (node.metadata?.key === 'PRI') {
          return (
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          );
        }
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'view':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        );
      case 'index':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
      case 'foreign-key':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        );
      case 'routine':
        return (
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        );
      case 'trigger':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getChildNodes = (): TreeNodeData[] => {
    if (node.type === 'database' && tables.length > 0) {
      const allTables = tables.map((table) => ({
        id: `table:${node.name}:${table.name}`,
        name: table.name,
        type: table.type === 'VIEW' ? ('view' as const) : ('table' as const),
        parent: node.name,
        metadata: table,
      }));

      // Filter tables based on search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return allTables.filter((table) =>
          table.name.toLowerCase().includes(query)
        );
      }

      return allTables;
    }

    // For table nodes, return a single "Fields" folder node
    if (node.type === 'table') {
      return [{
        id: `fields:${parentDatabase}:${node.name}`,
        name: 'Fields',
        type: 'fields' as const,
        parent: node.name,
        metadata: { database: parentDatabase },
      }];
    }

    // For fields nodes, return the actual columns
    if (node.type === 'fields' && columns.length > 0) {
      return columns.map((column) => ({
        id: `column:${parentDatabase}:${tableName}:${column.name}`,
        name: column.name,
        type: 'column' as const,
        parent: tableName,
        metadata: column,
      }));
    }

    return [];
  };

  const childNodes = getChildNodes();
  const isLoading = tablesLoading || columnsLoading;

  return (
    <div ref={nodeRef}>
      {/* Node row */}
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 ${
          isSelected ? 'bg-blue-50 border border-blue-200' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/collapse button */}
        {hasChildren() && (
          <button
            className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Icon */}
        <span className="flex-shrink-0 text-gray-600">{getIcon()}</span>

        {/* Node name */}
        <span className="text-sm truncate flex-1">{node.name}</span>

        {/* Type badge for columns */}
        {node.type === 'column' && node.metadata?.type && (
          <span className="text-xs text-gray-500 font-mono">{node.metadata.type}</span>
        )}
      </div>

      {/* Loading state */}
      {isExpanded && isLoading && (
        <div className="text-xs text-gray-500 italic" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
          Loading...
        </div>
      )}

      {/* Child nodes */}
      {isExpanded && !isLoading && childNodes.length > 0 && (
        <div>
          {childNodes.map((childNode) => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              connectionId={connectionId}
              isExpanded={expandedNodes.has(childNode.id)}
              isSelected={false}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              level={level + 1}
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
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && !isLoading && childNodes.length === 0 && hasChildren() && (
        <div
          className="text-xs text-gray-400 italic py-1"
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
        >
          No items
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          node={node}
          position={contextMenu}
          onClose={handleCloseContextMenu}
          connectionId={connectionId}
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
        />
      )}
    </div>
  );
}
