import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConnectionManager from './features/connections/ConnectionManager';
import SchemaExplorer from './features/schema/SchemaExplorer';
import SQLEditor from './features/query/SQLEditor';
import QueryBuilderCanvas from './features/queryBuilder/QueryBuilderCanvas';
import DataViewerWithSidebar from './features/dataViewer/DataViewerWithSidebar';
import SmartJoinView from './features/smartJoin/SmartJoinView';
import DocumentationTab from './features/docs/DocumentationTab';
import PerformanceMonitor from './features/performance/PerformanceMonitor';
import PostmanTab from './features/apiTester/PostmanTab';
import { useDatabases } from './hooks/useSchema';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, useConnectToDatabase } from './hooks/useConnections';
import { connectionsApi } from './api/connections';

type TabType = 'schema' | 'query' | 'queryBuilder' | 'smartJoin' | 'data' | 'performance' | 'api-tester' | 'docs';

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

  // Dock header actions (tabs + right controls) into the left sidebar (Slack-style)
  const [dockHeaderToSidebar, setDockHeaderToSidebar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dockHeaderToSidebar');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('dockHeaderToSidebar', JSON.stringify(dockHeaderToSidebar)); } catch {}
  }, [dockHeaderToSidebar]);
  // In compact mode, sidebar visibility is controlled from the compact rail

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
      {!dockHeaderToSidebar && (
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-2 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Tabs */}
          <div className="flex items-center gap-4">
            <motion.div className="flex items-center gap-2.5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            >
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1 text-gray-600 hover:text-gray-900 transition"
                title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <motion.svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"
                initial={{ scale: 1 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.06 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
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
              </motion.svg>
              <h1 className="text-gray-900 text-base font-extrabold tracking-tight hidden lg:inline" style={{ fontFamily: 'Urbanist, sans-serif' }}>Kumo DB</h1>
              
            </motion.div>

            {/* Tabs */}
            {activeConnection && !dockHeaderToSidebar && (
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'schema' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Schema
                  {activeTab === 'schema' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('query')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'query' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Query
                  {activeTab === 'query' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('queryBuilder')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'queryBuilder' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Query Builder
                  {activeTab === 'queryBuilder' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('smartJoin')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'smartJoin' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Smart Join
                  {activeTab === 'smartJoin' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
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
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'data' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Data
                  {activeTab === 'data' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'performance' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Performance
                  {activeTab === 'performance' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('api-tester')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'api-tester' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  API Tester
                  {activeTab === 'api-tester' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'docs' ? 'text-blue-600 dark:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Docs
                  {activeTab === 'docs' && (
                    <motion.div layoutId="tab-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Theme Toggle, Connection Status and Connections Button */}
          <div className="flex items-center gap-2">
            {/* Compact Mode: move all header actions to sidebar */}
            <motion.button
              onClick={() => setDockHeaderToSidebar(v => !v)}
              className="px-2 py-1 rounded border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
              title={dockHeaderToSidebar ? 'Exit Compact Mode' : 'Enter Compact Mode (dock to sidebar)'}
              aria-label="Toggle docking header actions"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              {dockHeaderToSidebar ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h7v7H3z" />
                  <path d="M14 3h7v7h-7z" />
                  <path d="M3 14h18v7H3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              )}
            </motion.button>
            {!dockHeaderToSidebar && (
            <motion.button
              onClick={() => setIsDark((v) => !v)}
              className="px-2 py-1 rounded border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle dark mode"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <motion.svg
                key={isDark ? 'sun' : 'moon'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"
              >
                {isDark ? (
                  <>
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </>
                ) : (
                  <>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </>
                )}
              </motion.svg>
            </motion.button>
            )}
            {(!dockHeaderToSidebar) && activeConnection && isConnected && connectionDetails && selectedDatabase && selectedTable && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600"
              >
                <div className={`w-2 h-2 rounded-full ${
                  connectionDetails?.environment === 'production' ? 'bg-red-500' :
                  connectionDetails?.environment === 'staging' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></div>
                <AnimatePresence initial={false}>
                  {connectionDetails?.environment === 'production' && (
                    <motion.span
                      key="prod-badge"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.1 }}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded"
                      title="Production Environment - Be Careful!"
                    >
                      PROD
                    </motion.span>
                  )}
                  {connectionDetails?.environment === 'staging' && (
                    <motion.span
                      key="stage-badge"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.1 }}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-yellow-500 rounded"
                      title="Staging Environment"
                    >
                      STAGE
                    </motion.span>
                  )}
                </AnimatePresence>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600 dark:text-gray-400">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                  <path d="M3 12A9 3 0 0 0 21 12"></path>
                </svg>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={selectedDatabase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    {selectedDatabase}
                  </motion.span>
                </AnimatePresence>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={selectedTable}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm text-gray-900 dark:text-gray-100"
                  >
                    {selectedTable}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
            {!dockHeaderToSidebar && (
            <motion.button
              onClick={() => setSidebarOpen((v) => !v)}
              className="group inline-flex items-center gap-2 px-2 py-1.5 rounded bg-white text-gray-900 border border-gray-200 hover:bg-gray-100"
              title={sidebarOpen ? 'Hide Connections Sidebar' : 'Show Connections Sidebar'}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                <path d="M3 12A9 3 0 0 0 21 12"></path>
              </svg>
              <span
                className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-150 whitespace-nowrap text-sm"
              >
                Connections
              </span>
            </motion.button>
            )}
          </div>
        </div>
      </header>
      )}

      <div className="flex-1 flex overflow-hidden">
        {dockHeaderToSidebar && (
          <aside className="w-16 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col items-stretch py-2 gap-1">
            {/* Kumo icon (brand) */}
            <button
              onClick={() => setDockHeaderToSidebar(false)}
              className="relative group w-full h-12 px-1 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Exit Compact Mode"
              aria-label="Exit Compact Mode"
            >
              <img src="/favicon.svg" alt="Kumo" className="w-5 h-5" />
              <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 z-20 px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity delay-300 whitespace-nowrap">Exit Compact Mode</span>
            </button>
            
            {/* Tabs as small icon-only buttons */}
            <button
              onClick={() => setActiveTab('schema')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='schema'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Schema"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='schema' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="6" height="6" rx="1" />
                <rect x="15" y="4" width="6" height="6" rx="1" />
                <rect x="9" y="14" width="6" height="6" rx="1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17 L6 7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17 L18 7" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Schema</span>
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='query'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Query"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='query' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 10l3 2-3 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14h5" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Query</span>
            </button>
            <button
              onClick={() => setActiveTab('queryBuilder')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='queryBuilder'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Query Builder"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='queryBuilder' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Query Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('smartJoin')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='smartJoin'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Smart Join"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='smartJoin' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="5" width="6" height="6" rx="1" />
                <rect x="15" y="13" width="6" height="6" rx="1" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8 L15 16" />
                <circle cx="12" cy="12" r="1.2" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Smart Join</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('data');
                if (activeConnection) {
                  queryClient.invalidateQueries({ queryKey: ['tableStats', activeConnection] });
                  queryClient.invalidateQueries({ queryKey: ['completeTableSchema', activeConnection] });
                  queryClient.invalidateQueries({ queryKey: ['tables', activeConnection] });
                }
                setSchemaRefreshKey(prev => prev + 1);
              }}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='data'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Data"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='data' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 18V12" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18V8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 18V14" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Data</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='docs'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Docs"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='docs' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {/* Book-open icon for Docs */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c-2-1-4-1.5-6-1.5S2 5.5 2 5.5v12s2-.5 4-.5 4 .5 6 1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c2-1 4-1.5 6-1.5s4 .5 4 .5v12s-2-.5-4-.5-4 .5-6 1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Docs</span>
            </button>
            {/* Bottom group: Theme + Connections + Exit */}
            <div className="mt-auto">
            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(v => !v)}
              className="relative group w-full h-14 px-1 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 z-20 px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity delay-300 whitespace-nowrap">Toggle theme</span>
            </button>
            {/* Connections toggle above exit */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`relative group w-full h-14 px-1 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${sidebarOpen ? 'bg-gray-100 dark:bg-slate-700' : ''}`}
              title={sidebarOpen ? 'Hide Connections' : 'Show Connections'}
              aria-label={sidebarOpen ? 'Hide Connections' : 'Show Connections'}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                <path d="M3 12A9 3 0 0 0 21 12" />
              </svg>
              <span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 z-20 px-2 py-1 text-xs rounded bg-gray-900 text-white dark:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity delay-300 whitespace-nowrap">
                {sidebarOpen ? 'Hide Connections' : 'Show Connections'}
              </span>
            </button>
            {/* Exit compact mode at very bottom */}
            <button
              onClick={() => setDockHeaderToSidebar(false)}
              className="w-full h-14 mb-1 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Exit Compact Mode"
              aria-label="Exit Compact Mode"
            >
              <svg className="w-5 h-5 flex-shrink-0 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 8h18" />
              </svg>
            </button>
            </div>
          </aside>
        )}
        {sidebarOpen && (
          <aside className="w-80 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden">
            {/* Align horizontal rail with compact bar (below Kumo icon) */}
            <div className="h-12 border-b border-gray-200 dark:border-slate-700" />
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.08, ease: 'easeOut' }}
                    className="h-full"
                  >
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
                {activeTab === 'performance' && (
                  <PerformanceMonitor
                    connectionId={activeConnection}
                    databases={databases.map((d) => ({ name: d.name, tables: 0 }))}
                  />
                )}
                {activeTab === 'api-tester' && <PostmanTab />}
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
                  </motion.div>
                </AnimatePresence>
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
