import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Download, RefreshCw, ChevronUp, ChevronDown, AlertCircle, FileText } from 'lucide-react';
import { RemoteFile, LogFileContent } from '../../../services/RemoteExplorerService';

interface LogFileViewerProps {
  file: RemoteFile;
  content: LogFileContent;
  onClose: () => void;
}

const LogFileViewer: React.FC<LogFileViewerProps> = ({ file, content, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLines, setFilteredLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [linesPerPage] = useState(1000);
  const [autoScroll, setAutoScroll] = useState(false);
  const [followTail, setFollowTail] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      const filtered = content.lines.filter(line => 
        line.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLines(filtered);
    } else {
      setFilteredLines(content.lines);
    }
  }, [searchQuery, content.lines]);

  useEffect(() => {
    if (autoScroll && filteredLines.length > 0) {
      setCurrentLine(filteredLines.length - linesPerPage);
    }
  }, [filteredLines, autoScroll, linesPerPage]);

  const visibleLines = filteredLines.slice(
    Math.max(0, currentLine),
    Math.min(filteredLines.length, currentLine + linesPerPage)
  );

  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCurrentLine(Math.max(0, currentLine - linesPerPage / 2));
    } else {
      setCurrentLine(Math.min(filteredLines.length - linesPerPage, currentLine + linesPerPage / 2));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogLevelIcon = (line: string) => {
    if (line.toLowerCase().includes('error')) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (line.toLowerCase().includes('warn')) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    if (line.toLowerCase().includes('info')) {
      return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
    return null;
  };

  const getLineNumber = (index: number) => {
    const actualIndex = searchQuery ? 
      content.lines.findIndex(line => line === filteredLines[index]) : 
      index;
    return actualIndex + 1;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-0 top-0 h-full w-1/2 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
        style={{ minWidth: '600px' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {file.path} • {content.totalLines.toLocaleString()} lines
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-lg ${autoScroll ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title="Auto Scroll"
            >
              <RefreshCw className={`w-4 h-4 ${autoScroll ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>

        {/* File Info Bar */}
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400">
                Showing {currentLine + 1}-{Math.min(currentLine + linesPerPage, filteredLines.length)} of {filteredLines.length}
                {searchQuery && ` (${content.totalLines} total)`}
              </span>
              {searchQuery && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {filteredLines.length} matches
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScroll('up')}
                disabled={currentLine === 0}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('down')}
                disabled={currentLine + linesPerPage >= filteredLines.length}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          <div className="h-full overflow-auto font-mono text-xs leading-relaxed">
            <div className="p-4">
              {visibleLines.map((line, index) => {
                const lineNumber = getLineNumber(index);
                const hasError = line.toLowerCase().includes('error');
                const hasWarning = line.toLowerCase().includes('warn');
                const hasInfo = line.toLowerCase().includes('info');
                
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 py-0.5 px-2 rounded hover:bg-gray-800 transition-colors ${
                      hasError ? 'bg-red-900/20' : 
                      hasWarning ? 'bg-yellow-900/20' : 
                      hasInfo ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <span className="text-gray-500 select-none" style={{ minWidth: '60px' }}>
                      {lineNumber}
                    </span>
                    <div className="flex items-start gap-2 flex-1">
                      {getLogLevelIcon(line)}
                      <span className={`${
                        hasError ? 'text-red-400' : 
                        hasWarning ? 'text-yellow-400' : 
                        hasInfo ? 'text-blue-400' : 
                        'text-gray-300'
                      }`}>
                        {line || '\u00A0'} {/* Non-breaking space for empty lines */}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2 bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Last modified: {file.modified ? new Date(file.modified).toLocaleString() : 'Unknown'}</span>
              {file.size && <span>Size: {(file.size / 1024).toFixed(1)} KB</span>}
            </div>
            <div className="flex items-center gap-2">
              {content.lines.some(line => line.toLowerCase().includes('error')) && (
                <span className="flex items-center gap-1 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Errors
                </span>
              )}
              {content.lines.some(line => line.toLowerCase().includes('warn')) && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Warnings
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogFileViewer;