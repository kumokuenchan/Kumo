import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Favorite tables and usage tracking (per connection+database)
  const favKey = selectedDatabase ? `favTables:${connectionId}:${selectedDatabase}` : '';
  const usageKey = selectedDatabase ? `tableUsage:${connectionId}:${selectedDatabase}` : '';

  const [favoriteTables, setFavoriteTables] = useState<Set<string>>(() => {
    if (!favKey) return new Set();
    try {
      const raw = localStorage.getItem(favKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() => {
    if (!usageKey) return {};
    try {
      const raw = localStorage.getItem(usageKey);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  });

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [savedWidth, setSavedWidth] = useState(320);

  // Search/filter state
  const [search, setSearch] = useState('');
  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, search]);

  // Reload favorites/usage when database changes
  useEffect(() => {
    if (!selectedDatabase) return;
    try {
      const favRaw = localStorage.getItem(favKey);
      setFavoriteTables(new Set(favRaw ? (JSON.parse(favRaw) as string[]) : []));
    } catch {
      setFavoriteTables(new Set());
    }
    try {
      const usageRaw = localStorage.getItem(usageKey);
      setUsageCounts(usageRaw ? (JSON.parse(usageRaw) as Record<string, number>) : {});
    } catch {
      setUsageCounts({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatabase, connectionId]);

  // Sorted favorites by usage count desc, fallback alphabetical
  const favoriteList = useMemo(() => {
    const list = tables.map((t) => t.name).filter((n) => favoriteTables.has(n));
    return list.sort((a, b) => {
      const ua = usageCounts[a] || 0;
      const ub = usageCounts[b] || 0;
      if (ub !== ua) return ub - ua;
      return a.localeCompare(b);
    });
  }, [tables, favoriteTables, usageCounts]);

  const toggleFavorite = (tableName: string) => {
    setFavoriteTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) next.delete(tableName); else next.add(tableName);
      try {
        if (favKey) localStorage.setItem(favKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Increment usage when user selects a table
  const handleSelectTable = (name: string) => {
    onTableSelect(name);
    setUsageCounts((prev) => {
      const next = { ...prev, [name]: (prev[name] || 0) + 1 };
      try {
        if (usageKey) localStorage.setItem(usageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const toggleSidebar = () => {
    if (isCollapsed) {
      // Expand: restore saved width
      setSidebarWidth(savedWidth);
      setIsCollapsed(false);
    } else {
      // Collapse: save current width and set to minimal
      setSavedWidth(sidebarWidth);
      setSidebarWidth(40);
      setIsCollapsed(true);
    }
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
      <div
        className="bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col shadow-sm relative"
        style={{
          width: `${sidebarWidth}px`,
          minWidth: isCollapsed ? '40px' : '200px',
          maxWidth: isCollapsed ? '40px' : '600px'
        }}
      >
        {/* Collapsed State - Show expand button only */}
        {isCollapsed ? (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            {/* Sidebar Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4">
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
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-600 focus:border-gray-400 dark:focus:border-slate-600 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">Select database...</option>
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-semibold text-gray-900 dark:text-white">
              {selectedDatabase}
            </div>
          )}
        </div>

        {/* Table Search */}
        {selectedDatabase && (
          <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tables..."
                  className="w-full px-3 py-1.5 pl-9 text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-600 focus:border-gray-400 dark:focus:border-slate-600 bg-white dark:bg-slate-700"
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
              <div className="py-0.5">
                {favoriteList.length > 0 && (
                  <div className="mb-2 px-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.803 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.803-2.036a1 1 0 00-1.176 0L6.61 16.283c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.974 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.075-3.292z" />
                        </svg>
                        Favorites
                      </div>
                      <div className="text-[10px] text-gray-400">by usage</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {favoriteList.map((name) => (
                        <button
                          key={name}
                          onClick={() => handleSelectTable(name)}
                          className={`px-2 py-1 rounded text-xs border transition-colors ${
                            selectedTable === name
                              ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                              : 'bg-white dark:bg-slate-800 border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                          title={`${name} · used ${usageCounts[name] || 0}x`}
                        >
                          ⭐ {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredTables.map((table) => (
                  <div key={table.name} className="group w-full">
                    <button
                      onClick={() => handleSelectTable(table.name)}
                      className={`w-full px-3 py-1 text-left border-l-2 transition-all ${
                        selectedTable === table.name
                          ? 'bg-gray-100 dark:bg-slate-800 border-gray-900 dark:border-blue-500 text-gray-900 dark:text-white'
                          : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-medium truncate flex items-center gap-2 ${
                              selectedTable === table.name ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                            }`}
                            title={table.name}
                          >
                            {table.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(table.name); }}
                          className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                          title={favoriteTables.has(table.name) ? 'Unpin from favorites' : 'Pin to favorites'}
                        >
                          {favoriteTables.has(table.name) ? (
                            <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.803 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.803-2.036a1 1 0 00-1.176 0L6.61 16.283c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.974 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.075-3.292z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">No tables found</div>
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
          </>
        )}

        {/* Collapse/Expand Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -translate-y-1/2 right-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors z-10"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className={`absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-400/50 transition-colors ${
              isResizing ? 'bg-blue-500/70' : 'bg-transparent'
            }`}
            onMouseDown={startResizing}
            style={{ cursor: 'col-resize', userSelect: 'none' }}
          />
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
