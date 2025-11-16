import React from 'react';
import FontSizeControl from './FontSizeControl';
import QuickCommandsComponent from './QuickCommandsComponent';

interface TerminalHeaderProps {
  isConnected: boolean;
  currentDirectory?: string;
  fontSize: number;
  terminalId?: string;
  showQuickCommands: boolean;
  setShowQuickCommands: (show: boolean) => void;
  onFontSizeChange: (newFontSize: number) => void;
  onFontSizeSave: (fontSize: number) => void;
  onClearTerminal: () => void;
  onExecuteCommand: (command: string) => void;
  onInsertCommand: (command: string) => void;
}

export default function TerminalHeader({
  isConnected,
  currentDirectory,
  fontSize,
  terminalId,
  showQuickCommands,
  setShowQuickCommands,
  onFontSizeChange,
  onFontSizeSave,
  onClearTerminal,
  onExecuteCommand,
  onInsertCommand
}: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0d1117]">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 ml-2">Terminal</span>
          {currentDirectory && (
            <span className="text-xs text-gray-500 ml-2 truncate max-w-xs" title={currentDirectory}>
              {currentDirectory}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 items-center">
        {/* Quick Commands Button */}
        <div className="relative">
          <button 
            onClick={() => setShowQuickCommands(!showQuickCommands)}
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