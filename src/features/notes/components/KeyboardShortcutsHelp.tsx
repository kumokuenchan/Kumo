import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl/Cmd', 'K'], description: 'Search notes', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', 'N'], description: 'Create new note', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', 'Shift', 'N'], description: 'Quick capture', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', '/'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'Navigation' },

  // Editing
  { keys: ['Ctrl/Cmd', 'B'], description: 'Bold text', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'I'], description: 'Italic text', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'U'], description: 'Underline text', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'K'], description: 'Insert link', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'Y'], description: 'Redo', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'S'], description: 'Save note', category: 'Editing' },

  // Formatting
  { keys: ['Ctrl/Cmd', 'Alt', '1'], description: 'Heading 1', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Alt', '2'], description: 'Heading 2', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Alt', '3'], description: 'Heading 3', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Shift', '8'], description: 'Bullet list', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Shift', '7'], description: 'Numbered list', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Shift', 'X'], description: 'Strike through', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'E'], description: 'Code block', category: 'Formatting' },
  { keys: ['Ctrl/Cmd', 'Shift', 'C'], description: 'Inline code', category: 'Formatting' },

  // View
  { keys: ['1'], description: 'List view (not in editor)', category: 'View' },
  { keys: ['2'], description: 'Grid view (not in editor)', category: 'View' },
  { keys: ['3'], description: 'Kanban view (not in editor)', category: 'View' },
  { keys: ['Ctrl/Cmd', 'P'], description: 'Toggle pinned notes', category: 'View' },

  // General
  { keys: ['Ctrl/Cmd', 'Enter'], description: 'Submit form', category: 'General' },
  { keys: ['/', 'command'], description: 'Slash commands', category: 'General' },
  { keys: ['@'], description: 'Mention user or note', category: 'General' },
  { keys: [':'], description: 'Insert emoji', category: 'General' },
];

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const renderKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="mx-1 text-gray-400">+</span>}
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">
          {key}
        </kbd>
      </React.Fragment>
    ));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Master these shortcuts for faster workflow
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((category, categoryIndex) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                  className="space-y-3"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Command className="w-4 h-4" />
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts
                      .filter(s => s.category === category)
                      .map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {renderKeys(shortcut.keys)}
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Keyboard className="w-4 h-4" />
                <span>Press <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl/Cmd</kbd> + <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">/</kbd> anytime to see this help</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Hook to show keyboard shortcuts modal
export function useKeyboardShortcuts(onOpen: () => void) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + / to open keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
