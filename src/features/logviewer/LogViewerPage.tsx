import React, { useState, useEffect } from 'react';
import LogFileSelector from './components/LogFileSelector';
import LogDisplay from './components/LogDisplay';
import SearchPanel from './components/SearchPanel';
import ErrorFrequencyChart from './components/ErrorFrequencyChart';
import { FileText } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [slowApiCalls, setSlowApiCalls] = useState<ApiCall[]>([]);

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

  // Filter entries based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredEntries(logEntries);
      return;
    }

    try {
      const filtered = logEntries.filter(entry => {
        if (isRegex) {
          const regex = new RegExp(searchQuery, 'i');
          return regex.test(entry.raw);
        }
        return entry.raw.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredEntries(filtered);
    } catch (error) {
      // Invalid regex, show all
      setFilteredEntries(logEntries);
    }
  }, [searchQuery, isRegex, logEntries]);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-semibold text-white">Log Viewer & Analyzer</h1>
        </div>
        <div className="text-sm text-gray-400">
          {logEntries.length} lines loaded
          {filteredEntries.length !== logEntries.length &&
            ` | ${filteredEntries.length} filtered`}
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
              searchQuery={searchQuery}
              isRegex={isRegex}
              onSearchChange={setSearchQuery}
              onRegexToggle={setIsRegex}
              resultCount={filteredEntries.length}
            />
          </div>

          {/* Error Frequency Chart */}
          <div className="flex-1 overflow-hidden border-t border-gray-800">
            <ErrorFrequencyChart
              logEntries={logEntries}
              slowApiCalls={slowApiCalls}
            />
          </div>
        </div>

        {/* Right Panel - Log Display */}
        <div className="flex-1 overflow-hidden">
          <LogDisplay
            logEntries={filteredEntries}
            searchQuery={searchQuery}
            isRegex={isRegex}
          />
        </div>
      </div>
    </div>
  );
}
