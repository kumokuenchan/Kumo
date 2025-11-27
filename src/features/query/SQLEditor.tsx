import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  useExecuteQuery,
  useExecuteMultipleQueries,
  useCancelQuery,
} from '../../hooks/useQuery';
import { QueryResult } from '../../api/query';
import {
  getQueryAtCursor,
  getQueryAtCursorWithRange,
  validateSQL,
  formatSQL,
  minifySQL,
} from './utils/sqlUtils';
import {
  type EditorTab,
  loadSavedTabs,
  saveTabs,
  createNewTab,
  createDefaultTab,
  loadActiveTabIndex,
  saveActiveTabIndex,
} from './utils/tabUtils';
import { schemaApi } from '../../api/schema';
import { dataEditingApi } from '../../api/dataEditing';
import { useConnection } from '../../hooks/useConnections';
import ResultGrid from './ResultGrid';
import SchemaTree from '../schema/SchemaTree';
import QueryResultsCompare from './QueryResultsCompare';
import { EditorTabBar } from './components/EditorTabBar';
import { EditorToolbar } from './components/EditorToolbar';
import { ToolbarRightButtons } from './components/EditorToolbar/ToolbarRightButtons';
import { RightPanelSidebar } from './components/RightPanelSidebar';
import SaveQueryModal from '../../components/SaveQueryModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { savedQueriesApi } from '../../api/savedQueries';
import PreferencesModal from '../../components/PreferencesModal';
import GenerateTestDataModal from '../../components/GenerateTestDataModal';
import { useCreateSavedQuery } from '../../hooks/useSavedQueries';
import ExplainVisualizer from './ExplainVisualizer';
import ShowCreateTableDialog from '../schema/ShowCreateTableDialog';
import ExportSchemaDialog from '../schema/ExportSchemaDialog';
import { queryAnalyzerApi, type ExplainAnalysis } from '../../api/queryAnalyzer';
import NaturalLanguageToSQL from './NaturalLanguageToSQL';
import { aiApi } from '../../api/ai';
import { AIResultsPanel } from './AIResultsPanel';
import { Wrench } from 'lucide-react';

interface SQLEditorProps {
  connectionId: string | null;
  generatedQuery?: string | null;
  onQueryUsed?: () => void;
}

