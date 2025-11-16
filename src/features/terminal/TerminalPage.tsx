import React, { useState, useEffect } from 'react';
import TerminalComponent from './components/TerminalComponent';
import TerminalThemeSelector from './components/TerminalThemeSelector';

interface Terminal {
  id: string;
  name: string;
}

type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '4x4';

const STORAGE_KEY_TERMINALS = 'kumodb_terminals';
const STORAGE_KEY_LAYOUT = 'kumodb_terminal_layout';
const STORAGE_KEY_THEME = 'kumodb_terminal_theme';

const AVAILABLE_THEMES = [
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'nord', name: 'Nord' },
  { id: 'one-dark', name: 'One Dark' },
];

export default function TerminalPage() {
  // Load from localStorage on mount
  const [terminals, setTerminals] = useState<Terminal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TERMINALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.length > 0 ? parsed : [{ id: '1', name: 'Terminal 1' }];
      }
    } catch (error) {
      console.error('Failed to load terminals from localStorage:', error);
    }
    return [{ id: '1', name: 'Terminal 1' }];
  });

  const [layout, setLayout] = useState<LayoutType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAYOUT);
      return (saved as LayoutType) || '1x1';
    } catch (error) {
      return '1x1';
    }
  });

  const [theme, setTheme] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved || 'github-dark';
    } catch (error) {
      return 'github-dark';
    }
  });

  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Save terminals to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TERMINALS, JSON.stringify(terminals));
    } catch (error) {
      console.error('Failed to save terminals to localStorage:', error);
    }
  }, [terminals]);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LAYOUT, layout);
    } catch (error) {
      console.error('Failed to save layout to localStorage:', error);
    }
  }, [layout]);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }, [theme]);

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
    } else if (terminals.length >= 4 && terminals.length <= 16) {
      setLayout('4x4');
    }
  };

  const removeTerminal = async (terminalId: string) => {
    if (terminals.length === 1) return; // Don't close the last terminal

    // Clean up the session on the backend
    const sessionId = localStorage.getItem(`terminal_session_${terminalId}`);
    if (sessionId) {
      try {
        await fetch(`/api/terminal/session/${sessionId}`, {
          method: 'DELETE',
        });
        localStorage.removeItem(`terminal_session_${terminalId}`);
      } catch (error) {
        console.error('Failed to close session:', error);
      }
    }

    // Clean up the terminal buffer
    localStorage.removeItem(`terminal_buffer_${terminalId}`);

    const newTerminals = terminals.filter(term => term.id !== terminalId);
    setTerminals(newTerminals);

    // Auto-adjust layout
    if (newTerminals.length === 1) {
      setLayout('1x1');
    } else if (newTerminals.length === 2) {
      setLayout('1x2');
    } else if (newTerminals.length >= 3) {
      setLayout('2x2');
    }
  };

  const renameTerminal = (terminalId: string, newName: string) => {
    setTerminals(terminals.map(term =>
      term.id === terminalId ? { ...term, name: newName } : term
    ));
  };

  const startEditing = (terminal: Terminal) => {
    setEditingTerminalId(terminal.id);
    setEditingName(terminal.name);
  };

  const finishEditing = () => {
    if (editingTerminalId && editingName.trim()) {
      renameTerminal(editingTerminalId, editingName.trim());
    }
    setEditingTerminalId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingTerminalId(null);
    setEditingName('');
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
      case '4x4':
        return 'grid-cols-4 grid-rows-4';
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-full mx-auto">
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

            {/* Layout Controls and Theme Selector */}
            <div className="flex items-center gap-3">
              {/* Theme Selector */}
              <TerminalThemeSelector 
                currentTheme={theme} 
                onThemeChange={setTheme} 
              />

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
                <button
                  onClick={() => setLayout('4x4')}
                  className={`p-2 rounded transition-colors ${layout === '4x4' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Grid (4x4)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="4" height="4" rx="0.5" />
                    <rect x="7" y="2" width="4" height="4" rx="0.5" />
                    <rect x="12" y="2" width="4" height="4" rx="0.5" />
                    <rect x="17" y="2" width="4" height="4" rx="0.5" />
                    <rect x="2" y="7" width="4" height="4" rx="0.5" />
                    <rect x="7" y="7" width="4" height="4" rx="0.5" />
                    <rect x="12" y="7" width="4" height="4" rx="0.5" />
                    <rect x="17" y="7" width="4" height="4" rx="0.5" />
                    <rect x="2" y="12" width="4" height="4" rx="0.5" />
                    <rect x="7" y="12" width="4" height="4" rx="0.5" />
                    <rect x="12" y="12" width="4" height="4" rx="0.5" />
                    <rect x="17" y="12" width="4" height="4" rx="0.5" />
                    <rect x="2" y="17" width="4" height="4" rx="0.5" />
                    <rect x="7" y="17" width="4" height="4" rx="0.5" />
                    <rect x="12" y="17" width="4" height="4" rx="0.5" />
                    <rect x="17" y="17" width="4" height="4" rx="0.5" />
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
        <div className={`grid ${getGridClass()} gap-4`}>
          {terminals.map((terminal, index) => (
            <div
              key={terminal.id}
              className="bg-white dark:bg-[#0d1117] rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm overflow-hidden flex flex-col h-full"
            >
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 flex-1">
                  {editingTerminalId === terminal.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          finishEditing();
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {terminal.name}
                      </span>
                      <button
                        onClick={() => startEditing(terminal)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-all"
                        title="Rename terminal"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
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
                  theme={theme}
                  onWorkingDirectoryChange={(cwd) => {
                    // Optionally update a state variable that tracks the directory for this terminal
                    // For now, we just handle it in the component itself
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}