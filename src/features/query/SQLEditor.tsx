import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { format } from 'sql-formatter';
import {
  useExecuteQuery,
  useExecuteMultipleQueries,
  useCancelQuery,
} from '../../hooks/useQuery';
import { QueryResult } from '../../api/query';
import ResultGrid from './ResultGrid';
import QueryHistoryPanel from './QueryHistoryPanel';

interface SQLEditorProps {
  connectionId: string | null;
}

export default function SQLEditor({ connectionId }: SQLEditorProps) {
  const [sql, setSql] = useState('-- Write your SQL query here\nSELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  // Resizable split between editor (top) and results (bottom)
  const [editorHeight, setEditorHeight] = useState<number>(260);
  const [isResizing, setIsResizing] = useState(false);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<any>(null);

  const executeMutation = useExecuteQuery();
  const executeMultipleMutation = useExecuteMultipleQueries();
  const cancelMutation = useCancelQuery();

  // Handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Add keyboard shortcuts
    editor.addCommand(
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
      () => {
        handleExecuteQuery();
      }
    );

    editor.addCommand(
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.KeyF,
      () => {
        handleFormatSQL();
      }
    );
  };

  // Handle vertical resizing (editor/results)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing || !leftPaneRef.current) return;
      const rect = leftPaneRef.current.getBoundingClientRect();
      const minEditor = 120; // px
      const minResults = 140; // px
      let newHeight = e.clientY - rect.top;
      newHeight = Math.max(minEditor, Math.min(newHeight, rect.height - minResults));
      setEditorHeight(newHeight);
    };
    const onMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing]);

  // Execute selected text or full query
  const handleExecuteQuery = async () => {
    if (!connectionId) {
      setError('Please connect to a database first');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const selectedText = editor?.getModel()?.getValueInRange(selection);

    // Use selected text if available, otherwise use full content
    const queryToExecute = selectedText && selectedText.trim() ? selectedText : sql;

    if (!queryToExecute.trim()) {
      setError('Please enter a SQL query');
      setIsRunning(false);
      return;
    }

    try {
      // Check if multiple statements
      const hasMultipleStatements = queryToExecute.split(';').filter(s => s.trim()).length > 1;

      if (hasMultipleStatements) {
        const response = await executeMultipleMutation.mutateAsync({
          connectionId,
          sql: queryToExecute,
        });

        if (response.success) {
          setResults(response.results);
          setActiveTab('results');
        } else {
          setError(response.error || 'Query execution failed');
        }
      } else {
        const response = await executeMutation.mutateAsync({
          connectionId,
          sql: queryToExecute,
        });

        if (response.success) {
          setResults([response.result]);
          setActiveTab('results');
        } else {
          setError('Query execution failed');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Query execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Cancel running query
  const handleCancelQuery = async () => {
    if (!connectionId) return;

    try {
      await cancelMutation.mutateAsync({ connectionId });
      setIsRunning(false);
      setError('Query cancelled by user');
    } catch (err: any) {
      console.error('Failed to cancel query:', err);
    }
  };

  // Format SQL
  const handleFormatSQL = () => {
    try {
      const formatted = format(sql, {
        language: 'mysql',
        tabWidth: 2,
        keywordCase: 'upper',
      });
      setSql(formatted);
    } catch (err) {
      console.error('Failed to format SQL:', err);
    }
  };

  // Clear results
  const handleClearResults = () => {
    setResults(null);
    setError(null);
  };

  // Handle history item selection
  const handleHistorySelect = (querySql: string) => {
    setSql(querySql);
    setShowHistory(false);
  };

  if (!connectionId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Database Connected</h3>
          <p className="text-gray-500">Please connect to a database to start writing queries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecuteQuery}
            disabled={isRunning}
            className={`px-4 py-2 rounded font-medium flex items-center gap-2 ${
              isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title="Execute Query (Ctrl+Enter)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            {isRunning ? 'Running...' : 'Run Query'}
          </button>

          {isRunning && (
            <button
              onClick={handleCancelQuery}
              className="px-4 py-2 rounded font-medium bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              title="Cancel Query"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              Cancel
            </button>
          )}

          <button
            onClick={handleFormatSQL}
            className="px-3 py-2 rounded text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            title="Format SQL (Ctrl+Shift+F)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            Format
          </button>

          <button
            onClick={handleClearResults}
            className="px-3 py-2 rounded text-gray-700 hover:bg-gray-200"
            title="Clear Results"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              showHistory ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            title="Query History"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            History
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div ref={leftPaneRef} className={`${showHistory ? 'w-2/3' : 'w-full'} flex flex-col border-r border-gray-200 min-h-0`}>
          <div style={{ height: editorHeight }} className="overflow-hidden">
            <Editor
              height={editorHeight}
              defaultLanguage="mysql"
              value={sql}
              onChange={(value) => setSql(value || '')}
              onMount={handleEditorDidMount}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* Horizontal resize handle */}
          <div
            className={`h-1 cursor-row-resize bg-gray-200 hover:bg-blue-500 ${isResizing ? 'bg-blue-500' : ''}`}
            onMouseDown={() => setIsResizing(true)}
            title="Drag to resize results"
          />

          {/* Results/Error Display */}
          <div className="flex-1 overflow-hidden border-t border-gray-200 min-h-0">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 flex gap-4">
              <button
                onClick={() => setActiveTab('results')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'results'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Results
                {results && results.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                    {results.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="h-full overflow-auto p-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-red-800">Error</h4>
                      <p className="text-sm text-red-700 mt-1 font-mono">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {results && results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <ResultGrid key={index} result={result} index={index} />
                  ))}
                </div>
              ) : (
                !error && (
                  <div className="text-center py-12 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p>No results yet. Execute a query to see results here.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-1/3">
            <QueryHistoryPanel
              connectionId={connectionId}
              onSelectQuery={handleHistorySelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
