import { motion } from 'framer-motion';
import { type EditorTab as EditorTabType } from '../../utils/tabUtils';

interface EditorTabProps {
  tab: EditorTabType;
  index: number;
  isActive: boolean;
  tabCount: number;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClickName: () => void;
}

export function EditorTab({
  tab,
  index,
  isActive,
  tabCount,
  onActivate,
  onClose,
  onContextMenu,
  onDoubleClickName,
}: EditorTabProps) {
  return (
    <div className="relative">
      <motion.button
        onClick={onActivate}
        onContextMenu={onContextMenu}
        className={`group px-4 py-2 text-sm font-medium rounded-xl flex items-center gap-3 relative transition-all duration-200 ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-md border-2'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800/60'
        }`}
        title={tab.name}
        style={
          isActive
            ? { borderColor: tab.color || '#3b82f6' }
            : tab.color
            ? { borderLeftWidth: '3px', borderLeftStyle: 'solid', borderLeftColor: tab.color }
            : undefined
        }
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        {tab.isPinned && (
          <motion.svg
            className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            whileHover={{ scale: 1.1 }}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </motion.svg>
        )}
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            onDoubleClickName();
          }}
          title="Double‑click to rename, right-click for options"
          className="truncate max-w-[120px]"
        >
          {tab.name}
        </span>
        {tabCount > 1 && (
          <motion.div
            onClick={onClose}
            className="opacity-0 group-hover:opacity-100 ml-1 flex items-center justify-center w-5 h-5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 cursor-pointer"
            title="Close tab"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
