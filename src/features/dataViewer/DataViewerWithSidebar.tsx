import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTables } from '../../hooks/useSchema';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import DataViewer from './DataViewer';

interface DataViewerWithSidebarProps {
  connectionId: string;
  databases: Array<{ name: string; tables: number }>;
  selectedDatabase: string | null;
  selectedTable: string | null;
  onDatabaseSelect: (database: string) => void;
  onTableSelect: (table: string) => void;
}

export default function DataViewerWithSidebar({
  connectionId,
  databases,
  selectedDatabase,
  selectedTable,
  onDatabaseSelect,
  onTableSelect,
}: DataViewerWithSidebarProps) {
  const queryClient = useQueryClient();
  const { data: connectionStatus } = useConnectionStatus(connectionId);
  const isConnected = !!connectionStatus?.isConnected;

  const { data: tablesData } = useTables(
    selectedDatabase && isConnected ? connectionId : null,
    selectedDatabase
  );
  const tables = tablesData || [];

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Search/filter state
  const [search, setSearch] = useState('');
  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, search]);

  // Refresh tables list
  const handleRefreshTables = () => {
    if (selectedDatabase) {
      queryClient.invalidateQueries({
        queryKey: ['tables', connectionId, selectedDatabase]
      });
    }
  };

  // Refresh databases list
  const handleRefreshDatabases = () => {
    queryClient.invalidateQueries({
      queryKey: ['databases', connectionId]
    });
  };

  // Handle sidebar resize
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  // Add mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing]);

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Table List */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm">
        {/* Sidebar Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Database
            </h3>
            <div className="flex items-center gap-2">
              {selectedDatabase && (
                <button
                  onClick={() => {
                    onDatabaseSelect('');
                    onTableSelect('');
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 font-medium transition-all"
                  title="Change database"
                >
                  Change
                </button>
              )}
              <button
                onClick={handleRefreshDatabases}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                title="Refresh databases list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Database Selector */}
          {!selectedDatabase ? (
            <select
              value=""
              onChange={(e) => onDatabaseSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-gray-900 cursor-pointer"
            >
              <option value="">Select database...</option>
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-semibold text-gray-900">
              {selectedDatabase}
            </div>
          )}
        </div>

        {/* Table Search */}
        {selectedDatabase && (
          <div className="px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tables..."
                  className="w-full px-3 py-1.5 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleRefreshTables}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                title="Refresh tables list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {filteredTables.length} of {tables.length} tables
            </div>
          </div>
        )}

        {/* Table List */}
        {selectedDatabase && (
          <div className="flex-1 overflow-y-auto">
            {filteredTables.length > 0 ? (
              <div className="py-2">
                {filteredTables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => onTableSelect(table.name)}
                    className={`w-full px-4 py-2.5 text-left border-l-2 transition-all ${
                      selectedTable === table.name
                        ? 'bg-gray-100 border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium truncate flex items-center gap-2 ${
                            selectedTable === table.name ? 'text-gray-900' : 'text-gray-700'
                          }`}
                          title={table.name}
                        >
                          {table.name}
                        </div>
                        <div className={`text-xs mt-0.5 ${
                          selectedTable === table.name ? 'text-gray-600' : 'text-gray-500'
                        }`}>
                          {table.rows?.toLocaleString() || 0} rows
                        </div>
                      </div>
                    </div>
                    {table.comment && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate" title={table.comment}>
                        {table.comment}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-400"
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
                  <p className="text-sm text-gray-600">
                    {tables.length === 0
                      ? 'No tables in this database'
                      : 'No tables match your search'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Database Selected */}
        {!selectedDatabase && (
          <div className="flex-1 flex items-center justify-center p-4">
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
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
              <p className="text-sm text-gray-600">Select a database above</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Data Viewer or Placeholder */}
      <div className="flex-1 min-w-0">
        {selectedDatabase && selectedTable ? (
          <DataViewer
            connectionId={connectionId}
            database={selectedDatabase}
            table={selectedTable}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
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
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl text-gray-600 mb-2">
                {selectedDatabase ? 'Select a Table' : 'Select a Database and Table'}
              </h2>
              <p className="text-gray-500">
                {selectedDatabase
                  ? 'Choose a table from the sidebar to view its data'
                  : 'Choose a database and table from the sidebar to get started'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
