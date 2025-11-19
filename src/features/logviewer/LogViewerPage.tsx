import React, { useState, useEffect } from 'react';
import LogFileSelector from './components/LogFileSelector';
import LogDisplay from './components/LogDisplay';
import SearchPanel, { LogFilters } from './components/SearchPanel';
import ErrorFrequencyChart from './components/ErrorFrequencyChart';
import TimelineChart from './components/TimelineChart';
import ExportLogs from './components/ExportLogs';
import { FileText, BarChart3, TrendingUp } from 'lucide-react';

export interface LogEntry {
  line: number;
  timestamp?: string;
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  raw: string;
}

export interface ApiCall {
  timestamp: string;
  endpoint: string;
  duration: number;
  status: number;
}

export default function LogViewerPage() {
  const [logContent, setLogContent] = useState<string>('');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LogEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [slowApiCalls, setSlowApiCalls] = useState<ApiCall[]>([]);
  const [activeView, setActiveView] = useState<'timeline' | 'stats'>('stats');

  const [filters, setFilters] = useState<LogFilters>({
    searchQuery: '',
    isRegex: false,
    levels: new Set(['ERROR', 'WARN', 'INFO', 'DEBUG']),
    startTime: undefined,
    endTime: undefined
  });

  // Parse log content into structured entries
  useEffect(() => {
    if (!logContent) {
      setLogEntries([]);
      setFilteredEntries([]);
      return;
    }

    const lines = logContent.split('\n');
    const entries: LogEntry[] = [];
    const apiCalls: ApiCall[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      // Parse log level
      let level: LogEntry['level'];
      if (/ERROR|error/i.test(line)) level = 'ERROR';
      else if (/WARN|warning/i.test(line)) level = 'WARN';
      else if (/INFO|info/i.test(line)) level = 'INFO';
      else if (/DEBUG|debug/i.test(line)) level = 'DEBUG';

      // Extract timestamp (common formats)
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;

      // Detect slow API calls (>1000ms)
      const apiMatch = line.match(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+).*?(\d+)ms/i);
      if (apiMatch) {
        const duration = parseInt(apiMatch[3]);
        if (duration > 1000) {
          apiCalls.push({
            timestamp: timestamp || new Date().toISOString(),
            endpoint: `${apiMatch[1]} ${apiMatch[2]}`,
            duration,
            status: 200
          });
        }
      }

      entries.push({
        line: index + 1,
        timestamp,
        level,
        message: line.replace(timestampMatch?.[0] || '', '').trim(),
        raw: line
      });
    });

    setLogEntries(entries);
    setFilteredEntries(entries);
    setSlowApiCalls(apiCalls);
  }, [logContent]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...logEntries];

    // Filter by log level
    if (filters.levels.size < 4) {
      filtered = filtered.filter(entry =>
        entry.level ? filters.levels.has(entry.level) : false
      );
    }

    // Filter by search query
    if (filters.searchQuery) {
      try {
        if (filters.isRegex) {
          const regex = new RegExp(filters.searchQuery, 'i');
          filtered = filtered.filter(entry => regex.test(entry.raw));
        } else {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(entry =>
            entry.raw.toLowerCase().includes(query)
          );
        }
      } catch (error) {
        // Invalid regex, show all
      }
    }

    // Filter by time range
    if (filters.startTime || filters.endTime) {
      filtered = filtered.filter(entry => {
        if (!entry.timestamp) return false;
        try {
          const entryTime = new Date(entry.timestamp);
          if (filters.startTime && entryTime < filters.startTime) return false;
          if (filters.endTime && entryTime > filters.endTime) return false;
          return true;
        } catch {
          return false;
        }
      });
    }

    setFilteredEntries(filtered);
  }, [filters, logEntries]);

  const handleTimeRangeClick = (startTime: Date, endTime: Date) => {
    setFilters(prev => ({
      ...prev,
      startTime,
      endTime
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-semibold text-white">Log Viewer & Analyzer</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            {logEntries.length} lines loaded
            {filteredEntries.length !== logEntries.length &&
              ` | ${filteredEntries.length} filtered`}
          </div>
          <ExportLogs logEntries={filteredEntries} fileName={selectedFile || 'logs'} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Selector & Search */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <LogFileSelector
            onFileSelected={setLogContent}
            selectedFile={selectedFile}
            onFilePathChange={setSelectedFile}
          />

          <div className="border-t border-gray-800">
            <SearchPanel
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredEntries.length}
              totalCount={logEntries.length}
            />
          </div>

          {/* Analytics View Toggle */}
          <div className="border-t border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Analytics View</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('stats')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  activeView === 'stats'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <BarChart3 className="w-3 h-3 inline mr-1" />
                Stats
              </button>
              <button
                onClick={() => setActiveView('timeline')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <TrendingUp className="w-3 h-3 inline mr-1" />
                Timeline
              </button>
            </div>
          </div>

          {/* Analytics Panel */}
          <div className="flex-1 overflow-hidden border-t border-gray-800">
            {activeView === 'stats' ? (
              <ErrorFrequencyChart
                logEntries={logEntries}
                slowApiCalls={slowApiCalls}
              />
            ) : (
              <TimelineChart
                logEntries={logEntries}
                onTimeRangeClick={handleTimeRangeClick}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Log Display */}
        <div className="flex-1 overflow-hidden">
          <LogDisplay
            logEntries={filteredEntries}
            searchQuery={filters.searchQuery}
            isRegex={filters.isRegex}
          />
        </div>
      </div>
    </div>
  );
}
