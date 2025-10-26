import { useState, useEffect } from 'react';
import { TreeNodeData } from './SchemaTree';
import {
  useCompleteTableSchema,
  useCreateTable,
} from '../../hooks/useSchema';
import { Column } from '../../api/schema';
import TableDesignerForm from './TableDesignerForm';

interface SchemaDetailPanelProps {
  selectedNode: TreeNodeData | null;
  connectionId: string | null;
  onTableUpdated?: () => void;
  onExportSchema?: (database: string, table?: string) => void;
}

type TabType = 'overview' | 'indexes' | 'ddl' | 'structure';

export default function SchemaDetailPanel({
  selectedNode,
  connectionId,
  onTableUpdated,
  onExportSchema,
}: SchemaDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Determine if structure tab should be shown
  const showStructureTab = selectedNode?.type === 'table' || selectedNode?.type === 'view';

  // Reset to overview tab when selected node changes
  useEffect(() => {
    setActiveTab('overview');
  }, [selectedNode?.name, selectedNode?.type]);

  // Extract database and table from selected node
  const database =
    selectedNode?.type === 'database'
      ? selectedNode.name
      : selectedNode?.type === 'table' || selectedNode?.type === 'view'
        ? selectedNode.parent
        : selectedNode?.type === 'column'
          ? selectedNode.parent
          : null;

  const table =
    selectedNode?.type === 'table' || selectedNode?.type === 'view'
      ? selectedNode.name
      : selectedNode?.type === 'column'
        ? selectedNode.parent
        : null;

  // Fetch table schema if a table is selected
  const { data: tableSchema, isLoading: schemaLoading } = useCompleteTableSchema(
    connectionId,
    database || null,
    selectedNode?.type === 'table' || selectedNode?.type === 'view' ? (table || null) : null
  );

  // Fetch CREATE TABLE statement
  const { data: createStatement, isLoading: createLoading } = useCreateTable(
    connectionId,
    database || null,
    selectedNode?.type === 'table' || selectedNode?.type === 'view' ? (table || null) : null
  );

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">Select a schema object to view details</p>
        </div>
      </div>
    );
  }

  const renderDatabaseDetails = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">{selectedNode.name}</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Database</span>
      </div>

      {selectedNode.metadata && (
        <div className="space-y-2">
          <DetailRow label="Character Set" value={selectedNode.metadata.charset} />
          <DetailRow label="Collation" value={selectedNode.metadata.collation} />
        </div>
      )}
    </div>
  );

  const renderTableDetails = () => (
    <div className="space-y-4">
      {schemaLoading && (
        <div className="text-sm text-gray-500">Loading details...</div>
      )}

      {tableSchema && (
        <>
          {/* Main Content Area - Two Column Layout */}
          <div className="flex gap-3">
            {/* Left Side - Columns Table */}
            <div className="flex-1">
              {tableSchema.columns && tableSchema.columns.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                          Length
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                          Decimals
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-r border-gray-200">
                          Not Null
                        </th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-r border-gray-200">
                          Key
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                          Comment
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSchema.columns.map((column: Column, index: number) => {
                        // Parse type to extract base type, length, and decimals
                        const typeMatch = column.type.match(/^(\w+)(?:\(([^,)]+)(?:,(\d+))?\))?/);
                        const baseType = typeMatch?.[1] || column.type;
                        const length = typeMatch?.[2] || '-';
                        const decimals = typeMatch?.[3] || '-';

                        return (
                          <tr
                            key={column.name}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="px-3 py-2 font-mono font-medium text-gray-900 border-b border-r border-gray-200">
                              {column.name}
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-700 border-b border-r border-gray-200">
                              {baseType}
                            </td>
                            <td className="px-3 py-2 text-gray-700 border-b border-r border-gray-200">
                              {length}
                            </td>
                            <td className="px-3 py-2 text-gray-700 border-b border-r border-gray-200">
                              {decimals}
                            </td>
                            <td className="px-3 py-2 text-center border-b border-r border-gray-200">
                              {!column.nullable ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-800 rounded">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center border-b border-r border-gray-200">
                              {column.key === 'PRI' && (
                                <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium">
                                  PK
                                </span>
                              )}
                              {column.key === 'UNI' && (
                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                                  UNI
                                </span>
                              )}
                              {column.key === 'MUL' && (
                                <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                                  MUL
                                </span>
                              )}
                              {!column.key && <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-700 border-b border-gray-200">
                              {column.comment || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Side - Statistics Panel */}
            <div className="flex-shrink-0" style={{ width: 'auto', minWidth: '200px' }}>
              {tableSchema.stats && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-xs mb-2 text-gray-700">Statistics</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Rows:</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {tableSchema.stats.rowCount?.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Data:</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {formatBytes(tableSchema.stats.dataSize)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Index:</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {formatBytes(tableSchema.stats.indexSize)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Auto Inc:</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {tableSchema.stats.autoIncrement?.toLocaleString() || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Engine:</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {tableSchema.stats.engine || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Collation:</span>
                      <span className="font-semibold text-gray-900 text-right break-all">
                        {tableSchema.stats.collation || '-'}
                      </span>
                    </div>
                    {tableSchema.stats.comment && (
                      <div className="pt-2 border-t border-gray-300">
                        <div className="text-gray-600 mb-1">Comment:</div>
                        <div className="font-semibold text-gray-900 text-xs">
                          {tableSchema.stats.comment}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Foreign Keys */}
          {tableSchema.foreignKeys && tableSchema.foreignKeys.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">
                Foreign Keys ({tableSchema.foreignKeys.length})
              </h4>
              <div className="space-y-1">
                {tableSchema.foreignKeys.map((fk) => (
                  <div key={fk.name} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="font-semibold">{fk.name}</div>
                    <div className="text-gray-600">
                      {fk.column} → {fk.referencedTable}.{fk.referencedColumn}
                    </div>
                    <div className="text-gray-600">
                      ON DELETE {fk.onDelete} | ON UPDATE {fk.onUpdate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderColumnDetails = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">{selectedNode.name}</h3>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Column</span>
      </div>

      {selectedNode.metadata && (
        <div className="space-y-2 text-sm">
          <DetailRow label="Type" value={selectedNode.metadata.type} mono />
          <DetailRow
            label="Nullable"
            value={selectedNode.metadata.nullable ? 'YES' : 'NO'}
          />
          <DetailRow label="Key" value={selectedNode.metadata.key || '-'} />
          <DetailRow
            label="Default"
            value={selectedNode.metadata.default || 'NULL'}
            mono
          />
          {selectedNode.metadata.extra && (
            <DetailRow label="Extra" value={selectedNode.metadata.extra} />
          )}
          {selectedNode.metadata.comment && (
            <DetailRow label="Comment" value={selectedNode.metadata.comment} />
          )}
          {selectedNode.metadata.characterSet && (
            <DetailRow label="Character Set" value={selectedNode.metadata.characterSet} />
          )}
          {selectedNode.metadata.collation && (
            <DetailRow label="Collation" value={selectedNode.metadata.collation} />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-700">
              {selectedNode?.name || 'Details'}
            </h2>
            {selectedNode?.type && (
              <span className={`text-xs px-2 py-1 rounded ${
                selectedNode.type === 'database' ? 'bg-blue-100 text-blue-800' :
                selectedNode.type === 'table' ? 'bg-green-100 text-green-800' :
                selectedNode.type === 'view' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedNode.type === 'database' ? 'Database' :
                 selectedNode.type === 'table' ? 'Table' :
                 selectedNode.type === 'view' ? 'View' :
                 'Column'}
              </span>
            )}
            {(selectedNode?.type === 'table' || selectedNode?.type === 'view') && tableSchema?.columns && activeTab === 'overview' && (
              <span className="text-sm text-gray-600">
                Columns ({tableSchema.columns.length})
              </span>
            )}
            {(selectedNode?.type === 'table' || selectedNode?.type === 'view') && tableSchema?.indexes && activeTab === 'indexes' && (
              <span className="text-sm text-gray-600">
                Indexes ({tableSchema.indexes.length})
              </span>
            )}
          </div>
          {(selectedNode?.type === 'database' || selectedNode?.type === 'table' || selectedNode?.type === 'view') && (
            <button
              onClick={() => {
                if (database) {
                  onExportSchema?.(database, table || undefined);
                }
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center gap-1"
              title="Export Schema"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>

      {/* Tabs - Only show if table/view is selected */}
      {showStructureTab && (
        <div className="px-4 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fields
            </button>
            <button
              onClick={() => setActiveTab('indexes')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'indexes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Indexes
            </button>
            <button
              onClick={() => setActiveTab('ddl')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'ddl'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              DDL
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'structure'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Structure
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' ? (
          <div className="h-full overflow-y-auto p-4">
            {selectedNode.type === 'database' && renderDatabaseDetails()}
            {(selectedNode.type === 'table' || selectedNode.type === 'view') &&
              renderTableDetails()}
            {selectedNode.type === 'column' && renderColumnDetails()}
            {selectedNode.type !== 'database' &&
              selectedNode.type !== 'table' &&
              selectedNode.type !== 'view' &&
              selectedNode.type !== 'column' && (
                <div className="text-sm text-gray-500">
                  No details available for this object type
                </div>
              )}
          </div>
        ) : activeTab === 'indexes' && showStructureTab ? (
          <div className="h-full overflow-y-auto p-4">
            {tableSchema?.indexes && tableSchema.indexes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                        Columns
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200">
                        Type
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-200">
                        Unique
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSchema.indexes.map((index, idx) => (
                      <tr
                        key={index.name}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-3 py-2 font-mono font-medium text-gray-900 border-b border-r border-gray-200">
                          {index.name}
                        </td>
                        <td className="px-3 py-2 text-gray-700 border-b border-r border-gray-200">
                          {index.columns.join(', ')}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-700 border-b border-r border-gray-200">
                          {index.type}
                        </td>
                        <td className="px-3 py-2 text-center border-b border-gray-200">
                          {index.unique ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 rounded">
                              ✓
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                No indexes found
              </div>
            )}
          </div>
        ) : activeTab === 'ddl' && showStructureTab ? (
          <div className="h-full overflow-y-auto p-4">
            {createLoading ? (
              <div className="text-sm text-gray-500">Loading CREATE TABLE statement...</div>
            ) : createStatement ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">CREATE TABLE Statement</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createStatement);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </button>
                </div>
                <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                  {createStatement}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                No CREATE TABLE statement available
              </div>
            )}
          </div>
        ) : activeTab === 'structure' && showStructureTab ? (
          <TableDesignerForm
            connectionId={connectionId || ''}
            database={database || ''}
            selectedTable={table}
            onSuccess={() => {
              onTableUpdated?.();
              setActiveTab('overview'); // Switch back to overview after save
            }}
            onCancel={() => setActiveTab('overview')} // Switch back to overview on cancel
          />
        ) : null}
      </div>
    </div>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-100">
      <span className="text-gray-600">{label}:</span>
      <span className={`font-semibold ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
