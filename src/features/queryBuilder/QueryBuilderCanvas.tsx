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

import QueryBuilderNode, { TableNodeData } from './QueryBuilderNode';
import JoinEdge, { JoinEdgeData } from './JoinEdge';
import WhereClauseBuilder from './WhereClauseBuilder';
import SQLPreviewPanel from './SQLPreviewPanel';
import { useTables } from '../../hooks/useSchema';
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
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [whereConditions, setWhereConditions] = useState<QueryCondition[]>([]);
  const [limit, setLimit] = useState<number | undefined>(undefined);
  const [offset, setOffset] = useState<number | undefined>(undefined);
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
              const newAliases = { ...tableData.aliases };
              if (alias) {
                newAliases[columnName] = alias;
              } else {
                delete newAliases[columnName];
              }
              return {
                ...prev,
                [tableName]: {
                  ...tableData,
                  aliases: newAliases,
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
        const nodeData = node.data as TableNodeData;
        const tableName = nodeData.tableName;
        const tableData = tableColumns[tableName];

        if (tableData) {
          return {
            ...node,
            data: {
              ...nodeData,
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
      const nodeData = node.data as TableNodeData;
      const tableName = nodeData.tableName;
      const tableData = tableColumns[tableName];

      if (tableData && tableData.selected.size > 0) {
        tableData.selected.forEach((columnName: string) => {
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
      const firstNodeData = nodes[0].data as TableNodeData;
      selectColumns.push({
        table: firstNodeData.tableName,
        column: '*',
      });
    }

    // Build JOINs from edges
    const joins: QueryJoin[] = edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      const sourceData = sourceNode?.data as TableNodeData | undefined;
      const targetData = targetNode?.data as TableNodeData | undefined;
      const edgeData = edge.data as JoinEdgeData | undefined;

      return {
        type: (edgeData?.joinType as JoinType) || 'INNER',
        table: {
          name: targetData?.tableName || '',
          database,
        },
        onConditions: [
          {
            column: `${sourceData?.tableName}.${edge.sourceHandle}`,
            operator: '=',
            value: `${targetData?.tableName}.${edge.targetHandle}`,
          },
        ],
      };
    });

    // Build AST
    const firstNodeData = nodes[0].data as TableNodeData;
    const ast: QueryBuilderAST = {
      select: selectColumns,
      from: {
        name: firstNodeData.tableName,
        database,
      },
      joins: joins.length > 0 ? joins : undefined,
      where: whereConditions.length > 0 ? whereConditions : undefined,
      limit: limit,
      offset: offset,
    };

    // Generate SQL via API
    try {
      const result = await previewMutation.mutateAsync(ast);
      setGeneratedSQL(result.sql);
    } catch (error) {
      console.error('Failed to generate SQL:', error);
    }
  }, [nodes, edges, tableColumns, whereConditions, limit, offset, database]); // Removed previewMutation from dependencies

  // Auto-generate SQL when state changes (with debouncing to reduce API calls)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      generateSQL();
    }, 800); // Wait 800ms after last change before generating SQL

    return () => clearTimeout(debounceTimer);
  }, [generateSQL]);

  // Save query builder state
  const saveQueryState = useCallback(() => {
    // Convert Sets to arrays for JSON serialization
    const serializableTableColumns: Record<string, { selected: string[]; aggregates: Record<string, AggregateFunction | undefined>; aliases: Record<string, string> }> = {};
    Object.keys(tableColumns).forEach((tableName) => {
      serializableTableColumns[tableName] = {
        selected: Array.from(tableColumns[tableName].selected),
        aggregates: tableColumns[tableName].aggregates,
        aliases: tableColumns[tableName].aliases,
      };
    });

    const state = {
      nodes,
      edges,
      whereConditions,
      tableColumns: serializableTableColumns,
      limit,
      offset,
      database,
    };

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-builder-${database}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, whereConditions, tableColumns, limit, offset, database]);

  // Load query builder state
  const loadQueryState = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const state = JSON.parse(text);

        // Validate state has required properties
        if (!state.nodes || !state.database) {
          alert('Invalid query builder state file');
          return;
        }

        // Check database matches
        if (state.database !== database) {
          const proceed = confirm(
            `This query was saved for database "${state.database}" but you're currently viewing "${database}". Load anyway?`
          );
          if (!proceed) return;
        }

        // Convert arrays back to Sets for tableColumns
        const restoredTableColumns: Record<string, { selected: Set<string>; aggregates: Record<string, AggregateFunction | undefined>; aliases: Record<string, string> }> = {};
        if (state.tableColumns) {
          Object.keys(state.tableColumns).forEach((tableName) => {
            restoredTableColumns[tableName] = {
              selected: new Set(state.tableColumns[tableName].selected || []),
              aggregates: state.tableColumns[tableName].aggregates || {},
              aliases: state.tableColumns[tableName].aliases || {},
            };
          });
        }

        // Restore state
        setNodes(state.nodes || []);
        setEdges(state.edges || []);
        setWhereConditions(state.whereConditions || []);
        setTableColumns(restoredTableColumns);
        setLimit(state.limit);
        setOffset(state.offset);
      } catch (error) {
        console.error('Failed to load query state:', error);
        alert('Failed to load query builder state. Invalid file format.');
      }
    };
    input.click();
  }, [database, setNodes, setEdges]);

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
      const nodeData = node.data as TableNodeData;
      const tableName = nodeData.tableName;
      const tableData = tableColumns[tableName];
      if (tableData) {
        tableData.selected.forEach((col: string) => {
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
            setLimit(undefined);
            setOffset(undefined);
          }}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear All
        </button>
        <button
          onClick={() => generateSQL()}
          disabled={previewMutation.isPending || nodes.length === 0}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="Refresh SQL preview"
        >
          {previewMutation.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh SQL
            </>
          )}
        </button>
        <div className="h-6 w-px bg-gray-300" />
        <button
          onClick={saveQueryState}
          disabled={nodes.length === 0}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="Save query builder state"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>
        <button
          onClick={loadQueryState}
          className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center gap-1"
          title="Load query builder state"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Load
        </button>
        <div className="flex-1" />
        {/* LIMIT and OFFSET controls */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">LIMIT:</label>
          <input
            type="number"
            min="0"
            value={limit ?? ''}
            onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="No limit"
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-600">OFFSET:</label>
          <input
            type="number"
            min="0"
            value={offset ?? ''}
            onChange={(e) => setOffset(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
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
