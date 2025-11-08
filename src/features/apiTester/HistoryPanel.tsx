import { useState, useEffect } from 'react';
import { Clock, Trash2, Search, X } from 'lucide-react';
import { apiTesterStorage, type HistoryItem } from '../../services/apiTesterStorage';
import type { ApiRequest } from '../../api/apiTester';

interface HistoryPanelProps {
  onLoadRequest: (request: ApiRequest) => void;
  onClose: () => void;
}

export default function HistoryPanel({ onLoadRequest, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>(apiTesterStorage.getHistory());
  // Refresh when history updates elsewhere
  useEffect(() => {
    const handler = () => setHistory(apiTesterStorage.getHistory());
    window.addEventListener('apiTester:historyChanged', handler as any);
    return () => window.removeEventListener('apiTester:historyChanged', handler as any);
  }, []);
  const [search, setSearch] = useState('');

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      apiTesterStorage.clearHistory();
      setHistory([]);
    }
  };

  const handleDeleteItem = (id: string) => {
    apiTesterStorage.deleteHistoryItem(id);
    setHistory(apiTesterStorage.getHistory());
  };

  const handleLoadRequest = (item: HistoryItem) => {
    onLoadRequest(item.request);
    onClose();
  };

  const filteredHistory = search
    ? history.filter(item =>
        (item.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
        item.request.url.toLowerCase().includes(search.toLowerCase()) ||
        item.request.method.toLowerCase().includes(search.toLowerCase())
      )
    : history;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="absolute right-0 top-12 bottom-0 w-96 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-l border-gray-300 dark:border-slate-700 shadow-xl flex flex-col z-10 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
          </span>
          <button
            onClick={handleClearHistory}
            disabled={history.length === 0}
            className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <Clock className="w-12 h-12 mb-3 text-gray-400 dark:text-gray-600" />
            <p className="text-sm">
              {search ? 'No matching history found' : 'No request history yet'}
            </p>
            <p className="text-xs mt-1">
              {search ? 'Try a different search term' : 'Executed requests will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="group p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 cursor-pointer transition-all duration-200"
                onClick={() => handleLoadRequest(item)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm ${
                        item.request.method === 'GET'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                          : item.request.method === 'POST'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                          : item.request.method === 'PUT'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25'
                          : item.request.method === 'DELETE'
                          ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25'
                          : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                      }`}
                    >
                      {item.request.method}
                    </span>
                    <span className={`text-sm font-medium ${getStatusColor(item.response.status)}`}>
                      {item.response.status}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  </button>
                </div>

                {item.title ? (
                  <>
                    <div className="text-sm text-gray-900 dark:text-white mb-0.5 truncate" title={item.title}>
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate" title={item.request.url}>
                      {item.request.url}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-900 dark:text-white mb-1 truncate" title={item.request.url}>
                    {item.request.url}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatTime(item.timestamp)}</span>
                  <span>•</span>
                  <span>{item.response.duration}ms</span>
                  {item.response.size > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {item.response.size < 1024
                          ? `${item.response.size}B`
                          : `${(item.response.size / 1024).toFixed(1)}KB`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
