import QueryHistoryPanel from '../../QueryHistoryPanel';
import SavedQueriesPanel from '../../SavedQueriesPanel';
import QuerySnippetsPanel from '../../QuerySnippetsPanel';

interface RightPanelSidebarProps {
  rightPanel: 'history' | 'saved' | 'snippets' | null;
  connectionId: string | null;
  isResultsMaximized: boolean;
  onSelectQuery: (sql: string) => void;
  onSelectSnippet: (sql: string, name: string) => void;
}

export function RightPanelSidebar({
  rightPanel,
  connectionId,
  isResultsMaximized,
  onSelectQuery,
  onSelectSnippet,
}: RightPanelSidebarProps) {
  if (!rightPanel || isResultsMaximized) {
    return null;
  }

  return (
    <div className="w-1/3 min-w-[320px] max-w-[520px] flex-shrink-0 h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto">
      {rightPanel === 'history' && connectionId && (
        <QueryHistoryPanel connectionId={connectionId} onSelectQuery={onSelectQuery} />
      )}
      {rightPanel === 'saved' && connectionId && (
        <SavedQueriesPanel connectionId={connectionId} onSelectQuery={onSelectQuery} />
      )}
      {rightPanel === 'snippets' && (
        <QuerySnippetsPanel onSelectSnippet={onSelectSnippet} />
      )}
    </div>
  );
}
