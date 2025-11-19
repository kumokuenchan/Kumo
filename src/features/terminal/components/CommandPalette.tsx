import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Terminal as TerminalIcon,
  Layout,
  Maximize2,
  Lock,
  Unlock,
  Plus,
  X,
  Grid3x3,
  Columns2,
  Rows2,
  Square,
  Palette,
  Activity,
  Server,
  Clock,
  Zap
} from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const STORAGE_KEY_RECENT_COMMANDS = 'kumodb_recent_commands';
const MAX_RECENT_COMMANDS = 5;

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_COMMANDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = searchQuery.trim() === ''
    ? commands.filter(cmd => recentCommands.includes(cmd.id)).slice(0, MAX_RECENT_COMMANDS)
    : commands.filter(cmd => {
        const query = searchQuery.toLowerCase();
        const labelMatch = cmd.label.toLowerCase().includes(query);
        const descMatch = cmd.description.toLowerCase().includes(query);
        const categoryMatch = cmd.category.toLowerCase().includes(query);
        const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(query));
        return labelMatch || descMatch || categoryMatch || keywordMatch;
      });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Save recent commands to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECENT_COMMANDS, JSON.stringify(recentCommands));
    } catch (error) {
      console.error('Failed to save recent commands:', error);
    }
  }, [recentCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const executeCommand = (command: Command) => {
    // Add to recent commands
    const newRecent = [
      command.id,
      ...recentCommands.filter(id => id !== command.id)
    ].slice(0, MAX_RECENT_COMMANDS);
    setRecentCommands(newRecent);

    // Execute the command
    command.action();

    // Close palette
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* Commands List */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto"
          >
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No commands found</p>
              </div>
            ) : (
              <>
                {searchQuery.trim() === '' && recentCommands.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recently Used
                  </div>
                )}
                {Object.entries(groupedCommands).map(([category, cmds], categoryIndex) => (
                  <div key={category}>
                    {searchQuery.trim() !== '' && (
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-900 z-10">
                        {category}
                      </div>
                    )}
                    {cmds.map((command, cmdIndex) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={command.id}
                          data-index={globalIndex}
                          onClick={() => executeCommand(command)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                          }`}
                        >
                          <div className={`flex-shrink-0 ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {command.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={`text-sm font-medium ${
                              isSelected
                                ? 'text-blue-900 dark:text-blue-100'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {command.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {command.description}
                            </div>
                          </div>
                          {command.shortcut && (
                            <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {command.shortcut}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">↵</kbd>
                Execute
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Esc</kbd>
                Close
              </span>
            </div>
            <div>
              {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
