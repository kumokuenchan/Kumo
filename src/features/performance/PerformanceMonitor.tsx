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
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-2">No Connection Selected</h2>
          <p className="text-gray-500 dark:text-gray-500">
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header with Tabs */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h2>
          </div>

          {/* Database Selector (for some tabs) */}
          {(activeTab === 'index-usage' || activeTab === 'query-stats') && (
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Databases</option>
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'metrics' && <MetricsDashboard connectionId={connectionId} />}
        {activeTab === 'connections' && <ActiveConnectionsViewer connectionId={connectionId} />}
        {activeTab === 'slow-queries' && <SlowQueryViewer connectionId={connectionId} />}
        {activeTab === 'index-usage' && (
          <IndexUsageAnalysis connectionId={connectionId} database={selectedDatabase} />
        )}
        {activeTab === 'query-stats' && <QueryStatsViewer connectionId={connectionId} />}
      </div>
    </div>
  );
}
