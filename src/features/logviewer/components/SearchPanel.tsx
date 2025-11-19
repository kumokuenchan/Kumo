import React from 'react';
import { Search, Code, Filter, Calendar } from 'lucide-react';

export interface LogFilters {
  searchQuery: string;
  isRegex: boolean;
  levels: Set<string>;
  startTime?: Date;
  endTime?: Date;
}

interface SearchPanelProps {
  filters: LogFilters;
  onFiltersChange: (filters: LogFilters) => void;
  resultCount: number;
  totalCount: number;
}

export default function SearchPanel({
  filters,
  onFiltersChange,
  resultCount,
  totalCount
}: SearchPanelProps) {
  const toggleLevel = (level: string) => {
    const newLevels = new Set(filters.levels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    onFiltersChange({ ...filters, levels: newLevels });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      isRegex: false,
      levels: new Set(['ERROR', 'WARN', 'INFO', 'DEBUG']),
      startTime: undefined,
      endTime: undefined
    });
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.levels.size !== 4 ||
    filters.startTime ||
    filters.endTime;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Search & Filter</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          placeholder={filters.isRegex ? 'Enter regex pattern...' : 'Search logs...'}
          className="w-full pl-10 pr-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Regex Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.isRegex}
            onChange={(e) => onFiltersChange({ ...filters, isRegex: e.target.checked })}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-400 group-hover:text-gray-300 flex items-center gap-1">
            <Code className="w-3 h-3" />
            Regex Mode
          </span>
        </label>

        <span className="text-xs text-gray-500">
          {resultCount} / {totalCount} lines
        </span>
      </div>

      {/* Log Level Filter */}
      <div className="pt-2 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-3 h-3 text-gray-500" />
          <p className="text-xs text-gray-500">Log Levels:</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['ERROR', 'WARN', 'INFO', 'DEBUG'].map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.levels.has(level)}
                onChange={() => toggleLevel(level)}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
              />
              <span
                className={`text-xs font-semibold ${
                  level === 'ERROR'
                    ? 'text-red-400'
                    : level === 'WARN'
                    ? 'text-yellow-400'
                    : level === 'INFO'
                    ? 'text-blue-400'
                    : 'text-gray-400'
                }`}
              >
                {level}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="pt-2 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-3 h-3 text-gray-500" />
          <p className="text-xs text-gray-500">Time Range:</p>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="datetime-local"
              value={filters.startTime?.toISOString().slice(0, 16) || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  startTime: e.target.value ? new Date(e.target.value) : undefined
                })
              }
              className="w-full px-2 py-1.5 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="datetime-local"
              value={filters.endTime?.toISOString().slice(0, 16) || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  endTime: e.target.value ? new Date(e.target.value) : undefined
                })
              }
              className="w-full px-2 py-1.5 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Quick Filters:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onFiltersChange({
                ...filters,
                searchQuery: 'ERROR',
                isRegex: false,
                levels: new Set(['ERROR'])
              });
            }}
            className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/50 transition-colors"
          >
            Errors Only
          </button>
          <button
            onClick={() => {
              onFiltersChange({
                ...filters,
                searchQuery: '',
                isRegex: false,
                levels: new Set(['ERROR', 'WARN'])
              });
            }}
            className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs hover:bg-yellow-900/50 transition-colors"
          >
            Errors + Warnings
          </button>
          <button
            onClick={() => {
              onFiltersChange({
                ...filters,
                searchQuery: '\\d+ms',
                isRegex: true
              });
            }}
            className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs hover:bg-blue-900/50 transition-colors"
          >
            API Calls
          </button>
        </div>
      </div>

      {/* Regex Help */}
      {filters.isRegex && (
        <div className="mt-3 p-2 bg-gray-900 rounded text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-1">Regex Examples:</p>
          <ul className="space-y-1 font-mono">
            <li>• \d+ = numbers</li>
            <li>• (ERROR|WARN) = OR</li>
            <li>• ^\[.*\] = starts with</li>
            <li>• .* = any characters</li>
          </ul>
        </div>
      )}
    </div>
  );
}
