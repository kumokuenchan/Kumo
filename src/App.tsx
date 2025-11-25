import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConnectionManager from './features/connections/ConnectionManager';
import SchemaExplorer from './features/schema/SchemaExplorer';
import SQLEditor from './features/query/SQLEditor';
import DataViewerWithSidebar from './features/dataViewer/DataViewerWithSidebar';
// Lazy-load heavier tabs
// const QueryBuilderCanvas = lazy(() => import('./features/queryBuilder/QueryBuilderCanvas'));
// const SmartJoinView = lazy(() => import('./features/smartJoin/SmartJoinView'));
const DocumentationTab = lazy(() => import('./features/docs/DocumentationTab'));
import PerformanceMonitor from './features/performance/PerformanceMonitor';
import PostmanTab from './features/apiTester/PostmanTab';
import PlaywrightModule from './features/playwrightTester/PlaywrightModule';
import MongoDB from './features/mongodb/MongoDB';
// Lazy-load Tools tab to reduce initial bundle
const ToolsTab = lazy(() => import('./features/tools/ToolsTab'));
// Lazy-load Notes and Terminal tabs
const NotesTab = lazy(() => import('./features/notes/NotesTab'));
const TerminalPage = lazy(() => import('./features/terminal/TerminalPage'));
const GitManagementPage = lazy(() => import('./features/git/GitManagementPage'));
const LogViewerPage = lazy(() => import('./features/logviewer/LogViewerPage'));
const BackupManager = lazy(() => import('./components/BackupManager'));
const AWSTab = lazy(() => import('./features/aws/AWSTab'));
const RemoteExplorer = lazy(() => import('./features/remote/components/RemoteExplorer'));
import { useDatabases } from './hooks/useSchema';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, useConnectToDatabase } from './hooks/useConnections';
import { connectionsApi } from './api/connections';

