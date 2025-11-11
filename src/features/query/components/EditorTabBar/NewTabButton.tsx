import { motion } from 'framer-motion';

interface NewTabButtonProps {
  onAddTab: () => void;
}

export function NewTabButton({ onAddTab }: NewTabButtonProps) {
  return (
    <motion.button
      onClick={onAddTab}
      className="group p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
      title="New Tab"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    </motion.button>
  );
}
