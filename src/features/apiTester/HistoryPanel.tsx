import { useState } from 'react';
import { Clock, Trash2, Search, X } from 'lucide-react';
import { apiTesterStorage, type HistoryItem } from '../../services/apiTesterStorage';
import type { ApiRequest } from '../../api/apiTester';

interface HistoryPanelProps {
  onLoadRequest: (request: ApiRequest) => void;
  onClose: () => void;
}

export default function HistoryPanel({ onLoadRequest, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>(apiTesterStorage.getHistory());
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
    <div className="absolute right-0 top-12 bottom-0 w-96 bg-white dark:bg-slate-800 border-l border-gray-300 dark:border-slate-700 shadow-lg flex flex-col z-10">
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
                className="group p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                onClick={() => handleLoadRequest(item)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        item.request.method === 'GET'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : item.request.method === 'POST'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : item.request.method === 'PUT'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : item.request.method === 'DELETE'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
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

                <div className="text-sm text-gray-900 dark:text-white mb-1 truncate" title={item.request.url}>
                  {item.request.url}
                </div>

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
