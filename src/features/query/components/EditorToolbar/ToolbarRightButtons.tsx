import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import type { EditorTab } from '../../utils/tabUtils';

interface ToolbarRightButtonsProps {
  // Full screen
  isResultsMaximized: boolean;
  onToggleFullScreen: () => void;

  // Export
  results: any[] | null;
  exportFormat: string | null;
  exportMenuPos: { left: number; top: number } | null;
  exportMenuRef: RefObject<HTMLDivElement>;
  onOpenExportMenu: (pos: { left: number; top: number }) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onCloseExportMenu: () => void;

  // Right panel
  rightPanel: 'history' | 'saved' | 'snippets' | null;
  onToggleSnippets: () => void;
  onToggleHistory: () => void;
  onToggleSaved: () => void;

  // Compare
  tabs: EditorTab[];
  onCompare: () => void;

  // Timezone
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
}

export function ToolbarRightButtons({
  isResultsMaximized,
  onToggleFullScreen,
  results,
  exportFormat,
  exportMenuPos,
  exportMenuRef,
  onOpenExportMenu,
  onExportCSV,
  onExportJSON,
  onCloseExportMenu,
  rightPanel,
  onToggleSnippets,
  onToggleHistory,
  onToggleSaved,
  tabs,
  onCompare,
  selectedTimezone,
  onTimezoneChange,
}: ToolbarRightButtonsProps) {
  // Common timezones
  const timezones = [
    { value: 'default', label: 'default' },
    { value: '-12:00', label: 'GMT-12:00' },
    { value: '-11:00', label: 'GMT-11:00' },
    { value: '-10:00', label: 'GMT-10:00 (HST)' },
    { value: '-09:30', label: 'GMT-09:30 (MHT)' },
    { value: '-09:00', label: 'GMT-09:00 (AKST)' },
    { value: '-08:00', label: 'GMT-08:00 (PST)' },
    { value: '-07:00', label: 'GMT-07:00 (MST)' },
    { value: '-06:00', label: 'GMT-06:00 (CST)' },
    { value: '-05:00', label: 'GMT-05:00 (EST)' },
    { value: '-04:30', label: 'GMT-04:30 (VET)' },
    { value: '-04:00', label: 'GMT-04:00 (AST)' },
    { value: '-03:30', label: 'GMT-03:30 (NST)' },
    { value: '-03:00', label: 'GMT-03:00 (BRT)' },
    { value: '-02:00', label: 'GMT-02:00 (FNT)' },
    { value: '-01:00', label: 'GMT-01:00 (AZOT)' },
    { value: '+00:00', label: 'GMT+00:00 (UTC)' },
    { value: '+01:00', label: 'GMT+01:00 (CET)' },
    { value: '+02:00', label: 'GMT+02:00 (EET)' },
    { value: '+03:00', label: 'GMT+03:00 (MSK)' },
    { value: '+03:30', label: 'GMT+03:30 (IRST)' },
    { value: '+04:00', label: 'GMT+04:00 (GST)' },
    { value: '+04:30', label: 'GMT+04:30 (AFT)' },
    { value: '+05:00', label: 'GMT+05:00 (PKT)' },
    { value: '+05:30', label: 'GMT+05:30 (IST)' },
    { value: '+05:45', label: 'GMT+05:45 (NPT)' },
    { value: '+06:00', label: 'GMT+06:00 (BST)' },
    { value: '+06:30', label: 'GMT+06:30 (MMT)' },
    { value: '+07:00', label: 'GMT+07:00 (ICT)' },
    { value: '+07:30', label: 'GMT+07:30 (CST)' },
    { value: '+08:00', label: 'GMT+08:00 (CST/SGT)' },
    { value: '+08:30', label: 'GMT+08:30 (KST)' },
    { value: '+08:45', label: 'GMT+08:45 (ACWST)' },
    { value: '+09:00', label: 'GMT+09:00 (JST/KST)' },
    { value: '+09:30', label: 'GMT+09:30 (ACST)' },
    { value: '+10:00', label: 'GMT+10:00 (AEST)' },
    { value: '+10:30', label: 'GMT+10:30 (ACDT)' },
    { value: '+11:00', label: 'GMT+11:00 (AEDT)' },
    { value: '+11:30', label: 'GMT+11:30 (NFT)' },
    { value: '+12:00', label: 'GMT+12:00 (NZST)' },
    { value: '+12:45', label: 'GMT+12:45 (CHAST)' },
    { value: '+13:00', label: 'GMT+13:00 (TOT)' },
    { value: '+13:45', label: 'GMT+13:45 (CHADT)' },
    { value: '+14:00', label: 'GMT+14:00 (LINT)' },
  ];

  return (
    <div className="flex items-center gap-1 ml-auto">
      {/* Timezone Dropdown */}
      <div className="relative">
        <select
          value={selectedTimezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          title="Select timezone for datetime display"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
      {/* Full Screen Toggle */}
      <button
        onClick={onToggleFullScreen}
        className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
        title={isResultsMaximized ? 'Exit Full Screen' : 'Full Screen Results'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M8 20H4v-4m12 0h4v4m0-12V4h-4" />
        </svg>
        Full Screen
      </button>

      {/* Export Menu */}
      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onOpenExportMenu({ left: rect.left, top: rect.bottom + 6 });
          }}
          className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export Results"
          disabled={!results || results.length === 0}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
        {exportFormat && exportMenuPos && createPortal(
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 py-1 min-w-[160px]"
            style={{ left: exportMenuPos.left, top: exportMenuPos.top }}
          >
            <button
              onClick={() => {
                onExportCSV();
                onCloseExportMenu();
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Export as CSV
            </button>
            <button
              onClick={() => {
                onExportJSON();
                onCloseExportMenu();
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 whitespace-nowrap"
            >
              Export as JSON
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Snippets */}
      <button
        onClick={onToggleSnippets}
        className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
        title="Query Snippets"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Snippets
      </button>

      {/* Compare Results */}
      <button
        onClick={onCompare}
        disabled={tabs.filter(t => t.results && t.results.length > 0).length < 2}
        className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Compare Results"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Compare
      </button>

      {/* History */}
      <button
        onClick={onToggleHistory}
        className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
        title="Query History"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        History
      </button>

      {/* Saved */}
      <button
        onClick={onToggleSaved}
        className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm"
        title="Saved Queries"
      >
        Saved
      </button>
    </div>
  );
}
