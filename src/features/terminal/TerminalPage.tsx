import React, { useState } from 'react';
import TerminalComponent from './components/TerminalComponent';

interface Terminal {
  id: string;
  name: string;
}

type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1';

export default function TerminalPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([
    { id: '1', name: 'Terminal 1' }
  ]);
  const [layout, setLayout] = useState<LayoutType>('1x1');

  const handleCommandSubmit = (command: string) => {
    // Command is handled by TerminalComponent
  };

  const addNewTerminal = () => {
    const newId = Date.now().toString();
    const newTerminal: Terminal = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`
    };
    setTerminals([...terminals, newTerminal]);

    // Auto-adjust layout based on terminal count
    if (terminals.length === 1) {
      setLayout('1x2');
    } else if (terminals.length === 2) {
      setLayout('2x2');
    } else if (terminals.length === 3) {
      setLayout('2x2');
    }
  };

  const removeTerminal = (terminalId: string) => {
    if (terminals.length === 1) return; // Don't close the last terminal

    const newTerminals = terminals.filter(term => term.id !== terminalId);
    setTerminals(newTerminals);

    // Auto-adjust layout
    if (newTerminals.length === 1) {
      setLayout('1x1');
    } else if (newTerminals.length === 2) {
      setLayout('1x2');
    }
  };

  const getGridClass = () => {
    switch (layout) {
      case '1x1':
        return 'grid-cols-1 grid-rows-1';
      case '1x2':
        return 'grid-cols-2 grid-rows-1';
      case '2x1':
        return 'grid-cols-1 grid-rows-2';
      case '2x2':
        return 'grid-cols-2 grid-rows-2';
      case '1x3':
        return 'grid-cols-3 grid-rows-1';
      case '3x1':
        return 'grid-cols-1 grid-rows-3';
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="max-w-full mx-auto flex-1 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
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

            {/* Layout Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setLayout('1x1')}
                  className={`p-2 rounded transition-colors ${layout === '1x1' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Single view"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
                <button
                  onClick={() => setLayout('1x2')}
                  className={`p-2 rounded transition-colors ${layout === '1x2' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Horizontal split"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="6" height="16" rx="1" />
                    <rect x="14" y="4" width="6" height="16" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setLayout('2x1')}
                  className={`p-2 rounded transition-colors ${layout === '2x1' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Vertical split"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="6" rx="1" />
                    <rect x="4" y="14" width="16" height="6" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setLayout('2x2')}
                  className={`p-2 rounded transition-colors ${layout === '2x2' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Grid (2x2)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="14" width="6" height="6" rx="1" />
                  </svg>
                </button>
              </div>

              <button
                onClick={addNewTerminal}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Add new terminal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Terminals Grid */}
        <div className={`grid ${getGridClass()} gap-4 flex-1`}>
          {terminals.map((terminal, index) => (
            <div
              key={terminal.id}
              className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {terminal.name}
                </span>
                {terminals.length > 1 && (
                  <button
                    onClick={() => removeTerminal(terminal.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Close terminal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Terminal Content */}
              <div className="flex-1 p-4 overflow-hidden">
                <TerminalComponent
                  onCommandSubmit={handleCommandSubmit}
                  terminalId={terminal.id}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}