import { QueryResult } from '../../../api/query';

export type EditorTab = {
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

/**
 * Generate a unique tab ID
 */
export const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Load saved tabs from localStorage
 */
export const loadSavedTabs = (): EditorTab[] => {
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
    {
      id: generateTabId(),
      name: 'Tab 1',
      sql: '-- Write your SQL query here\nSELECT 1;',
      results: null,
      error: null,
      isRunning: false,
      isPinned: false,
    },
  ];
};

/**
 * Save tabs to localStorage (excluding runtime state)
 */
export const saveTabs = (tabs: EditorTab[]): void => {
  try {
    // Only save essential data (not runtime state)
    const toSave = tabs.map(({ id, name, sql, isPinned, color }) => ({
      id,
      name,
      sql,
      isPinned,
      color,
    }));
    localStorage.setItem('sqlEditorTabs', JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save tabs:', e);
  }
};

/**
 * Create a new editor tab
 */
export const createNewTab = (
  existingTabs: EditorTab[],
  initialSql?: string,
  name?: string
): EditorTab => {
  const newIndex = existingTabs.length;
  return {
    id: generateTabId(),
    name: name || `Tab ${newIndex + 1}`,
    sql: initialSql ?? '-- Write your SQL query here\nSELECT 1;\n',
    results: null,
    error: null,
    isRunning: false,
  };
};

/**
 * Create a default tab (used when all tabs are closed)
 */
export const createDefaultTab = (): EditorTab => {
  return {
    id: generateTabId(),
    name: 'Tab 1',
    sql: '-- Write your SQL query here\nSELECT 1;\n',
    results: null,
    error: null,
    isRunning: false,
    isPinned: false,
  };
};

/**
 * Load active tab index from localStorage
 */
export const loadActiveTabIndex = (): number => {
  try {
    const saved = localStorage.getItem('sqlEditorActiveTab');
    return saved ? parseInt(saved, 10) : 0;
  } catch (e) {
    console.error('Failed to load active tab index:', e);
    return 0;
  }
};

/**
 * Save active tab index to localStorage
 */
export const saveActiveTabIndex = (index: number): void => {
  try {
    localStorage.setItem('sqlEditorActiveTab', String(index));
  } catch (e) {
    console.error('Failed to save active tab:', e);
  }
};

/**
 * Duplicate an existing tab
 */
export const duplicateTab = (tab: EditorTab, existingTabs: EditorTab[]): EditorTab => {
  return {
    ...tab,
    id: generateTabId(),
    name: `${tab.name} (Copy)`,
    results: null,
    error: null,
    isRunning: false,
  };
};
