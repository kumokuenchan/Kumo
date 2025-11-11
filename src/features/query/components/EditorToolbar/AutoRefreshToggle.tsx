import { RefreshCw } from 'lucide-react';

interface AutoRefreshToggleProps {
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  countdownSeconds: number;
  connectionId: string | null;
  onToggle: () => void;
  onIntervalChange: (interval: number) => void;
}

export function AutoRefreshToggle({
  autoRefreshEnabled,
  autoRefreshInterval,
  countdownSeconds,
  connectionId,
  onToggle,
  onIntervalChange,
}: AutoRefreshToggleProps) {
  return (
    <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-blue-200 dark:border-slate-600 shadow-sm">
      <button
        onClick={onToggle}
        disabled={!connectionId}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
          autoRefreshEnabled
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
            : 'bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}
      >
        <div className="ml-2">
          <RefreshCw className={`w-3.5 h-3.5 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
        </div>
        <div className="pr-2">
          <span>Auto-refresh</span>
        </div>
        {autoRefreshEnabled && (
          <div className="flex items-center gap-1 ml-0.5 pr-1">
            <div className="w-1.5 h-1.5 bg-green-200 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono">{countdownSeconds}s</span>
          </div>
        )}
      </button>

      {autoRefreshEnabled && (
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-blue-300 dark:bg-slate-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Every</span>

          {/* Custom interval input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="3600"
              value={autoRefreshInterval}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value > 0 && value <= 3600) {
                  onIntervalChange(value);
                }
              }}
              disabled={!connectionId}
              className="w-10 px-1.5 py-0.5 text-xs text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="sec"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">sec</span>
          </div>
        </div>
      )}
    </div>
  );
}
