import { useTables } from '../../hooks/useSchema';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

interface TableSelectorProps {
  connectionId: string;
  databases: Array<{ name: string; tables: number }>;
  selectedDatabase: string | null;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (table: string) => void;
}

export default function TableSelector({
  connectionId,
  databases,
  selectedDatabase,
  onDatabaseSelect,
  onTableSelect,
}: TableSelectorProps) {
  const { data: connectionStatus } = useConnectionStatus(connectionId);
  const isConnected = !!connectionStatus?.isConnected;

  const { data: tablesData } = useTables(
    selectedDatabase && isConnected ? connectionId : null,
    selectedDatabase
  );
  const tables = tablesData || [];

  if (!selectedDatabase) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg
            className="w-20 h-20 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
          <h2 className="text-xl text-gray-600 mb-4">Select a Database</h2>
          <p className="text-gray-500 mb-6">
            Choose a database to view table data
          </p>
          <div className="space-y-2">
            {databases.map((db) => (
              <button
                key={db.name}
                onClick={() => onDatabaseSelect(db.name)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-500 text-left transition-colors"
              >
                <div className="font-medium">{db.name}</div>
                <div className="text-xs text-gray-500">Database</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDatabaseSelect('')}
            className="text-gray-600 hover:text-gray-800"
            title="Back to databases"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedDatabase}
          </h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Select a table to view its data</p>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => onTableSelect(table.name)}
              className="p-4 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 text-left transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-800 group-hover:text-blue-600 mb-1">
                    {table.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {table.rows?.toLocaleString() || 0} rows
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
              {table.comment && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  {table.comment}
                </div>
              )}
            </button>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-600">No tables found in this database</p>
          </div>
        )}
      </div>
    </div>
  );
}
