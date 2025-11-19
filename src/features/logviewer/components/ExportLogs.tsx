import React, { useState } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet, Check } from 'lucide-react';
import { LogEntry } from '../LogViewerPage';

interface ExportLogsProps {
  logEntries: LogEntry[];
  fileName?: string;
}

type ExportFormat = 'log' | 'json' | 'csv';

export default function ExportLogs({ logEntries, fileName = 'logs' }: ExportLogsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exported, setExported] = useState(false);

  const exportAsLog = () => {
    const content = logEntries.map(entry => entry.raw).join('\n');
    downloadFile(content, `${fileName}.log`, 'text/plain');
  };

  const exportAsJson = () => {
    const content = JSON.stringify(logEntries, null, 2);
    downloadFile(content, `${fileName}.json`, 'application/json');
  };

  const exportAsCsv = () => {
    // CSV Header
    const headers = ['Line', 'Timestamp', 'Level', 'Message'];
    const csvContent = [
      headers.join(','),
      ...logEntries.map(entry => [
        entry.line,
        entry.timestamp ? `"${entry.timestamp}"` : '',
        entry.level || '',
        `"${entry.message.replace(/"/g, '""')}"` // Escape quotes
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, `${fileName}.csv`, 'text/csv');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success feedback
    setExported(true);
    setTimeout(() => {
      setExported(false);
      setIsOpen(false);
    }, 1500);
  };

  const handleExport = (format: ExportFormat) => {
    switch (format) {
      case 'log':
        exportAsLog();
        break;
      case 'json':
        exportAsJson();
        break;
      case 'csv':
        exportAsCsv();
        break;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={logEntries.length === 0}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          logEntries.length === 0
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
        title="Export logs"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
        {logEntries.length > 0 && (
          <span className="text-xs opacity-75">({logEntries.length} lines)</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-20 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {exported ? (
              <div className="p-4 flex items-center justify-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Exported successfully!</span>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-gray-700 bg-gray-800">
                  <p className="text-xs font-semibold text-gray-400">Export Format</p>
                </div>

                <button
                  onClick={() => handleExport('log')}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">.log file</div>
                    <div className="text-xs text-gray-500">Plain text format</div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm"
                >
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">.json file</div>
                    <div className="text-xs text-gray-500">Structured JSON</div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors flex items-center gap-3 text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">.csv file</div>
                    <div className="text-xs text-gray-500">Spreadsheet format</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
