import { motion } from 'framer-motion';
import type { RefObject } from 'react';
import { RunButton } from './RunButton';
import { FormatButtons } from './FormatButtons';
import { AIMenuButton } from './AIMenuButton';
import { AutoRefreshToggle } from './AutoRefreshToggle';
import { UtilityButtons } from './UtilityButtons';

interface EditorToolbarProps {
  // Schema sidebar
  showSchemaSidebar: boolean;
  onToggleSchemaSidebar: () => void;

  // Format buttons
  onFormat: () => void;
  onMinify: () => void;
  onClearResults: () => void;
  formatOnPaste: boolean;
  onToggleFormatOnPaste: () => void;

  // Utility buttons
  onSave: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;

  // Run button
  isRunning: boolean;
  onRun: () => void;
  onCancel: () => void;

  // AI Menu
  showAIMenu: boolean;
  aiMenuPos: { left: number; top: number } | null;
  isAIProcessing: boolean;
  isAnalyzingData: boolean;
  sql: string;
  results: any[] | null;
  onToggleAIMenu: (pos: { left: number; top: number }) => void;
  onCloseAIMenu: () => void;
  onExplainSQL: () => void;
  onOptimizeSQL: () => void;
  onGenerateTestData: () => void;
  onAnalyzeData: () => void;
  aiMenuRef: RefObject<HTMLButtonElement>;
  aiDropdownRef: RefObject<HTMLDivElement>;

  // Auto-refresh
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
  countdownSeconds: number;
  onToggleAutoRefresh: () => void;
  onAutoRefreshIntervalChange: (interval: number) => void;

  // Connection
  connectionId: string | null;
  currentConnection: { database?: string } | null;
}

export function EditorToolbar({
  showSchemaSidebar,
  onToggleSchemaSidebar,
  onFormat,
  onMinify,
  onClearResults,
  formatOnPaste,
  onToggleFormatOnPaste,
  onSave,
  onAnalyze,
  isAnalyzing,
  isRunning,
  onRun,
  onCancel,
  showAIMenu,
  aiMenuPos,
  isAIProcessing,
  isAnalyzingData,
  sql,
  results,
  connectionId,
  currentConnection,
  onToggleAIMenu,
  onCloseAIMenu,
  onExplainSQL,
  onOptimizeSQL,
  onGenerateTestData,
  onAnalyzeData,
  aiMenuRef,
  aiDropdownRef,
  autoRefreshEnabled,
  autoRefreshInterval,
  countdownSeconds,
  onToggleAutoRefresh,
  onAutoRefreshIntervalChange,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2">
        {/* Schema Toggle */}
        <motion.button
          onClick={onToggleSchemaSidebar}
          aria-pressed={showSchemaSidebar}
          className={`group flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            showSchemaSidebar
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-800/60'
          }`}
          title={showSchemaSidebar ? 'Hide Schema Browser' : 'Show Schema Browser'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className={`w-4 h-4 rounded ${
              showSchemaSidebar ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'
            } transition-colors`}
          />
          <span>Schema</span>
        </motion.button>

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-1">
          <FormatButtons
            onFormat={onFormat}
            onMinify={onMinify}
            onClearResults={onClearResults}
            formatOnPaste={formatOnPaste}
            onToggleFormatOnPaste={onToggleFormatOnPaste}
          />

          <UtilityButtons
            onSave={onSave}
            onAnalyze={onAnalyze}
            isAnalyzing={isAnalyzing}
            connectionId={connectionId}
          />

          <RunButton isRunning={isRunning} onRun={onRun} onCancel={onCancel} />
        </div>

        <AIMenuButton
          showAIMenu={showAIMenu}
          aiMenuPos={aiMenuPos}
          isAIProcessing={isAIProcessing}
          isAnalyzingData={isAnalyzingData}
          sql={sql}
          connectionId={connectionId}
          currentConnection={currentConnection}
          results={results}
          onToggleMenu={onToggleAIMenu}
          onClose={onCloseAIMenu}
          onExplainSQL={onExplainSQL}
          onOptimizeSQL={onOptimizeSQL}
          onGenerateTestData={onGenerateTestData}
          onAnalyzeData={onAnalyzeData}
          aiMenuRef={aiMenuRef}
          aiDropdownRef={aiDropdownRef}
        />

        <AutoRefreshToggle
          autoRefreshEnabled={autoRefreshEnabled}
          autoRefreshInterval={autoRefreshInterval}
          countdownSeconds={countdownSeconds}
          connectionId={connectionId}
          onToggle={onToggleAutoRefresh}
          onIntervalChange={onAutoRefreshIntervalChange}
        />
      </div>
  );
}
