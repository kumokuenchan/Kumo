import { TreeNodeData } from './SchemaTree';
import {
  useCompleteTableSchema,
  useTableStats,
  useCreateTable,
} from '../../hooks/useSchema';
import { Column } from '../../api/schema';

interface SchemaDetailPanelProps {
  selectedNode: TreeNodeData | null;
  connectionId: string | null;
}

export default function SchemaDetailPanel({
  selectedNode,
  connectionId,
}: SchemaDetailPanelProps) {
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
    database,
    selectedNode?.type === 'table' || selectedNode?.type === 'view' ? table : null
  );

  // Fetch CREATE TABLE statement
  const { data: createStatement, isLoading: createLoading } = useCreateTable(
    connectionId,
    database,
    selectedNode?.type === 'table' || selectedNode?.type === 'view' ? table : null
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
      <div>
        <h3 className="font-semibold text-lg mb-2">{selectedNode.name}</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          {selectedNode.type === 'view' ? 'View' : 'Table'}
        </span>
      </div>

      {schemaLoading && (
        <div className="text-sm text-gray-500">Loading details...</div>
      )}

      {tableSchema && (
        <>
          {/* Statistics */}
          {tableSchema.stats && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Statistics</h4>
              <div className="space-y-2 text-sm">
                <DetailRow label="Rows" value={tableSchema.stats.rowCount?.toLocaleString()} />
                <DetailRow
                  label="Data Size"
                  value={formatBytes(tableSchema.stats.dataSize)}
                />
                <DetailRow
                  label="Index Size"
                  value={formatBytes(tableSchema.stats.indexSize)}
                />
                <DetailRow label="Engine" value={tableSchema.stats.engine} />
                <DetailRow label="Collation" value={tableSchema.stats.collation} />
                {tableSchema.stats.comment && (
                  <DetailRow label="Comment" value={tableSchema.stats.comment} />
                )}
              </div>
            </div>
          )}

          {/* Columns */}
          {tableSchema.columns && tableSchema.columns.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">
                Columns ({tableSchema.columns.length})
              </h4>
              <div className="space-y-1">
                {tableSchema.columns.map((column: Column) => (
                  <div
                    key={column.name}
                    className="p-2 bg-gray-50 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{column.name}</span>
                      {column.key === 'PRI' && (
                        <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-xs">
                          PK
                        </span>
                      )}
                      {column.key === 'UNI' && (
                        <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">
                          UNIQUE
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600">
                      Type: <span className="font-mono">{column.type}</span>
                    </div>
                    {column.default !== null && (
                      <div className="text-gray-600">
                        Default: <span className="font-mono">{column.default}</span>
                      </div>
                    )}
                    {column.extra && (
                      <div className="text-gray-600">
                        Extra: <span className="font-mono">{column.extra}</span>
                      </div>
                    )}
                    {column.comment && (
                      <div className="text-gray-600">Comment: {column.comment}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indexes */}
          {tableSchema.indexes && tableSchema.indexes.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">
                Indexes ({tableSchema.indexes.length})
              </h4>
              <div className="space-y-1">
                {tableSchema.indexes.map((index) => (
                  <div key={index.name} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="font-semibold">{index.name}</div>
                    <div className="text-gray-600">
                      Columns: {index.columns.join(', ')}
                    </div>
                    <div className="text-gray-600">
                      Type: {index.type} {index.unique && '(Unique)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* CREATE TABLE Statement */}
          {createStatement && !createLoading && (
            <div>
              <h4 className="font-semibold text-sm mb-2">CREATE TABLE Statement</h4>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                {createStatement}
              </pre>
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
        <h2 className="font-semibold text-gray-700">Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
