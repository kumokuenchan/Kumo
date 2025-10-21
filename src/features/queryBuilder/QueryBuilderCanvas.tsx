import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import QueryBuilderNode, { TableNodeData, ColumnInfo } from './QueryBuilderNode';
import JoinEdge, { JoinEdgeData } from './JoinEdge';
import WhereClauseBuilder from './WhereClauseBuilder';
import SQLPreviewPanel from './SQLPreviewPanel';
import { useTables, useColumns } from '../../hooks/useSchema';
import { usePreviewQuery } from '../../hooks/useQueryBuilder';
import type {
  QueryBuilderAST,
  QueryColumn,
  QueryJoin,
  QueryCondition,
  JoinType,
  AggregateFunction,
} from '../../types/queryBuilder';

interface QueryBuilderCanvasProps {
  connectionId: string;
  database: string;
  onExecuteQuery?: (sql: string) => void;
  onEditSQL?: (sql: string) => void;
}

const nodeTypes = {
  tableNode: QueryBuilderNode,
};

const edgeTypes = {
  joinEdge: JoinEdge,
};

export default function QueryBuilderCanvas({
  connectionId,
  database,
  onExecuteQuery,
  onEditSQL,
}: QueryBuilderCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [whereConditions, setWhereConditions] = useState<QueryCondition[]>([]);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [showTableSelector, setShowTableSelector] = useState(false);
  // Enable canvas panning only while holding Space
  const [panOnDragEnabled, setPanOnDragEnabled] = useState(false);
  // Resizable preview panel (right side)
  const [previewWidth, setPreviewWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Fetch available tables
  const { data: tables = [] } = useTables(connectionId, database);

  // Query preview hook
  const previewMutation = usePreviewQuery();

  // Track selected columns per table
  const [tableColumns, setTableColumns] = useState<
    Record<string, { selected: Set<string>; aggregates: Record<string, AggregateFunction | undefined>; aliases: Record<string, string> }>
  >({});

  // Add a table to the canvas
  const addTable = useCallback(
    (tableName: string) => {
      const existingNode = nodes.find((n) => n.data.tableName === tableName);
      if (existingNode) {
        alert('Table already added to canvas');
        return;
      }

      const newNodeId = `table-${tableName}`;
      const position = {
        x: 100 + nodes.length * 50,
        y: 100 + nodes.length * 50,
      };

      // Initialize column tracking for this table
      setTableColumns((prev) => ({
        ...prev,
        [tableName]: {
          selected: new Set<string>(),
          aggregates: {},
          aliases: {},
        },
      }));

      const newNode: Node<TableNodeData> = {
        id: newNodeId,
        type: 'tableNode',
        position,
        data: {
          tableName,
          database,
          connectionId,
          selectedColumns: new Set<string>(),
          onColumnSelect: (columnName: string, selected: boolean) => {
            setTableColumns((prev) => {
              const tableData = prev[tableName] || { selected: new Set(), aggregates: {}, aliases: {} };
              const newSelected = new Set(tableData.selected);
              if (selected) {
                newSelected.add(columnName);
              } else {
                newSelected.delete(columnName);
              }
              return {
                ...prev,
                [tableName]: { ...tableData, selected: newSelected },
              };
            });
          },
          onAggregateChange: (columnName: string, aggregate?: AggregateFunction) => {
            setTableColumns((prev) => {
              const tableData = prev[tableName] || { selected: new Set(), aggregates: {}, aliases: {} };
              return {
                ...prev,
                [tableName]: {
                  ...tableData,
                  aggregates: { ...tableData.aggregates, [columnName]: aggregate },
                },
              };
            });
          },
          onAliasChange: (columnName: string, alias: string) => {
            setTableColumns((prev) => {
              const tableData = prev[tableName] || { selected: new Set(), aggregates: {}, aliases: {} };
              return {
                ...prev,
                [tableName]: {
                  ...tableData,
                  aliases: { ...tableData.aliases, [columnName]: alias || undefined },
                },
              };
            });
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setShowTableSelector(false);
    },
    [nodes, database, setNodes]
  );

  // Update nodes with column data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const tableName = node.data.tableName;
        const tableData = tableColumns[tableName];

        if (tableData) {
          return {
            ...node,
            data: {
              ...node.data,
              selectedColumns: tableData.selected,
            },
          };
        }
        return node;
      })
    );
  }, [tableColumns, setNodes]);

  // Handle edge connections (JOINs)
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge<JoinEdgeData> = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'joinEdge',
        data: {
          joinType: 'INNER',
          onJoinTypeChange: (newType: JoinType) => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === `edge-${params.source}-${params.target}`
                  ? { ...e, data: { ...e.data, joinType: newType } }
                  : e
              )
            );
          },
          onRemove: () => {
            setEdges((eds) => eds.filter((e) => e.id !== `edge-${params.source}-${params.target}`));
          },
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Generate SQL from current state
  const generateSQL = useCallback(async () => {
    if (nodes.length === 0) {
      setGeneratedSQL('');
      return;
    }

    // Build SELECT columns
    const selectColumns: QueryColumn[] = [];
    nodes.forEach((node) => {
      const tableName = node.data.tableName;
      const tableData = tableColumns[tableName];

      if (tableData && tableData.selected.size > 0) {
        tableData.selected.forEach((columnName) => {
          selectColumns.push({
            table: tableName,
            column: columnName,
            alias: tableData.aliases[columnName],
            aggregateFunction: tableData.aggregates[columnName],
          });
        });
      }
    });

    // If no columns selected, select all from first table
    if (selectColumns.length === 0 && nodes.length > 0) {
      selectColumns.push({
        table: nodes[0].data.tableName,
        column: '*',
      });
    }

    // Build JOINs from edges
    const joins: QueryJoin[] = edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      return {
        type: (edge.data?.joinType as JoinType) || 'INNER',
        table: {
          name: targetNode?.data.tableName || '',
          database,
        },
        onConditions: [
          {
            column: `${sourceNode?.data.tableName}.${edge.sourceHandle}`,
            operator: '=',
            value: `${targetNode?.data.tableName}.${edge.targetHandle}`,
          },
        ],
      };
    });

    // Build AST
    const ast: QueryBuilderAST = {
      select: selectColumns,
      from: {
        name: nodes[0].data.tableName,
        database,
      },
      joins: joins.length > 0 ? joins : undefined,
      where: whereConditions.length > 0 ? whereConditions : undefined,
    };

    // Generate SQL via API
    try {
      const result = await previewMutation.mutateAsync(ast);
      setGeneratedSQL(result.sql);
    } catch (error) {
      console.error('Failed to generate SQL:', error);
    }
  }, [nodes, edges, tableColumns, whereConditions, database, previewMutation]);

  // Auto-generate SQL when state changes
  useEffect(() => {
    generateSQL();
  }, [generateSQL]);

  // Toggle pan-on-drag with Space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPanOnDragEnabled(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPanOnDragEnabled(false);
      }
    };
    const handleBlur = () => setPanOnDragEnabled(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Handle vertical resize between canvas and preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const minRight = 320; // min preview width
      const maxRight = Math.max(360, Math.min(rect.width - 360, rect.width));
      const newRightWidth = Math.max(minRight, Math.min(maxRight, rect.right - e.clientX));
      setPreviewWidth(newRightWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Get all available columns for WHERE clause
  const availableColumns = useMemo(() => {
    const columns: string[] = [];
    nodes.forEach((node) => {
      const tableName = node.data.tableName;
      const tableData = tableColumns[tableName];
      if (tableData) {
        tableData.selected.forEach((col) => {
          columns.push(`${tableName}.${col}`);
        });
      }
    });
    return columns;
  }, [nodes, tableColumns]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b">
        <button
          onClick={() => setShowTableSelector(!showTableSelector)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Add Table
        </button>
        <button
          onClick={() => {
            setNodes([]);
            setEdges([]);
            setWhereConditions([]);
            setTableColumns({});
          }}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear All
        </button>
        <div className="flex-1" />
        <span className="text-sm text-gray-600">
          Tables: {nodes.length} | JOINs: {edges.length}
        </span>
      </div>

      {/* Table Selector */}
      {showTableSelector && (
        <div className="px-4 py-2 bg-blue-50 border-b">
          {tables.length === 0 ? (
            <div className="text-sm text-blue-800">
              No tables found. Make sure you are connected and a database is selected.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => addTable(table.name)}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                >
                  {table.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content: Canvas + Preview */}
      <div ref={contentRef} className="flex-1 flex min-h-0">
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            nodeDragHandle=".drag-handle"
            panOnDrag={panOnDragEnabled}
            zoomOnScroll={true}
            zoomOnDoubleClick={false}
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-left" className="bg-white p-2 rounded shadow">
              <div className="text-xs text-gray-600">
                <div>Drag tables to arrange</div>
                <div>Connect columns to create JOINs</div>
              </div>
            </Panel>
          </ReactFlow>

          {/* WHERE Clause Builder (Bottom Panel) */}
          {availableColumns.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 max-h-[200px] overflow-y-auto">
              <WhereClauseBuilder
                conditions={whereConditions}
                onChange={setWhereConditions}
                availableColumns={availableColumns}
              />
            </div>
          )}
        </div>

        {/* Vertical resize handle */}
        <div
          className={`w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 ${isResizing ? 'bg-blue-500' : ''}`}
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize preview"
        />

        {/* SQL Preview Panel */}
        <div className="border-l" style={{ width: previewWidth, minWidth: 320 }}>
          <SQLPreviewPanel
            sql={generatedSQL}
            validation={previewMutation.data?.validation}
            onExecute={() => onExecuteQuery?.(generatedSQL)}
            onEditSQL={() => onEditSQL?.(generatedSQL)}
            isGenerating={previewMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
