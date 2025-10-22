import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { format } from 'sql-formatter';
import {
  useExecuteQuery,
  useExecuteMultipleQueries,
  useCancelQuery,
} from '../../hooks/useQuery';
import { QueryResult } from '../../api/query';
import { schemaApi } from '../../api/schema';
import { dataEditingApi } from '../../api/dataEditing';
import { useConnection } from '../../hooks/useConnections';
import ResultGrid from './ResultGrid';
import QueryHistoryPanel from './QueryHistoryPanel';
import SavedQueriesPanel from './SavedQueriesPanel';
import SaveQueryModal from '../../components/SaveQueryModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { savedQueriesApi } from '../../api/savedQueries';
import PreferencesModal from '../../components/PreferencesModal';
import { useCreateSavedQuery } from '../../hooks/useSavedQueries';

interface SQLEditorProps {
  connectionId: string | null;
}

type EditorTab = {
  id: string;
  name: string;
  sql: string;
  results: QueryResult[] | null;
  error: string | null;
  isRunning: boolean;
};

export default function SQLEditor({ connectionId }: SQLEditorProps) {
  const [sql, setSql] = useState('-- Write your SQL query here\nSELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Multi-tab: editor/results tabs
  const [tabs, setTabs] = useState<EditorTab[]>([
    { id: `tab_${Date.now()}`, name: 'Tab 1', sql, results: null, error: null, isRunning: false },
  ]);
  const [activeEditorTab, setActiveEditorTab] = useState(0);
  const [rightPanel, setRightPanel] = useState<null | 'history' | 'saved'>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [renameTabIndex, setRenameTabIndex] = useState<number | null>(null);
  const [pendingOverwriteName, setPendingOverwriteName] = useState<string | null>(null);
  const [pendingOverwriteFolder, setPendingOverwriteFolder] = useState<string | undefined>(undefined);
  const [pendingOverwriteTags, setPendingOverwriteTags] = useState<string[] | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [isResultsMaximized, setIsResultsMaximized] = useState(false);
  // Value hints (WHERE suggestions) toggle & limit
  const [sampleHintsEnabled, setSampleHintsEnabled] = useState(true);
  const [sampleLimit, setSampleLimit] = useState(10);
  const [showPrefs, setShowPrefs] = useState(false);
  // Resizable split between editor (top) and results (bottom)
  const [editorHeight, setEditorHeight] = useState<number>(260);
  const [isResizing, setIsResizing] = useState(false);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<any>(null);
  const createSavedMutation = useCreateSavedQuery();
  const { data: currentConnection } = useConnection(connectionId || null);
  
  // Keep current tab's SQL in sync with editor content
  useEffect(() => {
    setTabs((prev) => {
      const next = [...prev];
      if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], sql };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, activeEditorTab]);

  const activateTab = (index: number) => {
    setActiveEditorTab(index);
    const t = tabs[index];
    if (t) {
      setSql(t.sql);
      setResults(t.results);
      setError(t.error);
      setIsRunning(t.isRunning);
    }
  };

  const addTab = (initialSql?: string, name?: string) => {
    const newIndex = tabs.length;
    const newTab: EditorTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name || `Tab ${newIndex + 1}`,
      sql: initialSql ?? '-- Write your SQL query here\nSELECT 1;\n',
      results: null,
      error: null,
      isRunning: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveEditorTab(newIndex);
    setSql(newTab.sql);
    setResults(null);
    setError(null);
    setIsRunning(false);
  };

  const closeTab = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      if (next.length === 0) {
        const seed: EditorTab = {
          id: `tab_${Date.now()}`,
          name: 'Tab 1',
          sql: '-- Write your SQL query here\nSELECT 1;\n',
          results: null,
          error: null,
          isRunning: false,
        };
        setActiveEditorTab(0);
        setSql(seed.sql);
        setResults(null);
        setError(null);
        setIsRunning(false);
        return [seed];
      }
      let newIdx = activeEditorTab;
      if (index === activeEditorTab) newIdx = Math.max(0, index - 1);
      else if (index < activeEditorTab) newIdx = activeEditorTab - 1;
      setActiveEditorTab(newIdx);
      const t = next[newIdx];
      if (t) {
        setSql(t.sql);
        setResults(t.results);
        setError(t.error);
        setIsRunning(t.isRunning);
      }
      return next;
    });
  };

  const commitRenameTab = (index: number, name: string) => {
    setTabs((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], name };
      return next;
    });
  };

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

    // Ctrl/Cmd + Shift + Enter: Run in New Tab
    editor.addCommand(
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyMod.Shift | window.monaco.KeyCode.Enter,
      () => {
        handleExecuteQueryNewTab();
      }
    );

    // Note: consider enabling proactive trigger if needed in the future.

    // Smart autocomplete: FK-aware JOIN, WHERE hints, Snippet macros
    const monaco: any = (window as any).monaco;
    if (monaco?.languages?.registerCompletionItemProvider) {
      const fkCache: Record<string, any[]> = {};
      const distinctCache: Record<string, string[]> = {};

      const parseSimpleFrom = (sqlText: string): { database: string | null; table: string | null; alias?: string | null } | null => {
        if (!sqlText) return null;
        const s0 = sqlText.replace(/\/\*[^]*?\*\//g, '').replace(/--.*$/gm, '');
        const m = /from\s+((`[^`]+`|\w+)\.)?(`[^`]+`|\w+)(?:\s+(as\s+)?(\w+))?/i.exec(s0);
        if (!m) return null;
        const dbRaw = m[2];
        const tblRaw = m[3];
        const alias = m[5] || null;
        const unquote = (x?: string | null) => (x ? x.replace(/^`|`$/g, '') : x);
        return { database: unquote(dbRaw) || null, table: unquote(tblRaw) || null, alias };
      };

      const getForeignKeys = async (connId: string, database: string, table: string) => {
        const key = `${connId}:${database}:${table}`;
        if (fkCache[key]) return fkCache[key];
        try {
          const fks = await schemaApi.getForeignKeys(connId, database, table);
          fkCache[key] = fks || [];
          return fkCache[key];
        } catch {
          fkCache[key] = [];
          return [];
        }
      };

      const getDistinct = async (connId: string, database: string, table: string, column: string, limit = 10) => {
        const key = `${connId}:${database}:${table}:${column}:${limit}`;
        if (distinctCache[key]) return distinctCache[key];
        try {
          const res = await dataEditingApi.fkLookup(connId, database, table, column, undefined, limit, 0).catch(async () => {
            // fallback to distinct-values endpoint if available in data viewer API
            try {
              const dv = await (await import('../../api/dataViewer')).dataViewerApi.getDistinctValues(connId, database, table, column, limit);
              const out = (dv?.data?.values || []).map((v: any) => String(v));
              distinctCache[key] = out;
              return out;
            } catch {
              return [] as string[];
            }
          });
          const out = Array.isArray(res?.options) ? res.options.map((o: any) => String(o.label || o.value)) : [];
          distinctCache[key] = out;
          return out;
        } catch {
          return [] as string[];
        }
      };

      monaco.languages.registerCompletionItemProvider('mysql', {
        triggerCharacters: [' ', '.', '=', '(', ',', '*'],
        provideCompletionItems: async (model, position) => {
          const textUntilPos = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
          const lower = textUntilPos.toLowerCase();
          const suggestions: any[] = [];

          // Snippet macros
          suggestions.push(
            {
              label: 'sel',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'SELECT template',
              insertText: 'SELECT ${1:*}\\nFROM ${2:table}\\nWHERE ${3:condition};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'ins',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'INSERT template',
              insertText: 'INSERT INTO ${1:table} (${2:col1}, ${3:col2})\\nVALUES (${4:val1}, ${5:val2});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'upd',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'UPDATE template',
              insertText: 'UPDATE ${1:table}\\nSET ${2:col} = ${3:value}\\nWHERE ${4:condition};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'seljoin',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'SELECT with JOIN template',
              insertText: 'SELECT ${1:t1.*}, ${2:t2.*}\\nFROM ${3:table1} ${4:t1}\\nJOIN ${5:table2} ${6:t2} ON ${4:t1}.${7:fk} = ${6:t2}.${8:pk}\\nWHERE ${9:condition};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'del',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'DELETE template',
              insertText: 'DELETE FROM ${1:table}\\nWHERE ${2:condition};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'ctas',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'CREATE TABLE AS SELECT',
              insertText: 'CREATE TABLE ${1:new_table} AS\\nSELECT ${2:*}\\nFROM ${3:table}\\nWHERE ${4:condition};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
              label: 'with',
              kind: monaco.languages.CompletionItemKind.Snippet,
              documentation: 'WITH CTE template',
              insertText: 'WITH ${1:cte_name} AS (\\n  SELECT ${2:*}\\n  FROM ${3:table}\\n  WHERE ${4:condition}\\n)\\nSELECT ${5:*}\\nFROM ${1:cte_name};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
          );

          // Context: FROM/JOIN tables ... offer FK-aware JOINs
          const ctx = parseSimpleFrom(model.getValue());
          const baseDb = ctx?.database || (currentConnection?.database || null);
          const baseTable = ctx?.table || null;
          const baseAlias = ctx?.alias || (baseTable ? 't1' : null);
          const parseTablesAliases = (sqlText: string): Array<{ table: string; alias?: string | null }> => {
            const s = sqlText.replace(/\/\*[^]*?\*\//g, '').replace(/--.*$/gm, ' ');
            const out: Array<{ table: string; alias?: string | null }> = [];
            const fromRe = /from\s+((`[^`]+`|\w+)\.)?(`[^`]+`|\w+)(?:\s+(?:as\s+)?(\w+))?/ig;
            const joinRe = /join\s+((`[^`]+`|\w+)\.)?(`[^`]+`|\w+)(?:\s+(?:as\s+)?(\w+))?/ig;
            let m: RegExpExecArray | null;
            if ((m = fromRe.exec(s))) {
              const tbl = (m[3] || '').replace(/^`|`$/g, '');
              const alias = m[4] || null;
              if (tbl) out.push({ table: tbl, alias });
            }
            while ((m = joinRe.exec(s))) {
              const tbl = (m[3] || '').replace(/^`|`$/g, '');
              const alias = m[4] || null;
              if (tbl) out.push({ table: tbl, alias });
            }
            return out;
          };
          const tables = parseTablesAliases(model.getValue());
          const lastCtx = tables.length > 0 ? tables[tables.length - 1] : null;

          if (connectionId && baseDb && (baseTable || lastCtx?.table) && /\bjoin\s+$/i.test(lower) && !/from\s*\(/i.test(model.getValue())) {
            const sourceTable = lastCtx?.table || baseTable!;
            const sourceAlias = lastCtx?.alias || baseAlias || sourceTable.substring(0,1);
            const fks = await getForeignKeys(connectionId, baseDb, sourceTable);
            for (const fk of fks) {
              const joinAlias = fk.referencedTable === sourceTable ? 't2' : fk.referencedTable.substring(0, 1);
              const onLeft = `${sourceAlias}.${fk.column}`;
              const onRight = `${joinAlias}.${fk.referencedColumn}`;
              suggestions.push({
                label: `JOIN ${fk.referencedTable} ON ${onLeft} = ${onRight}`,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Join via foreign key',
                insertText: `JOIN ${fk.referencedTable} ${joinAlias} ON ${onLeft} = ${onRight} `,
              });
            }
          }

          // Table suggestions after FROM or JOIN (e.g. "select * from ")
          if (connectionId && /(\bfrom\s*$|\bfrom\s+[`\w]*$|\bjoin\s+[`\w]*$)/i.test(lower)) {
            if (baseDb) {
              const tbls = await getTables(connectionId, baseDb);
              for (const t of tbls) {
                suggestions.push({
                  label: t,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: t,
                  documentation: `Table in ${baseDb}`,
                });
              }
            } else {
              try {
                const dbs = await schemaApi.getDatabases(connectionId);
                const top = (dbs || []).slice(0, 3);
                for (const db of top) {
                  const tbls = await getTables(connectionId, db.name);
                  for (const t of tbls) {
                    const q = `${db.name}.${t}`;
                    suggestions.push({
                      label: q,
                      kind: monaco.languages.CompletionItemKind.Class,
                      insertText: q,
                      documentation: `Table in ${db.name}`,
                    });
                  }
                }
              } catch {}
            }
          }

          // Database-qualified: after typing "from db." suggest tables within that db
          if (connectionId) {
            const mDb = /(from|join)\s+([`\w]+)\.$/i.exec(lower);
            if (mDb) {
              const dbIdent = mDb[2].replace(/`/g, '');
              try {
                const tbls = await getTables(connectionId, dbIdent);
                for (const t of tbls) {
                  suggestions.push({
                    label: `${dbIdent}.${t}`,
                    kind: monaco.languages.CompletionItemKind.Class,
                    insertText: `${t}`,
                    documentation: `Table in ${dbIdent}`,
                  });
                }
              } catch {}
            }
          }

          // Context: WHERE ... column value hints (sampled)
          const whereIdx = lower.lastIndexOf(' where ');
          if (connectionId && baseDb && baseTable && whereIdx !== -1 && sampleHintsEnabled) {
            const tail = textUntilPos.slice(whereIdx + 7);
            // Try to capture pattern: alias.column or table.column
            const m = /(\b[\w`]+)\.(\b[\w`]+)\s*(=|in\s*\()\s*$/i.exec(tail);
            if (m) {
              let aliasOrTable = (m[1] || '').replace(/`/g, '');
              const column = (m[2] || '').replace(/`/g, '');
              // If alias matches base alias, resolve to base table
              const resolvedTable = aliasOrTable === (baseAlias || '') ? baseTable : baseTable;
              const values = await getDistinct(connectionId, baseDb, resolvedTable!, column, sampleLimit);
              for (const v of values) {
                const quoted = /\D/.test(v) ? `'${v.replace(/'/g, "''")}'` : v;
                suggestions.push({
                  label: `= ${v}`,
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: `${m[3] === 'in(' || m[3]?.toLowerCase().startsWith('in') ? `${quoted}` : ` ${quoted}`}`,
                });
              }
            }
          }

          return { suggestions } as any;
        },
      });
    }
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
    setTabs((prev) => {
      const next = [...prev];
      if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], isRunning: true, error: null };
      return next;
    });
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
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], results: response.results, error: null, isRunning: false };
            return next;
          });
          setActiveTab('results');
        } else {
          setError(response.error || 'Query execution failed');
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], error: response.error || 'Query execution failed', isRunning: false };
            return next;
          });
        }
      } else {
        const response = await executeMutation.mutateAsync({
          connectionId,
          sql: queryToExecute,
        });

        if (response.success) {
          setResults([response.result]);
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], results: [response.result], error: null, isRunning: false };
            return next;
          });
          setActiveTab('results');
        } else {
          setError('Query execution failed');
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], error: 'Query execution failed', isRunning: false };
            return next;
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Query execution failed');
      setTabs((prev) => {
        const next = [...prev];
        if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], error: err?.message || 'Query execution failed', isRunning: false };
        return next;
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleExecuteQueryNewTab = async () => {
    if (!connectionId) {
      setError('Please connect to a database first');
      return;
    }
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const selectedText = editor?.getModel()?.getValueInRange(selection);
    const text = selectedText && selectedText.trim() ? selectedText : sql;
    addTab(text);
    // Execute in the newly created tab
    setTimeout(() => {
      handleExecuteQuery();
    }, 0);
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
    setRightPanel(null);
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

          <button
            onClick={handleExecuteQueryNewTab}
            className="px-3 py-2 rounded text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            title="Run in New Tab (Ctrl+Shift+Enter)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Tab
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

          <button
            onClick={() => setShowSaveModal(true)}
            className={`px-3 py-2 rounded flex items-center gap-2 ${createSavedMutation.isPending ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
            title="Save current query"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Save
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResultsMaximized((v) => !v)}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              isResultsMaximized ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            title={isResultsMaximized ? 'Exit Full Screen' : 'Full Screen Results'}
          >
            {isResultsMaximized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9H5V5m0 10v4h4m6-14h4v4M15 15h4v4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M8 20H4v-4m12 0h4v4m0-12V4h-4" />
              </svg>
            )}
            {isResultsMaximized ? 'Exit Full Screen' : 'Full Screen'}
          </button>

          {/* Preferences */}
          <button
            onClick={() => setShowPrefs(true)}
            className="px-3 py-2 rounded text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            title="Preferences"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
            </svg>
            Prefs
          </button>

          <button
            onClick={() => setRightPanel((p) => (p === 'history' ? null : 'history'))}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              rightPanel === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'
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

          <button
            onClick={() => setRightPanel((p) => (p === 'saved' ? null : 'saved'))}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              rightPanel === 'saved' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            title="Saved Queries"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-4 7 4V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
            </svg>
            Saved
          </button>
        </div>
      </div>

      {/* Query Tabs */}
      <div className="border-b border-gray-200 px-4 py-1 flex items-center justify-between bg-white">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => activateTab(i)}
              className={`px-4 py-2 rounded-t-md border min-w-[120px] flex items-center justify-between ${
                i === activeEditorTab
                  ? 'border-b-white border-gray-300 bg-white text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-100'
              }`}
              title={t.name}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/tabindex', String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIdxStr = e.dataTransfer.getData('text/tabindex');
                const fromIdx = Number(fromIdxStr);
                if (!Number.isFinite(fromIdx) || fromIdx === i) return;
                setTabs((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(i, 0, moved);
                  return next;
                });
                setActiveEditorTab(i);
              }}
            >
              <span
                className="mr-2 text-sm truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenameTabIndex(i);
                }}
                title="Double‑click to rename"
              >
                {t.name}
              </span>
              <span
                onClick={(e) => closeTab(i, e)}
                className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 text-gray-500"
                title="Close tab"
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <div>
          <button
            onClick={() => addTab()}
            className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
            title="Add Tab"
          >
            +
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div
          ref={leftPaneRef}
          className={`${isResultsMaximized ? 'w-full' : rightPanel ? 'w-2/3' : 'w-full'} flex flex-col border-r border-gray-200 min-h-0`}
        >
          {!isResultsMaximized && (
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
          )}

          {/* Horizontal resize handle */}
          {!isResultsMaximized && (
            <div
              className={`h-1 cursor-row-resize bg-gray-200 hover:bg-blue-500 ${isResizing ? 'bg-blue-500' : ''}`}
              onMouseDown={() => setIsResizing(true)}
              title="Drag to resize results"
            />
          )}

          {/* Results/Error Display */}
          <div className="flex-1 overflow-hidden border-t border-gray-200 min-h-0">
            {/* Tabs */}
            <div className="border-b border-gray-200 bg-gray-50 px-4 flex items-center justify-between">
              <div className="flex gap-4">
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

              <div className="flex items-center gap-2 py-1">
                <button
                  onClick={() => setIsResultsMaximized((v) => !v)}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                    isResultsMaximized ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title={isResultsMaximized ? 'Exit Full Screen' : 'Full Screen Results'}
                >
                  {isResultsMaximized ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9H5V5m0 10v4h4m6-14h4v4M15 15h4v4" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M8 20H4v-4m12 0h4v4m0-12V4h-4" />
                    </svg>
                  )}
                  {isResultsMaximized ? 'Exit' : 'Full Screen'}
                </button>
              </div>
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
                    <ResultGrid
                      key={index}
                      result={result}
                      index={index}
                      fullHeight={isResultsMaximized && results.length === 1}
                      connectionId={connectionId || undefined}
                      sourceSql={sql}
                      isOnlyResult={results.length === 1}
                    />
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
        {(rightPanel && !isResultsMaximized) && (
          <div className="w-1/3">
            {rightPanel === 'history' && connectionId && (
              <QueryHistoryPanel connectionId={connectionId} onSelectQuery={handleHistorySelect} />
            )}
            {rightPanel === 'saved' && connectionId && (
              <SavedQueriesPanel connectionId={connectionId} onSelectQuery={handleHistorySelect} />
            )}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={showPrefs}
        hintsEnabled={sampleHintsEnabled}
        limit={sampleLimit}
        onChange={({ hintsEnabled, limit }) => {
          setSampleHintsEnabled(hintsEnabled);
          setSampleLimit(limit);
        }}
        onClose={() => setShowPrefs(false)}
      />

      {/* Rename Tab Modal */}
      <SaveQueryModal
        isOpen={renameTabIndex !== null}
        title="Rename Tab"
        defaultName={renameTabIndex !== null ? (tabs[renameTabIndex]?.name || '') : ''}
        sqlPreview={undefined}
        isLoading={false}
        onCancel={() => setRenameTabIndex(null)}
        onSubmit={(newName) => {
          if (renameTabIndex === null) return;
          const name = (newName || '').trim();
          if (!name) { setRenameTabIndex(null); return; }
          commitRenameTab(renameTabIndex, name);
          setRenameTabIndex(null);
        }}
      />

      {/* Save Query Modal */}
      <SaveQueryModal
        isOpen={showSaveModal}
        defaultName={'My Query'}
        sqlPreview={sql}
        showFolderTags={true}
        isLoading={createSavedMutation.isPending}
        onCancel={() => setShowSaveModal(false)}
        onSubmit={async (payload) => {
          if (!connectionId) { setError('Please connect to a database first'); return; }
          try {
            const { name, folder, tags } = typeof payload === 'string' ? { name: payload, folder: undefined, tags: undefined } : payload;
            const existing = await savedQueriesApi.list(connectionId);
            if (existing.some((e) => e.name === name)) {
              setPendingOverwriteName(name);
              setPendingOverwriteFolder(folder);
              setPendingOverwriteTags(tags);
              return;
            }
            await createSavedMutation.mutateAsync({ connectionId, name, sql, database: undefined, tags, folder });
            setShowSaveModal(false);
            setRightPanel('saved');
          } catch (e: any) {
            setError(e?.message || 'Failed to save query');
          }
        }}
      />

      {/* Overwrite confirm */}
      <ConfirmDialog
        isOpen={pendingOverwriteName !== null}
        title="Overwrite Saved Query?"
        message={`A saved query named "${pendingOverwriteName || ''}" already exists. Overwrite it and keep a revision?`}
        confirmLabel="Overwrite"
        cancelLabel="Cancel"
        onCancel={() => { setPendingOverwriteName(null); setShowSaveModal(true); }}
        onConfirm={async () => {
          if (!connectionId || pendingOverwriteName === null) return;
          try {
            await savedQueriesApi.create(connectionId, pendingOverwriteName, sql, undefined, pendingOverwriteTags, pendingOverwriteFolder, true);
            setPendingOverwriteName(null);
            setPendingOverwriteFolder(undefined);
            setPendingOverwriteTags(undefined);
            setShowSaveModal(false);
            setRightPanel('saved');
          } catch (e: any) {
            setError(e?.message || 'Failed to overwrite');
            setPendingOverwriteName(null);
            setPendingOverwriteFolder(undefined);
            setPendingOverwriteTags(undefined);
          }
        }}
      />
    </div>
  );
}
