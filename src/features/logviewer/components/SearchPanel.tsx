import React from 'react';
import { Search, Code } from 'lucide-react';

interface SearchPanelProps {
  searchQuery: string;
  isRegex: boolean;
  onSearchChange: (query: string) => void;
  onRegexToggle: (enabled: boolean) => void;
  resultCount: number;
}

export default function SearchPanel({
  searchQuery,
  isRegex,
  onSearchChange,
  onRegexToggle,
  resultCount
}: SearchPanelProps) {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">Search & Filter</h3>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isRegex ? 'Enter regex pattern...' : 'Search logs...'}
          className="w-full pl-10 pr-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Regex Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => onRegexToggle(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-400 group-hover:text-gray-300 flex items-center gap-1">
            <Code className="w-3 h-3" />
            Regex Mode
          </span>
        </label>

        {searchQuery && (
          <span className="text-xs text-gray-500">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Common Patterns */}
      <div className="pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2">Quick Filters:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onSearchChange('ERROR');
              onRegexToggle(false);
            }}
            className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/50 transition-colors"
          >
            Errors
          </button>
          <button
            onClick={() => {
              onSearchChange('WARN');
              onRegexToggle(false);
            }}
            className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs hover:bg-yellow-900/50 transition-colors"
          >
            Warnings
          </button>
          <button
            onClick={() => {
              onSearchChange('\\d+ms');
              onRegexToggle(true);
            }}
            className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs hover:bg-blue-900/50 transition-colors"
          >
            API Calls
          </button>
          <button
            onClick={() => {
              onSearchChange('');
              onRegexToggle(false);
            }}
            className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Regex Help */}
      {isRegex && (
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
