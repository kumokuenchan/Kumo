import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface TableColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
}

interface TableData {
  name: string;
  columns: TableColumn[];
}

interface Relationship {
  id: string;
  name: string;
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
  onDelete: string;
  onUpdate: string;
}

interface ERDiagramData {
  tables: TableData[];
  relationships: Relationship[];
}

interface ERDiagramVisualizerProps {
  data: ERDiagramData;
  isLoading: boolean;
}

// Custom table node component
function TableNode({ data }: { data: any }) {
  return (
    <div className="bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-lg w-[280px]">
      {/* Table Header */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-2 rounded-t-lg font-semibold text-sm truncate">
        {data.label}
      </div>

      {/* Columns List */}
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {data.columns.slice(0, 20).map((column: TableColumn, index: number) => (
          <div
            key={column.name}
            className={`px-2 py-1 text-xs font-mono flex items-center gap-2 ${
              index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800'
            }`}
          >
            {/* Key indicators */}
            <span className="w-4 flex-shrink-0">
              {column.isPrimaryKey && (
                <span className="text-yellow-600 dark:text-yellow-400 font-bold" title="Primary Key">
                  🔑
                </span>
              )}
              {!column.isPrimaryKey && column.isForeignKey && (
                <span className="text-purple-600 dark:text-purple-400 font-bold" title="Foreign Key">
                  🔗
                </span>
              )}
            </span>

            {/* Column name */}
            <span className={`flex-1 truncate ${column.isPrimaryKey ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
              {column.name}
            </span>

            {/* Column type */}
            <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">
              {column.type.length > 15 ? column.type.substring(0, 12) + '...' : column.type}
            </span>

            {/* Nullable indicator */}
            {column.nullable && !column.isPrimaryKey && (
              <span className="text-gray-400 text-xs flex-shrink-0" title="Nullable">
                NULL
              </span>
            )}
          </div>
        ))}
        {data.columns.length > 20 && (
          <div className="px-2 py-2 text-xs text-center text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-slate-900">
            + {data.columns.length - 20} more columns...
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  tableNode: TableNode,
};

export default function ERDiagramVisualizer({ data, isLoading }: ERDiagramVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Auto-layout tables in a grid with dynamic spacing
  const layoutTables = useCallback((tables: TableData[], relationships: Relationship[]) => {
    if (tables.length === 0) return { nodes: [], edges: [] };

    // Calculate table dimensions (estimate based on columns)
    const estimateTableHeight = (columnCount: number) => {
      const headerHeight = 40;
      const rowHeight = 28;
      const maxDisplayColumns = 20; // We only show 20 columns max
      const displayColumns = Math.min(columnCount, maxDisplayColumns);
      const maxHeight = 440; // Max height with scrolling
      const calculatedHeight = headerHeight + (displayColumns * rowHeight) + 20;
      return Math.min(calculatedHeight, maxHeight); // Cap at max height
    };

    const tableWidth = 280;

    // Optimize grid dimensions based on table count
    const tableCount = tables.length;
    let cols: number;

    if (tableCount <= 4) {
      cols = 2;
    } else if (tableCount <= 9) {
      cols = 3;
    } else if (tableCount <= 16) {
      cols = 4;
    } else if (tableCount <= 25) {
      cols = 5;
    } else {
      cols = Math.ceil(Math.sqrt(tableCount));
    }

    // Calculate spacing based on table sizes
    const horizontalSpacing = tableWidth + 150; // Add extra space for arrows

    // Track max height per row for better vertical spacing
    const rowHeights: number[] = [];
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const height = estimateTableHeight(table.columns.length);
      if (!rowHeights[row] || height > rowHeights[row]) {
        rowHeights[row] = height;
      }
    });

    // Create nodes with dynamic positioning
    const newNodes: Node[] = tables.map((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      // Calculate Y position based on cumulative row heights
      let yPosition = 50;
      for (let i = 0; i < row; i++) {
        yPosition += rowHeights[i] + 60; // Reduced gap from 100px to 60px
      }

      return {
        id: table.name,
        type: 'tableNode',
        position: {
          x: col * horizontalSpacing + 50,
          y: yPosition,
        },
        data: {
          label: table.name,
          columns: table.columns,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges from relationships
    const newEdges: Edge[] = relationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceTable,
      target: rel.targetTable,
      type: 'smoothstep',
      animated: false,
      label: `${rel.sourceColumn} → ${rel.targetColumn}`,
      labelStyle: { fontSize: 10, fill: '#666' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#3B82F6',
      },
      style: {
        stroke: '#3B82F6',
        strokeWidth: 2,
      },
    }));

    return { nodes: newNodes, edges: newEdges };
  }, []);

  useEffect(() => {
    if (data && data.tables) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutTables(
        data.tables,
        data.relationships
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [data, layoutTables, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading ER diagram...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.tables || data.tables.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No tables found in this database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        minZoom={0.05}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background color="#94a3b8" gap={16} />
        <Controls className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600" />
        <MiniMap
          className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600"
          nodeColor={(node) => {
            return '#3B82F6';
          }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2 text-gray-900 dark:text-white">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">🔑</span>
            <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600 dark:text-purple-400">🔗</span>
            <span className="text-gray-700 dark:text-gray-300">Foreign Key</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Relationship</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
          <div className="text-gray-600 dark:text-gray-400">
            {data.tables.length} table{data.tables.length !== 1 ? 's' : ''} · {data.relationships.length} relationship{data.relationships.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
