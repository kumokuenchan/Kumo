import { motion } from 'framer-motion';

interface RunButtonProps {
  isRunning: boolean;
  onRun: () => void;
  onCancel: () => void;
}

export function RunButton({ isRunning, onRun, onCancel }: RunButtonProps) {
  return (
    <motion.button
      onClick={isRunning ? onCancel : onRun}
      className={`group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isRunning
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600'
          : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600'
      }`}
      title={isRunning ? 'Cancel running query' : 'Execute Query (Ctrl+Enter)'}
      whileHover={!isRunning ? { scale: 1.02, y: -1 } : {}}
      whileTap={{ scale: 0.98, y: 0 }}
    >
      {isRunning ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Cancel</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          <span>Run</span>
        </>
      )}
    </motion.button>
  );
}
