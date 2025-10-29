import { useState, useEffect, useRef } from 'react';
import ConnectionManager from './features/connections/ConnectionManager';
import SchemaExplorer from './features/schema/SchemaExplorer';
import SQLEditor from './features/query/SQLEditor';
import QueryBuilderCanvas from './features/queryBuilder/QueryBuilderCanvas';
import DataViewerWithSidebar from './features/dataViewer/DataViewerWithSidebar';
import SmartJoinView from './features/smartJoin/SmartJoinView';
import DocumentationTab from './features/docs/DocumentationTab';
import { useDatabases } from './hooks/useSchema';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, useConnectToDatabase } from './hooks/useConnections';
import { connectionsApi } from './api/connections';

type TabType = 'schema' | 'query' | 'queryBuilder' | 'smartJoin' | 'data' | 'docs';

function App() {
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [activeConnection, setActiveConnection] = useState<string | null>(() => {
    const saved = localStorage.getItem('activeConnection');
    return saved || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as TabType) || 'schema';
  });
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(() => {
    const saved = localStorage.getItem('selectedDatabase');
    return saved || null;
  });
  const [selectedTable, setSelectedTable] = useState<string | null>(() => {
    const saved = localStorage.getItem('selectedTable');
    return saved || null;
  });
  const [triggerNewConnection, setTriggerNewConnection] = useState<number>(0);
  const [generatedQuery, setGeneratedQuery] = useState<string | null>(null);
  const [schemaRefreshKey, setSchemaRefreshKey] = useState<number>(0);
  // Store passwords in memory for auto-reconnect (not persisted to localStorage for security)
  const [connectionPasswords, setConnectionPasswords] = useState<Map<string, string>>(new Map());
  // Keep-alive settings (defaults). Persist keys if user changes via future UI
  const [keepAliveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('keepAliveEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [keepAliveMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('keepAliveMinutes');
    const val = saved ? Number(saved) : 10;
    return Number.isFinite(val) && val > 0 ? val : 10;
  });

  // Apply theme to <html> via class and attribute for CSS/Tailwind
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Persist active connection to localStorage
  useEffect(() => {
    if (activeConnection) {
      localStorage.setItem('activeConnection', activeConnection);
    } else {
      localStorage.removeItem('activeConnection');
    }
  }, [activeConnection]);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist selected database to localStorage
  useEffect(() => {
    if (selectedDatabase) {
      localStorage.setItem('selectedDatabase', selectedDatabase);
    } else {
      localStorage.removeItem('selectedDatabase');
    }
  }, [selectedDatabase]);

  // Persist selected table to localStorage
  useEffect(() => {
    if (selectedTable) {
      localStorage.setItem('selectedTable', selectedTable);
    } else {
      localStorage.removeItem('selectedTable');
    }
  }, [selectedTable]);

  // Check connection status (pool available?)
  const { data: connectionStatus } = useConnectionStatus(activeConnection);
  const isConnected = !!connectionStatus?.isConnected;

  // Get connection details for auto-reconnect
  const { data: connectionDetails } = useConnection(activeConnection);
  const connectMutation = useConnectToDatabase();

  // Track previous connection state for auto-reconnect
  const prevIsConnected = useRef<boolean | null>(null);
  const isReconnecting = useRef(false);

  // Fetch databases only when connected
  const { data: databasesData } = useDatabases(isConnected ? activeConnection : null);
  const databases = databasesData || [];

  // Keep-alive ping for active connection
  useEffect(() => {
    if (!keepAliveEnabled) return;
    if (!activeConnection) return;
    if (!isConnected) return;

    const intervalMs = keepAliveMinutes * 60 * 1000;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const pw = connectionPasswords.get(activeConnection);
        await connectionsApi.ping(activeConnection, pw);
        await queryClient.invalidateQueries({ queryKey: ['connectionStats', activeConnection] });
      } catch {
        // ignore
      }
    };

    const handle = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [keepAliveEnabled, keepAliveMinutes, activeConnection, isConnected, connectionPasswords, queryClient]);

  // Auto-reconnect when connection is lost
  useEffect(() => {
    // Skip if no active connection
    if (!activeConnection) {
      prevIsConnected.current = null;
      return;
    }

    // Initialize on first run
    if (prevIsConnected.current === null) {
      prevIsConnected.current = isConnected;
      return;
    }

    // Detect disconnection (was connected, now disconnected)
    const wasConnected = prevIsConnected.current;
    const nowDisconnected = !isConnected;

    if (wasConnected && nowDisconnected && !isReconnecting.current) {
      console.log('Connection lost. Attempting auto-reconnect...');

      // Check if we have a cached password for this connection
      const cachedPassword = connectionPasswords.get(activeConnection);

      if (cachedPassword) {
        isReconnecting.current = true;

        connectMutation.mutateAsync({
          id: activeConnection,
          password: cachedPassword,
        })
        .then(() => {
          console.log('Auto-reconnect successful');
          queryClient.invalidateQueries({ queryKey: ['connectionStats', activeConnection] });
        })
        .catch((error) => {
          console.error('Auto-reconnect failed:', error);
        })
        .finally(() => {
          isReconnecting.current = false;
        });
      } else {
        console.log('Cannot auto-reconnect: no password in memory. User needs to reconnect manually.');
      }
    }

    // Update previous state
    prevIsConnected.current = isConnected;
  }, [isConnected, activeConnection, connectionPasswords, connectMutation, queryClient]);

  const handleGenerateQuery = (database: string, table: string) => {
    // Generate SELECT query template
    const query = `SELECT * FROM \`${table}\` WHERE `;
    setGeneratedQuery(query);
    setActiveTab('query');
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1 text-gray-600 hover:text-gray-900 transition"
                title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                <path d="M75 45C75 36.7157 68.2843 30 60 30C58.3431 30 56.7686 30.3137 55.3137 30.8824C52.4804 23.6863 45.6863 18.75 37.5 18.75C26.4543 18.75 17.5 27.7043 17.5 38.75C17.5 39.6667 17.5588 40.5686 17.6716 41.451C11.7157 43.8137 7.5 49.6569 7.5 56.25C7.5 64.9558 14.5442 72 23.25 72H70C79.665 72 87.5 64.165 87.5 54.5C87.5 48.7647 84.3971 43.7843 79.8039 41.1373C78.902 42.8824 77.5686 44.3824 75.9314 45.5098C76.598 46.7745 77 48.2157 77 49.75C77 54.5784 73.0784 58.5 68.25 58.5H33.75C28.9216 58.5 25 54.5784 25 49.75C25 45.8137 27.5686 42.4902 31.1765 41.3333C31.0588 40.4804 31 39.6176 31 38.75C31 32.0882 36.3382 26.75 43 26.75C48.0196 26.75 52.3333 29.7451 54.3137 34.0588C56.2255 32.7647 58.5196 32 61 32C67.6275 32 73 37.3725 73 44C73 44.3529 72.9804 44.6961 72.9412 45.0294C74.0098 45.0098 75 45.4216 75 45Z" fill="url(#gradient1)"/>
                <ellipse cx="50" cy="52" rx="18" ry="6" fill="url(#gradient2)" opacity="0.9"/>
                <rect x="32" y="52" width="36" height="8" fill="url(#gradient2)" opacity="0.8"/>
                <ellipse cx="50" cy="60" rx="18" ry="6" fill="url(#gradient3)" opacity="0.9"/>
                <rect x="32" y="60" width="36" height="8" fill="url(#gradient3)" opacity="0.7"/>
                <ellipse cx="50" cy="68" rx="18" ry="6" fill="url(#gradient4)"/>
                <defs>
                  <linearGradient id="gradient1" x1="7.5" y1="18.75" x2="87.5" y2="72" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#60A5FA"/>
                    <stop offset="100%" stopColor="#3B82F6"/>
                  </linearGradient>
                  <linearGradient id="gradient2" x1="32" y1="52" x2="68" y2="58" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1E40AF"/>
                    <stop offset="100%" stopColor="#3B82F6"/>
                  </linearGradient>
                  <linearGradient id="gradient3" x1="32" y1="60" x2="68" y2="66" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1E3A8A"/>
                    <stop offset="100%" stopColor="#2563EB"/>
                  </linearGradient>
                  <linearGradient id="gradient4" x1="32" y1="68" x2="68" y2="74" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1E3A8A"/>
                    <stop offset="100%" stopColor="#3B82F6"/>
                  </linearGradient>
                </defs>
              </svg>
              <h1 className="text-gray-900" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Kumo DB</h1>
            </div>

            {/* Tabs */}
            {activeConnection && (
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'schema'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Schema
                </button>
                <button
                  onClick={() => setActiveTab('query')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'query'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Query
                </button>
                <button
                  onClick={() => setActiveTab('queryBuilder')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'queryBuilder'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Query Builder
                </button>
                <button
                  onClick={() => setActiveTab('smartJoin')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'smartJoin'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Smart Join
                </button>
                <button
                  onClick={() => {
                    setActiveTab('data');
                    // Refresh schema panel and table stats when switching to Data tab
                    if (activeConnection) {
                      queryClient.invalidateQueries({
                        queryKey: ['tableStats', activeConnection],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ['completeTableSchema', activeConnection],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ['tables', activeConnection],
                      });
                    }
                    setSchemaRefreshKey(prev => prev + 1);
                  }}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'data'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Data
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'docs'
                      ? 'border-blue-500 text-blue-600 dark:border-gray-400 dark:text-gray-200'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Docs
                </button>
              </div>
            )}
          </div>

          {/* Right: Theme Toggle, Connection Status and Connections Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark((v) => !v)}
              className="p-2 rounded border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                // Sun icon
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                // Moon icon
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            {activeConnection && isConnected && selectedDatabase && selectedTable && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                    <path d="M3 12A9 3 0 0 0 21 12"></path>
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{selectedDatabase}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
                <span className="text-sm text-gray-900">{selectedTable}</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 transition"
              title={sidebarOpen ? 'Hide Connections Sidebar' : 'Show Connections Sidebar'}
            >
              Connections
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden">
            <ConnectionManager
              activeConnection={activeConnection}
              onConnectionSelect={setActiveConnection}
              triggerNew={triggerNewConnection}
              onPasswordCached={(connectionId, password) => {
                setConnectionPasswords(prev => {
                  const next = new Map(prev);
                  next.set(connectionId, password);
                  return next;
                });
              }}
            />
          </aside>
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeConnection ? (
            <>
              {!isConnected && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-yellow-800 font-medium">Not connected.</span>
                      <span className="text-yellow-700">Open the sidebar and click "Connect" to reconnect to your database.</span>
                    </div>
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition"
                    >
                      Open Connections
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'schema' && (
                  <SchemaExplorer
                    key={schemaRefreshKey}
                    connectionId={activeConnection}
                    onViewData={(db, tbl) => {
                      setSelectedDatabase(db);
                      setSelectedTable(tbl);
                      setActiveTab('data');
                      setSchemaRefreshKey(prev => prev + 1);
                    }}
                    onGenerateQuery={handleGenerateQuery}
                    onTableRenamed={(database, oldName, newName) => {
                      // Update selectedTable if it was the renamed table
                      if (selectedDatabase === database && selectedTable === oldName) {
                        setSelectedTable(newName);
                      }
                    }}
                  />
                )}
                {activeTab === 'query' && (
                  <SQLEditor
                    connectionId={activeConnection}
                    generatedQuery={generatedQuery}
                    onQueryUsed={() => setGeneratedQuery(null)}
                  />
                )}
                {activeTab === 'queryBuilder' && (
                  <>
                    {selectedDatabase ? (
                      <QueryBuilderCanvas
                        connectionId={activeConnection}
                        database={selectedDatabase}
                        onExecuteQuery={(sql) => {
                          // Switch to SQL Editor tab with the generated query
                          setActiveTab('query');
                          // TODO: Pre-populate SQL editor with the query
                        }}
                        onEditSQL={(sql) => {
                          // Switch to SQL Editor tab
                          setActiveTab('query');
                          // TODO: Pre-populate SQL editor with the query
                        }}
                      />
                    ) : (
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
                            Choose a database to start building queries visually
                          </p>
                          <div className="space-y-2">
                            {databases.map((db) => (
                              <button
                                key={db.name}
                                onClick={() => setSelectedDatabase(db.name)}
                                className="w-full px-4 py-3 glass rounded-lg text-left transition-colors hover:bg-white/60"
                              >
                                <div className="font-medium">{db.name}</div>
                                <div className="text-xs text-gray-500">{db.charset} • {db.collation}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === 'smartJoin' && (
                  <>
                    {selectedDatabase ? (
                      <SmartJoinView connectionId={activeConnection} database={selectedDatabase} />
                    ) : (
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
                            Choose a database to start joining related tables automatically
                          </p>
                          <div className="space-y-2">
                            {databases.map((db) => (
                              <button
                                key={db.name}
                                onClick={() => setSelectedDatabase(db.name)}
                                className="w-full px-4 py-2 text-left rounded bg-blue-50 hover:bg-blue-100 text-blue-900 transition"
                              >
                                {db.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {activeTab === 'data' && (
                  <DataViewerWithSidebar
                    connectionId={activeConnection}
                    databases={databases.map((d) => ({ name: d.name, tables: 0 }))}
                    selectedDatabase={selectedDatabase}
                    selectedTable={selectedTable}
                    onDatabaseSelect={setSelectedDatabase}
                    onTableSelect={setSelectedTable}
                  />
                )}
                {activeTab === 'docs' && (
                  <>
                    {selectedDatabase ? (
                      <DocumentationTab connectionId={activeConnection!} database={selectedDatabase} />
                    ) : (
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
                          <h2 className="text-xl text-gray-600 mb-2">Select a Database</h2>
                          <p className="text-gray-500 mb-4">Choose a database to generate documentation</p>
                          <div className="space-y-2">
                            {databases.map((db) => (
                              <button
                                key={db.name}
                                onClick={() => setSelectedDatabase(db.name)}
                                className="w-full px-4 py-2 text-left rounded bg-blue-50 hover:bg-blue-100 text-blue-900 transition"
                              >
                                {db.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800">
              <div className="text-center">
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
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                <h2 className="text-xl text-gray-700 font-semibold mb-2">Welcome to Kumo DB</h2>
                <p className="text-gray-500 mb-6">
                  Create or select a connection to get started
                </p>
                <button
                  onClick={() => {
                    setSidebarOpen(true);
                    setTriggerNewConnection((prev) => prev + 1);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Connection
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