type TabType = 'schema' | 'query' | 'queryBuilder' | 'smartJoin' | 'data' | 'performance' | 'api-tester' | 'playwright' | 'docs' | 'tools' | 'mongodb' | 'notes' | 'terminal' | 'git' | 'logs' | 'backup' | 'aws' | 'remote';

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
  // Track intentional disconnects to prevent auto-reconnect
  const intentionalDisconnects = useRef<Set<string>>(new Set());

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
        // Only invalidate queries if we're on the performance tab to avoid unnecessary re-renders
        if (activeTab === 'performance') {
          await queryClient.invalidateQueries({ queryKey: ['connectionStats', activeConnection] });
        }
      } catch {
        // ignore
      }
    };

    const handle = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [keepAliveEnabled, keepAliveMinutes, activeConnection, isConnected, connectionPasswords, queryClient, activeTab]);

  // Auto-reconnect when connection is lost (but not for intentional disconnects)
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
      // Check if this was an intentional disconnect
      if (intentionalDisconnects.current.has(activeConnection)) {
        console.log('Intentional disconnect detected. Skipping auto-reconnect.');
        // Remove from intentional disconnects set
        intentionalDisconnects.current.delete(activeConnection);
        // Update previous state and return
        prevIsConnected.current = isConnected;
        return;
      }

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
          // Only invalidate queries if we're on the performance tab to avoid unnecessary re-renders
          if (activeTab === 'performance') {
            queryClient.invalidateQueries({ queryKey: ['connectionStats', activeConnection] });
          }
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
      <header className="bg-white/70 dark:bg-slate-900/70 border-b border-gray-200/20 dark:border-slate-700/20 px-4 py-2.5 sticky top-0 z-10 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Tabs */}
          <div className="flex items-center gap-6">
            <motion.div className="flex items-center gap-3"
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <motion.button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-2xl transition-all duration-300"
                title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
              <motion.div
                className="flex items-center gap-2.5"
                whileHover={{ scale: 1.02 }}
              >
                <motion.svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
                <h1 className="text-gray-900 dark:text-gray-100 text-[15px] font-semibold tracking-tight hidden sm:inline" style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}>Kumo</h1>
              </motion.div>
            </motion.div>

            {/* Tabs - Responsive with icons on tablet */}
            {!dockHeaderToSidebar && (
              <div className="flex gap-1 rounded-2xl p-1">
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'schema'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Schema</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="6" height="6" rx="1" />
                    <rect x="15" y="4" width="6" height="6" rx="1" />
                    <rect x="9" y="14" width="6" height="6" rx="1" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17 L6 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17 L18 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('query')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'query'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Query</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" ry="2" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 10l3 2-3 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14h5" />
                  </svg>
                </button>
{/* <button
                  onClick={() => setActiveTab('queryBuilder')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'queryBuilder'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Query Builder</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('smartJoin')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'smartJoin'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Smart Join</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="6" height="6" rx="1" />
                    <rect x="15" y="13" width="6" height="6" rx="1" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8 L15 16" />
                    <circle cx="12" cy="12" r="1.2" />
                  </svg>
                </button> */}
                <button
                  onClick={() => {
                    setActiveTab('data');
                    if (activeConnection) {
                      // Only invalidate queries if we're switching to the data tab to avoid unnecessary re-renders
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
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'data'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Data</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 18V12" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18V8" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 18V14" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'performance'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Performance</span>
                  <svg className="w-5 h-5 lg:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 16a8 8 0 10-16 0" />
                    <path d="M12 16v-3" />
                    <path d="M12 13l4-4" />
                    <circle cx="12" cy="16" r="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('api-tester')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'api-tester'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">API Tester</span>
                  <svg className="w-5 h-5 lg:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="14" rx="2" />
                    <path d="M7 8h6" />
                    <path d="M7 12h10" />
                    <path d="M7 16h8" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('playwright')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'playwright'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">E2E Tests</span>
                  <svg className="w-5 h-5 lg:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9l6 6" />
                    <path d="M15 9l-6 6" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'docs'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Docs</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {/* Book-open icon for Docs */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c-2-1-4-1.5-6-1.5S2 5.5 2 5.5v12s2-.5 4-.5 4 .5 6 1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c2-1 4-1.5 6-1.5s4 .5 4 .5v12s-2-.5-4-.5-4 .5-6 1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'tools'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Tools</span>
                  <svg className="w-5 h-5 lg:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a4 4 0 1 0-5.66 5.66l7.07 7.07a1 1 0 0 0 1.41 0l1.41-1.41a1 1 0 0 0 0-1.41L14.7 6.3z" />
                    <path d="M3 21l6-6" />
                    <path d="M13 7l4-4 1 1-4 4" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'notes'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Notes</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('terminal')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'terminal'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Terminal</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('git')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'git'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Git</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c-2-1-4-1.5-6-1.5S2 5.5 2 5.5v12s2-.5 4-.5 4 .5 6 1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c2-1 4-1.5 6-1.5s4 .5 4 .5v12s-2-.5-4-.5-4 .5-6 1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'logs'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">Logs</span>
                  <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                {/* Backup tab hidden in non-compact mode - accessible via header icon */}
                <button
                  onClick={() => setActiveTab('mongodb')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'mongodb'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">MongoDB</span>
                  <div className="w-5 h-5 lg:hidden rounded flex items-center justify-center bg-green-600">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.86 12.94c-.24-.24-.66-.24-.9 0l-1.3 1.3c-.24.24-.63.24-.87 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.65.65c.24.24.24.66 0 .9l-.35.35c-.24.24-.24.66 0 .9l.9.9c.24.24.24.66 0 .9l-.9.9c-.24.24-.66.24-.9 0l-.35-.35c-.24-.24-.66-.24-.9 0l-.65.65c-.24.24-.66.24-.9 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l1.3-1.3c.24-.24.63-.24.87 0l1.3 1.3c.24.24.24.66 0 .9l-.9.9c-.24.24-.66.24-.9 0l-.65-.65c-.24-.24-.24-.66 0-.9l.35-.35c.24-.24.66-.24.9 0l.9.9c.24.24.66.24.9 0l.9-.9c.24-.24.66-.24.9 0l.35.35c.24.24.66.24.9 0l.65-.65c.24-.24.66-.24.9 0l1.3 1.3c.24.24.24.66 0 .9l-1.3 1.3c-.24.24-.63.24-.87 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.65.65c.24.24.24.66 0 .9l-.35.35c-.24.24-.66.24-.9 0l-.9-.9c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.35.35c.24.24.66.24.9 0l.65-.65z"/>
                      <circle cx="8" cy="8" r="2"/>
                      <circle cx="16" cy="8" r="2"/>
                      <circle cx="12" cy="16" r="2"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('aws')}
                  className={`relative px-4 py-2 text-[14px] font-semibold rounded-xl transition-all duration-300 lg:px-4 lg:py-2 lg:text-[14px] ${
                    activeTab === 'aws'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-black/5 dark:shadow-black/20 border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-slate-800/50'
                  } lg:inline-flex lg:items-center`}
                >
                  <span className="hidden lg:inline">AWS</span>
                  <svg className="w-5 h-5 lg:hidden" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.76 10.17c0 .4.03.73.09.98.06.25.15.52.29.81.05.1.07.2.07.28 0 .12-.08.24-.23.36l-.77.51c-.11.07-.22.11-.32.11-.12 0-.24-.06-.36-.17-.14-.15-.26-.31-.37-.48-.1-.17-.21-.36-.33-.58-.83.98-1.87 1.47-3.12 1.47-.89 0-1.6-.25-2.12-.76-.52-.51-.78-1.19-.78-2.05 0-.91.32-1.64.97-2.19.65-.55 1.51-.83 2.59-.83.36 0 .73.03 1.12.08.39.05.79.13 1.21.22v-.73c0-.76-.16-1.29-.48-1.59-.32-.3-.87-.45-1.64-.45-.35 0-.71.04-1.08.13-.37.08-.74.19-1.1.32-.16.06-.28.1-.35.12-.07.02-.12.03-.15.03-.13 0-.2-.1-.2-.29v-.46c0-.15.02-.26.06-.33.04-.07.11-.14.22-.2.35-.18.77-.33 1.26-.45.49-.12 1.01-.18 1.56-.18 1.19 0 2.06.27 2.61.81.54.54.81 1.37.81 2.48v3.27zm-4.31 1.62c.35 0 .71-.06 1.1-.19.39-.13.73-.34 1.03-.65.18-.19.31-.4.39-.63.08-.23.13-.51.13-.84v-.4c-.31-.06-.64-.11-.98-.15-.34-.04-.68-.06-1.02-.06-.72 0-1.25.14-1.59.43-.34.29-.5.69-.5 1.21 0 .49.13.86.38 1.11.25.25.61.37 1.06.37zm8.58 1.15c-.17 0-.28-.03-.35-.09-.07-.06-.13-.19-.19-.39l-2.11-6.93c-.06-.2-.09-.33-.09-.39 0-.15.08-.23.23-.23h.94c.18 0 .3.03.36.09.07.06.12.19.18.39l1.51 5.95 1.4-5.95c.05-.2.11-.33.17-.39.07-.06.19-.09.37-.09h.77c.18 0 .3.03.37.09.07.06.13.19.17.39l1.42 6.03 1.55-6.03c.06-.2.12-.33.18-.39.07-.06.19-.09.36-.09h.89c.15 0 .23.08.23.23 0 .05-.01.1-.02.16-.01.06-.03.13-.06.23l-2.16 6.93c-.06.2-.12.33-.19.39-.07.06-.18.09-.35.09h-.83c-.18 0-.3-.03-.37-.09-.07-.06-.13-.19-.17-.39l-1.39-5.78-1.38 5.78c-.05.2-.11.33-.17.39-.07.06-.19.09-.37.09h-.83zm13.67.28c-.55 0-1.1-.06-1.64-.19-.54-.13-.96-.27-1.26-.43-.18-.1-.3-.21-.35-.32-.05-.11-.07-.23-.07-.35v-.48c0-.19.07-.29.21-.29.08 0 .16.02.24.05.08.03.2.08.35.14.5.22 1.03.38 1.61.5.58.12 1.15.18 1.72.18.91 0 1.62-.16 2.11-.48.49-.32.74-.77.74-1.36 0-.4-.13-.73-.39-.99-.26-.26-.75-.5-1.46-.72l-2.1-.66c-1.06-.33-1.84-.82-2.33-1.47-.49-.65-.74-1.37-.74-2.16 0-.62.13-1.17.4-1.64.27-.47.63-.88 1.08-1.21.45-.33.97-.58 1.57-.75.6-.17 1.23-.25 1.9-.25.24 0 .49.01.74.04.25.03.5.07.73.12.23.05.45.11.66.18.21.07.39.14.54.22.14.07.25.15.32.23.07.08.11.18.11.3v.45c0 .19-.07.29-.21.29-.08 0-.21-.04-.39-.13-.59-.27-1.26-.4-2.01-.4-.83 0-1.48.14-1.93.41-.45.27-.68.68-.68 1.23 0 .4.14.74.42 1.01.28.27.8.54 1.55.79l2.06.66c1.04.33 1.8.79 2.27 1.38.47.59.7 1.27.7 2.04 0 .64-.13 1.21-.4 1.72-.27.51-.64.94-1.11 1.31-.47.37-1.03.65-1.68.84-.65.19-1.35.28-2.1.28z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Right: Minimal Controls */}
          <div className="flex items-center gap-1.5">
            {/* Compact Mode Toggle */}
            <motion.button
              onClick={() => setDockHeaderToSidebar(v => !v)}
              className="p-2 rounded-2xl hover:bg-gray-100/60 dark:hover:bg-slate-800/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-300"
              title={dockHeaderToSidebar ? 'Exit Compact Mode' : 'Enter Compact Mode'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {dockHeaderToSidebar ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="18" height="7" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
              )}
            </motion.button>

            {/* Theme Toggle */}
            <motion.button
              onClick={() => setIsDark((v) => !v)}
              className="p-2 rounded-2xl hover:bg-gray-100/60 dark:hover:bg-slate-800/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-300"
              title="Toggle Dark/Light Mode"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.svg
                key={isDark ? 'sun' : 'moon'}
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"
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

            {/* Backup Button - Small icon */}
            <motion.button
              onClick={() => setActiveTab('backup')}
              className="p-2 rounded-2xl hover:bg-gray-100/60 dark:hover:bg-slate-800/60 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-300"
              title="Backup & Restore"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </motion.button>

            {/* Connection Status - Minimal and Refined */}
            {(!dockHeaderToSidebar) && activeConnection && isConnected && connectionDetails && selectedDatabase && selectedTable && (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-gray-200/30 dark:border-slate-700/30 backdrop-blur-sm shadow-sm"
              >
                <div className={`w-2 h-2 rounded-full ${
                  connectionDetails?.environment === 'production' ? 'bg-red-500' :
                  connectionDetails?.environment === 'staging' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}></div>
                <div className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{selectedDatabase}</span>
                  <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedTable}</span>
                </div>
              </motion.div>
            )}

            {/* Connections Button - Minimal Apple-style */}
            {!dockHeaderToSidebar && (
            <motion.button
              onClick={() => setSidebarOpen((v) => !v)}
              className="group p-2 rounded-2xl bg-gray-100/80 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 transition-all duration-300 border border-gray-200/40 dark:border-slate-700/40"
              title={sidebarOpen ? 'Hide Connections' : 'Show Connections'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                <path d="M3 12A9 3 0 0 0 21 12"></path>
              </svg>
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
{/* <button
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
            </button> */}
            <button
              onClick={() => {
                setActiveTab('data');
                if (activeConnection) {
                  // Only invalidate queries if we're switching to the data tab to avoid unnecessary re-renders
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
                <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 18V12" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18V8" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 18V14" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Data</span>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='performance'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Performance"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='performance' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 16a8 8 0 10-16 0" />
                <path d="M12 16v-3" />
                <path d="M12 13l4-4" />
                <circle cx="12" cy="16" r="1" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Performance</span>
            </button>
            <button
              onClick={() => setActiveTab('api-tester')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='api-tester'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="API Tester"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='api-tester' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M7 8h6" />
                <path d="M7 12h10" />
                <path d="M7 16h8" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">API Tester</span>
            </button>
            <button
              onClick={() => setActiveTab('playwright')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='playwright'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="E2E Tests"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='playwright' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9l6 6" />
                <path d="M15 9l-6 6" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">E2E Tests</span>
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
            <button
              onClick={() => setActiveTab('tools')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='tools'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Tools"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='tools' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a4 4 0 1 0-5.66 5.66l7.07 7.07a1 1 0 0 0 1.41 0l1.41-1.41a1 1 0 0 0 0-1.41L14.7 6.3z" />
                <path d="M3 21l6-6" />
                <path d="M13 7l4-4 1 1-4 4" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Tools</span>
            </button>
            {/* MongoDB Button */}
            <button
              onClick={() => setActiveTab('mongodb')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='mongodb'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="MongoDB"
            >
              <div className={`w-5 h-5 flex-shrink-0 rounded flex items-center justify-center ${activeTab==='mongodb' ? 'bg-green-600' : 'bg-gray-600'}`}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.86 12.94c-.24-.24-.66-.24-.9 0l-1.3 1.3c-.24.24-.63.24-.87 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.65.65c.24.24.24.66 0 .9l-.35.35c-.24.24-.24.66 0 .9l.9.9c.24.24.24.66 0 .9l-.9.9c-.24.24-.66.24-.9 0l-.35-.35c-.24-.24-.66-.24-.9 0l-.65.65c-.24.24-.66.24-.9 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l1.3-1.3c.24-.24.63-.24.87 0l1.3 1.3c.24.24.24.66 0 .9l-.9.9c-.24.24-.66.24-.9 0l-.65-.65c-.24-.24-.24-.66 0-.9l.35-.35c.24-.24.66-.24.9 0l.9.9c.24.24.66.24.9 0l.9-.9c.24-.24.66-.24.9 0l.35.35c.24.24.66.24.9 0l.65-.65c.24-.24.66-.24.9 0l1.3 1.3c.24.24.24.66 0 .9l-1.3 1.3c-.24.24-.63.24-.87 0l-1.3-1.3c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.65.65c.24.24.24.66 0 .9l-.35.35c-.24.24-.66.24-.9 0l-.9-.9c-.24-.24-.24-.66 0-.9l.9-.9c.24-.24.66-.24.9 0l.35.35c.24.24.66.24.9 0l.65-.65z"/>
                  <circle cx="8" cy="8" r="2"/>
                  <circle cx="16" cy="8" r="2"/>
                  <circle cx="12" cy="16" r="2"/>
                </svg>
              </div>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">MongoDB</span>
            </button>
            {/* Notes Button */}
            <button
              onClick={() => setActiveTab('notes')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='notes'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Notes"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='notes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Notes</span>
            </button>
            {/* Terminal Button */}
            <button
              onClick={() => setActiveTab('terminal')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='terminal'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Terminal"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='terminal' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Terminal</span>
            </button>
            {/* Git Button */}
            <button
              onClick={() => setActiveTab('git')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='git'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Git"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='git' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c-2-1-4-1.5-6-1.5S2 5.5 2 5.5v12s2-.5 4-.5 4 .5 6 1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6c2-1 4-1.5 6-1.5s4 .5 4 .5v12s-2-.5-4-.5-4 .5-6 1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Git</span>
            </button>
            {/* Logs Button */}
            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='logs'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Logs"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='logs' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Logs</span>
            </button>
            {/* Backup Button */}
            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='backup'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Backup"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='backup' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Backup</span>
            </button>
            {/* Remote Explorer Button */}
            <button
              onClick={() => setActiveTab('remote')}
              className={`w-full h-14 px-1 flex flex-col items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${activeTab==='remote'?'bg-gray-100 dark:bg-slate-700':''}`}
              title="Remote Explorer"
            >
              <svg className={`w-5 h-5 flex-shrink-0 ${activeTab==='remote' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H12M8 11H12M8 15H16M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 17V21M8 21H16" />
              </svg>
              <span className="mt-1 text-[10px] leading-tight text-center text-gray-700 dark:text-gray-200">Remote</span>
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
              actualConnectionStatus={activeConnection ? isConnected : undefined}
              onPasswordCached={(connectionId, password) => {
                setConnectionPasswords(prev => {
                  const next = new Map(prev);
                  next.set(connectionId, password);
                  return next;
                });
              }}
              onBeforeDisconnect={(connectionId) => {
                // Mark this as an intentional disconnect to prevent auto-reconnect
                intentionalDisconnects.current.add(connectionId);
              }}
            />
          </aside>
        )}

        <main className={`flex-1 flex flex-col ${activeTab === 'terminal' ? 'overflow-auto' : 'overflow-hidden'}`}>
          {activeConnection ? (
            <>
              {!isConnected && !['api-tester', 'tools', 'mongodb', 'notes', 'terminal', 'logs', 'git', 'aws', 'docs', 'playwright'].includes(activeTab) && (
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
              <div className={`flex-1 ${activeTab === 'terminal' ? '' : 'overflow-hidden'}`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.08, ease: 'easeOut' }}
                    className={activeTab === 'terminal' ? '' : 'h-full'}
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
{/* {activeTab === 'queryBuilder' && (
                  <>
                    {selectedDatabase ? (
                      <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading query builder…</div>}>
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
                      </Suspense>
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
                )} */}
{/* {activeTab === 'smartJoin' && (
                  <>
                    {selectedDatabase ? (
                      <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading smart join…</div>}>
                        <SmartJoinView connectionId={activeConnection} database={selectedDatabase} />
                      </Suspense>
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
                )} */}
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
                {activeTab === 'playwright' && <PlaywrightModule />}
                {activeTab === 'tools' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading tools…</div>}>
                    <ToolsTab />
                  </Suspense>
                )}
                {activeTab === 'mongodb' && (
                  <MongoDB />
                )}
                {activeTab === 'aws' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading AWS tools…</div>}>
                    <AWSTab />
                  </Suspense>
                )}
                {activeTab === 'notes' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading notes…</div>}>
                    <NotesTab />
                  </Suspense>
                )}
                {activeTab === 'terminal' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading terminal…</div>}>
                    <TerminalPage />
                  </Suspense>
                )}
                {activeTab === 'git' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading git management…</div>}>
                    <GitManagementPage />
                  </Suspense>
                )}
                {activeTab === 'logs' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading log viewer…</div>}>
                    <LogViewerPage />
                  </Suspense>
                )}
                {activeTab === 'backup' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading backup manager…</div>}>
                    <BackupManager />
                  </Suspense>
                )}
                {activeTab === 'remote' && (
                  <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading remote explorer…</div>}>
                    <RemoteExplorer />
                  </Suspense>
                )}
                {activeTab === 'docs' && (
                  <>
                    {selectedDatabase ? (
                      <Suspense fallback={<div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading docs…</div>}>
                        <DocumentationTab connectionId={activeConnection!} database={selectedDatabase} />
                      </Suspense>
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
                <h2 className="text-xl text-gray-700 font-semibold mb-2">Welcome to Kumo</h2>
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
