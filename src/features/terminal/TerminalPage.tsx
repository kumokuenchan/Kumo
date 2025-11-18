import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalComponent from './components/TerminalComponent';
import TerminalThemeSelector from './components/TerminalThemeSelector';
import ProcessMonitor from './components/ProcessMonitor';
import SSHConnectionManager from './components/SSHConnectionManager';
import { Activity, Server } from 'lucide-react';

interface Terminal {
  id: string;
  name: string;
  initialCommand?: string;
}

type LayoutType = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '4x4';
type ViewMode = 'grid' | 'tabs';

const STORAGE_KEY_TERMINALS = 'kumodb_terminals';
const STORAGE_KEY_LAYOUT = 'kumodb_terminal_layout';
const STORAGE_KEY_THEME = 'kumodb_terminal_theme';
const STORAGE_KEY_VIEW_MODE = 'kumodb_terminal_view_mode';
const STORAGE_KEY_ACTIVE_TAB = 'kumodb_terminal_active_tab';

const AVAILABLE_THEMES = [
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'nord', name: 'Nord' },
  { id: 'one-dark', name: 'One Dark' },
];

// Animation variants
const terminalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: { duration: 0.2 }
  }
};

const tabVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  },
  exit: { opacity: 0, x: 10, transition: { duration: 0.15 } }
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: { opacity: 0, transition: { duration: 0.1 } }
};

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

  const [showProcessMonitor, setShowProcessMonitor] = useState(false);
  const [showSSHManager, setShowSSHManager] = useState(false);
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
      return (saved as ViewMode) || 'grid';
    } catch (error) {
      return 'grid';
    }
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      return saved || '1';
    } catch (error) {
      return '1';
    }
  });

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

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

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
    } catch (error) {
      console.error('Failed to save view mode to localStorage:', error);
    }
  }, [viewMode]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
    } catch (error) {
      console.error('Failed to save active tab to localStorage:', error);
    }
  }, [activeTabId]);

  // Keyboard shortcut for new terminal (Cmd+T / Ctrl+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't' && viewMode === 'tabs') {
        e.preventDefault();
        addNewTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, terminals.length]);

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

    // In tab mode, switch to the new terminal
    if (viewMode === 'tabs') {
      setActiveTabId(newId);
    } else {
      // Auto-adjust layout based on terminal count in grid mode
      if (terminals.length === 1) {
        setLayout('1x2');
      } else if (terminals.length === 2) {
        setLayout('2x2');
      } else if (terminals.length === 3) {
        setLayout('2x2');
      } else if (terminals.length >= 4 && terminals.length <= 16) {
        setLayout('4x4');
      }
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

    // In tab mode, switch to another tab if the closed tab was active
    if (viewMode === 'tabs' && activeTabId === terminalId && newTerminals.length > 0) {
      const currentIndex = terminals.findIndex(t => t.id === terminalId);
      // Switch to the tab to the left, or the first tab if we closed the first one
      const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0;
      setActiveTabId(newTerminals[newActiveIndex].id);
    }

    // Auto-adjust layout in grid mode
    if (viewMode === 'grid') {
      if (newTerminals.length === 1) {
        setLayout('1x1');
      } else if (newTerminals.length === 2) {
        setLayout('1x2');
      } else if (newTerminals.length >= 3) {
        setLayout('2x2');
      }
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

  // Tab drag and drop handlers
  const handleTabDragStart = (e: React.DragEvent, terminalId: string) => {
    setDraggedTabId(terminalId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTabDrop = (e: React.DragEvent, targetTerminalId: string) => {
    e.preventDefault();

    if (!draggedTabId || draggedTabId === targetTerminalId) {
      setDraggedTabId(null);
      return;
    }

    const draggedIndex = terminals.findIndex(t => t.id === draggedTabId);
    const targetIndex = terminals.findIndex(t => t.id === targetTerminalId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTabId(null);
      return;
    }

    // Reorder terminals array
    const newTerminals = [...terminals];
    const [removed] = newTerminals.splice(draggedIndex, 1);
    newTerminals.splice(targetIndex, 0, removed);

    setTerminals(newTerminals);
    setDraggedTabId(null);
  };

  const handleTabDragEnd = () => {
    setDraggedTabId(null);
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
              {/* SSH Connection Manager Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSSHManager(!showSSHManager);
                    setShowProcessMonitor(false);
                  }}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="SSH Connections"
                >
                  <Server className="w-4 h-4" />
                </button>

                {/* SSH Manager Dropdown */}
                {showSSHManager && (
                  <div className="absolute right-0 top-12 z-50">
                    <SSHConnectionManager
                      onConnect={(connection) => {
                        // Build SSH command
                        const sshCommand = connection.authMethod === 'key' && connection.keyPath
                          ? `ssh -i ${connection.keyPath} -p ${connection.port} ${connection.username}@${connection.host}`
                          : `ssh -p ${connection.port} ${connection.username}@${connection.host}`;

                        // Build full command sequence with post-connection commands
                        // SSH command will be executed first, then post-connection commands
                        // We'll pass the post-connection commands separately to be executed after SSH connects
                        let fullCommand = sshCommand;

                        // If there are post-connection commands, we need to pass them to the terminal
                        // The terminal will execute them after the SSH session is established
                        if (connection.postConnectionCommands && connection.postConnectionCommands.length > 0) {
                          // Add a delay and then execute the commands
                          // Format: ssh command, then after connection, send each command
                          const commandsWithDelay = connection.postConnectionCommands.join('\n');
                          fullCommand = `${sshCommand}|||POST:${commandsWithDelay}`;
                        }

                        // Create a new terminal with this SSH command
                        const newTerminalId = Date.now().toString();
                        const newTerminal: Terminal = {
                          id: newTerminalId,
                          name: `SSH: ${connection.name}`,
                          initialCommand: fullCommand
                        };
                        setTerminals([...terminals, newTerminal]);

                        // In tab mode, switch to the new SSH terminal
                        if (viewMode === 'tabs') {
                          setActiveTabId(newTerminalId);
                        }

                        setShowSSHManager(false);
                      }}
                      onClose={() => setShowSSHManager(false)}
                    />
                  </div>
                )}
              </div>

              {/* Process Monitor Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProcessMonitor(!showProcessMonitor);
                    setShowSSHManager(false);
                  }}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Process Monitor"
                >
                  <Activity className="w-4 h-4" />
                </button>

                {/* Process Monitor Dropdown */}
                {showProcessMonitor && (
                  <div className="absolute right-0 top-12 z-50">
                    <ProcessMonitor
                      onClose={() => setShowProcessMonitor(false)}
                    />
                  </div>
                )}
              </div>

              {/* Theme Selector */}
              <TerminalThemeSelector
                currentTheme={theme}
                onThemeChange={setTheme}
              />

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Grid view"
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('tabs')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === 'tabs'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Tab view (Cmd+T for new tab)"
                >
                  Tabs
                </button>
              </div>

              {/* Layout Controls - Only show in grid mode */}
              {viewMode === 'grid' && (
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
              )}

              <button
                onClick={addNewTerminal}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                title={viewMode === 'tabs' ? "Add new terminal (Cmd+T)" : "Add new terminal"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Tab View */}
        {viewMode === 'tabs' ? (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={contentVariants}
            className="flex flex-col h-[calc(100vh-200px)]"
          >
            {/* Chrome-style Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 px-2 py-1.5 rounded-t-xl border-b border-gray-200 dark:border-gray-700 overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
              <AnimatePresence mode="popLayout">
                {terminals.map((terminal) => (
                  <motion.div
                  key={terminal.id}
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, terminal.id)}
                  onDragOver={handleTabDragOver}
                  onDrop={(e) => handleTabDrop(e, terminal.id)}
                  onDragEnd={handleTabDragEnd}
                  onClick={() => setActiveTabId(terminal.id)}
                  className={`
                    group relative flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all
                    ${activeTabId === terminal.id
                      ? 'bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white border-t-2 border-l border-r border-blue-500 dark:border-blue-400'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${draggedTabId === terminal.id ? 'opacity-50' : ''}
                  `}
                  style={{ minWidth: '120px', maxWidth: '200px' }}
                >
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
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="text-sm font-medium flex-1 bg-white dark:bg-gray-800 border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <span
                        className="text-sm font-medium truncate flex-1"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(terminal);
                        }}
                      >
                        {terminal.name}
                      </span>
                      {terminals.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTerminal(terminal.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                          title="Close tab"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
              </AnimatePresence>
            </div>

            {/* Active Terminal Content */}
            <AnimatePresence mode="wait">
              {terminals.map((terminal) => (
                activeTabId === terminal.id && (
                  <motion.div
                    key={terminal.id}
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex-1 bg-white dark:bg-[#0d1117] rounded-b-xl border border-gray-200/50 dark:border-gray-800/50 shadow-sm overflow-hidden"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    <div className="h-full p-4" style={{ scrollBehavior: 'smooth' }}>
                      <TerminalComponent
                        onCommandSubmit={handleCommandSubmit}
                        terminalId={terminal.id}
                        theme={theme}
                        initialCommand={terminal.initialCommand}
                        onWorkingDirectoryChange={(cwd) => {}}
                      />
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Grid View */
          <motion.div
            className={`grid ${getGridClass()} gap-4`}
            layout
            transition={{
              layout: { duration: 0.3, ease: 'easeInOut' }
            }}
          >
            <AnimatePresence mode="popLayout">
              {terminals.map((terminal, index) => (
                <motion.div
                  key={terminal.id}
                  variants={terminalVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
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
              <div className="flex-1 p-4 overflow-hidden" style={{ scrollBehavior: 'smooth' }}>
                <TerminalComponent
                  onCommandSubmit={handleCommandSubmit}
                  terminalId={terminal.id}
                  theme={theme}
                  initialCommand={terminal.initialCommand}
                  onWorkingDirectoryChange={(cwd) => {
                    // Optionally update a state variable that tracks the directory for this terminal
                    // For now, we just handle it in the component itself
                  }}
                />
              </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}