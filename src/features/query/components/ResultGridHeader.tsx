import { createPortal } from 'react-dom';

interface ResultGridHeaderProps {
  index: number;
  result: any;
  involvedTables: string[];
  selectedTimezone?: string;
  currentTimeInTimezone: string;
  editable: boolean;
  exitEditMode: () => void;
  effectiveDb: string | null;
  effectiveTable: string | null;
  enableEditMode: () => void;
  handleSave: () => void;
  canSaveWithPK: boolean;
  saving: boolean;
  hasChanges: boolean;
  pkColumns: string[];
  setShowPivot: (value: boolean) => void;
  showPivot: boolean;
  exportButtonRef: React.RefObject<HTMLButtonElement>;
  exportFormat: 'csv' | 'json' | null;
  setExportFormat: (format: 'csv' | 'json' | null) => void;
  dropdownPosition: { top: number; left: number } | null;
  exportToCSV: () => void;
  exportToJSON: () => void;
  exportToExcel: () => void;
}

export default function ResultGridHeader({
  index,
  result,
  involvedTables,
  selectedTimezone,
  currentTimeInTimezone,
  editable,
  exitEditMode,
  effectiveDb,
  effectiveTable,
  enableEditMode,
  handleSave,
  canSaveWithPK,
  saving,
  hasChanges,
  pkColumns,
  setShowPivot,
  showPivot,
  exportButtonRef,
  exportFormat,
  setExportFormat,
  dropdownPosition,
  exportToCSV,
  exportToJSON,
  exportToExcel,
}: ResultGridHeaderProps) {
  return (
    <div
      className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/40 dark:border-gray-700/40 overflow-visible relative backdrop-blur-xl"
      style={{ zIndex: 10 }}
    >
      <div className="flex items-center justify-between w-full flex-wrap">
        <div className="flex items-center gap-3 text-sm px-5 py-3">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-[13px]">
            Result Set {index + 1}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">
            {result.rowCount.toLocaleString()} {result.rowCount === 1 ? 'row' : 'rows'}
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-[12px]">
            {result.executionTime}ms
          </span>
          {involvedTables.length > 0 && (
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {involvedTables.join(', ')}
            </span>
          )}
          {selectedTimezone && selectedTimezone !== 'UTC' && (
            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1 text-[12px] font-medium">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {currentTimeInTimezone}
            </span>
          )}
          {editable && (
            <>
              <button
                onClick={exitEditMode}
                className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600/50 flex items-center gap-1.5 transition-colors duration-150"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>Exit</span>
              </button>
            </>
          )}
          {editable && (effectiveDb || effectiveTable) && (
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
              title={`${effectiveDb || 'db?'}.${effectiveTable || 'table?'}`}
            >
              Target: {effectiveDb || 'db?'}.{effectiveTable || 'table?'}
            </span>
          )}
        </div>

        {/* Right section - contextual action bar */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0">
          {/* Mode indicator */}
          {!editable ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs font-medium">Browse Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Edit Mode</span>
            </div>
          )}

          {/* Progressive disclosure - show actions contextually */}
          {result.type === 'select' && (
            <>
              {/* Primary action: Enable Editing (only in browse mode) */}
              {!editable && (
                <button
                  onClick={enableEditMode}
                  className="px-4 py-2 text-[13px] font-semibold rounded-xl whitespace-nowrap transition-all duration-200 bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Enable Editing
                </button>
              )}

              {/* Primary action: Save Changes (only in edit mode) */}
              {editable && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!canSaveWithPK || saving}
                    className={`px-4 py-2 text-[13px] font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                      !canSaveWithPK
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : saving
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>

                  {/* Inline status message instead of tooltip */}
                  {!canSaveWithPK && hasChanges && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 max-w-48">
                      {!pkColumns.length
                        ? 'Primary key required for save'
                        : 'Check connection & permissions'}
                    </div>
                  )}
                </div>
              )}

              {/* Secondary actions - grouped */}
              <div
                className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 pl-3"
                style={{ position: 'relative', zIndex: 50 }}
              >
                {/* Pivot/Chart - secondary action */}
                <button
                  onClick={() => setShowPivot((v) => !v)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    showPivot
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title="Pivot / Chart"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </button>

                {/* Export - secondary action */}
                <div className="relative" style={{ zIndex: 100 }}>
                  <button
                    ref={exportButtonRef}
                    onClick={() => setExportFormat(exportFormat ? null : 'csv')}
                    className="p-2 rounded-lg transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Export"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>

                  {/* Export dropdown - using portal for proper stacking */}
                  {exportFormat &&
                    dropdownPosition &&
                    createPortal(
                      <div
                        className="fixed bg-white dark:bg-gray-800 border border-gray-200/40 dark:border-gray-700/40 rounded-xl shadow-lg min-w-[160px] overflow-hidden backdrop-blur-xl"
                        style={{
                          zIndex: 99999,
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                        }}
                      >
                        <button
                          onClick={() => {
                            exportToCSV();
                            setExportFormat(null);
                          }}
                          className="w-full px-4 py-3 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                            />
                          </svg>
                          Export as CSV
                        </button>
                        <button
                          onClick={() => {
                            exportToJSON();
                            setExportFormat(null);
                          }}
                          className="w-full px-4 py-3 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Export as JSON
                        </button>
                        <button
                          onClick={() => {
                            exportToExcel();
                            setExportFormat(null);
                          }}
                          className="w-full px-4 py-3 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 flex items-center gap-3"
                        >
                          <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z"
                            />
                          </svg>
                          Export as Excel
                        </button>
                      </div>,
                      document.body,
                    )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}