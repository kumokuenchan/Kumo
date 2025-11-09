import { useState } from 'react';
import { Activity, Database, Zap, BarChart3, List, TrendingUp } from 'lucide-react';
import MetricsDashboard from './MetricsDashboard';
import ActiveConnectionsViewer from './ActiveConnectionsViewer';
import SlowQueryViewer from './SlowQueryViewer';
import IndexUsageAnalysis from './IndexUsageAnalysis';
import QueryStatsViewer from './QueryStatsViewer';

interface PerformanceMonitorProps {
  connectionId: string | null;
  databases: Array<{ name: string; tables: number }>;
}

type TabType = 'metrics' | 'connections' | 'slow-queries' | 'index-usage' | 'query-stats';

export default function PerformanceMonitor({ connectionId, databases }: PerformanceMonitorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');

  if (!connectionId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-[#0d1117] dark:to-[#1a1d23]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Connection Selected</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Please connect to a database to view performance metrics
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'metrics' as TabType, label: 'Metrics Dashboard', icon: BarChart3 },
    { id: 'connections' as TabType, label: 'Active Connections', icon: Database },
    { id: 'slow-queries' as TabType, label: 'Slow Queries', icon: Zap },
    { id: 'index-usage' as TabType, label: 'Index Usage', icon: List },
    { id: 'query-stats' as TabType, label: 'Query Statistics', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-[#0d1117] dark:to-[#1a1d23]">
      {/* Database Selector and Tab Navigation */}
      <div className="px-4 py-2 bg-white/60 dark:bg-[#161b22]/60 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        {/* Database Selector */}
        {(activeTab === 'index-usage' || activeTab === 'query-stats') && (
          <div className="flex items-center gap-2 mb-2">
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">All Databases</option>
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name} ({db.tables})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          {activeTab === 'metrics' && <MetricsDashboard connectionId={connectionId} />}
          {activeTab === 'connections' && <ActiveConnectionsViewer connectionId={connectionId} />}
          {activeTab === 'slow-queries' && <SlowQueryViewer connectionId={connectionId} />}
          {activeTab === 'index-usage' && (
            <IndexUsageAnalysis connectionId={connectionId} database={selectedDatabase} />
          )}
          {activeTab === 'query-stats' && <QueryStatsViewer connectionId={connectionId} />}
        </div>
      </div>
    </div>
  );
}