export default function SQLEditor({ connectionId, generatedQuery, onQueryUsed }: SQLEditorProps) {

  const [sql, setSql] = useState('-- Write your SQL query here\nSELECT 1;');
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Multi-tab: editor/results tabs
  const [tabs, setTabs] = useState<EditorTab[]>(loadSavedTabs());
  const [activeEditorTab, setActiveEditorTab] = useState(() => loadActiveTabIndex());
  const [rightPanel, setRightPanel] = useState<null | 'history' | 'saved' | 'snippets'>(null);
  const [colorPickerTab, setColorPickerTab] = useState<number | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ left: number; top: number } | null>(null);
  const [compareMode, setCompareMode] = useState<{ leftTab: number; rightTab: number } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [renameTabIndex, setRenameTabIndex] = useState<number | null>(null);
  const [pendingOverwriteName, setPendingOverwriteName] = useState<string | null>(null);
  const [pendingOverwriteFolder, setPendingOverwriteFolder] = useState<string | undefined>(undefined);
  const [pendingOverwriteTags, setPendingOverwriteTags] = useState<string[] | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [isResultsMaximized, setIsResultsMaximized] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Value hints (WHERE suggestions) toggle & limit
  const [sampleHintsEnabled, setSampleHintsEnabled] = useState(true);
  const [sampleLimit, setSampleLimit] = useState(10);
  const [showPrefs, setShowPrefs] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel' | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');

  // Auto-refresh
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5); // in seconds
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Features
  const [aiResultType, setAiResultType] = useState<'explain' | 'optimize' | 'analyze' | 'schema' | null>(null);
  const [aiResultContent, setAiResultContent] = useState<string>('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showGenerateTestDataModal, setShowGenerateTestDataModal] = useState(false);
  const [isGeneratingTestData, setIsGeneratingTestData] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [isAnalyzingData, setIsAnalyzingData] = useState(false);

  // Split editors
  const [splitEnabled, setSplitEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("sqlEditorSplit") === 'true'; } catch { return false; }
  });
  const [rightEditorTab, setRightEditorTab] = useState<number>(() => {
    try { const saved = localStorage.getItem('sqlEditorRightTab'); return saved ? parseInt(saved, 10) : 0; } catch { return 0; }
  });
  const rightEditorRef = useRef<any>(null);
  useEffect(() => { try { localStorage.setItem('sqlEditorSplit', String(splitEnabled)); } catch {} }, [splitEnabled]);
  useEffect(() => { try { localStorage.setItem('sqlEditorRightTab', String(rightEditorTab)); } catch {} }, [rightEditorTab]);
  // Resizable split between editor (top) and results (bottom)
  const [editorHeight, setEditorHeight] = useState<number>(260);
  const [isResizing, setIsResizing] = useState(false);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [exportMenuPos, setExportMenuPos] = useState<{ left: number; top: number } | null>(null);
  const aiMenuRef = useRef<HTMLButtonElement | null>(null);
  const aiDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPos, setAiMenuPos] = useState<{ left: number; top: number } | null>(null);
  // Schema sidebar toggle
  const [showSchemaSidebar, setShowSchemaSidebar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sqlEditorShowSchema');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const toggleSchemaSidebar = () => setShowSchemaSidebar((v) => !v);
  // EXPLAIN analysis
  const [explainAnalysis, setExplainAnalysis] = useState<ExplainAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Schema dialog state (for context menu items)
  const [showCreateTable, setShowCreateTable] = useState<{ database: string; table: string } | null>(null);
  const [exportSchema, setExportSchema] = useState<{ database: string; table?: string } | null>(null);
  // Format on paste
  const [formatOnPaste, setFormatOnPaste] = useState(() => {
    try {
      const saved = localStorage.getItem('sqlEditorFormatOnPaste');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(
    () => document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const editorRef = useRef<any>(null);
  const formatOnPasteRef = useRef(formatOnPaste);
  const prevGeneratedQueryRef = useRef<string | null | undefined>(null);
  const createSavedMutation = useCreateSavedQuery();
  const { data: currentConnection } = useConnection(connectionId || null);

  // Keep formatOnPasteRef in sync with formatOnPaste state
  useEffect(() => {
    formatOnPasteRef.current = formatOnPaste;
  }, [formatOnPaste]);

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Persist schema sidebar visibility
  useEffect(() => {
    try {
      localStorage.setItem('sqlEditorShowSchema', JSON.stringify(showSchemaSidebar));
    } catch {}
  }, [showSchemaSidebar]);

  // Initialize SQL from loaded tabs
  useEffect(() => {
    const initialTab = tabs[activeEditorTab];
    if (initialTab) {
      setSql(initialTab.sql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Keep current tab's SQL in sync with editor content
  useEffect(() => {
    setTabs((prev) => {
      const next = [...prev];
      if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], sql };
      return next;
    });

    // Validate SQL on change
    if (editorRef.current) {
      validateSQL(editorRef.current, sql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, activeEditorTab]);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);

  // Handle generated query from schema tree
  useEffect(() => {
    // Only run if generatedQuery actually changed to a new value
    if (generatedQuery && generatedQuery !== prevGeneratedQueryRef.current) {
      prevGeneratedQueryRef.current = generatedQuery;

      // Set the SQL in state and editor
      setSql(generatedQuery);
      if (editorRef.current) {
        const editor = editorRef.current;
        editor.setValue(generatedQuery);
        const model = editor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          const lastLineLength = model.getLineLength(lineCount);
          editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
        }
        editor.focus();
      }
      // Notify parent that query was used
      onQueryUsed?.();
    }
  }, [generatedQuery, onQueryUsed]);

  // Save active tab index to localStorage
  useEffect(() => {
    saveActiveTabIndex(activeEditorTab);
  }, [activeEditorTab]);

  // Auto-refresh effect
  useEffect(() => {
    // Clean up any existing timer
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    // Clean up countdown timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // Set up countdown timer
    if (autoRefreshEnabled && connectionId) {
      setCountdownSeconds(autoRefreshInterval);
      countdownTimerRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            return autoRefreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Set up new timer if auto-refresh is enabled
    if (autoRefreshEnabled && connectionId && !isRunning) {
      autoRefreshTimerRef.current = setInterval(() => {
        handleExecuteQuery();
        setCountdownSeconds(autoRefreshInterval);
      }, autoRefreshInterval * 1000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [autoRefreshEnabled, autoRefreshInterval, connectionId, isRunning]);

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
    const newTab = createNewTab(tabs, initialSql, name);
    setTabs((prev) => [...prev, newTab]);
    setActiveEditorTab(newIndex);
    setSql(newTab.sql);
    setResults(null);
    setError(null);
    setIsRunning(false);
  };

  const closeTab = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Prevent closing pinned tabs
    if (tabs[index]?.isPinned) {
      setError('Cannot close pinned tab. Unpin it first.');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setTabs((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      if (next.length === 0) {
        const seed = createDefaultTab();
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

  const togglePinTab = (index: number) => {
    setTabs((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], isPinned: !next[index].isPinned };
      }
      return next;
    });
  };

  const setTabColor = (index: number, color: string | undefined) => {
    setTabs((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], color };
      }
      return next;
    });
    setColorPickerTab(null);
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

    // Initial validation
    validateSQL(editor, sql);

    // Register custom folding provider for SQL queries
    const monaco = window.monaco;
    if (monaco?.languages) {
      // Dispose previous provider if exists
      if ((window as any).sqlFoldingProvider) {
        (window as any).sqlFoldingProvider.dispose();
      }

      // Register new folding range provider
      (window as any).sqlFoldingProvider = monaco.languages.registerFoldingRangeProvider('mysql', {
        provideFoldingRanges: (model: any) => {
          const text = model.getValue();
          const lines = text.split('\n');
          const foldingRanges: any[] = [];

          let queryStartLine = -1;
          let queryLines: string[] = [];

          // Find query blocks separated by semicolons
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip empty lines and comments at the start
            if (queryStartLine === -1) {
              if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
                queryStartLine = i;
                queryLines = [line];
              }
            } else {
              queryLines.push(line);

              // Check if this line contains a semicolon (end of query)
              if (line.includes(';')) {
                // Only create folding range if query spans multiple lines
                if (queryLines.length > 1) {
                  foldingRanges.push({
                    start: queryStartLine + 1, // Monaco uses 1-indexed lines
                    end: i + 1,
                    kind: monaco.languages.FoldingRangeKind.Region
                  });
                }

                // Reset for next query
                queryStartLine = -1;
                queryLines = [];
              }
            }
          }

          // Handle last query if it doesn't end with semicolon
          if (queryStartLine !== -1 && queryLines.length > 1) {
            foldingRanges.push({
              start: queryStartLine + 1,
              end: lines.length,
              kind: monaco.languages.FoldingRangeKind.Region
            });
          }

          return foldingRanges;
        }
      });
    }

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

    // Ctrl/Cmd + B: Toggle schema browser
    editor.addCommand(
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyB,
      () => {
        toggleSchemaSidebar();
      }
    );

    // Ctrl/Cmd + K, Ctrl/Cmd + 0: Fold All
    editor.addCommand(
      monaco.KeyMod.chord(
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyK,
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Digit0
      ),
      () => {
        editor.trigger('fold', 'editor.foldAll');
      }
    );

    // Ctrl/Cmd + K, Ctrl/Cmd + J: Unfold All
    editor.addCommand(
      monaco.KeyMod.chord(
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyK,
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyJ
      ),
      () => {
        editor.trigger('fold', 'editor.unfoldAll');
      }
    );

    // Add context menu actions
    const monacoInstance = (window as any).monaco;
    if (monacoInstance?.editor) {
      // 1. Run Query at Cursor
      editor.addAction({
        id: 'run-query-at-cursor',
        label: 'Run Query at Cursor',
        contextMenuGroupId: 'execution',
        contextMenuOrder: 1,
        keybindings: [],
        run: async (ed: any) => {
          const queryAtCursor = getQueryAtCursor(ed);
          if (queryAtCursor && queryAtCursor.trim()) {
            // Execute the query at cursor
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

            try {
              const response = await executeMutation.mutateAsync({
                connectionId,
                sql: queryAtCursor,
              });

              if (response.success) {
                setResults([response.result]);
                setTabs((prev) => {
                  const next = [...prev];
                  if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], results: [response.result], error: null, isRunning: false };
                  return next;
                });
                setActiveTab('results');
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
              } else {
                setError('Query execution failed');
                setTabs((prev) => {
                  const next = [...prev];
                  if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], error: 'Query execution failed', isRunning: false };
                  return next;
                });
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
          } else {
            setError('No query found at cursor position');
          }
        },
      });

      // 2. Format Query at Cursor
      editor.addAction({
        id: 'format-query-at-cursor',
        label: 'Format Query at Cursor',
        contextMenuGroupId: 'formatting',
        contextMenuOrder: 1,
        keybindings: [],
        run: (ed: any) => {
          const queryInfo = getQueryAtCursorWithRange(ed);
          if (queryInfo) {
            try {
              const formatted = format(queryInfo.fullQuery, {
                language: 'mysql',
                tabWidth: 2,
                keywordCase: 'upper',
              });

              const model = ed.getModel();
              if (model) {
                // Replace the query range with formatted version
                const range = new monacoInstance.Range(
                  queryInfo.startLine + 1, // Monaco uses 1-indexed lines
                  1,
                  queryInfo.endLine + 1,
                  model.getLineMaxColumn(queryInfo.endLine + 1)
                );
                ed.executeEdits('format-query', [{
                  range: range,
                  text: formatted,
                }]);
              }
            } catch (err) {
              console.error('Failed to format query:', err);
              setError('Failed to format query');
            }
          }
        },
      });

      // 3. Open Query in New Tab
      editor.addAction({
        id: 'open-query-in-new-tab',
        label: 'Open Query in New Tab',
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        keybindings: [],
        run: (ed: any) => {
          const queryAtCursor = getQueryAtCursor(ed);
          if (queryAtCursor && queryAtCursor.trim()) {
            // Add the query with semicolon back
            const queryWithSemicolon = queryAtCursor + ';';
            addTab(queryWithSemicolon, 'Query');
          } else {
            setError('No query found at cursor position');
          }
        },
      });

      // 4. Comment/Uncomment Query
      editor.addAction({
        id: 'toggle-comment-query',
        label: 'Comment/Uncomment Query',
        contextMenuGroupId: 'editing',
        contextMenuOrder: 1,
        keybindings: [],
        run: (ed: any) => {
          const queryInfo = getQueryAtCursorWithRange(ed);
          if (queryInfo) {
            const model = ed.getModel();
            if (model) {
              const lines = queryInfo.fullQuery.split('\n');

              // Check if all non-empty lines are commented
              const nonEmptyLines = lines.filter(line => line.trim().length > 0);
              const allCommented = nonEmptyLines.every(line => line.trim().startsWith('--'));

              let newText: string;
              if (allCommented) {
                // Uncomment: remove -- from the beginning of each line
                newText = lines.map(line => {
                  const trimmed = line.trimStart();
                  if (trimmed.startsWith('-- ')) {
                    return line.replace('-- ', '');
                  } else if (trimmed.startsWith('--')) {
                    return line.replace('--', '');
                  }
                  return line;
                }).join('\n');
              } else {
                // Comment: add -- to the beginning of each non-empty line
                newText = lines.map(line => {
                  if (line.trim().length > 0) {
                    return '-- ' + line;
                  }
                  return line;
                }).join('\n');
              }

              const range = new monacoInstance.Range(
                queryInfo.startLine + 1,
                1,
                queryInfo.endLine + 1,
                model.getLineMaxColumn(queryInfo.endLine + 1)
              );
              ed.executeEdits('toggle-comment', [{
                range: range,
                text: newText,
              }]);
            }
          }
        },
      });

      // 5. Delete Query at Cursor
      editor.addAction({
        id: 'delete-query-at-cursor',
        label: 'Delete Query at Cursor',
        contextMenuGroupId: 'editing',
        contextMenuOrder: 2,
        keybindings: [],
        run: (ed: any) => {
          const queryInfo = getQueryAtCursorWithRange(ed);
          if (queryInfo) {
            const model = ed.getModel();
            if (model) {
              const range = new monacoInstance.Range(
                queryInfo.startLine + 1,
                1,
                queryInfo.endLine + 2, // +2 to include the newline after semicolon
                1
              );
              ed.executeEdits('delete-query', [{
                range: range,
                text: '',
              }]);
            }
          } else {
            setError('No query found at cursor position');
          }
        },
      });

      // 6. Duplicate Query at Cursor
      editor.addAction({
        id: 'duplicate-query-at-cursor',
        label: 'Duplicate Query at Cursor',
        contextMenuGroupId: 'editing',
        contextMenuOrder: 3,
        keybindings: [],
        run: (ed: any) => {
          const queryInfo = getQueryAtCursorWithRange(ed);
          if (queryInfo) {
            const model = ed.getModel();
            if (model) {
              // Insert the duplicated query after the current query
              const insertPosition = new monacoInstance.Position(queryInfo.endLine + 2, 1);
              ed.executeEdits('duplicate-query', [{
                range: new monacoInstance.Range(insertPosition.lineNumber, insertPosition.column, insertPosition.lineNumber, insertPosition.column),
                text: '\n' + queryInfo.fullQuery + '\n',
              }]);
            }
          } else {
            setError('No query found at cursor position');
          }
        },
      });

      // 7. Fold Query at Cursor
      editor.addAction({
        id: 'fold-query-at-cursor',
        label: 'Fold Query',
        contextMenuGroupId: 'folding',
        contextMenuOrder: 1,
        keybindings: [],
        run: (ed: any) => {
          const position = ed.getPosition();
          if (position) {
            ed.trigger('fold', 'editor.fold', {
              levels: 1,
              direction: 'up',
              selectionLines: [position.lineNumber]
            });
          }
        },
      });

      // 8. Fold All Queries
      editor.addAction({
        id: 'fold-all-queries',
        label: 'Fold All Queries',
        contextMenuGroupId: 'folding',
        contextMenuOrder: 2,
        keybindings: [],
        run: (ed: any) => {
          ed.trigger('fold', 'editor.foldAll');
        },
      });

      // 9. Unfold All Queries
      editor.addAction({
        id: 'unfold-all-queries',
        label: 'Unfold All Queries',
        contextMenuGroupId: 'folding',
        contextMenuOrder: 3,
        keybindings: [],
        run: (ed: any) => {
          ed.trigger('fold', 'editor.unfoldAll');
        },
      });
    }

    // Note: consider enabling proactive trigger if needed in the future.

    // Smart autocomplete: FK-aware JOIN, WHERE hints, Snippet macros
    if (monaco?.languages?.registerCompletionItemProvider) {
      const fkCache: Record<string, any[]> = {};
      const distinctCache: Record<string, string[]> = {};
      const tablesCache: Record<string, string[]> = {};
      const columnsCache: Record<string, any[]> = {};

      const getTables = async (connId: string, database: string): Promise<string[]> => {
        const key = `${connId}:${database}`;
        if (tablesCache[key]) return tablesCache[key];
        try {
          const tables = await schemaApi.getTables(connId, database);
          const tableNames = tables.map((t: any) => t.name || t);
          tablesCache[key] = tableNames;
          return tableNames;
        } catch {
          tablesCache[key] = [];
          return [];
        }
      };

      const getColumns = async (connId: string, database: string, table: string) => {
        const key = `${connId}:${database}:${table}`;
        if (columnsCache[key]) return columnsCache[key];
        try {
          const cols = await schemaApi.getColumns(connId, database, table);
          columnsCache[key] = cols || [];
          return cols || [];
        } catch {
          columnsCache[key] = [];
          return [];
        }
      };

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

          // Column suggestions after WHERE/SELECT/ORDER BY/GROUP BY
          if (connectionId && baseDb && baseTable) {
            // Check if we're after WHERE, SELECT, ORDER BY, GROUP BY, or HAVING
            const afterWhere = /\bwhere\s+[\w`]*$/i.test(lower);
            const afterSelect = /\bselect\s+[\w`]*$/i.test(lower);
            const afterOrderBy = /\border\s+by\s+[\w`]*$/i.test(lower);
            const afterGroupBy = /\bgroup\s+by\s+[\w`]*$/i.test(lower);
            const afterHaving = /\bhaving\s+[\w`]*$/i.test(lower);
            const afterAnd = /\b(and|or)\s+[\w`]*$/i.test(lower);
            const afterComma = /,\s*[\w`]*$/i.test(lower);

            if (afterWhere || afterSelect || afterOrderBy || afterGroupBy || afterHaving || afterAnd || afterComma) {
              const cols = await getColumns(connectionId, baseDb, baseTable);
              for (const col of cols) {
                suggestions.push({
                  label: col.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.name,
                  documentation: `${col.type}${col.key === 'PRI' ? ' (Primary Key)' : ''}${col.key === 'UNI' ? ' (Unique)' : ''}`,
                  detail: col.type,
                });
              }
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

    // Handle paste event for format on paste
    editor.onDidPaste((e: any) => {
      if (!formatOnPasteRef.current) return;

      try {
        const model = editor.getModel();
        if (!model) return;

        const pastedRange = e.range;
        const pastedText = model.getValueInRange(pastedRange);

        // Try to format the pasted text
        const formatted = format(pastedText, {
          language: 'mysql',
          tabWidth: 2,
          keywordCase: 'upper',
        });

        // Replace the pasted text with formatted version
        editor.executeEdits('format-paste', [{
          range: pastedRange,
          text: formatted,
        }]);
      } catch (err) {
        // If formatting fails, keep the original pasted text
        console.error('Failed to format pasted SQL:', err);
      }
    });
  };

  // Handle click outside menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportFormat(null);
      }
      if (showAIMenu) {
        const target = event.target as Node;
        const clickedButton = aiMenuRef.current?.contains(target);
        const clickedDropdown = aiDropdownRef.current?.contains(target);
        if (!clickedButton && !clickedDropdown) {
          setShowAIMenu(false);
        }
      }
    };

    if (exportFormat || showAIMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [exportFormat, showAIMenu]);

  // Handle click outside color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside color picker
      if (colorPickerTab !== null && !target.closest('.color-picker-menu')) {
        setColorPickerTab(null);
        setColorPickerPos(null);
      }
    };

    if (colorPickerTab !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [colorPickerTab]);

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

    const startTime = performance.now();
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

    // Get the current editor content (most up-to-date)
    const editorContent = editor?.getValue() || sql;

    // Use selected text if available, otherwise use full editor content
    const queryToExecute = selectedText && selectedText.trim() ? selectedText : editorContent;

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

        const endTime = performance.now();
        const executionTime = Math.round(endTime - startTime);
        const rowsAffected = response.results?.reduce((sum, r) => sum + (r.affectedRows || r.rows?.length || 0), 0) || 0;

        if (response.success) {
          setResults(response.results);
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = {
              ...next[activeEditorTab],
              results: response.results,
              error: null,
              isRunning: false,
              executionTime,
              rowsAffected
            };
            return next;
          });
          setActiveTab('results');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
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

        const endTime = performance.now();
        const executionTime = Math.round(endTime - startTime);
        const rowsAffected = response.result?.affectedRows || response.result?.rows?.length || 0;

        if (response.success) {
          setResults([response.result]);
          setTabs((prev) => {
            const next = [...prev];
            if (next[activeEditorTab]) next[activeEditorTab] = {
              ...next[activeEditorTab],
              results: [response.result],
              error: null,
              isRunning: false,
              executionTime,
              rowsAffected
            };
            return next;
          });
          setActiveTab('results');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
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
      const response = await cancelMutation.mutateAsync({ connectionId });
      setIsRunning(false);
      setTabs((prev) => {
        const next = [...prev];
        if (next[activeEditorTab]) next[activeEditorTab] = { ...next[activeEditorTab], isRunning: false, error: 'Query cancelled by user' };
        return next;
      });
      setError('Query cancelled by user');
    } catch (err: any) {
      console.error('Failed to cancel query:', err);
      setError(err.message || 'Failed to cancel query');
    }
  };

  // Analyze query with EXPLAIN
  const handleAnalyzeQuery = async () => {
    if (!connectionId) {
      setError('Please connect to a database first');
      return;
    }

    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const selectedText = editor?.getModel()?.getValueInRange(selection);
    const editorContent = sql || '';
    const queryToAnalyze = selectedText && selectedText.trim() ? selectedText : editorContent;

    if (!queryToAnalyze.trim()) {
      setError('No query to analyze');
      return;
    }

    // Only SELECT queries can be analyzed
    if (!queryToAnalyze.trim().toLowerCase().startsWith('select')) {
      setError('Only SELECT queries can be analyzed with EXPLAIN');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await queryAnalyzerApi.analyzeQuery(connectionId, queryToAnalyze);
      setExplainAnalysis(analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze query');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI: Analyze Schema/Table from the schema tree (Query tab)
  const handleAnalyzeSchemaFromTree = async (database: string, table?: string) => {
    if (!connectionId) {
      setError('Please connect to a database first');
      return;
    }
    setError(null);
    try {
      setIsAIProcessing(true);
      setAiResultType('schema');
      setAiResultContent('');

      const payload: { connectionId: string; database: string; table?: string } = {
        connectionId,
        database,
      };
      if (table && table.trim()) payload.table = table;

      const res = await aiApi.analyzeSchema(payload);
      const scope = table && table.trim() ? `${database}.${table}` : `${database} (schema)`;
      setAiResultContent(`AI Schema Analysis for ${scope}\n\n${res.analysis}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to analyze schema');
      setAiResultType(null);
    } finally {
      setIsAIProcessing(false);
    }
  };

  // Format SQL
  const handleFormatSQL = () => {
    try {
      const formatted = formatSQL(sql);
      setSql(formatted);
      const editor = editorRef.current;
      if (editor) {
        editor.setValue(formatted);
      }
    } catch (err) {
      console.error('Failed to format SQL:', err);
    }
  };

  // Minify SQL
  const handleMinifySQL = () => {
    try {
      const minified = minifySQL(sql);
      setSql(minified);
      const editor = editorRef.current;
      if (editor) {
        editor.setValue(minified);
      }
    } catch (err) {
      console.error('Failed to minify SQL:', err);
    }
  };

  // AI: Explain SQL
  const handleExplainSQL = async () => {
    if (!sql.trim()) {
      setError('No SQL query to explain');
      return;
    }

    setIsAIProcessing(true);
    setAiResultType('explain');
    setAiResultContent('');
    setError(null);

    try {
      const response = await aiApi.explainSQL({ sql });
      setAiResultContent(response.explanation);
    } catch (err: any) {
      setError(err.message || 'Failed to explain SQL');
      setAiResultType(null);
    } finally {
      setIsAIProcessing(false);
    }
  };

  // AI: Optimize SQL
  const handleOptimizeSQL = async () => {
    if (!sql.trim()) {
      setError('No SQL query to optimize');
      return;
    }

    setIsAIProcessing(true);
    setAiResultType('optimize');
    setAiResultContent('');
    setError(null);

    try {
      // Optionally get schema context for better optimization suggestions
      const response = await aiApi.optimizeSQL({ sql });
      setAiResultContent(response.optimization);
    } catch (err: any) {
      setError(err.message || 'Failed to optimize SQL');
      setAiResultType(null);
    } finally {
      setIsAIProcessing(false);
    }
  };

  // AI: Fix SQL Error
  const [isFixing, setIsFixing] = useState(false);
  const handleFixSQL = async () => {
    if (!sql.trim() || !error) {
      return;
    }

    setIsFixing(true);

    try {
      const response = await aiApi.fixSQL({ sql, error });

      // Apply the fixed SQL to the editor
      setSql(response.fixedSql);
      const editor = editorRef.current;
      if (editor) {
        editor.setValue(response.fixedSql);
      }

      // Clear the error
      setError(null);

      // Show what changed in AI panel
      const changedMessage = response.fixedSql !== sql
        ? '✓ Query has been fixed and updated in the editor!'
        : 'ℹ AI suggested the same query.';

      setAiResultType('explain');
      setAiResultContent(`${changedMessage}\n\n${response.explanation}\n\n--- Original Query ---\n${sql}\n\n--- Fixed Query ---\n${response.fixedSql}`);
    } catch (err: any) {
      setError(err.message || 'Failed to fix SQL');
      console.error('Fix SQL error:', err);
    } finally {
      setIsFixing(false);
    }
  };

  // AI: Generate Test Data
  const handleGenerateTestData = async (tableName: string, rowCount: number) => {
    if (!connectionId || !currentConnection?.database) {
      setError('Please select a database first');
      return;
    }

    setIsGeneratingTestData(true);

    try {
      const database = currentConnection.database;

      // Get columns for the selected table from the current database
      const tableColumns = await schemaApi.getColumns(connectionId, database, tableName);

      // Build schema string for AI
      const schemaString = `${database}.${tableName} (\n${
        tableColumns.map(col =>
          `  ${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}${col.key === 'PRI' ? ' PRIMARY KEY' : ''}${col.key === 'UNI' ? ' UNIQUE' : ''}${col.default !== null ? ` DEFAULT ${col.default}` : ''}${col.extra ? ` ${col.extra}` : ''}`
        ).join(',\n')
      }\n)`;

      const response = await aiApi.generateTestData({
        tableName,
        schema: schemaString,
        rowCount
      });

      // Insert the generated SQL into the editor
      setSql(response.insertStatements);
      const editor = editorRef.current;
      if (editor) {
        editor.setValue(response.insertStatements);
        editor.focus();
      }

      // Close the modal
      setShowGenerateTestDataModal(false);

      // Show success message
      setAiResultType('explain');
      setAiResultContent(`Generated ${rowCount} INSERT statement${rowCount !== 1 ? 's' : ''} for table ${database}.${tableName}.\n\nThe statements have been inserted into the editor. Review them and click "Run" to insert the test data.`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate test data');
      setShowGenerateTestDataModal(false);
    } finally {
      setIsGeneratingTestData(false);
    }
  };

  // AI: Analyze Data
  const handleAnalyzeData = async () => {
    if (!results || results.length === 0 || !results[0]?.rows) {
      setError('No data available to analyze');
      return;
    }

    setIsAnalyzingData(true);
    setIsAIProcessing(true);
    setAiResultType('analyze'); // Use analyze type for green theme
    setAiResultContent('');
    setError(null);

    try {
      const firstResult = results[0];
      const response = await aiApi.analyzeData({
        data: firstResult.rows,
        sql,
        rowCount: firstResult.rowCount
      });

      setAiResultContent(
        `📊 AI Data Analysis (${response.rowsAnalyzed} of ${response.totalRows} rows analyzed)\n\n${response.analysis}`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to analyze data');
      setAiResultType(null);
    } finally {
      setIsAnalyzingData(false);
      setIsAIProcessing(false);
    }
  };

  // Open Generate Test Data Modal
  const handleOpenGenerateTestDataModal = async () => {
    if (connectionId && currentConnection?.database) {
      try {
        const tables = await schemaApi.getTables(connectionId, currentConnection.database);
        setAvailableTables(tables.map(t => t.name));
        setShowGenerateTestDataModal(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load tables');
      }
    } else if (connectionId && !currentConnection?.database) {
      setError('Please select a database first');
    }
  };

  // Toggle AI Menu
  const handleToggleAIMenu = (pos: { left: number; top: number }) => {
    setAiMenuPos(pos);
    setShowAIMenu(!showAIMenu);
  };

  const handleCloseAIMenu = () => {
    setShowAIMenu(false);
  };

  // Toggle Auto-refresh
  const handleToggleAutoRefresh = () => {
    const newEnabled = !autoRefreshEnabled;
    setAutoRefreshEnabled(newEnabled);
    // If enabling auto-refresh, run query immediately
    if (newEnabled && connectionId) {
      handleExecuteQuery();
    }
  };

  // Handle Compare Results
  const handleCompareResults = () => {
    // Find tabs with results
    const tabsWithResults = tabs
      .map((t, idx) => ({ tab: t, index: idx }))
      .filter(({ tab }) => tab.results && tab.results.length > 0);

    if (tabsWithResults.length < 2) {
      setError('Need at least 2 tabs with results to compare');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Auto-select first two tabs with results
    setCompareMode({
      leftTab: tabsWithResults[0].index,
      rightTab: tabsWithResults[1].index
    });
  };

  // Handle Snippet Selection
  const handleSnippetSelect = (sql: string, name: string) => {
    // Insert snippet into current tab or create new tab
    setSql(sql);
    const editor = editorRef.current;
    if (editor) {
      editor.setValue(sql);
      editor.focus();
    }
    setRightPanel(null);
  };

  // Close AI results panel
  const handleCloseAIResults = () => {
    setAiResultType(null);
    setAiResultContent('');
  };

  // Toggle format on paste
  const toggleFormatOnPaste = () => {
    const newValue = !formatOnPaste;
    setFormatOnPaste(newValue);
    localStorage.setItem('sqlEditorFormatOnPaste', String(newValue));
  };

  // Clear results
  const handleClearResults = () => {
    setResults(null);
    setError(null);
    // Also clear the results from the current active tab
    setTabs((prev) => {
      const next = [...prev];
      if (next[activeEditorTab]) {
        next[activeEditorTab] = { ...next[activeEditorTab], results: null, error: null };
      }
      return next;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!results || results.length === 0) return;

    results.forEach((result, index) => {
      if (result.type !== 'select' || !result.rows || !result.fields) return;

      const headers = result.fields.map((f) => f.name).join(',');
      const csvRows = result.rows
        .map((row) =>
          result.fields!
            .map((field) => {
              const value = row[field.name];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
              return value;
            })
            .join(',')
        )
        .join('\n');

      const csv = `${headers}\n${csvRows}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${index + 1}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Export to JSON
  const exportToJSON = () => {
    if (!results || results.length === 0) return;

    results.forEach((result, index) => {
      if (result.type !== 'select' || !result.rows) return;

      const json = JSON.stringify(result.rows, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${index + 1}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Handle history item selection
  const handleHistorySelect = (querySql: string, queryName?: string) => {
    const current = tabs[activeEditorTab];
    if (!current) return;

    // Update current tab with new SQL and optionally update the name
    setTabs((prev) => {
      const next = [...prev];
      next[activeEditorTab] = {
        ...current,
        sql: querySql,
        name: queryName || current.name, // Update tab name if queryName is provided
        results: null,
        error: null,
      };
      return next;
    });

    // Update both state and editor directly
    setSql(querySql);
    const editor = editorRef.current;
    if (editor) {
      editor.setValue(querySql);
      const model = editor.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        const lastLineLength = model.getLineLength(lineCount);
        editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
      }
      editor.focus();
    }

    setShowHistory(false);
    setRightPanel(null);
  };

  if (!connectionId) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl flex items-center justify-center">
            <svg
              className="w-10 h-10 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Connect to Database</h3>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Please connect to a database to start writing and executing SQL queries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
      {/* Minimalist Toolbar */}
      <div className="border-b border-gray-200/60 dark:border-gray-700/60 px-6 py-3 flex items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <EditorToolbar
          showSchemaSidebar={showSchemaSidebar}
          onToggleSchemaSidebar={toggleSchemaSidebar}
          onFormat={handleFormatSQL}
          onMinify={handleMinifySQL}
          onClearResults={handleClearResults}
          formatOnPaste={formatOnPaste}
          onToggleFormatOnPaste={toggleFormatOnPaste}
          onSave={() => setShowSaveModal(true)}
          onAnalyze={handleAnalyzeQuery}
          isAnalyzing={isAnalyzing}
          isRunning={isRunning}
          onRun={handleExecuteQuery}
          onCancel={handleCancelQuery}
          showAIMenu={showAIMenu}
          aiMenuPos={aiMenuPos}
          isAIProcessing={isAIProcessing}
          isAnalyzingData={isAnalyzingData}
          sql={sql}
          results={results}
          connectionId={connectionId}
          currentConnection={currentConnection}
          onToggleAIMenu={handleToggleAIMenu}
          onCloseAIMenu={handleCloseAIMenu}
          onExplainSQL={handleExplainSQL}
          onOptimizeSQL={handleOptimizeSQL}
          onGenerateTestData={handleOpenGenerateTestDataModal}
          onAnalyzeData={handleAnalyzeData}
          aiMenuRef={aiMenuRef}
          aiDropdownRef={aiDropdownRef}
          autoRefreshEnabled={autoRefreshEnabled}
          autoRefreshInterval={autoRefreshInterval}
          countdownSeconds={countdownSeconds}
          onToggleAutoRefresh={handleToggleAutoRefresh}
          onAutoRefreshIntervalChange={setAutoRefreshInterval}
        />

        <ToolbarRightButtons
          isResultsMaximized={isResultsMaximized}
          onToggleFullScreen={() => setIsResultsMaximized((v) => !v)}
          results={results}
          exportFormat={exportFormat}
          exportMenuPos={exportMenuPos}
          exportMenuRef={exportMenuRef}
          onOpenExportMenu={(pos) => {
            setExportMenuPos(pos);
            setExportFormat(exportFormat ? null : 'csv');
          }}
          onExportCSV={exportToCSV}
          onExportJSON={exportToJSON}
          onCloseExportMenu={() => setExportFormat(null)}
          rightPanel={rightPanel}
          selectedTimezone={selectedTimezone}
          onTimezoneChange={setSelectedTimezone}
          onToggleSnippets={() => setRightPanel((p) => (p === 'snippets' ? null : 'snippets'))}
          onToggleHistory={() => setRightPanel((p) => (p === 'history' ? null : 'history'))}
          onToggleSaved={() => setRightPanel((p) => (p === 'saved' ? null : 'saved'))}
          tabs={tabs}
          onCompare={handleCompareResults}
        />
      </div>

      {/* Query Tabs */}
      <EditorTabBar
        tabs={tabs}
        activeTabIndex={activeEditorTab}
        colorPickerTab={colorPickerTab}
        colorPickerPos={colorPickerPos}
        onActivateTab={activateTab}
        onAddTab={() => addTab()}
        onCloseTab={closeTab}
        onTogglePin={togglePinTab}
        onSetTabColor={setTabColor}
        onSetRenameTabIndex={setRenameTabIndex}
        onOpenColorPicker={(index, pos) => {
          setColorPickerTab(index);
          setColorPickerPos(pos);
        }}
        onCloseColorPicker={() => {
          setColorPickerTab(null);
          setColorPickerPos(null);
        }}
        onCompareResults={(leftTab, rightTab) => {
          setCompareMode({ leftTab, rightTab });
        }}
        onSetError={setError}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left schema sidebar */}
        {showSchemaSidebar && (
          <div className="w-80 h-full flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <SchemaTree
              connectionId={connectionId}
              onlyDatabase={currentConnection?.database}
              restrictTableActions={true}
              onAnalyzeTable={handleAnalyzeSchemaFromTree}
              onViewData={(database, table) => {
                const template = `SELECT * FROM \`${database}\`.\`${table}\` LIMIT 100;`;
                setSql(template);
                const editor = editorRef.current;
                if (editor) {
                  editor.setValue(template);
                }
                handleExecuteQuery();
              }}
              onShowCreateTable={(database, table) => setShowCreateTable({ database, table })}
              onExportSchema={(database, table) => setExportSchema({ database, table })}
              onDumpSQL={(database, table) => {
                if (!connectionId) return;
                try {
                  const url = `/api/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/dump?includeData=true`;
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${table}_dump.sql`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  console.error('Failed to dump SQL:', e);
                }
              }}
              onGenerateQuery={(database, table) => {
                const template = `SELECT * FROM \`${database}\`.\`${table}\` LIMIT 100;`;
                setSql(template);
                const editor = editorRef.current;
                if (editor) {
                  editor.setValue(template);
                  const model = editor.getModel();
                  if (model) {
                    const lineCount = model.getLineCount();
                    const lastLineLength = model.getLineLength(lineCount);
                    editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
                  }
                  editor.focus();
                }
              }}
            />
          </div>
        )}

        {/* Editor */}
        <div
          ref={leftPaneRef}
          className={`flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 min-h-0 min-w-0`}
        >
          {!isResultsMaximized && (
            <>
              <div style={{ height: editorHeight }} className="overflow-hidden bg-gray-50 dark:bg-gray-800">
                <div className="flex h-full"><Editor
                  key={`editor-${activeEditorTab}`}
                  height={editorHeight}
                  defaultLanguage="mysql"
                  defaultValue={sql}
                  onChange={(value) => setSql(value || '')}
                  onMount={handleEditorDidMount}
                  theme={isDarkMode ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    // Enable folding
                    folding: true,
                    foldingStrategy: 'auto',
                    showFoldingControls: 'always',
                    foldingHighlight: true,
                    unfoldOnClickAfterEndOfLine: true,
                  }}
                />
              </div></div>
              <div className="px-6 py-3 bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                    <kbd className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">⌘</kbd>
                    <kbd className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">↩</kbd>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Execute query</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Use</span>
                    <kbd className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">;</kbd>
                    <span className="text-xs text-gray-500 dark:text-gray-400">to separate queries</span>
                  </div>
                </div>
                <NaturalLanguageToSQL
                  connectionId={connectionId}
                  currentDatabase={currentConnection?.database || null}
                  onSQLGenerated={(generatedSQL) => {
                    // Insert generated SQL into current tab
                    setSql(generatedSQL);
                    const editor = editorRef.current;
                    if (editor) {
                      editor.setValue(generatedSQL);
                      editor.focus();
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Horizontal resize handle */}
          {!isResultsMaximized && (
            <div
              className={`h-1.5 cursor-row-resize group relative ${isResizing ? 'bg-blue-500' : 'bg-gray-200/60 hover:bg-blue-400/80'} transition-colors duration-200`}
              onMouseDown={() => setIsResizing(true)}
              title="Drag to resize results"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-gray-400/60 group-hover:bg-blue-500 rounded-full transition-colors duration-200"></div>
              </div>
            </div>
          )}

          {/* AI Results Panel */}
          {(aiResultType || isAIProcessing) && (
            <div className="px-4">
              <AIResultsPanel
                type={aiResultType}
                content={aiResultContent}
                isLoading={isAIProcessing}
                onClose={handleCloseAIResults}
              />
            </div>
          )}

          {/* Results/Error Display */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {/* Results Header */}
            <div className="px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <motion.div 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Query Results</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SQL execution output</p>
                  </div>
                </motion.div>
                
                {tabs[activeEditorTab]?.executionTime !== undefined && (
                  <motion.div 
                    className="flex items-center gap-4 text-xs"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                      <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{tabs[activeEditorTab].executionTime}ms</span>
                      <span className="text-gray-500 dark:text-gray-400">execution time</span>
                    </div>
                    {tabs[activeEditorTab]?.rowsAffected !== undefined && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{tabs[activeEditorTab].rowsAffected}</span>
                        <span className="text-gray-500 dark:text-gray-400">row{tabs[activeEditorTab].rowsAffected !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              {isRunning && (
                <motion.div 
                  className="flex items-center gap-3 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-200/60 dark:border-blue-800/60"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </div>
                  <span className="text-sm font-medium">Executing query...</span>
                </motion.div>
              )}
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-auto px-6 py-6 min-h-0 bg-gray-50/30 dark:bg-gray-900/30">
              {error && (
                <motion.div 
                  className="bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200/60 dark:border-red-800/60 rounded-xl p-6 mb-6 shadow-sm backdrop-blur-sm"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-800/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-4 h-4 text-red-600 dark:text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-red-800 dark:text-red-300 mb-1">Query Error</h4>
                        <p className="text-sm text-red-700 dark:text-red-400 font-mono leading-relaxed bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-800/30">{error}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleFixSQL}
                      disabled={isFixing || !sql.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md"
                      title="Use AI to analyze and fix this error"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isFixing ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Fixing...</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-4 h-4" />
                          <span>Fix with AI</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {(() => {
                // Generate unique stable IDs for each result set when results change
                const resultSetIds = useMemo(() => {
                  if (!results) return [];
                  const timestamp = Date.now();
                  return results.map((_, idx) => `resultset-${idx}-${timestamp}`);
                }, [results]);

                return results && results.length > 0 ? (
                  <motion.div
                    key={`results-${resultSetIds.join('-')}`}
                    initial={autoRefreshEnabled ? false : { opacity: 0, y: 8 }}
                    animate={autoRefreshEnabled ? false : { opacity: 1, y: 0 }}
                    transition={autoRefreshEnabled ? { duration: 0 } : { duration: 0.18 }}
                    className={results.length === 1 ? 'h-full flex flex-col' : 'space-y-4'}
                  >
                    {results.map((result, index) => {
                      // Split SQL by semicolon to get individual statements for each result
                      const sqlStatements = sql.split(';').filter(s => s.trim());
                      const relevantSql = sqlStatements[index] || sql;

                      return (
                        <motion.div
                          key={resultSetIds[index]}
                          initial={autoRefreshEnabled ? false : { opacity: 0, y: 6 }}
                          animate={autoRefreshEnabled ? false : { opacity: 1, y: 0 }}
                          transition={autoRefreshEnabled ? { duration: 0 } : { duration: 0.18, delay: index * 0.04 }}
                        >
                          <ResultGrid
                            result={result}
                            index={index}
                            fullHeight={results.length === 1}
                            connectionId={connectionId || undefined}
                            sourceSql={relevantSql}
                            isOnlyResult={results.length === 1}
                            selectedTimezone={selectedTimezone}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  !error && (
                    <motion.div
                      initial={autoRefreshEnabled ? false : { opacity: 0 }}
                      animate={autoRefreshEnabled ? false : { opacity: 1 }}
                      className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500"
                    >
                      <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-500">No results yet</p>
                      <p className="text-sm text-gray-400 mt-1">Run a query to see results here</p>
                    </div>
                  </motion.div>
                )
              );
              })()}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded shadow"
                  >
                    ✓ Query executed successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Panel - History/Saved/Snippets */}
        <RightPanelSidebar
          rightPanel={rightPanel}
          connectionId={connectionId}
          isResultsMaximized={isResultsMaximized}
          onSelectQuery={handleHistorySelect}
          onSelectSnippet={handleSnippetSelect}
        />
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

      {/* Compare Results Modal */}
      {compareMode && tabs[compareMode.leftTab]?.results?.[0] && tabs[compareMode.rightTab]?.results?.[0] && (
        <QueryResultsCompare
          leftResult={tabs[compareMode.leftTab].results![0]}
          rightResult={tabs[compareMode.rightTab].results![0]}
          leftLabel={tabs[compareMode.leftTab].name}
          rightLabel={tabs[compareMode.rightTab].name}
          onClose={() => setCompareMode(null)}
        />
      )}

      {/* Show CREATE TABLE Dialog */}
      {showCreateTable && connectionId && (
        <ShowCreateTableDialog
          connectionId={connectionId}
          database={showCreateTable.database}
          table={showCreateTable.table}
          isOpen={true}
          onClose={() => setShowCreateTable(null)}
        />
      )}

      {/* Export Schema Dialog */}
      {exportSchema && connectionId && (
        <ExportSchemaDialog
          connectionId={connectionId}
          database={exportSchema.database}
          table={exportSchema.table}
          isOpen={true}
          onClose={() => setExportSchema(null)}
        />
      )}

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

      {/* EXPLAIN Analysis Modal */}
      {explainAnalysis && (
        <ExplainVisualizer
          analysis={explainAnalysis}
          onClose={() => setExplainAnalysis(null)}
        />
      )}

      {/* Generate Test Data Modal */}
      <GenerateTestDataModal
        isOpen={showGenerateTestDataModal}
        tables={availableTables}
        database={currentConnection?.database}
        onGenerate={handleGenerateTestData}
        onCancel={() => setShowGenerateTestDataModal(false)}
        isLoading={isGeneratingTestData}
      />

      {/* Tab Context Menu Portal */}
    </div>
  );
}
