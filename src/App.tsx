import { useState } from 'react';
import ConnectionManager from './features/connections/ConnectionManager';
import SchemaExplorer from './features/schema/SchemaExplorer';
import SQLEditor from './features/query/SQLEditor';
import QueryBuilderCanvas from './features/queryBuilder/QueryBuilderCanvas';
import DataViewer from './features/dataViewer/DataViewer';
import TableSelector from './features/dataViewer/TableSelector';
import SmartJoinView from './features/smartJoin/SmartJoinView';
import { useDatabases } from './hooks/useSchema';
import { useConnectionStatus } from './hooks/useConnectionStatus';

type TabType = 'schema' | 'query' | 'queryBuilder' | 'smartJoin' | 'data';

function App() {
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('schema');
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Check connection status (pool available?)
  const { data: connectionStatus } = useConnectionStatus(activeConnection);
  const isConnected = !!connectionStatus?.isConnected;

  // Fetch databases only when connected
  const { data: databasesData } = useDatabases(isConnected ? activeConnection : null);
  const databases = databasesData || [];

  return (
    <div className="h-screen flex flex-col bg-transparent">
      <header className="glass-strong p-4 text-slate-900 dark:text-slate-100 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kumo DB</h1>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="px-3 py-1 text-sm rounded border border-white/30 hover:bg-white/20 transition"
          title={sidebarOpen ? 'Hide Connections Sidebar' : 'Show Connections Sidebar'}
        >
          {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-80 glass border-r border-white/20 overflow-y-auto">
            <ConnectionManager
              activeConnection={activeConnection}
              onConnectionSelect={setActiveConnection}
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
              <div className="glass mx-4 my-3 px-2 py-2 rounded-xl border border-white/30 flex gap-1">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`pill-btn ${activeTab === 'schema' ? 'pill-btn-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                    Schema
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('query')}
                  className={`pill-btn ${activeTab === 'query' ? 'pill-btn-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                    Query
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('queryBuilder')}
                  className={`pill-btn ${activeTab === 'queryBuilder' ? 'pill-btn-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Query Builder
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('smartJoin')}
                  className={`pill-btn ${activeTab === 'smartJoin' ? 'pill-btn-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    Smart Join
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('data')}
                  className={`pill-btn ${activeTab === 'data' ? 'pill-btn-active' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Data
                  </div>
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
                  <>
                    {selectedDatabase && selectedTable ? (
                      <DataViewer
                        connectionId={activeConnection}
                        database={selectedDatabase}
                        table={selectedTable}
                        onBackToTables={() => setSelectedTable(null)}
                        onBackToDatabases={() => {
                          setSelectedTable(null);
                          setSelectedDatabase(null);
                        }}
                      />
                    ) : (
                      <TableSelector
                        connectionId={activeConnection}
                        databases={databases.map((d) => ({ name: d.name, tables: 0 }))}
                        selectedDatabase={selectedDatabase}
                        onDatabaseSelect={setSelectedDatabase}
                        onTableSelect={setSelectedTable}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
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
                <h2 className="text-2xl text-gray-600 mb-2">Welcome to Kumo DB</h2>
                <p className="text-gray-500">
                  Create or select a connection to get started
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
