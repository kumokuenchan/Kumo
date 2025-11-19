import React, { useRef, useEffect, useState } from 'react';
import { LogEntry } from '../LogViewerPage';
import { ChevronDown, ChevronRight } from 'lucide-react';
import JsonView from '@uiw/react-json-view';

interface LogDisplayProps {
  logEntries: LogEntry[];
  searchQuery: string;
  isRegex: boolean;
}

export default function LogDisplay({ logEntries, searchQuery, isRegex }: LogDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedJsonLines, setExpandedJsonLines] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logEntries.length]);

  const getLogLevelClass = (level?: LogEntry['level']) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-900/30 text-red-400 border-l-4 border-red-500';
      case 'WARN':
        return 'bg-yellow-900/30 text-yellow-400 border-l-4 border-yellow-500';
      case 'INFO':
        return 'bg-blue-900/30 text-blue-400 border-l-4 border-blue-500';
      case 'DEBUG':
        return 'bg-gray-800/30 text-gray-400 border-l-4 border-gray-500';
      default:
        return 'bg-gray-900/30 text-gray-300 border-l-4 border-transparent';
    }
  };

  const tryParseJson = (text: string): { isJson: boolean; data?: any } => {
    try {
      // Try to find JSON in the message
      const jsonMatch = text.match(/\{.*\}|\[.*\]/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { isJson: true, data: parsed };
      }
    } catch (e) {
      // Not JSON
    }
    return { isJson: false };
  };

  const toggleJsonExpansion = (line: number) => {
    setExpandedJsonLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(line)) {
        newSet.delete(line);
      } else {
        newSet.add(line);
      }
      return newSet;
    });
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    try {
      if (isRegex) {
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="bg-yellow-500 text-black font-bold">
              {part}
            </span>
          ) : (
            part
          )
        );
      } else {
        const lowerText = text.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        return (
          <>
            {text.substring(0, index)}
            <span className="bg-yellow-500 text-black font-bold">
              {text.substring(index, index + searchQuery.length)}
            </span>
            {text.substring(index + searchQuery.length)}
          </>
        );
      }
    } catch (error) {
      return text;
    }
  };

  const detectSlowApi = (text: string) => {
    const match = text.match(/(\d+)ms/);
    if (match) {
      const duration = parseInt(match[1]);
      if (duration > 1000) {
        return (
          <span className="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded">
            SLOW API: {duration}ms
          </span>
        );
      }
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">Log Output</span>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded"></div>
              <span className="text-gray-400">Error</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded"></div>
              <span className="text-gray-400">Warning</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
              <span className="text-gray-400">Info</span>
            </span>
          </div>
        </div>
      </div>

      {/* Log Lines */}
      <div ref={containerRef} className="flex-1 overflow-auto font-mono text-xs">
        {logEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No log file loaded. Select a log file to begin.
          </div>
        ) : (
          logEntries.map((entry) => {
            const jsonParse = tryParseJson(entry.message);
            const isJsonExpanded = expandedJsonLines.has(entry.line);

            return (
              <div
                key={entry.line}
                className={`px-4 py-2 hover:bg-gray-800/50 transition-colors ${getLogLevelClass(
                  entry.level
                )}`}
              >
                <div className="flex gap-3">
                  {/* Line number */}
                  <span className="text-gray-600 select-none w-12 text-right flex-shrink-0">
                    {entry.line}
                  </span>

                  {/* Timestamp */}
                  {entry.timestamp && (
                    <span className="text-gray-500 flex-shrink-0">{entry.timestamp}</span>
                  )}

                  {/* Level badge */}
                  {entry.level && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                        entry.level === 'ERROR'
                          ? 'bg-red-600 text-white'
                          : entry.level === 'WARN'
                          ? 'bg-yellow-600 text-white'
                          : entry.level === 'INFO'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {entry.level}
                    </span>
                  )}

                  {/* Message */}
                  <div className="flex-1">
                    {jsonParse.isJson ? (
                      <div>
                        <button
                          onClick={() => toggleJsonExpansion(entry.line)}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 mb-1"
                        >
                          {isJsonExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span className="text-xs font-semibold">JSON Data</span>
                        </button>
                        {isJsonExpanded ? (
                          <div className="mt-1 bg-gray-950 rounded p-2 overflow-x-auto">
                            <JsonView
                              value={jsonParse.data}
                              collapsed={1}
                              displayDataTypes={false}
                              style={{
                                backgroundColor: 'transparent',
                                fontSize: '11px'
                              }}
                            />
                          </div>
                        ) : (
                          <span className="break-all text-gray-400">
                            {highlightText(entry.message.substring(0, 100))}
                            {entry.message.length > 100 && '...'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="break-all">
                        {highlightText(entry.message)}
                        {detectSlowApi(entry.message)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
