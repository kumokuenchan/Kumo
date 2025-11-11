import { createPortal } from 'react-dom';
import { type EditorTab } from '../../utils/tabUtils';

interface TabColorPickerProps {
  tabs: EditorTab[];
  colorPickerTab: number;
  position: { left: number; top: number };
  onTogglePin: (index: number) => void;
  onSetColor: (index: number, color: string | undefined) => void;
  onCompare: () => void;
  onClose: () => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export function TabColorPicker({
  tabs,
  colorPickerTab,
  position,
  onTogglePin,
  onSetColor,
  onCompare,
  onClose,
}: TabColorPickerProps) {
  const tab = tabs[colorPickerTab];
  if (!tab) return null;

  return createPortal(
    <div
      className="color-picker-menu fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg py-1 min-w-[180px]"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        zIndex: 9999,
      }}
    >
      {/* Pin/Unpin Tab */}
      <button
        onClick={() => {
          onTogglePin(colorPickerTab);
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        {tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}
      </button>

      {/* Compare Results (only if tab has results) */}
      {tab.results && tab.results.length > 0 && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
          <button
            onClick={() => {
              onCompare();
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            Compare Results
          </button>
        </>
      )}

      {/* Color Picker */}
      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Set Color</div>
      <div className="px-3 py-2 flex flex-wrap gap-2">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              onSetColor(colorPickerTab, color);
              onClose();
            }}
            className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {tab.color && (
          <button
            onClick={() => {
              onSetColor(colorPickerTab, undefined);
              onClose();
            }}
            className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition flex items-center justify-center text-xs"
            title="Remove color"
          >
            ×
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
