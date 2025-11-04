import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
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
import SchemaTree from '../schema/SchemaTree';
import QueryHistoryPanel from './QueryHistoryPanel';
import SavedQueriesPanel from './SavedQueriesPanel';
import QuerySnippetsPanel from './QuerySnippetsPanel';
import QueryResultsCompare from './QueryResultsCompare';
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
import { Sparkles, Zap, Wrench, Beaker, BrainCircuit, ChevronDown } from 'lucide-react';

interface SQLEditorProps {
  connectionId: string | null;
  generatedQuery?: string | null;
  onQueryUsed?: () => void;
}

type EditorTab = {
  id: string;
  name: string;
  sql: string;
  results: QueryResult[] | null;
  error: string | null;
  isRunning: boolean;
  isPinned?: boolean;
  color?: string;
  executionTime?: number;
  rowsAffected?: number;
};

export default function SQLEditor({ connectionId, generatedQuery, onQueryUsed }: SQLEditorProps) {
  // Load saved tabs from localStorage
  const loadSavedTabs = (): EditorTab[] => {
    try {
      const saved = localStorage.getItem('sqlEditorTabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore tabs with runtime state
        return parsed.map((t: any) => ({
          ...t,
          results: null,
          error: null,
          isRunning: false,
          isPinned: t.isPinned || false,
          color: t.color || undefined,
        }));
      }
    } catch (e) {
      console.error('Failed to load saved tabs:', e);
    }
    return [
      { id: `tab_${Date.now()}`, name: 'Tab 1', sql: '-- Write your SQL query here\nSELECT 1;', results: null, error: null, isRunning: false, isPinned: false },
    ];
  };

  const [sql, setSql] = useState('-- Write your SQL query here\nSELECT 1;');
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Multi-tab: editor/results tabs
  const [tabs, setTabs] = useState<EditorTab[]>(loadSavedTabs);
  const [activeEditorTab, setActiveEditorTab] = useState(() => {
    try {
      const saved = localStorage.getItem('sqlEditorActiveTab');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [rightPanel, setRightPanel] = useState<null | 'history' | 'saved' | 'snippets'>(null);
  const [colorPickerTab, setColorPickerTab] = useState<number | null>(null);
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
    try {
      // Only save essential data (not runtime state)
      const toSave = tabs.map(({ id, name, sql, isPinned, color }) => ({ id, name, sql, isPinned, color }));
      localStorage.setItem('sqlEditorTabs', JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save tabs:', e);
    }
  }, [tabs]);

  // Handle generated query from schema tree
  useEffect(() => {
    if (generatedQuery) {
      // Set the SQL in the active tab
      setSql(generatedQuery);
      // Position cursor at the end
      if (editorRef.current) {
        const editor = editorRef.current;
        const model = editor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          const lastLineLength = model.getLineLength(lineCount);
          editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
          editor.focus();
        }
      }
      // Notify parent that query was used
      onQueryUsed?.();
    }
  }, [generatedQuery, onQueryUsed]);

  // Save active tab index to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sqlEditorActiveTab', String(activeEditorTab));
    } catch (e) {
      console.error('Failed to save active tab:', e);
    }
  }, [activeEditorTab]);

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
        const seed: EditorTab = {
          id: `tab_${Date.now()}`,
          name: 'Tab 1',
          sql: '-- Write your SQL query here\nSELECT 1;\n',
          results: null,
          error: null,
          isRunning: false,
          isPinned: false,
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

  // Helper function to get the query at cursor position
  const getQueryAtCursor = (editor: any): string | null => {
    const result = getQueryAtCursorWithRange(editor);
    return result ? result.query : null;
  };

  // Helper function to get the query at cursor position WITH line range info
  const getQueryAtCursorWithRange = (editor: any): { query: string; startLine: number; endLine: number; fullQuery: string } | null => {
    const model = editor.getModel();
    if (!model) return null;

    const position = editor.getPosition();
    if (!position) return null;

    const fullText = model.getValue();
    const lines = fullText.split('\n');
    const currentLineNumber = position.lineNumber - 1; // 0-indexed

    // Find the start of the current statement (search backwards from the line BEFORE cursor for semicolon)
    let startLine = 0;
    for (let i = currentLineNumber - 1; i >= 0; i--) {
      if (lines[i].includes(';')) {
        // Found a semicolon, start after this line
        startLine = i + 1;
        break;
      }
    }

    // Find the end of the current statement (search forwards from cursor line for semicolon)
    let endLine = lines.length - 1;
    for (let i = currentLineNumber; i < lines.length; i++) {
      if (lines[i].includes(';')) {
        // Found a semicolon, end at this line
        endLine = i;
        break;
      }
    }

    // Extract the statement lines
    const statementLines = lines.slice(startLine, endLine + 1);
    const fullQuery = statementLines.join('\n');
    const statement = fullQuery.trim();

    // Remove the trailing semicolon for execution
    const cleanStatement = statement.endsWith(';') ? statement.slice(0, -1).trim() : statement;

    console.log('Debug - Current line:', currentLineNumber);
    console.log('Debug - Start line:', startLine, 'End line:', endLine);
    console.log('Debug - Extracted query:', cleanStatement);

    return cleanStatement ? { query: cleanStatement, startLine, endLine, fullQuery } : null;
  };

  // Basic SQL syntax validation
  const validateSQL = (editor: any, sqlText: string) => {
    const monaco = (window as any).monaco;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers: any[] = [];

    // Basic syntax validation rules
    const lines = sqlText.split('\n');
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim().toUpperCase();

      // Check for common syntax errors
      // Unclosed quotes
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;

      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lineIndex + 1,
          startColumn: 1,
          endLineNumber: lineIndex + 1,
          endColumn: line.length + 1,
          message: 'Unclosed quote detected'
        });
      }

      // Missing semicolon (warning only)
      if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
        const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
        const startsWithKeyword = keywords.some(kw => trimmed.startsWith(kw));

        if (startsWithKeyword && !line.trim().endsWith(';') && lineIndex === lines.length - 1) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: lineIndex + 1,
            startColumn: line.length,
            endLineNumber: lineIndex + 1,
            endColumn: line.length + 1,
            message: 'Consider adding a semicolon at the end of the statement'
          });
        }
      }

      // Unmatched parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineIndex + 1,
          startColumn: 1,
          endLineNumber: lineIndex + 1,
          endColumn: line.length + 1,
          message: 'Unmatched parentheses detected'
        });
      }
    });

    monaco.editor.setModelMarkers(model, 'sql-validator', markers);
  };

  // Handle editor mount
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Initial validation
    validateSQL(editor, sql);

    // Register custom folding provider for SQL queries
    const monaco = (window as any).monaco;
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

    console.log('Cancel button clicked - attempting to cancel query');

    try {
      const response = await cancelMutation.mutateAsync({ connectionId });
      console.log('Cancel response:', response);
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

  // Minify SQL
  const handleMinifySQL = () => {
    try {
      let minified = sql;
      // Remove single-line comments (-- comment)
      minified = minified.replace(/--[^\n]*/g, '');
      // Remove multi-line comments (/* comment */)
      minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
      // Collapse multiple spaces/newlines into single space
      minified = minified.replace(/\s+/g, ' ');
      // Remove spaces around common SQL operators and punctuation (except semicolons)
      minified = minified.replace(/\s*([(),=<>])\s*/g, '$1');
      // Split by semicolon, trim each query, and rejoin with semicolon + newline
      const queries = minified.split(';').map(q => q.trim()).filter(q => q.length > 0);
      minified = queries.join(';\n');
      setSql(minified);
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

      console.log('Fix SQL response:', response);

      // Apply the fixed SQL to the editor
      setSql(response.fixedSql);

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

    // Reflect in the editor immediately
    setSql(querySql);
    // Move cursor to end and focus editor
    setTimeout(() => {
      const editor = editorRef.current;
      const model = editor?.getModel?.();
      if (editor && model) {
        const lineCount = model.getLineCount();
        const lastLineLength = model.getLineLength(lineCount);
        editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
        editor.focus();
      }
    }, 0);

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
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Database Connected</h3>
          <p className="text-gray-500 dark:text-gray-400">Please connect to a database to start writing queries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSchemaSidebar}
            aria-pressed={showSchemaSidebar}
            className={`px-2 py-1.5 flex items-center gap-1.5 text-sm rounded ${showSchemaSidebar ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
            title={showSchemaSidebar ? 'Hide Schema Browser' : 'Show Schema Browser'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Schema
          </button>
          

          <button
            onClick={() => addTab()}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="New Tab"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Tab
          </button>

          <button
            onClick={handleFormatSQL}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Format SQL (Ctrl+Shift+F)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Format
          </button>

          <button
            onClick={handleMinifySQL}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Minify SQL - Remove extra whitespace and comments"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
            Minify
          </button>

          <label
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm cursor-pointer"
            title="Automatically format SQL when pasted"
          >
            <input
              type="checkbox"
              checked={formatOnPaste}
              onChange={toggleFormatOnPaste}
              className="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            Format on Paste
          </label>

          <button
            onClick={handleClearResults}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Clear Results"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Clear
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Save current query"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          <button
            onClick={handleAnalyzeQuery}
            disabled={isAnalyzing || !connectionId}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Analyze Query Performance (EXPLAIN)"
          >
            {isAnalyzing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Explaining...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Explain
              </>
            )}
          </button>

          <div className="w-px h-6 bg-gray-300" />

          <motion.button
            onClick={isRunning ? handleCancelQuery : handleExecuteQuery}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-sm transition ${
              isRunning
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isRunning ? "Cancel running query" : "Execute Query (Ctrl+Enter)"}
            whileHover={isRunning ? undefined : { scale: 1.05 }}
            whileTap={isRunning ? undefined : { scale: 0.96 }}
          >
            {isRunning ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Cancel Query</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Run Query
              </>
            )}
          </motion.button>

          {/* AI Assistant Dropdown */}
          <div className="relative">
            <button
              ref={aiMenuRef}
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setAiMenuPos({ left: rect.left, top: rect.bottom + 6 });
                setShowAIMenu(!showAIMenu);
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
                    setShowAIMenu(false);
                    handleExplainSQL();
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
                    setShowAIMenu(false);
                    handleOptimizeSQL();
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
                  onClick={async () => {
                    setShowAIMenu(false);
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
                    setShowAIMenu(false);
                    handleAnalyzeData();
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
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsResultsMaximized((v) => !v)}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title={isResultsMaximized ? 'Exit Full Screen' : 'Full Screen Results'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M8 20H4v-4m12 0h4v4m0-12V4h-4" />
            </svg>
            Full Screen
          </button>

          

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setExportMenuPos({ left: rect.left, top: rect.bottom + 6 });
                setExportFormat(exportFormat ? null : 'csv');
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
              <div className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 py-1 min-w-[160px]" style={{ left: exportMenuPos.left, top: exportMenuPos.top }}>
                <button
                  onClick={() => {
                    exportToCSV();
                    setExportFormat(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 whitespace-nowrap"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    exportToJSON();
                    setExportFormat(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 whitespace-nowrap"
                >
                  Export as JSON
                </button>
              </div>,
              document.body
            )}
          </div>

          <button
            onClick={() => setRightPanel((p) => (p === 'snippets' ? null : 'snippets'))}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Query Snippets"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Snippets
          </button>

          <button
            onClick={() => {
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
            }}
            disabled={tabs.filter(t => t.results && t.results.length > 0).length < 2}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Compare Results"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Compare
          </button>

          <button
            onClick={() => setRightPanel((p) => (p === 'history' ? null : 'history'))}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1.5 text-sm"
            title="Query History"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>

          <button
            onClick={() => setRightPanel((p) => (p === 'saved' ? null : 'saved'))}
            className="px-2 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm"
            title="Saved Queries"
          >
            Saved
          </button>
        </div>
      </div>

      {/* Query Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2 bg-gray-50 dark:bg-gray-800">
        {tabs.map((t, i) => (
          <div key={t.id} className="relative">
            <button
              onClick={() => activateTab(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                setColorPickerTab(colorPickerTab === i ? null : i);
              }}
              className={`px-3 py-1 text-sm rounded flex items-center gap-2 relative ${
                i === activeEditorTab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              title={t.name}
              style={{ borderLeft: t.color ? `3px solid ${t.color}` : undefined }}
            >
              {t.isPinned && (
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenameTabIndex(i);
                }}
                title="Double‑click to rename, right-click for options"
              >
                {t.name}
              </span>
              {tabs.length > 1 && (
                <span
                  onClick={(e) => closeTab(i, e)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 dark:text-gray-500"
                  title="Close tab"
                >
                  ×
                </span>
              )}
            </button>

            {/* Tab Context Menu */}
            {colorPickerTab === i && (
              <div className="color-picker-menu absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 py-1 min-w-[180px]">
                <button
                  onClick={() => togglePinTab(i)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {t.isPinned ? 'Unpin Tab' : 'Pin Tab'}
                </button>
                {t.results && t.results.length > 0 && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                    <button
                      onClick={() => {
                        // Find another tab with results to compare with
                        const otherTabsWithResults = tabs
                          .map((tab, idx) => ({ tab, idx }))
                          .filter(({ tab, idx }) => idx !== i && tab.results && tab.results.length > 0);

                        if (otherTabsWithResults.length === 0) {
                          setError('Need another tab with results to compare');
                          setTimeout(() => setError(null), 3000);
                          setColorPickerTab(null);
                          return;
                        }

                        // Compare with the first available tab
                        setCompareMode({
                          leftTab: i,
                          rightTab: otherTabsWithResults[0].idx
                        });
                        setColorPickerTab(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Compare Results
                    </button>
                  </>
                )}
                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Set Color</div>
                <div className="px-3 py-2 flex flex-wrap gap-2">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTabColor(i, color)}
                      className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {t.color && (
                    <button
                      onClick={() => setTabColor(i, undefined)}
                      className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition flex items-center justify-center text-xs"
                      title="Remove color"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

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
                setTimeout(() => {
                  const editor = editorRef.current;
                  const model = editor?.getModel?.();
                  if (editor && model) {
                    const lineCount = model.getLineCount();
                    const lastLineLength = model.getLineLength(lineCount);
                    editor.setPosition({ lineNumber: lineCount, column: lastLineLength + 1 });
                    editor.focus();
                  }
                }, 0);
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
                  height={editorHeight}
                  defaultLanguage="mysql"
                  value={sql}
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
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Press Ctrl+Enter to run query. Use ; to separate multiple queries. Click the arrow in the gutter to fold/unfold queries.
                </p>
                <NaturalLanguageToSQL
                  connectionId={connectionId}
                  currentDatabase={currentConnection?.database || null}
                  onSQLGenerated={(generatedSQL) => {
                    // Insert generated SQL into current tab
                    setSql(generatedSQL);
                  }}
                />
              </div>
            </>
          )}

          {/* Horizontal resize handle */}
          {!isResultsMaximized && (
            <div
              className={`h-1 cursor-row-resize bg-gray-200 hover:bg-blue-500 ${isResizing ? 'bg-blue-500' : ''}`}
              onMouseDown={() => setIsResizing(true)}
              title="Drag to resize results"
            />
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
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Results</h3>
                {tabs[activeEditorTab]?.executionTime !== undefined && (
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {tabs[activeEditorTab].executionTime}ms
                    </span>
                    {tabs[activeEditorTab]?.rowsAffected !== undefined && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {tabs[activeEditorTab].rowsAffected} row{tabs[activeEditorTab].rowsAffected !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {isRunning && (
                <div className="flex items-center gap-2 text-blue-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-xs">Executing...</span>
                </div>
              )}
            </div>

            {/* Results Content */}
            <div className="flex-1 overflow-auto p-4 min-h-0">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4 animate-shake">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800 dark:text-red-300">Error</h4>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1 font-mono">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleFixSQL}
                      disabled={isFixing || !sql.trim()}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      title="Use AI to analyze and fix this error"
                    >
                      {isFixing ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Fixing...
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" />
                          Fix with AI
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={results.length === 1 ? 'h-full flex flex-col' : 'space-y-4'}
                  >
                    {results.map((result, index) => {
                      // Split SQL by semicolon to get individual statements for each result
                      const sqlStatements = sql.split(';').filter(s => s.trim());
                      const relevantSql = sqlStatements[index] || sql;

                      return (
                        <motion.div
                          key={resultSetIds[index]}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: index * 0.04 }}
                        >
                          <ResultGrid
                            result={result}
                            index={index}
                            fullHeight={results.length === 1}
                            connectionId={connectionId || undefined}
                            sourceSql={relevantSql}
                            isOnlyResult={results.length === 1}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  !error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
        {(rightPanel && !isResultsMaximized) && (
          <div className="w-1/3 min-w-[320px] max-w-[520px] flex-shrink-0 h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto">
            {rightPanel === 'history' && connectionId && (
              <QueryHistoryPanel connectionId={connectionId} onSelectQuery={handleHistorySelect} />
            )}
            {rightPanel === 'saved' && connectionId && (
              <SavedQueriesPanel connectionId={connectionId} onSelectQuery={handleHistorySelect} />
            )}
            {rightPanel === 'snippets' && (
              <QuerySnippetsPanel onSelectSnippet={(sql, name) => {
                // Insert snippet into current tab or create new tab
                setSql(sql);
                setRightPanel(null);
                // Focus the editor
                setTimeout(() => {
                  const editor = editorRef.current;
                  if (editor) {
                    editor.focus();
                  }
                }, 100);
              }} />
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
    </div>
  );
}




