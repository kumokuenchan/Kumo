import { createPortal } from 'react-dom';
import { Sparkles, ChevronDown, Zap, Beaker, BrainCircuit } from 'lucide-react';
import type { RefObject } from 'react';

interface AIMenuButtonProps {
  showAIMenu: boolean;
  aiMenuPos: { left: number; top: number } | null;
  isAIProcessing: boolean;
  isAnalyzingData: boolean;
  sql: string;
  connectionId: string | null;
  currentConnection: { database?: string } | null;
  results: any[] | null;
  onToggleMenu: (pos: { left: number; top: number }) => void;
  onClose: () => void;
  onExplainSQL: () => void;
  onOptimizeSQL: () => void;
  onGenerateTestData: () => void;
  onAnalyzeData: () => void;
  aiMenuRef: RefObject<HTMLButtonElement>;
  aiDropdownRef: RefObject<HTMLDivElement>;
}

export function AIMenuButton({
  showAIMenu,
  aiMenuPos,
  isAIProcessing,
  isAnalyzingData,
  sql,
  connectionId,
  currentConnection,
  results,
  onToggleMenu,
  onClose,
  onExplainSQL,
  onOptimizeSQL,
  onGenerateTestData,
  onAnalyzeData,
  aiMenuRef,
  aiDropdownRef,
}: AIMenuButtonProps) {
  return (
    <div className="relative">
      <button
        ref={aiMenuRef}
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onToggleMenu({ left: rect.left, top: rect.bottom + 6 });
        }}
        className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1.5 text-sm transition-colors"
        title="AI Assistant - Explain, Optimize, Generate, and Analyze"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI Assistant</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAIMenu ? 'rotate-180' : ''}`} />
      </button>

      {showAIMenu && aiMenuPos && createPortal(
        <div
          ref={aiDropdownRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 py-2 min-w-[220px]"
          style={{ left: aiMenuPos.left, top: aiMenuPos.top }}
        >
          {/* Explain SQL */}
          <button
            onClick={() => {
              onClose();
              onExplainSQL();
            }}
            disabled={isAIProcessing || !sql.trim()}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-gray-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Convert SQL to plain English"
          >
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <div className="font-medium">Explain SQL</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Convert to plain English</div>
            </div>
          </button>

          {/* Optimize SQL */}
          <button
            onClick={() => {
              onClose();
              onOptimizeSQL();
            }}
            disabled={isAIProcessing || !sql.trim()}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 dark:text-gray-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Get performance suggestions"
          >
            <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <div className="font-medium">Optimize SQL</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Performance suggestions</div>
            </div>
          </button>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          {/* Generate Test Data */}
          <button
            onClick={() => {
              onClose();
              onGenerateTestData();
            }}
            disabled={!connectionId || !currentConnection?.database}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:text-gray-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Create realistic test data"
          >
            <Beaker className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-medium">Generate Test Data</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Realistic INSERT statements</div>
            </div>
          </button>

          {/* Analyze Data */}
          <button
            onClick={() => {
              onClose();
              onAnalyzeData();
            }}
            disabled={isAnalyzingData || !results || results.length === 0}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 dark:text-gray-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Get insights and trends"
          >
            <BrainCircuit className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <div className="font-medium">Analyze Data</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Insights & recommendations</div>
            </div>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
