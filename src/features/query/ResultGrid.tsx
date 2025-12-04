import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { QueryResult } from '../../api/query';
import { useTableColumns } from '../../hooks/useDataViewer';
import { useTables } from '../../hooks/useSchema';
import { useConnection } from '../../hooks/useConnections';
import { dataEditingApi } from '../../api/dataEditing';
import DateTimeDisplay, { formatDatetimeToMySQL } from './components/DateTimeDisplay';
import { useQueryGenerator } from './components/QueryGenerator';
import { getTimezoneName } from '../../utils/timezones';
import PivotFullScreenOverlay from './components/PivotFullScreenOverlay';
import ResultTable from './components/ResultTable';
import PivotPanel from './components/PivotPanel';
import ContextMenu from './components/ContextMenu';
import ResultGridHeader from './components/ResultGridHeader';
import { useExportFunctions } from './components/ExportFunctions';
import { useResultTableColumns } from './components/TableColumns';

// Get current time in selected timezone
const getCurrentTimeInTimezone = (timezone?: string): string => {
  if (!timezone || timezone === 'UTC') {
    return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  if (timezone === 'default') {
    // For default, use local browser time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  const now = new Date();
  const match = timezone.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const [sign, tzHours, tzMinutes] = match.slice(1);
  const offsetInMinutes = (parseInt(tzHours) * 60) + parseInt(tzMinutes);

  // Get the current UTC time in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

  // Apply the timezone offset
  const targetTime = new Date(utcTime + (sign === '+' ? offsetInMinutes : -offsetInMinutes) * 60000);

  // Format the date
  const year = targetTime.getFullYear();
  const month = String(targetTime.getMonth() + 1).padStart(2, '0');
  const day = String(targetTime.getDate()).padStart(2, '0');
  const hours = String(targetTime.getHours()).padStart(2, '0');
  const minutes = String(targetTime.getMinutes()).padStart(2, '0');
  const seconds = String(targetTime.getSeconds()).padStart(2, '0');

  // Get timezone name (e.g., "CST/SGT" from "GMT+08:00 (CST/SGT)")
  const tzName = getTimezoneName(timezone);

  // Format: "2025-12-04 21:43:55 (CST/SGT) (+08:00)"
  const tzNamePart = tzName ? `(${tzName}) ` : '';
  const tzOffsetPart = `(${timezone})`;

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${tzNamePart}${tzOffsetPart}`;
};

// Extract table names from SQL query including JOINed tables
function extractTableNames(sql: string): string[] {
  if (!sql) return [];

  const tables = new Set<string>();

  // Match FROM clause - handles `database`.`table` or just `table`
  const fromMatch = sql.match(
    /FROM\s+(?:`?([a-zA-Z0-9_]+)`?\.)?`?([a-zA-Z0-9_]+)`?(?:\s+(?:AS\s+)?`?([a-zA-Z0-9_]+)`?)?/i,
  );
  if (fromMatch) {
    // If database.table format, use database.table, otherwise just table
    const tableName = fromMatch[1] ? `${fromMatch[1]}.${fromMatch[2]}` : fromMatch[2];
    tables.add(tableName);
  }

  // Match all JOIN clauses (INNER JOIN, LEFT JOIN, RIGHT JOIN, etc.)
  // Handles `database`.`table` or just `table`
  const joinRegex =
    /(?:INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN|JOIN)\s+(?:`?([a-zA-Z0-9_]+)`?\.)?`?([a-zA-Z0-9_]+)`?/gi;
  let joinMatch;
  while ((joinMatch = joinRegex.exec(sql)) !== null) {
    // If database.table format, use database.table, otherwise just table
    const tableName = joinMatch[1] ? `${joinMatch[1]}.${joinMatch[2]}` : joinMatch[2];
    tables.add(tableName);
  }

  return Array.from(tables);
}

interface ResultGridProps {
  result: QueryResult;
  index: number;
  fullHeight?: boolean; // when true, grid expands to fill parent
  connectionId?: string;
  sourceSql?: string;
  isOnlyResult?: boolean;
  selectedTimezone?: string; // timezone offset like '+08:00', '-05:00', etc.
}

export default function ResultGrid({
  result,
  index,
  fullHeight = false,
  connectionId,
  sourceSql,
  isOnlyResult,
  selectedTimezone,
}: ResultGridProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | null>(null);
  // Inline edit state for ad-hoc query results (local-only edits)
  const [editable, setEditable] = useState(false);
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [edits, setEdits] = useState<Record<number, Record<string, any>>>({});
  const [focusCell, setFocusCell] = useState<{ row: number; col: string } | null>(null);
  // Refs to avoid recreating column defs on each keystroke
  const editableRef = useRef(editable);
  const editsRef = useRef(edits);
  const isComposingRef = useRef(false);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  useEffect(() => {
    editsRef.current = edits;
  }, [edits]);

  // Update dropdown position when export format changes
  useEffect(() => {
    if (exportFormat && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.right - 160, // Align right edge
      });
    } else {
      setDropdownPosition(null);
    }
  }, [exportFormat]);

  const [saving, setSaving] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowIndex: number;
    columnName: string | null;
    cellValue?: any;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const contextMenuColumnRef = useRef<string | null>(null);
  const contextMenuCellValueRef = useRef<any>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const tableContainerRef2 = useRef<HTMLDivElement>(null);
  const [isCellHovered, setIsCellHovered] = useState<{ row: number; col: string } | null>(null);
  const [canUserEnableEdit, setCanUserEnableEdit] = useState(true);

  // Extract table names from SQL query
  const involvedTables = useMemo(() => {
    return sourceSql ? extractTableNames(sourceSql) : [];
  }, [sourceSql]);

  // Local copy of rows so we can reflect saved changes without re-running query
  const [rows, setRows] = useState<any[]>(result.rows || []);
  // Cache the original sourceSql on mount to prevent it from being overwritten
  const originalSourceSqlRef = useRef<string | undefined>(sourceSql);
  // Current time in selected timezone
  const [currentTimeInTimezone, setCurrentTimeInTimezone] = useState<string>(() => 
    getCurrentTimeInTimezone(selectedTimezone)
  );

  useEffect(() => {
    setRows(result.rows || []);
    setEdits({});
    setRowSelection({});
    setSorting([]);
    // Don't update originalSourceSqlRef here - it should remain stable after mount
  }, [result.rows, result.rowCount, index]);

  // Use cached sourceSql instead of prop to prevent corruption from clipboard operations
  const stableSourceSql = originalSourceSqlRef.current;

  // Update current time every second and when timezone changes
  useEffect(() => {
    // Update immediately when timezone changes
    setCurrentTimeInTimezone(getCurrentTimeInTimezone(selectedTimezone));
    
    // Set up interval to update every second
    const interval = setInterval(() => {
      setCurrentTimeInTimezone(getCurrentTimeInTimezone(selectedTimezone));
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedTimezone]);

  // Pivot / Chart preview
  const [showPivot, setShowPivot] = useState(false);
  const [pivotRow, setPivotRow] = useState<string | null>(null);
  const [pivotCol, setPivotCol] = useState<string | null>(null);
  const [pivotVal, setPivotVal] = useState<string | null>(null);
  const [pivotAgg, setPivotAgg] = useState<'count' | 'sum' | 'avg'>('count');
  const [chartType, setChartType] = useState<'bar' | 'vbar' | 'line' | 'heatmap' | 'pie'>('bar');
  const pivotRef = useRef<HTMLDivElement | null>(null);

  // Export dropdown position for portal rendering
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Pivot options: limit rows/cols for visualization and wrap long labels
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limitN, setLimitN] = useState<number>(20);
  const [wrapLabels, setWrapLabels] = useState(false);
  const [pivotSort, setPivotSort] = useState<'none' | 'desc' | 'asc'>('none');
  const [rotateVBarLabels, setRotateVBarLabels] = useState(true);
  const [showBarValues, setShowBarValues] = useState(false);
  // Pie chart UX options
  const [pieGroupSmall, setPieGroupSmall] = useState(true);
  const [pieMinPercent, setPieMinPercent] = useState<number>(2);
  const [pieMaxCategories, setPieMaxCategories] = useState<number>(20);
  const [hiddenPieLabels, setHiddenPieLabels] = useState<Set<string>>(new Set());
  const [pivotFullScreen, setPivotFullScreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!pivotFullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPivotFullScreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pivotFullScreen]);

  const exportPivotPNG = async () => {
    try {
      const container = pivotRef.current;
      if (!container) return;
      const svgEl = container.querySelector('svg') as SVGSVGElement | null;
      if (!svgEl) return;

      // Determine intrinsic size from viewBox (fallback to current size)
      const vb = svgEl.viewBox?.baseVal;
      const vbWidth =
        vb && vb.width
          ? vb.width
          : svgEl.width?.baseVal?.value || svgEl.getBoundingClientRect().width || 1000;
      const vbHeight =
        vb && vb.height
          ? vb.height
          : svgEl.height?.baseVal?.value || svgEl.getBoundingClientRect().height || 400;

      // Clone the SVG and set explicit size to avoid CSS/layout expansion
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(vbWidth));
      clone.setAttribute('height', String(vbHeight));
      if (!clone.getAttribute('preserveAspectRatio')) {
        clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 1.5));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vbWidth * scale);
        canvas.height = Math.round(vbHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return;
        }
        // Background (light/dark safe)
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? '#111827' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(img, 0, 0, vbWidth, vbHeight);
        canvas.toBlob((png) => {
          if (!png) {
            URL.revokeObjectURL(url);
            return;
          }
          const dl = URL.createObjectURL(png);
          const a = document.createElement('a');
          a.href = dl;
          a.download = `pivot_chart_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(dl);
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    } catch (e) {
      console.error('Failed to export PNG', e);
      alert('Failed to export chart as PNG');
    }
  };
  const allColumns: string[] = useMemo(() => {
    const f = (result as any)?.fields;
    if (Array.isArray(f) && f.length) return f.map((x: any) => x.name);
    const sample = rows[0] || {};
    return Object.keys(sample);
  }, [result, rows]);
  useEffect(() => {
    if (showPivot && allColumns.length) {
      if (!pivotRow) setPivotRow(allColumns[0]);
      if (!pivotCol) setPivotCol(allColumns[1] || allColumns[0]);
      if (!pivotVal) setPivotVal(allColumns[2] || allColumns[1] || allColumns[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPivot, allColumns]);
  const pivotData = useMemo(() => {
    if (!pivotRow || !pivotCol) return null;
    const rowKeys = new Set<string>();
    const colKeys = new Set<string>();
    rows.forEach((r) => {
      rowKeys.add(String(r[pivotRow] ?? ''));
      colKeys.add(String(r[pivotCol] ?? ''));
    });
    const rList = Array.from(rowKeys);
    const cList = Array.from(colKeys);
    const cIndex = new Map(cList.map((c, i) => [c, i]));
    const matrix = new Map<string, number[]>();
    rList.forEach((rk) => matrix.set(rk, new Array(cList.length).fill(0)));
    const counts = new Map<string, number[]>();
    if (pivotAgg === 'avg') rList.forEach((rk) => counts.set(rk, new Array(cList.length).fill(0)));
    rows.forEach((r) => {
      const rk = String(r[pivotRow] ?? '');
      const ck = String(r[pivotCol] ?? '');
      const ci = cIndex.get(ck);
      if (ci == null) return;
      const arr = matrix.get(rk)!;
      if (pivotAgg === 'count') {
        arr[ci] = (arr[ci] || 0) + 1;
      } else {
        const v = Number(pivotVal ? r[pivotVal] : 0) || 0;
        arr[ci] = (arr[ci] || 0) + v;
        if (pivotAgg === 'avg') {
          const cArr = counts.get(rk)!;
          cArr[ci] = (cArr[ci] || 0) + 1;
        }
      }
    });
    if (pivotAgg === 'avg') {
      rList.forEach((rk) => {
        const arr = matrix.get(rk)!;
        const cArr = counts.get(rk)!;
        arr.forEach((v, i) => {
          arr[i] = cArr[i] ? v / cArr[i] : 0;
        });
      });
    }
    const rowTotals = rList.map((rk) =>
      (matrix.get(rk) || []).reduce((a, b) => a + (Number(b) || 0), 0),
    );
    const maxVal = Math.max(0, ...rList.flatMap((rk) => matrix.get(rk) || []));

    const colTotals = cList.map((_, ci) =>
      rList.reduce((sum, rk) => sum + (Number((matrix.get(rk) || [])[ci]) || 0), 0),
    );
    const maxRowTotal = Math.max(0, ...rowTotals);
    const maxColTotal = Math.max(0, ...colTotals);
    return { rList, cList, matrix, rowTotals, colTotals, maxVal, maxRowTotal, maxColTotal };
  }, [rows, pivotRow, pivotCol, pivotVal, pivotAgg]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check if there's a text selection in the document
  const hasTextSelection = () => {
    const selection = window.getSelection();
    return selection && selection.toString().length > 0;
  };

  // Handle cell click - only for selection and context menu, not for editing
  const handleCellClick = (rowIndex: number, colName: string, event: React.MouseEvent) => {
    // Don't trigger any edit mode - only focus cell for copy operations
    if (!editableRef.current) {
      setFocusCell({ row: rowIndex, col: colName });
    }
  };

  // Function to enable edit mode via button click
  const enableEditMode = () => {
    setEditable(true);
    setCanUserEnableEdit(false);
    setToast({
      message: 'Edit mode enabled. Click cells to modify values.',
      type: 'info',
    });
  };

  // Function to exit edit mode
  const exitEditMode = () => {
    setEditable(false);
    setCanUserEnableEdit(true);
    setFocusCell(null);
    setToast({
      message: 'Exited edit mode. Click "Enable Editing" to modify data.',
      type: 'info',
    });
  };

  // Adjust context menu position to prevent overflow
  useEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menu = contextMenuRef.current;
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = contextMenu;

      // Check if menu overflows right edge
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
      }

      // Check if menu overflows bottom edge
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
      }

      // Ensure menu doesn't go off left/top edges
      x = Math.max(10, x);
      y = Math.max(10, y);

      // Update position if changed
      if (x !== contextMenu.x || y !== contextMenu.y) {
        setContextMenu((prev) => (prev ? { ...prev, x, y } : null));
      }
    }
  }, [contextMenu]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        contextMenuColumnRef.current = null;
        contextMenuCellValueRef.current = null;
      }
    };

    // Add listener after a small delay to prevent immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  // Note: Inline edit mode stays enabled once activated
  // Users can manually disable it if needed

  // Try to extract a simple target table from the SQL
  const parseSimpleFrom = (
    sql?: string,
  ): { database: string | null; table: string | null } | null => {
    if (!sql) return null;
    const s0 = sql.replace(/\/\*[^]*?\*\//g, '').replace(/--.*$/gm, '');
    const s = s0.toLowerCase();
    if (/(\bjoin\b|\bunion\b|\bwith\b)/.test(s)) return null;
    if (/from\s*\(/.test(s)) return null; // subquery
    const m = /from\s+((`[^`]+`|\w+)\.)?(`[^`]+`|\w+)/i.exec(s0);
    if (!m) return null;
    const dbRaw = m[2];
    const tblRaw = m[3];
    const unquote = (x?: string | null) => (x ? x.replace(/^`|`$/g, '') : x);
    return { database: unquote(dbRaw) || null, table: unquote(tblRaw) || null };
  };

  const target = useMemo(() => parseSimpleFrom(stableSourceSql), [stableSourceSql, index]);
  const targetDb = target?.database || null;
  const targetTable = target?.table || null;

  // Allow user override for table when SQL isn't fully qualified
  const [overrideDb, setOverrideDb] = useState<string | null>(null);
  const [overrideTable, setOverrideTable] = useState<string | null>(null);
  useEffect(() => {
    // Reset overrides when target changes
    setOverrideDb(null);
    setOverrideTable(null);
  }, [targetDb, targetTable]);

  // Default DB comes from the connection when not specified in SQL
  const { data: currentConnection } = useConnection(connectionId || null);
  const connectionDefaultDb = currentConnection?.database || null;
  const effectiveDb = targetDb || connectionDefaultDb || overrideDb || null;
  const effectiveTable = overrideTable || targetTable;

  const { data: tbls } = useTables(connectionId || null, effectiveDb || null);
  const { data: columnsInfo } = useTableColumns(
    connectionId || null,
    effectiveDb || null,
    effectiveTable || null,
  );
  const columnsMeta = columnsInfo?.columns || [];
  const pkColumns = useMemo(
    () => columnsMeta.filter((c: any) => c.key === 'PRI').map((c: any) => c.name),
    [columnsMeta],
  );
  const hasChanges = useMemo(
    () => Object.values(edits).some((c) => c && Object.keys(c).length > 0),
    [edits],
  );

  const canSave =
    !!connectionId &&
    result.type === 'select' &&
    !!effectiveDb &&
    !!effectiveTable &&
    Array.isArray(rows) &&
    rows.length > 0 &&
    hasChanges; // must have edits

  const canSaveWithPK = canSave && pkColumns.length > 0;

  // Use the QueryGenerator hook for query generation functions
  const { generateUpdateQuery, generateCreateTableAs, generateInsertQuery, generateDeleteQuery } = useQueryGenerator({
    rows,
    result,
    effectiveDb,
    effectiveTable,
    pkColumns,
    rowSelection,
    selectedTimezone,
    onToast: (toast) => setToast(toast),
  });

  // Use the ExportFunctions hook for export functionality
  const { exportToCSV, exportToJSON, exportToExcel } = useExportFunctions({
    result,
    rows,
    selectedTimezone,
  });

  // Use the TableColumns hook for column definitions and save functionality
  const { columns, handleSave } = useResultTableColumns({
    result,
    rows,
    columnsMeta,
    selectedTimezone,
    editable,
    edits,
    setEdits,
    focusCell,
    setRows,
    setEditable,
    setCanUserEnableEdit,
    setFocusCell,
    setToast,
    setSaving,
    connectionId,
    effectiveDb,
    effectiveTable,
    pkColumns,
    canSave,
  });

  // Generate raw MySQL CLI-style output
  const generateRawQueryResult = useCallback(async () => {
    if (result.type !== 'select' || !result.fields || !rows) return;

    // Calculate column widths (max of header length and data length)
    const columnWidths: Record<string, number> = {};
    result.fields.forEach((field) => {
      columnWidths[field.name] = field.name.length;
    });

    rows.forEach((row) => {
      result.fields!.forEach((field) => {
        const value = row[field.name];
        const strValue = value === null ? 'NULL' : formatDatetimeToMySQL(value, selectedTimezone);
        columnWidths[field.name] = Math.max(columnWidths[field.name], strValue.length);
      });
    });

    // Build the border line
    const buildBorderLine = () => {
      const parts = result.fields!.map((field) => '-'.repeat(columnWidths[field.name] + 2));
      return '+' + parts.join('+') + '+';
    };

    // Build header row
    const buildHeaderRow = () => {
      const parts = result.fields!.map((field) => {
        const padding = columnWidths[field.name] - field.name.length;
        return ' ' + field.name + ' '.repeat(padding) + ' ';
      });
      return '|' + parts.join('|') + '|';
    };

    // Format value for MySQL output
    const formatValueForMySQL = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      return formatDatetimeToMySQL(value, selectedTimezone);
    };

    // Build data row
    const buildDataRow = (row: any) => {
      const parts = result.fields!.map((field) => {
        const value = row[field.name];
        const strValue = formatValueForMySQL(value);
        const padding = columnWidths[field.name] - strValue.length;
        return ' ' + strValue + ' '.repeat(padding) + ' ';
      });
      return '|' + parts.join('|') + '|';
    };

    // Reconstruct the SQL query and remove comments
    let sqlQuery = stableSourceSql || 'SELECT ...';
    // Remove single-line comments (-- ...)
    sqlQuery = sqlQuery.replace(/--.*$/gm, '');
    // Remove multi-line comments (/* ... */)
    sqlQuery = sqlQuery.replace(/\/\*[\s\S]*?\*\//g, '');
    // Clean up extra whitespace and newlines
    sqlQuery = sqlQuery.replace(/\s+/g, ' ').trim();

    // Build the complete output
    const lines: string[] = [];
    lines.push(`mysql> ${sqlQuery};`);
    lines.push(buildBorderLine());
    lines.push(buildHeaderRow());
    lines.push(buildBorderLine());
    rows.forEach((row) => {
      lines.push(buildDataRow(row));
    });
    lines.push(buildBorderLine());
    lines.push(
      `${rows.length} row${rows.length === 1 ? '' : 's'} in set (${(result.executionTime / 1000).toFixed(2)} sec)`,
    );
    lines.push('');

    const output = lines.join('\n');

    await navigator.clipboard.writeText(output);
    setToast({
      message: `Copied raw query result to clipboard`,
      type: 'success',
    });
  }, [result, rows, stableSourceSql]);

  // Copy cell value
  const copyCellValue = useCallback(async () => {
    const cellValue = contextMenuCellValueRef.current;
    if (cellValue === null || cellValue === undefined) {
      await navigator.clipboard.writeText('NULL');
    } else {
      await navigator.clipboard.writeText(formatDatetimeToMySQL(cellValue, selectedTimezone));
    }
    setToast({
      message: `Copied cell value to clipboard`,
      type: 'success',
    });
  }, []);

  // Copy column names
  const copyColumnNames = useCallback(async () => {
    if (!result.fields) return;
    const columnNames = result.fields.map((f) => f.name).join(', ');
    await navigator.clipboard.writeText(columnNames);
    setToast({
      message: `Copied ${result.fields.length} column names to clipboard`,
      type: 'success',
    });
  }, [result.fields]);

  // Copy as JSON
  const copyAsJSON = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const dataToExport =
      selectedIndices.length > 0 ? selectedIndices.map((idx) => rows[idx]).filter(Boolean) : rows;

    // Format datetime values in each row
    const formattedData = dataToExport.map((row) => {
      const formattedRow: any = {};
      Object.keys(row).forEach((key) => {
        formattedRow[key] = formatDatetimeToMySQL(row[key], selectedTimezone);
      });
      return formattedRow;
    });

    const json = JSON.stringify(formattedData, null, 2);
    await navigator.clipboard.writeText(json);
    setToast({
      message: `Copied ${dataToExport.length} ${dataToExport.length === 1 ? 'row' : 'rows'} as JSON to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows]);

  // Copy as TSV
  const copyAsTSV = useCallback(async () => {
    if (!result.fields) return;

    const selectedIndices = Object.keys(rowSelection).map(Number);
    const dataToExport =
      selectedIndices.length > 0 ? selectedIndices.map((idx) => rows[idx]).filter(Boolean) : rows;

    // Header row
    const header = result.fields.map((f) => f.name).join('\t');

    // Data rows
    const dataRows = dataToExport.map((row) => {
      return result
        .fields!.map((field) => {
          const value = row[field.name];
          if (value === null || value === undefined) return 'NULL';
          // Format datetime values
          return formatDatetimeToMySQL(value);
          return String(value);
        })
        .join('\t');
    });

    const tsv = [header, ...dataRows].join('\n');
    await navigator.clipboard.writeText(tsv);
    setToast({
      message: `Copied ${dataToExport.length} ${dataToExport.length === 1 ? 'row' : 'rows'} as TSV to clipboard`,
      type: 'success',
    });
  }, [result.fields, rowSelection, rows]);

  

  

  const table = useReactTable({
    data: rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    enableSorting: true,
    enableMultiSort: true,
  });

  

  // Render based on query type
  if (result.type === 'select') {
    return (
      <div
        className={`${fullHeight ? 'flex flex-col h-full min-h-0' : ''} border border-gray-200/40 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-900`}
      >
        {/* Header with stats and export - sticky buttons */}
        <ResultGridHeader
          index={index}
          result={result}
          involvedTables={involvedTables}
          selectedTimezone={selectedTimezone}
          currentTimeInTimezone={currentTimeInTimezone}
          editable={editable}
          exitEditMode={exitEditMode}
          effectiveDb={effectiveDb}
          effectiveTable={effectiveTable}
          enableEditMode={enableEditMode}
          handleSave={handleSave}
          canSaveWithPK={canSaveWithPK}
          saving={saving}
          hasChanges={hasChanges}
          pkColumns={pkColumns}
          setShowPivot={setShowPivot}
          showPivot={showPivot}
          exportButtonRef={exportButtonRef}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          dropdownPosition={dropdownPosition}
          exportToCSV={exportToCSV}
          exportToJSON={exportToJSON}
          exportToExcel={exportToExcel}
        />

        {/* Table */}
        <ResultTable
          table={table}
          rows={rows}
          fullHeight={fullHeight}
          editable={editable}
          isCellHovered={isCellHovered}
          setIsCellHovered={setIsCellHovered}
          setContextMenu={setContextMenu}
          handleCellClick={handleCellClick}
          contextMenuColumnRef={contextMenuColumnRef}
          contextMenuCellValueRef={contextMenuCellValueRef}
          tableContainerRef2={tableContainerRef2}
        />

        {/* Pivot Panel */}
        {showPivot && pivotData && (
          <PivotPanel
            pivotData={pivotData}
            allColumns={allColumns}
            pivotRow={pivotRow}
            setPivotRow={setPivotRow}
            pivotCol={pivotCol}
            setPivotCol={setPivotCol}
            pivotVal={pivotVal}
            setPivotVal={setPivotVal}
            pivotAgg={pivotAgg}
            setPivotAgg={setPivotAgg}
            chartType={chartType}
            setChartType={setChartType}
            exportPivotPNG={exportPivotPNG}
            setPivotFullScreen={setPivotFullScreen}
            pivotSort={pivotSort}
            setPivotSort={setPivotSort}
            limitEnabled={limitEnabled}
            setLimitEnabled={setLimitEnabled}
            pieGroupSmall={pieGroupSmall}
            setPieGroupSmall={setPieGroupSmall}
            pieMinPercent={pieMinPercent}
            setPieMinPercent={setPieMinPercent}
            pieMaxCategories={pieMaxCategories}
            setPieMaxCategories={setPieMaxCategories}
            hiddenPieLabels={hiddenPieLabels}
            setHiddenPieLabels={setHiddenPieLabels}
            limitN={limitN}
            setLimitN={setLimitN}
            wrapLabels={wrapLabels}
            setWrapLabels={setWrapLabels}
            rotateVBarLabels={rotateVBarLabels}
            setRotateVBarLabels={setRotateVBarLabels}
            showBarValues={showBarValues}
            setShowBarValues={setShowBarValues}
            pivotRef={pivotRef}
          />
        )}

        {/* Pivot Full Screen Overlay */}
        {showPivot && pivotData && pivotFullScreen && (
          <PivotFullScreenOverlay
            pivotData={pivotData}
            allColumns={allColumns}
            pivotRow={pivotRow}
            setPivotRow={setPivotRow}
            pivotCol={pivotCol}
            setPivotCol={setPivotCol}
            pivotVal={pivotVal}
            setPivotVal={setPivotVal}
            pivotAgg={pivotAgg}
            setPivotAgg={setPivotAgg}
            chartType={chartType}
            setChartType={setChartType}
            pivotSort={pivotSort}
            setPivotSort={setPivotSort}
            limitEnabled={limitEnabled}
            setLimitEnabled={setLimitEnabled}
            limitN={limitN}
            setLimitN={setLimitN}
            wrapLabels={wrapLabels}
            setWrapLabels={setWrapLabels}
            rotateVBarLabels={rotateVBarLabels}
            setRotateVBarLabels={setRotateVBarLabels}
            showBarValues={showBarValues}
            setShowBarValues={setShowBarValues}
            pieGroupSmall={pieGroupSmall}
            setPieGroupSmall={setPieGroupSmall}
            pieMinPercent={pieMinPercent}
            setPieMinPercent={setPieMinPercent}
            pieMaxCategories={pieMaxCategories}
            setPieMaxCategories={setPieMaxCategories}
            exportPivotPNG={exportPivotPNG}
            setPivotFullScreen={setPivotFullScreen}
          />
        )}

        {/* Context Menu */}
        <ContextMenu
          contextMenu={contextMenu}
          contextMenuRef={contextMenuRef}
          contextMenuColumnRef={contextMenuColumnRef}
          contextMenuCellValueRef={contextMenuCellValueRef}
          rowSelection={rowSelection}
          setContextMenu={setContextMenu}
          copyCellValue={copyCellValue}
          generateUpdateQuery={generateUpdateQuery}
          generateInsertQuery={generateInsertQuery}
          generateDeleteQuery={generateDeleteQuery}
          generateCreateTableAs={generateCreateTableAs}
          copyColumnNames={copyColumnNames}
          copyAsJSON={copyAsJSON}
          copyAsTSV={copyAsTSV}
          generateRawQueryResult={generateRawQueryResult}
        />

        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-green-500'
                : toast.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For non-SELECT queries (INSERT, UPDATE, DELETE, DDL)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-sm dark:text-gray-200">
          {result.type.toUpperCase()} Result {index + 1}
        </span>
      </div>

      <div className="p-4">
        <div className="space-y-2 text-sm">
          {result.type === 'insert' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Affected Rows:</span>
                <span className="font-semibold dark:text-gray-200">{result.affectedRows || 0}</span>
              </div>
              {result.insertId !== undefined && result.insertId > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Insert ID:</span>
                  <span className="font-semibold dark:text-gray-200">{result.insertId}</span>
                </div>
              )}
            </>
          )}

          {result.type === 'update' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rows Matched:</span>
                <span className="font-semibold dark:text-gray-200">{result.affectedRows || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rows Changed:</span>
                <span className="font-semibold dark:text-gray-200">{result.changedRows || 0}</span>
              </div>
            </>
          )}

          {result.type === 'delete' && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rows Deleted:</span>
              <span className="font-semibold dark:text-gray-200">{result.affectedRows || 0}</span>
            </div>
          )}

          {result.type === 'ddl' && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">Success</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Execution Time:</span>
            <span className="font-semibold dark:text-gray-200">{result.executionTime}ms</span>
          </div>

          {result.warningCount !== undefined && result.warningCount > 0 && (
            <div className="flex justify-between text-yellow-600 dark:text-yellow-500">
              <span>Warnings:</span>
              <span className="font-semibold">{result.warningCount}</span>
            </div>
          )}

          {result.message && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Message:</span>
              <p className="mt-1 text-gray-700 dark:text-gray-300 font-mono text-xs">
                {result.message}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">Query executed successfully</span>
          </div>
        </div>
      </div>
    </div>
  );
}
