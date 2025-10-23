import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { AggregateFunction } from '../../types/queryBuilder';
import { useColumns } from '../../hooks/useSchema';

export interface TableNodeData {
  tableName: string;
  tableAlias?: string;
  database: string;
  connectionId: string;
  selectedColumns: Set<string>;
  onColumnSelect: (columnName: string, selected: boolean) => void;
  onAggregateChange: (columnName: string, aggregate?: AggregateFunction) => void;
  onAliasChange: (columnName: string, alias: string) => void;
  [key: string]: unknown;
}

export interface ColumnInfo {
  name: string;
  type: string;
  key?: string;
}

const aggregateFunctions: AggregateFunction[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

function QueryBuilderNode(props: NodeProps) {
  const nodeData = props.data as TableNodeData;
  const { tableName, tableAlias, database, connectionId, selectedColumns, onColumnSelect, onAggregateChange, onAliasChange } = nodeData;

  // Fetch columns for this table
  const { data: columnsData, isLoading } = useColumns(connectionId, database, tableName);
  const columns: ColumnInfo[] = Array.isArray(columnsData)
    ? columnsData.map((col: any) => ({
        name: col.name,
        type: col.type,
        key: col.key === 'PRI' ? 'PK' : col.key === 'MUL' ? 'FK' : undefined,
      }))
    : [];

  const displayName = tableAlias || tableName;

  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg min-w-[250px]">
      {/* Table Header (drag handle) */}
      <div className="bg-blue-500 text-white px-4 py-2 rounded-t-lg font-semibold drag-handle cursor-move">
        <div className="flex items-center justify-between">
          <span>{displayName}</span>
          {tableAlias && (
            <span className="text-xs bg-blue-600 px-2 py-1 rounded">
              {tableName}
            </span>
          )}
        </div>
      </div>

      {/* Columns List */}
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center text-sm text-gray-500 py-4">Loading columns...</div>
        ) : columns.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-4">No columns found</div>
        ) : (
          columns.map((column) => {
          const isSelected = selectedColumns.has(column.name);

          return (
            <div
              key={column.name}
              className={`p-2 border-b last:border-b-0 hover:bg-gray-50 ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onColumnSelect(column.name, e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />

                {/* Column Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {column.name}
                    </span>
                    {column.key && (
                      <span className="text-xs text-yellow-600 font-semibold">
                        {column.key}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{column.type}</span>
                </div>

                {/* Connection Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={column.name}
                  className="w-3 h-3 bg-blue-500"
                  style={{ right: -6 }}
                />
                <Handle
                  type="target"
                  position={Position.Left}
                  id={column.name}
                  className="w-3 h-3 bg-blue-500"
                  style={{ left: -6 }}
                />
              </div>

              {/* Aggregate and Alias (shown when selected) */}
              {isSelected && (
                <div className="mt-2 pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 w-16">Aggregate:</label>
                    <select
                      className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                      onChange={(e) => {
                        const value = e.target.value;
                        onAggregateChange(
                          column.name,
                          value === '' ? undefined : (value as AggregateFunction)
                        );
                      }}
                    >
                      <option value="">None</option>
                      {aggregateFunctions.map((fn) => (
                        <option key={fn} value={fn}>
                          {fn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 w-16">Alias:</label>
                    <input
                      type="text"
                      placeholder="Optional alias"
                      className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                      onChange={(e) => onAliasChange(column.name, e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}

export default memo(QueryBuilderNode);
