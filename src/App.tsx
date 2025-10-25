import { useState, useEffect } from 'react';
import ConnectionManager from './features/connections/ConnectionManager';
import SchemaExplorer from './features/schema/SchemaExplorer';
import SQLEditor from './features/query/SQLEditor';
import QueryBuilderCanvas from './features/queryBuilder/QueryBuilderCanvas';
import DataViewerWithSidebar from './features/dataViewer/DataViewerWithSidebar';
import SmartJoinView from './features/smartJoin/SmartJoinView';
import { useDatabases } from './hooks/useSchema';
import { useConnectionStatus } from './hooks/useConnectionStatus';

type TabType = 'schema' | 'query' | 'queryBuilder' | 'smartJoin' | 'data';

function App() {
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

  // Fetch databases only when connected
  const { data: databasesData } = useDatabases(isConnected ? activeConnection : null);
  const databases = databasesData || [];

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 text-gray-600 hover:text-gray-900 transition"
            title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Kumo DB</h1>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 transition"
          title={sidebarOpen ? 'Hide Connections Sidebar' : 'Show Connections Sidebar'}
        >
          Connections
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <ConnectionManager
              activeConnection={activeConnection}
              onConnectionSelect={setActiveConnection}
              triggerNew={triggerNewConnection}
            />
          </aside>
        )}

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeConnection ? (
            <>
              {!isConnected && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-yellow-800 text-sm">
                  Not connected. Select the connection in the sidebar and click "Connect" to load schema.
                </div>
              )}
              {/* Tab Navigation */}
              <div className="bg-white border-b border-gray-200 px-6 flex gap-6">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'schema'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Schema
                </button>

                <button
                  onClick={() => setActiveTab('query')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'query'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Query
                </button>

                <button
                  onClick={() => setActiveTab('queryBuilder')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'queryBuilder'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Query Builder
                </button>

                <button
                  onClick={() => setActiveTab('smartJoin')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'smartJoin'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Smart Join
                </button>

                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'data'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Data
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'schema' && (
                  <SchemaExplorer
                    connectionId={activeConnection}
                    onViewData={(db, tbl) => {
                      setSelectedDatabase(db);
                      setSelectedTable(tbl);
                      setActiveTab('data');
                    }}
                  />
                )}
                {activeTab === 'query' && <SQLEditor connectionId={activeConnection} />}
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
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
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
