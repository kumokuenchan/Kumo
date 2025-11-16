import React from 'react';
import TerminalComponent from './components/TerminalComponent';

export default function TerminalPage() {
  const handleCommandSubmit = (command: string) => {
    // Command is handled by TerminalComponent
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-xs text-white font-mono">_</span>
            </span>
            Terminal
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Interactive command terminal for database operations and system commands
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 shadow-sm">
            <TerminalComponent onCommandSubmit={handleCommandSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}