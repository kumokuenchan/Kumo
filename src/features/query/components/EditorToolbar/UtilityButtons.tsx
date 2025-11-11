import { motion } from 'framer-motion';

interface UtilityButtonsProps {
  onSave: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  connectionId: string | null;
}

export function UtilityButtons({
  onSave,
  onAnalyze,
  isAnalyzing,
  connectionId,
}: UtilityButtonsProps) {
  return (
    <>
      {/* Save Query */}
      <motion.button
        onClick={onSave}
        className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
        title="Save current query"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
      </motion.button>

      {/* Analyze Query Performance */}
      <motion.button
        onClick={onAnalyze}
        disabled={isAnalyzing || !connectionId}
        className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        title="Analyze Query Performance (EXPLAIN)"
        whileHover={!isAnalyzing ? { scale: 1.05 } : {}}
        whileTap={!isAnalyzing ? { scale: 0.95 } : {}}
      >
        {isAnalyzing ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        )}
      </motion.button>
    </>
  );
}
