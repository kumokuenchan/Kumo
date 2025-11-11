import { motion } from 'framer-motion';

interface FormatButtonsProps {
  onFormat: () => void;
  onMinify: () => void;
  onClearResults: () => void;
  formatOnPaste: boolean;
  onToggleFormatOnPaste: () => void;
}

export function FormatButtons({
  onFormat,
  onMinify,
  onClearResults,
  formatOnPaste,
  onToggleFormatOnPaste,
}: FormatButtonsProps) {
  return (
    <>
      {/* Format SQL */}
      <motion.button
        onClick={onFormat}
        className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
        title="Format SQL (Ctrl+Shift+F)"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </motion.button>

      {/* Minify SQL */}
      <motion.button
        onClick={onMinify}
        className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
        title="Minify SQL - Remove extra whitespace and comments"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          />
        </svg>
      </motion.button>

      {/* Auto-format on paste checkbox */}
      <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer group">
        <input
          type="checkbox"
          checked={formatOnPaste}
          onChange={onToggleFormatOnPaste}
          className="w-3.5 h-3.5 text-blue-500 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-0"
        />
        <span className="group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors whitespace-nowrap">
          Auto-format
        </span>
      </label>

      {/* Clear Results */}
      <motion.button
        onClick={onClearResults}
        className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
        title="Clear Results"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </motion.button>
    </>
  );
}
