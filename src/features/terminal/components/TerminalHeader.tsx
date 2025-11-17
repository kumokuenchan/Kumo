import React, { useState } from 'react';
import FontSizeControl from './FontSizeControl';
import QuickCommandsComponent from './QuickCommandsComponent';
import ExportTerminalOutput from './ExportTerminalOutput';
import CommandHistory from './CommandHistory';
import TerminalStatusIndicator from './TerminalStatusIndicator';
import TerminalBookmarks from './TerminalBookmarks';
import { Bookmark } from 'lucide-react';

interface TerminalHeaderProps {
  isConnected: boolean;
  currentDirectory?: string;
  fontSize: number;
  terminalId?: string;
  sessionId?: string;
  showQuickCommands: boolean;
  setShowQuickCommands: (show: boolean) => void;
  onFontSizeChange: (newFontSize: number) => void;
  onFontSizeSave: (fontSize: number) => void;
  onClearTerminal: () => void;
  onExecuteCommand: (command: string) => void;
  onInsertCommand: (command: string) => void;
  onCommandFromHistory: (command: string) => void;
  onNavigateToDirectory?: (path: string) => void;
}

export default function TerminalHeader({
  isConnected,
  currentDirectory,
  fontSize,
  terminalId,
  sessionId,
  showQuickCommands,
  setShowQuickCommands,
  onFontSizeChange,
  onFontSizeSave,
  onClearTerminal,
  onExecuteCommand,
  onInsertCommand,
  onCommandFromHistory,
  onNavigateToDirectory
}: TerminalHeaderProps) {
  const [showBookmarks, setShowBookmarks] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0d1117]">
      <div className="flex items-center gap-2">
        <TerminalStatusIndicator
          sessionId={sessionId}
          isActive={isConnected}
          connectionStatus={isConnected ? 'connected' : 'disconnected'}
        />
        <div className="flex items-center gap-2">
          {currentDirectory && (
            <span className="text-xs text-gray-500 ml-2 truncate max-w-xs" title={currentDirectory}>
              {currentDirectory}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 items-center">
        {/* Export Terminal Output */}
        {terminalId && (
          <ExportTerminalOutput 
            terminalId={terminalId}
            onExport={(content, filename) => {
              // Create a Blob with the content
              const blob = new Blob([content], { type: 'text/plain' });
              
              // Create a download link
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              
              // Trigger download
              document.body.appendChild(a);
              a.click();
              
              // Cleanup
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          />
        )}
        
        {/* Command History */}
        <CommandHistory
          terminalId={terminalId}
          onCommandSelect={onCommandFromHistory}
          onCommandAdded={(command) => {
            // Optional: Handle when a command is added to history
            console.log('Command added to history:', command);
          }}
        />

        {/* Bookmarks Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBookmarks(!showBookmarks);
              setShowQuickCommands(false);
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 mr-2"
            title="Directory Bookmarks"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Bookmarks Dropdown */}
          {showBookmarks && onNavigateToDirectory && (
            <div className="absolute right-0 top-8 z-10">
              <TerminalBookmarks
                currentDirectory={currentDirectory || '/'}
                onNavigate={(path) => {
                  onNavigateToDirectory(path);
                  setShowBookmarks(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Quick Commands Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowQuickCommands(!showQuickCommands);
              setShowBookmarks(false);
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1 mr-2"
            title="Quick Commands"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          
          {/* Quick Commands Dropdown */}
          {showQuickCommands && (
            <div className="absolute right-0 top-8 z-10">
              <QuickCommandsComponent
                terminalId={terminalId}
                onExecuteCommand={(command) => {
                  // Only send to PTY - the response will come back via WebSocket and be displayed
                  // Don't write to terminal directly to avoid double execution
                  onExecuteCommand(command);
                  setShowQuickCommands(false);
                }}
                onInsertCommand={(command) => {
                  onInsertCommand(command);
                  setShowQuickCommands(false);
                }}
              />
            </div>
          )}
        </div>
        
        {/* Font Size Controls */}
        <FontSizeControl 
          initialFontSize={fontSize}
          onFontSizeChange={onFontSizeChange}
          onFontSizeSave={onFontSizeSave}
          terminalId={terminalId}
        />
        <button 
          onClick={onClearTerminal}
          className="text-gray-400 hover:text-gray-200 transition-colors ml-2"
          title="Clear terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}