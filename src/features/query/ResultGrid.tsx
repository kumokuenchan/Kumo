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

  useEffect(() => {
    setRows(result.rows || []);
    setEdits({});
    setRowSelection({});
    setSorting([]);
    // Don't update originalSourceSqlRef here - it should remain stable after mount
  }, [result.rows, result.rowCount, index]);

  // Use cached sourceSql instead of prop to prevent corruption from clipboard operations
  const stableSourceSql = originalSourceSqlRef.current;

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

  // Generate UPDATE query for selected rows
  const generateUpdateQuery = useCallback(
    (targetColumn: string) => {
      const selectedIndices = Object.keys(rowSelection).map(Number);
      if (selectedIndices.length === 0) return;

      const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
      if (!effectiveTable || selectedRowData.length === 0) return;

      if (!targetColumn) return;

      const queries: string[] = [];

      selectedRowData.forEach((row) => {
        const tableName = effectiveDb
          ? `\`${effectiveDb}\`.\`${effectiveTable}\``
          : `\`${effectiveTable}\``;

        // Build SET clause (only the target column)
        const colValue = row[targetColumn];
        const formattedColValue =
          colValue === null || colValue === undefined
            ? 'NULL'
            : typeof colValue === 'string'
              ? `'${formatDatetimeToMySQL(colValue, selectedTimezone).replace(/'/g, "''")}'`
              : formatDatetimeToMySQL(colValue, selectedTimezone);
        const setClause = `\`${targetColumn}\` = ${formattedColValue}`;

        // Build WHERE clause (using PKs or all columns if no PK)
        let whereClause = '';
        if (pkColumns.length > 0) {
          whereClause = pkColumns
            .map((pk) => {
              const pkValue = row[pk];
              const formattedPkValue =
                pkValue === null || pkValue === undefined
                  ? 'NULL'
                  : typeof pkValue === 'string'
                    ? `'${formatDatetimeToMySQL(pkValue, selectedTimezone).replace(/'/g, "''")}'`
                    : formatDatetimeToMySQL(pkValue, selectedTimezone);
              return `\`${pk}\` = ${formattedPkValue}`;
            })
            .join(' AND ');
        } else {
          // No PK, use all columns
          whereClause =
            result.fields
              ?.map((f) => {
                const fieldValue = row[f.name];
                const formattedFieldValue =
                  fieldValue === null || fieldValue === undefined
                    ? 'NULL'
                    : typeof fieldValue === 'string'
                      ? `'${formatDatetimeToMySQL(fieldValue, selectedTimezone).replace(/'/g, "''")}'`
                      : formatDatetimeToMySQL(fieldValue, selectedTimezone);
                return `\`${f.name}\` = ${formattedFieldValue}`;
              })
              .join(' AND ') || '';
        }

        queries.push(`UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`);
      });

      const finalQuery = queries.join('\n');

      // Copy to clipboard synchronously
      navigator.clipboard
        .writeText(finalQuery)
        .then(() => {
          setToast({
            message: `Copied ${queries.length} UPDATE ${queries.length === 1 ? 'query' : 'queries'} for column '${targetColumn}' to clipboard`,
            type: 'success',
          });
        })
        .catch(() => {
          setToast({
            message: `Failed to copy to clipboard`,
            type: 'error',
          });
        });
    },
    [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields, index],
  );

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

  // Generate CREATE TABLE AS
  const generateCreateTableAs = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const sourceTable = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    // Build WHERE clause based on PKs
    let whereClause = '';
    if (pkColumns.length === 1) {
      const pkName = pkColumns[0];
      const pkValues = selectedRowData.map((row) => {
        const pkValue = row[pkName];
        return pkValue === null || pkValue === undefined
          ? 'NULL'
          : typeof pkValue === 'string'
            ? `'${pkValue.replace(/'/g, "''")}'`
            : pkValue;
      });
      whereClause = `WHERE \`${pkName}\` IN (${pkValues.join(', ')})`;
    } else if (pkColumns.length > 0) {
      // Composite primary key
      const conditions = selectedRowData.map((row) => {
        const pkConditions = pkColumns
          .map((pk) => {
            const pkValue = row[pk];
            const formattedValue =
              pkValue === null || pkValue === undefined
                ? 'NULL'
                : typeof pkValue === 'string'
                  ? `'${pkValue.replace(/'/g, "''")}'`
                  : pkValue;
            return `\`${pk}\` = ${formattedValue}`;
          })
          .join(' AND ');
        return `(${pkConditions})`;
      });
      whereClause = `WHERE ${conditions.join(' OR ')}`;
    } else {
      // No PK - use all columns
      const conditions = selectedRowData.map((row) => {
        const allConditions =
          result.fields
            ?.map((f) => {
              const value = row[f.name];
              const formattedValue =
                value === null || value === undefined
                  ? 'NULL'
                  : typeof value === 'string'
                    ? `'${value.replace(/'/g, "''")}'`
                    : value;
              return `\`${f.name}\` = ${formattedValue}`;
            })
            .join(' AND ') || '';
        return `(${allConditions})`;
      });
      whereClause = `WHERE ${conditions.join(' OR ')}`;
    }

    const createTableQuery = `CREATE TABLE new_table AS\nSELECT * FROM ${sourceTable}\n${whereClause};`;

    await navigator.clipboard.writeText(createTableQuery);
    setToast({
      message: `Copied CREATE TABLE AS query to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields]);

  // Generate INSERT query for selected rows
  const generateInsertQuery = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const tableName = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    // Get all column names from the first row
    const columnNames = result.fields?.map((f) => f.name) || [];
    const columnsClause = columnNames.map((col) => `\`${col}\``).join(', ');

    // Build VALUES clauses for each row
    const valuesClauses = selectedRowData.map((row) => {
      const values = columnNames.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          return `'${formatDatetimeToMySQL(value, selectedTimezone).replace(/'/g, "''")}'`;
        } else {
          return formatDatetimeToMySQL(value, selectedTimezone);
        }
      });
      return `(${values.join(', ')})`;
    });

    // Generate single INSERT with multiple VALUES
    const insertQuery = `INSERT INTO ${tableName} (${columnsClause}) VALUES\n${valuesClauses.join(',\n')};`;

    await navigator.clipboard.writeText(insertQuery);
    setToast({
      message: `Copied INSERT query for ${selectedRowData.length} ${selectedRowData.length === 1 ? 'row' : 'rows'} to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, result.fields]);

  // Generate DELETE query for selected rows
  const generateDeleteQuery = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const tableName = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    let deleteQuery = '';

    // If we have a single primary key, use IN clause
    if (pkColumns.length === 1) {
      const pkName = pkColumns[0];
      const pkValues = selectedRowData.map((row) => {
        const pkValue = row[pkName];
        return pkValue === null || pkValue === undefined
          ? 'NULL'
          : typeof pkValue === 'string'
            ? `'${pkValue.replace(/'/g, "''")}'`
            : pkValue;
      });
      deleteQuery = `DELETE FROM ${tableName} WHERE \`${pkName}\` IN (${pkValues.join(', ')});`;
    }
    // For composite primary keys or no primary key, generate individual WHERE clauses with OR
    else {
      const whereClauses: string[] = [];

      selectedRowData.forEach((row) => {
        if (pkColumns.length > 0) {
          // Composite primary key
          const conditions = pkColumns
            .map((pk) => {
              const pkValue = row[pk];
              const formattedPkValue =
                pkValue === null || pkValue === undefined
                  ? 'NULL'
                  : typeof pkValue === 'string'
                    ? `'${pkValue.replace(/'/g, "''")}'`
                    : pkValue;
              return `\`${pk}\` = ${formattedPkValue}`;
            })
            .join(' AND ');
          whereClauses.push(`(${conditions})`);
        } else {
          // No PK, use all columns
          const conditions =
            result.fields
              ?.map((f) => {
                const fieldValue = row[f.name];
                const formattedFieldValue =
                  fieldValue === null || fieldValue === undefined
                    ? 'NULL'
                    : typeof fieldValue === 'string'
                      ? `'${fieldValue.replace(/'/g, "''")}'`
                      : fieldValue;
                return `\`${f.name}\` = ${formattedFieldValue}`;
              })
              .join(' AND ') || '';
          whereClauses.push(`(${conditions})`);
        }
      });

      deleteQuery = `DELETE FROM ${tableName} WHERE ${whereClauses.join(' OR ')};`;
    }

    await navigator.clipboard.writeText(deleteQuery);
    setToast({
      message: `Copied DELETE query for ${selectedRowData.length} ${selectedRowData.length === 1 ? 'row' : 'rows'} to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields, index]);

  // Generate columns from fields
  const columns: ColumnDef<any>[] = useMemo(() => {
    if (result.type === 'select' && result.fields) {
      return result.fields.map((field) => {
        // Check if this is a datetime column
        const isDateTimeColumn = /datetime|timestamp/i.test(field.type || '');

        return {
          accessorKey: field.name,
          header: () => (
            <div className="flex items-center gap-1">
              <span className="font-bold">{field.name}</span>
              {field.key === 'PRI' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border dark:border-yellow-700/30 px-1 rounded">
                  PK
                </span>
              )}
              {field.key === 'MUL' && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-slate-700/40 dark:text-gray-100 dark:border dark:border-slate-600/60 px-1 rounded">
                  FK
                </span>
              )}
              {isDateTimeColumn && selectedTimezone && selectedTimezone !== 'UTC' && (
                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200 px-1 rounded">
                  {selectedTimezone}
                </span>
              )}
            </div>
          ),
          cell: (info) => {
            const rowIndex = info.row.index;
            const colName = String(info.column.id);
            const original = info.getValue();
            const edited = editsRef.current[rowIndex]?.[colName];
            const value = edited !== undefined ? edited : original;
            const dirty = Object.prototype.hasOwnProperty.call(
              editsRef.current[rowIndex] || {},
              colName,
            );

            if (!editableRef.current) {
              if (value === null) {
                return <span className="text-gray-400 italic">NULL</span>;
              }
              // Check for string date values (ISO format from backend)
              if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                // Convert ISO format to MySQL format
                return <DateTimeDisplay value={value} timezone={selectedTimezone} />;
              }
              if (value instanceof Date) {
                // Format date to YYYY-MM-DD HH:MM:SS (MySQL format)
                return <DateTimeDisplay value={value} timezone={selectedTimezone} />;
              }
              if (typeof value === 'object') {
                return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
              }
              return <span>{String(value)}</span>;
            }

            // Decide editor type using schema when available; fall back to runtime type
            const colInfo = (columnsMeta as any[]).find?.((c: any) => c.name === colName);
            const colType = String(colInfo?.type || '').toLowerCase();
            const isBoolean = /tinyint\(1\)|\bbool\b|\bboolean\b/.test(colType);
            const isNumeric =
              /int|decimal|float|double|numeric|bigint|smallint|mediumint|real/.test(colType) ||
              (typeof original === 'number' && Number.isFinite(original));
            const inputClass = `w-full border rounded px-2 py-1 text-sm ${dirty ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}`;

            if (isBoolean) {
              const checked = Boolean(value);
              return (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    key={`chk-${rowIndex}-${colName}`}
                    autoFocus={focusCell?.row === rowIndex && focusCell?.col === colName}
                    type="checkbox"
                    className="w-4 h-4"
                    checked={checked}
                    onChange={(e) => {
                      const v = e.target.checked ? 1 : 0;
                      setEdits((prev) => {
                        const next = { ...prev } as Record<number, Record<string, any>>;
                        const row = { ...(next[rowIndex] || {}) } as Record<string, any>;
                        row[colName] = v;
                        next[rowIndex] = row;
                        editsRef.current = next;
                        return next;
                      });
                    }}
                  />
                  {colInfo?.nullable && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                      onClick={() =>
                        setEdits((prev) => {
                          const next = { ...prev } as Record<number, Record<string, any>>;
                          const row = { ...(next[rowIndex] || {}) } as Record<string, any>;
                          row[colName] = null;
                          next[rowIndex] = row;
                          editsRef.current = next;
                          return next;
                        })
                      }
                      title="Set NULL"
                    >
                      NULL
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  key={`inp-${rowIndex}-${colName}`}
                  autoFocus={focusCell?.row === rowIndex && focusCell?.col === colName}
                  type="text"
                  inputMode={isNumeric ? 'decimal' : 'text'}
                  className={inputClass}
                  value={typeof value === 'number' && isNaN(value) ? '' : (value ?? '')}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    const raw = e.currentTarget.value;
                    const v = isNumeric ? (raw === '' ? '' : Number(raw)) : raw;
                    setEdits((prev) => {
                      const next = { ...prev } as Record<number, Record<string, any>>;
                      const row = { ...(next[rowIndex] || {}) } as Record<string, any>;
                      row[colName] = v;
                      next[rowIndex] = row;
                      editsRef.current = next;
                      return next;
                    });
                  }}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = isComposingRef.current
                      ? raw
                      : isNumeric
                        ? raw === ''
                          ? ''
                          : Number(raw)
                        : raw;
                    setEdits((prev) => {
                      const next = { ...prev } as Record<number, Record<string, any>>;
                      const row = { ...(next[rowIndex] || {}) } as Record<string, any>;
                      row[colName] = v;
                      next[rowIndex] = row;
                      editsRef.current = next;
                      return next;
                    });
                  }}
                />
                {colInfo?.nullable && (
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                    onClick={() =>
                      setEdits((prev) => {
                        const next = { ...prev } as Record<number, Record<string, any>>;
                        const row = { ...(next[rowIndex] || {}) } as Record<string, any>;
                        row[colName] = null;
                        next[rowIndex] = row;
                        editsRef.current = next;
                        return next;
                      })
                    }
                    title="Set NULL"
                  >
                    NULL
                  </button>
                )}
              </div>
            );
          },
        };
      });
    }
    return [];
  }, [result.fields, columnsMeta]);

  // Build and persist changes
  const handleSave = async () => {
    if (!canSave || !connectionId || !effectiveDb || !effectiveTable) return;

    // Disallow PK edits in this mode
    for (const [rowIdxStr, changes] of Object.entries(edits)) {
      for (const pk of pkColumns) {
        if (Object.prototype.hasOwnProperty.call(changes, pk)) {
          setToast({
            message: 'Saving primary key changes is not supported here. Use the Data tab.',
            type: 'error',
          });
          return;
        }
      }
    }

    // Prepare batch updates
    const updates: Array<{
      key: Record<string, any>;
      changes: Record<string, any>;
      rowIndex: number;
    }> = [];
    for (const [rowIdxStr, changes] of Object.entries(edits)) {
      const rowIndex = Number(rowIdxStr);
      const originalRow = rows[rowIndex];
      if (!originalRow) continue;
      const key: Record<string, any> = {};
      pkColumns.forEach((k) => (key[k] = originalRow[k]));
      const cleanChanges: Record<string, any> = {};
      Object.entries(changes).forEach(([k, v]) => {
        // Skip undefined (not edited), include null and values
        if (v !== undefined) cleanChanges[k] = v;
      });
      if (Object.keys(cleanChanges).length > 0) {
        updates.push({ key, changes: cleanChanges, rowIndex });
      }
    }

    if (updates.length === 0) {
      setToast({
        message: 'No changes to save.',
        type: 'info',
      });
      return;
    }

    try {
      setSaving(true);
      // Persist to server first
      const payload = updates.map((u) => ({ key: u.key, changes: u.changes }));
      const resp = await dataEditingApi.batchUpdate(
        connectionId!,
        effectiveDb!,
        effectiveTable!,
        payload,
        false,
      );

      // If any failed, surface error and do not apply optimistic changes
      if (!resp?.success) {
        throw new Error('Batch update failed');
      }
      const failed = (resp.results || []).find((r: any) => r && r.success === false);
      if (failed) {
        throw new Error(failed.error || 'One or more updates failed');
      }

      // Apply saved changes locally and clear edits for those rows
      setRows((prev) => {
        const next = [...prev];
        for (const u of updates) {
          const r = { ...(next[u.rowIndex] || {}) };
          Object.assign(r, u.changes);
          next[u.rowIndex] = r;
        }
        return next;
      });
      setEdits((prev) => {
        const n: Record<number, Record<string, any>> = {} as any;
        // Remove entries that were saved
        Object.keys(prev).forEach((k) => {
          const idx = Number(k);
          if (!updates.find((u) => u.rowIndex === idx)) {
            n[idx] = prev[idx];
          }
        });
        return n;
      });
      setToast({
        message: 'Changes saved successfully.',
        type: 'success',
      });

      // Auto-exit edit mode after successful save
      setEditable(false);
      setCanUserEnableEdit(true);
      setFocusCell(null);
    } catch (e: any) {
      setToast({
        message: e?.message || 'Failed to save changes.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

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

  // Export to CSV
  const exportToCSV = () => {
    if (result.type !== 'select' || !rows || !result.fields) return;

    const headers = result.fields.map((f) => f.name).join(',');
    const csvRows = rows
      .map((row) =>
        result
          .fields!.map((field) => {
            const value = row[field.name];
            if (value === null) return 'NULL';

            // Format datetime values for CSV export
            const formattedValue = formatDatetimeToMySQL(value, selectedTimezone);

            if (typeof formattedValue === 'string')
              return `"${formattedValue.replace(/"/g, '""')}"`;
            return formattedValue;
          })
          .join(','),
      )
      .join('\n');

    const csv = `${headers}\n${csvRows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJSON = () => {
    if (result.type !== 'select' || !rows) return;

    // Format datetime values in each row
    const formattedRows = rows.map((row) => {
      const formattedRow: any = {};
      Object.keys(row).forEach((key) => {
        formattedRow[key] = formatDatetimeToMySQL(row[key], selectedTimezone);
      });
      return formattedRow;
    });

    const json = JSON.stringify(formattedRows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (result.type !== 'select' || !rows || !result.fields) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Query Results');

      // Add headers
      const headers = result.fields.map((f) => f.name);
      worksheet.addRow(headers);

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      rows.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Format datetime values
          const formattedValue = formatDatetimeToMySQL(value, selectedTimezone);
          // Convert null to empty string
          if (formattedValue === 'NULL') {
            return '';
          }
          return formattedValue;
        });
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel');
    }
  };

  // Render based on query type
  if (result.type === 'select') {
    return (
      <div
        className={`${fullHeight ? 'flex flex-col h-full min-h-0' : ''} border border-gray-200/40 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-gray-900`}
      >
        {/* Header with stats and export - sticky buttons */}
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

        {/* Table */}
        {rows && rows.length > 0 ? (
          <div
            ref={tableContainerRef2}
            className={`overflow-auto ${fullHeight ? 'flex-1 min-h-0' : 'max-h-126'}`}
            onClick={() => setContextMenu(null)}
          >
            <table className="w-full flex-wrap table-auto text-[13px]">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 sticky top-0 backdrop-blur-xl">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <th
                      className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200/60 dark:border-gray-700/60"
                      style={{ width: '48px' }}
                    >
                      <input
                        type="checkbox"
                        checked={table.getIsAllRowsSelected()}
                        ref={(el) => {
                          if (el) el.indeterminate = table.getIsSomeRowsSelected();
                        }}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200/60 dark:border-gray-700/60"
                      >
                        {header.column.getCanSort() ? (
                          <div
                            className="flex items-center gap-2 cursor-pointer select-none hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() && (
                              <span className="text-xs">
                                {
                                  {
                                    asc: '↑',
                                    desc: '↓',
                                  }[header.column.getIsSorted() as string]
                                }
                              </span>
                            )}
                          </div>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/30'} ${row.getIsSelected() ? 'bg-blue-50 dark:bg-blue-900/20' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150`}
                  >
                    <td
                      className="px-5 py-3 border-b border-gray-200/40 dark:border-gray-700/40"
                      style={{ width: '48px' }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!row.getIsSelected()) {
                          row.toggleSelected();
                        }
                        setContextMenu({ x: e.clientX, y: e.clientY, rowIndex, columnName: null });
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    {row.getVisibleCells().map((cell) => {
                      const colName = String(cell.column.id);
                      const isHovered =
                        isCellHovered?.row === rowIndex && isCellHovered?.col === colName;

                      return (
                        <td
                          key={cell.id}
                          className={`px-5 py-3 border-b border-gray-200/40 dark:border-gray-700/40 text-gray-800 dark:text-gray-200 transition-all duration-200 relative group ${
                            editable ? '' : 'max-w-md truncate'
                          } ${
                            !editable && isHovered
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 cursor-text'
                              : !editable
                                ? 'cursor-default'
                                : ''
                          }`}
                          onMouseEnter={() => setIsCellHovered({ row: rowIndex, col: colName })}
                          onMouseLeave={() => setIsCellHovered(null)}
                          onClick={(e) => handleCellClick(rowIndex, colName, e)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (!row.getIsSelected()) {
                              row.toggleSelected();
                            }
                            const cellValue = cell.getValue();
                            contextMenuColumnRef.current = colName;
                            contextMenuCellValueRef.current = cellValue;
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              rowIndex,
                              columnName: colName,
                              cellValue,
                            });
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No rows returned
          </div>
        )}

        {/* Pivot Panel */}
        {showPivot && pivotData && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="text-xs text-gray-500">Row</label>
              <select
                value={pivotRow || ''}
                onChange={(e) => setPivotRow(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Column</label>
              <select
                value={pivotCol || ''}
                onChange={(e) => setPivotCol(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Value</label>
              <select
                value={pivotVal || ''}
                onChange={(e) => setPivotVal(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="">(none)</option>
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Agg</label>
              <select
                value={pivotAgg}
                onChange={(e) => setPivotAgg(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="count">COUNT</option>
                <option value="sum">SUM</option>
                <option value="avg">AVG</option>
              </select>
              <label className="text-xs text-gray-500">Chart</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="bar">Bar</option>
                <option value="vbar">Vertical Bar</option>
                <option value="line">Line</option>
                <option value="heatmap">Heatmap</option>
                <option value="pie">Pie</option>
              </select>
              <button
                onClick={exportPivotPNG}
                className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="Download chart as PNG"
              >
                Download PNG
              </button>
              <button
                onClick={() => setPivotFullScreen(true)}
                className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="View pivot chart in full screen"
              >
                Full Screen
              </button>
              <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
              <label className="text-xs text-gray-500">Sort</label>
              <select
                value={pivotSort}
                onChange={(e) => setPivotSort(e.target.value as any)}
                className="hidden px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="Sort categories by totals"
              >
                <option value="none">None</option>
                <option value="desc">Top → Low</option>
                <option value="asc">Low → Top</option>
              </select>
              {/* Replaced labels for clarity */}
              <select
                value={pivotSort}
                onChange={(e) => setPivotSort(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="Sort categories by totals"
              >
                <option value="none">None</option>
                <option value="desc">Top to Low</option>
                <option value="asc">Low to Top</option>
              </select>
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={limitEnabled}
                  onChange={(e) => setLimitEnabled(e.target.checked)}
                />
                Limit
              </label>
              {/* Pie chart specific controls */}
              {chartType === 'pie' && (
                <>
                  <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
                  <label className="text-xs text-gray-500 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pieGroupSmall}
                      onChange={(e) => setPieGroupSmall(e.target.checked)}
                    />
                    Group small (
                    <input
                      type="number"
                      className="w-12 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      value={pieMinPercent}
                      min={0}
                      max={50}
                      onChange={(e) =>
                        setPieMinPercent(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                      }
                    />
                    %)
                  </label>
                  <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                    Max cats
                    <input
                      type="number"
                      className="w-14 px-1 py-0.5 text-xs border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      value={pieMaxCategories}
                      min={1}
                      max={200}
                      onChange={(e) =>
                        setPieMaxCategories(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                  <button
                    onClick={() => setHiddenPieLabels(new Set())}
                    className="ml-2 px-2 py-1 text-xs border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    title="Reset legend toggles"
                  >
                    Reset legend
                  </button>
                </>
              )}
              <input
                type="number"
                min={1}
                value={limitN}
                onChange={(e) => setLimitN(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                disabled={!limitEnabled}
                title="Top N rows/columns to display"
              />
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={wrapLabels}
                  onChange={(e) => setWrapLabels(e.target.checked)}
                />
                Wrap labels
              </label>
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={rotateVBarLabels}
                  onChange={(e) => setRotateVBarLabels(e.target.checked)}
                />
                Rotate v-bar labels
              </label>
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={showBarValues}
                  onChange={(e) => setShowBarValues(e.target.checked)}
                />
                Show values
              </label>
            </div>

            <div
              ref={pivotRef}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded max-h-96 overflow-auto"
            >
              {chartType === 'bar' ? (
                (() => {
                  const barStep = 18;
                  const topPad = 16;
                  const bottomPad = 16;
                  const rowTotalMap = new Map<string, number>();
                  pivotData.rList.forEach((rk: any, i: number) =>
                    rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                  );
                  let rowOrder = [...pivotData.rList] as any[];
                  if (pivotSort === 'desc')
                    rowOrder.sort(
                      (a, b) =>
                        (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                    );
                  if (pivotSort === 'asc')
                    rowOrder.sort(
                      (a, b) =>
                        (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                    );
                  const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                  const innerH = topPad + rowsL.length * barStep + bottomPad;
                  const wrap = (text: string, maxChars = 18): string[] => {
                    if (!wrapLabels) return [text];
                    const words = String(text).split(/\s+/);
                    const lines: string[] = [];
                    let current = '';
                    for (const w of words) {
                      if ((current + ' ' + w).trim().length <= maxChars) {
                        current = (current ? current + ' ' : '') + w;
                      } else {
                        if (current) lines.push(current);
                        // If single word longer than max, hard-split
                        if (w.length > maxChars) {
                          for (let i = 0; i < w.length; i += maxChars) {
                            lines.push(w.slice(i, i + maxChars));
                          }
                          current = '';
                        } else {
                          current = w;
                        }
                      }
                    }
                    if (current) lines.push(current);
                    return lines.length ? lines : [String(text)];
                  };
                  return (
                    <svg
                      viewBox={`0 0 1000 ${innerH}`}
                      className="w-full"
                      style={{ height: innerH }}
                    >
                      {rowsL.map((rk, i) => {
                        const total = rowTotalMap.get(String(rk)) || 0;
                        const max = Math.max(1, pivotData.maxRowTotal);
                        const w = (total / max) * 960;
                        const y = topPad + i * barStep;
                        const lines = wrap(String(rk));
                        return (
                          <g key={String(rk)}>
                            <rect x={24} y={y} width={w} height={12} fill="#60a5fa" />
                            <text x={22} y={y + 6} fontSize="10" fill="#6b7280" textAnchor="end">
                              {lines.map((ln, j) => (
                                <tspan key={j} x={22} dy={j === 0 ? 0 : 10}>
                                  {ln}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()
              ) : chartType === 'vbar' ? (
                <svg viewBox="0 0 1000 400" className="w-full h-80">
                  {(() => {
                    const rowTotalMap = new Map<string, number>();
                    pivotData.rList.forEach((rk: any, i: number) =>
                      rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                    );
                    let rowOrder = [...pivotData.rList] as any[];
                    if (pivotSort === 'desc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                      );
                    if (pivotSort === 'asc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                      );
                    const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                    const max = Math.max(1, pivotData.maxRowTotal);
                    const n = rowsL.length;
                    const xStep = n ? 960 / n : 960;
                    const barW = Math.max(1, xStep * 0.8);
                    return (
                      <>
                        <line x1={24} y1={360} x2={984} y2={360} stroke="#e5e7eb" />
                        {rowsL.map((rk, i) => {
                          const total = rowTotalMap.get(String(rk)) || 0;
                          const h = (total / max) * 340;
                          const x = 24 + i * xStep + (xStep - barW) / 2;
                          const y = 360 - h;
                          return (
                            <g key={String(rk)}>
                              <rect x={x} y={y} width={barW} height={h} fill="#60a5fa" />
                              {showBarValues && h > 8 && (
                                <text
                                  x={x + barW / 2}
                                  y={y - 4}
                                  fontSize="10"
                                  fill="#374151"
                                  textAnchor="middle"
                                >
                                  {total}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        {rowsL.slice(0, 24).map((rk, i) => {
                          const labelX = 24 + i * xStep + xStep / 2;
                          const labelY = 380;
                          const text = String(rk).slice(0, 14);
                          return rotateVBarLabels ? (
                            <g
                              key={`lbl-${i}`}
                              transform={`translate(${labelX}, ${labelY}) rotate(-45)`}
                            >
                              <text x={0} y={0} fontSize="8" fill="#6b7280" textAnchor="end">
                                {text}
                              </text>
                            </g>
                          ) : (
                            <text
                              key={`lbl-${i}`}
                              x={labelX}
                              y={labelY}
                              fontSize="8"
                              fill="#6b7280"
                              textAnchor="middle"
                            >
                              {text}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              ) : chartType === 'line' ? (
                <svg viewBox="0 0 1000 400" className="w-full h-80">
                  {(() => {
                    const colTotalMap = new Map<string, number>();
                    (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                      colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
                    );
                    let colOrder = [...pivotData.cList] as any[];
                    if (pivotSort === 'desc')
                      colOrder.sort(
                        (a, b) =>
                          (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                      );
                    if (pivotSort === 'asc')
                      colOrder.sort(
                        (a, b) =>
                          (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                      );
                    const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
                    const colTotalsL = colsL.map((ck) => colTotalMap.get(String(ck)) || 0);
                    const max = Math.max(1, pivotData.maxColTotal || 1);
                    const n = colsL.length;
                    const xStep = n ? 960 / n : 960;
                    const pts = colsL
                      .map((ck, i) => {
                        const v = colTotalsL[i] || 0;
                        const x = 24 + i * xStep + xStep / 2;
                        const y = 360 - (v / max) * 340;
                        return `${x},${y}`;
                      })
                      .join(' ');
                    return (
                      <>
                        <line x1={24} y1={360} x2={984} y2={360} stroke="#e5e7eb" />
                        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} />
                        {colsL.slice(0, 24).map((ck, i) => (
                          <text
                            key={i}
                            x={24 + i * xStep + xStep / 2}
                            y={380}
                            fontSize="8"
                            fill="#6b7280"
                            textAnchor="middle"
                          >
                            {String(ck).slice(0, 10)}
                          </text>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              ) : chartType === 'pie' ? (
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <svg viewBox="0 0 800 400" className="w-full h-80">
                      {(() => {
                        const baseRows = limitEnabled
                          ? pivotData.rList.slice(0, limitN)
                          : pivotData.rList;
                        const rowTotalMap = new Map<string, number>();
                        pivotData.rList.forEach((rk: any, i: number) =>
                          rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                        );
                        const merged: Record<string, number> = {};
                        baseRows.forEach((rk: any) => {
                          const label = String(rk);
                          const val = rowTotalMap.get(label) || 0;
                          merged[label] = (merged[label] || 0) + val;
                        });
                        let entries = Object.entries(merged).map(([label, total]) => ({
                          label,
                          total,
                        }));
                        if (pivotSort === 'desc' || pivotSort === 'none')
                          entries.sort((a, b) => b.total - a.total);
                        else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
                        const grand = entries.reduce((a, b) => a + b.total, 0) || 1;
                        if (pieGroupSmall) {
                          const min = (pieMinPercent / 100) * grand;
                          const small = entries.filter((e) => e.total < min);
                          const big = entries.filter((e) => e.total >= min);
                          const otherTotal = small.reduce((a, b) => a + b.total, 0);
                          entries =
                            otherTotal > 0 ? [...big, { label: 'Other', total: otherTotal }] : big;
                        }
                        if (entries.length > pieMaxCategories) {
                          const head = entries.slice(0, pieMaxCategories - 1);
                          const tail = entries.slice(pieMaxCategories - 1);
                          const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                          entries = [...head, { label: 'Other', total: otherTotal }];
                        }
                        const hashString = (str: string): number => {
                          let h = 2166136261 >>> 0;
                          for (let i = 0; i < str.length; i++) {
                            h ^= str.charCodeAt(i);
                            h = Math.imul(h, 16777619);
                          }
                          return h >>> 0;
                        };
                        const mulberry32 = (a: number) => () => {
                          let t = (a += 0x6d2b79f5);
                          t = Math.imul(t ^ (t >>> 15), t | 1);
                          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                        };
                        const colorFor = (label: string): string =>
                          label === 'Other'
                            ? '#9CA3AF'
                            : (() => {
                                const seed = hashString(label);
                                const rand = mulberry32(seed);
                                const h = Math.floor(rand() * 360);
                                const s = Math.floor(60 + rand() * 30);
                                const l = Math.floor(45 + rand() * 15);
                                return `hsl(${h}, ${s}%, ${l}%)`;
                              })();
                        const cx = 260,
                          cy = 200,
                          r = 140;
                        let angle = -Math.PI / 2;
                        return (
                          <>
                            {entries.map((e, i) => {
                              const theta = (e.total / grand) * Math.PI * 2;
                              const x1 = cx + r * Math.cos(angle);
                              const y1 = cy + r * Math.sin(angle);
                              const x2 = cx + r * Math.cos(angle + theta);
                              const y2 = cy + r * Math.sin(angle + theta);
                              const large = theta > Math.PI ? 1 : 0;
                              const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                              angle += theta;
                              return (
                                <path
                                  key={e.label + i}
                                  d={d}
                                  fill={colorFor(e.label)}
                                  stroke="#fff"
                                  strokeWidth={1}
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  {(() => {
                    const baseRows = limitEnabled
                      ? pivotData.rList.slice(0, limitN)
                      : pivotData.rList;
                    const rowTotalMap = new Map<string, number>();
                    pivotData.rList.forEach((rk: any, i: number) =>
                      rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                    );
                    const merged: Record<string, number> = {};
                    baseRows.forEach((rk: any) => {
                      const label = String(rk);
                      const val = rowTotalMap.get(label) || 0;
                      merged[label] = (merged[label] || 0) + val;
                    });
                    let entries = Object.entries(merged).map(([label, total]) => ({
                      label,
                      total,
                    }));
                    if (pivotSort === 'desc' || pivotSort === 'none')
                      entries.sort((a, b) => b.total - a.total);
                    else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
                    const grand = entries.reduce((a, b) => a + b.total, 0) || 1;
                    if (pieGroupSmall) {
                      const min = (pieMinPercent / 100) * grand;
                      const small = entries.filter((e) => e.total < min);
                      const big = entries.filter((e) => e.total >= min);
                      const otherTotal = small.reduce((a, b) => a + b.total, 0);
                      entries =
                        otherTotal > 0 ? [...big, { label: 'Other', total: otherTotal }] : big;
                    }
                    if (entries.length > pieMaxCategories) {
                      const head = entries.slice(0, pieMaxCategories - 1);
                      const tail = entries.slice(pieMaxCategories - 1);
                      const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                      entries = [...head, { label: 'Other', total: otherTotal }];
                    }
                    const hashString = (str: string): number => {
                      let h = 2166136261 >>> 0;
                      for (let i = 0; i < str.length; i++) {
                        h ^= str.charCodeAt(i);
                        h = Math.imul(h, 16777619);
                      }
                      return h >>> 0;
                    };
                    const mulberry32 = (a: number) => () => {
                      let t = (a += 0x6d2b79f5);
                      t = Math.imul(t ^ (t >>> 15), t | 1);
                      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                    };
                    const colorFor = (label: string): string =>
                      label === 'Other'
                        ? '#9CA3AF'
                        : (() => {
                            const seed = hashString(label);
                            const rand = mulberry32(seed);
                            const h = Math.floor(rand() * 360);
                            const s = Math.floor(60 + rand() * 30);
                            const l = Math.floor(45 + rand() * 15);
                            return `hsl(${h}, ${s}%, ${l}%)`;
                          })();
                    return (
                      <div className="w-64 max-h-80 overflow-auto pr-1">
                        {entries.map((e, i) => (
                          <div
                            key={e.label + i}
                            className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200"
                          >
                            <span
                              className="inline-block w-3 h-3 rounded-sm"
                              style={{ backgroundColor: colorFor(e.label) }}
                            ></span>
                            <span className="truncate" title={`${e.label} (${e.total})`}>
                              {e.label} ({e.total})
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <svg viewBox="0 0 1000 640" className="w-full h-96">
                  {(() => {
                    const rowTotalMap = new Map<string, number>();
                    pivotData.rList.forEach((rk: any, i: number) =>
                      rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                    );
                    let rowOrder = [...pivotData.rList] as any[];
                    if (pivotSort === 'desc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                      );
                    if (pivotSort === 'asc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                      );
                    const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                    const colTotalMap = new Map<string, number>();
                    (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                      colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
                    );
                    let colOrder = [...pivotData.cList] as any[];
                    if (pivotSort === 'desc')
                      colOrder.sort(
                        (a, b) =>
                          (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                      );
                    if (pivotSort === 'asc')
                      colOrder.sort(
                        (a, b) =>
                          (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                      );
                    const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
                    const cellW = 960 / Math.max(1, colsL.length);
                    const cellH = 520 / Math.max(1, rowsL.length);
                    const valMax = Math.max(1, pivotData.maxVal);
                    return rowsL.map((rk, ri) =>
                      colsL.map((ck, ci) => {
                        const v = (pivotData.matrix.get(rk) || [])[ci] || 0;
                        const intensity = Math.floor((v / valMax) * 255);
                        const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                        return (
                          <rect
                            key={`${ri}-${ci}`}
                            x={24 + ci * cellW}
                            y={16 + ri * cellH}
                            width={cellW - 4}
                            height={cellH - 4}
                            fill={color}
                          />
                        );
                      }),
                    );
                  })()}
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Pivot Full Screen Overlay */}
        {showPivot && pivotData && pivotFullScreen && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col">
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-600"
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
                <span className="font-semibold">Pivot / Chart — Fullscreen</span>
                <span className="ml-2 text-xs text-gray-500 hidden sm:inline">
                  Press Esc to exit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPivotPNG}
                  className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  title="Download chart as PNG"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => setPivotFullScreen(false)}
                  className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  title="Close (Esc)"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Controls duplicated for fullscreen */}
            <div className="sticky top-12 z-10 bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500">Row</label>
              <select
                value={pivotRow || ''}
                onChange={(e) => setPivotRow(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Column</label>
              <select
                value={pivotCol || ''}
                onChange={(e) => setPivotCol(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Value</label>
              <select
                value={pivotVal || ''}
                onChange={(e) => setPivotVal(e.target.value || null)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="">(none)</option>
                {allColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-500">Agg</label>
              <select
                value={pivotAgg}
                onChange={(e) => setPivotAgg(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="count">COUNT</option>
                <option value="sum">SUM</option>
                <option value="avg">AVG</option>
              </select>
              <label className="text-xs text-gray-500">Chart</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="bar">Bar</option>
                <option value="vbar">Vertical Bar</option>
                <option value="line">Line</option>
                <option value="heatmap">Heatmap</option>
                <option value="pie">Pie</option>
              </select>
              {/* Replaced labels for clarity */}
              <select
                value={pivotSort}
                onChange={(e) => setPivotSort(e.target.value as any)}
                className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="none">None</option>
                <option value="desc">Top to Low</option>
                <option value="asc">Low to Top</option>
              </select>
              <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
              <label className="text-xs text-gray-500">Sort</label>
              <select
                value={pivotSort}
                onChange={(e) => setPivotSort(e.target.value as any)}
                className="hidden px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="none">None</option>
                <option value="desc">Top → Low</option>
                <option value="asc">Low → Top</option>
              </select>
              <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
              <label className="text-xs text-gray-500 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={limitEnabled}
                  onChange={(e) => setLimitEnabled(e.target.checked)}
                />
                Limit
              </label>
              <input
                type="number"
                min={1}
                value={limitN}
                onChange={(e) => setLimitN(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                disabled={!limitEnabled}
              />
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={wrapLabels}
                  onChange={(e) => setWrapLabels(e.target.checked)}
                />
                Wrap labels
              </label>
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={rotateVBarLabels}
                  onChange={(e) => setRotateVBarLabels(e.target.checked)}
                />
                Rotate v-bar labels
              </label>
              <label className="text-xs text-gray-500 flex items-center gap-2 ml-2">
                <input
                  type="checkbox"
                  checked={showBarValues}
                  onChange={(e) => setShowBarValues(e.target.checked)}
                />
                Show values
              </label>
              {chartType === 'pie' && (
                <>
                  <div className="mx-2 h-5 w-px bg-gray-300 dark:bg-gray-700" />
                  <label className="text-xs text-gray-500 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pieGroupSmall}
                      onChange={(e) => setPieGroupSmall(e.target.checked)}
                    />
                    Group small
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={pieMinPercent}
                    onChange={(e) =>
                      setPieMinPercent(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                    }
                    className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    title="Group slices below this percent into Other"
                  />
                  <label className="text-xs text-gray-500 ml-2">Max cats</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={pieMaxCategories}
                    onChange={(e) =>
                      setPieMaxCategories(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
                    }
                    className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    title="Maximum categories before combining into Other"
                  />
                </>
              )}
            </div>

            {/* Fullscreen chart area */}
            <div className="flex-1 min-h-0 overflow-auto p-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg min-h-[75vh]">
                {chartType === 'bar' ? (
                  (() => {
                    const barStep = 18;
                    const topPad = 16;
                    const bottomPad = 16;
                    const rowTotalMap = new Map<string, number>();
                    pivotData.rList.forEach((rk: any, i: number) =>
                      rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                    );
                    let rowOrder = [...pivotData.rList] as any[];
                    if (pivotSort === 'desc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                      );
                    if (pivotSort === 'asc')
                      rowOrder.sort(
                        (a, b) =>
                          (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                      );
                    const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                    const innerH = topPad + rowsL.length * barStep + bottomPad;
                    const wrap = (text: string, maxChars = 24): string[] => {
                      if (!wrapLabels) return [text];
                      const words = String(text).split(/\s+/);
                      const lines: string[] = [];
                      let current = '';
                      for (const w of words) {
                        if ((current + ' ' + w).trim().length <= maxChars) {
                          current = (current ? current + ' ' : '') + w;
                        } else {
                          if (current) lines.push(current);
                          if (w.length > maxChars) {
                            for (let i = 0; i < w.length; i += maxChars)
                              lines.push(w.slice(i, i + maxChars));
                            current = '';
                          } else {
                            current = w;
                          }
                        }
                      }
                      if (current) lines.push(current);
                      return lines.length ? lines : [String(text)];
                    };
                    return (
                      <svg
                        viewBox={`0 0 1400 ${innerH}`}
                        className="w-full"
                        style={{ height: innerH }}
                      >
                        {rowsL.map((rk, i) => {
                          const total = rowTotalMap.get(String(rk)) || 0;
                          const max = Math.max(1, pivotData.maxRowTotal);
                          const w = (total / max) * 1360;
                          const y = topPad + i * barStep;
                          const lines = wrap(String(rk));
                          return (
                            <g key={String(rk)}>
                              <rect x={40} y={y} width={w} height={12} fill="#60a5fa" />
                              <text x={38} y={y + 6} fontSize="12" fill="#6b7280" textAnchor="end">
                                {lines.map((ln, j) => (
                                  <tspan key={j} x={38} dy={j === 0 ? 0 : 12}>
                                    {ln}
                                  </tspan>
                                ))}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()
                ) : chartType === 'vbar' ? (
                  <svg viewBox="0 0 1400 700" className="w-full h-[70vh]">
                    {(() => {
                      const rowTotalMap = new Map<string, number>();
                      pivotData.rList.forEach((rk: any, i: number) =>
                        rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                      );
                      let rowOrder = [...pivotData.rList] as any[];
                      if (pivotSort === 'desc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                        );
                      if (pivotSort === 'asc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                        );
                      const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                      const max = Math.max(1, pivotData.maxRowTotal);
                      const n = rowsL.length;
                      const xStep = n ? 1360 / n : 1360;
                      const barW = Math.max(2, xStep * 0.8);
                      return (
                        <>
                          <line x1={40} y1={640} x2={1400 - 40} y2={640} stroke="#e5e7eb" />
                          {rowsL.map((rk, i) => {
                            const total = rowTotalMap.get(String(rk)) || 0;
                            const h = (total / max) * 600;
                            const x = 40 + i * xStep + (xStep - barW) / 2;
                            const y = 640 - h;
                            return (
                              <g key={String(rk)}>
                                <rect x={x} y={y} width={barW} height={h} fill="#60a5fa" />
                                {showBarValues && h > 10 && (
                                  <text
                                    x={x + barW / 2}
                                    y={y - 6}
                                    fontSize="12"
                                    fill="#374151"
                                    textAnchor="middle"
                                  >
                                    {total}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                          {rowsL.slice(0, 60).map((rk, i) => {
                            const labelX = 40 + i * xStep + xStep / 2;
                            const labelY = 660;
                            const text = String(rk).slice(0, 18);
                            return rotateVBarLabels ? (
                              <g
                                key={`lbl-fs-${i}`}
                                transform={`translate(${labelX}, ${labelY}) rotate(-45)`}
                              >
                                <text x={0} y={0} fontSize="10" fill="#6b7280" textAnchor="end">
                                  {text}
                                </text>
                              </g>
                            ) : (
                              <text
                                key={`lbl-fs-${i}`}
                                x={labelX}
                                y={labelY}
                                fontSize="10"
                                fill="#6b7280"
                                textAnchor="middle"
                              >
                                {text}
                              </text>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                ) : chartType === 'line' ? (
                  <svg viewBox="0 0 1400 700" className="w-full h-[70vh]">
                    {(() => {
                      const colTotalMap = new Map<string, number>();
                      (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                        colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
                      );
                      let colOrder = [...pivotData.cList] as any[];
                      if (pivotSort === 'desc')
                        colOrder.sort(
                          (a, b) =>
                            (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                        );
                      if (pivotSort === 'asc')
                        colOrder.sort(
                          (a, b) =>
                            (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                        );
                      const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
                      const colTotalsL = colsL.map((ck) => colTotalMap.get(String(ck)) || 0);
                      const max = Math.max(1, pivotData.maxColTotal || 1);
                      const n = colsL.length;
                      const xStep = n ? 1360 / n : 1360;
                      const pts = colsL
                        .map((ck, i) => {
                          const v = colTotalsL[i] || 0;
                          const x = 40 + i * xStep + xStep / 2;
                          const y = 640 - (v / max) * 600;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <>
                          <line x1={40} y1={640} x2={1400 - 40} y2={640} stroke="#e5e7eb" />
                          <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} />
                          {colsL.slice(0, 60).map((ck, i) => (
                            <text
                              key={i}
                              x={40 + i * xStep + xStep / 2}
                              y={660}
                              fontSize="10"
                              fill="#6b7280"
                              textAnchor="middle"
                            >
                              {String(ck).slice(0, 14)}
                            </text>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                ) : chartType === 'pie' ? (
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <svg viewBox="0 0 1200 700" className="w-full h-[70vh]">
                        {(() => {
                          const rowTotalMap = new Map<string, number>();
                          pivotData.rList.forEach((rk: any, i: number) =>
                            rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                          );
                          let rowOrder = [...pivotData.rList] as any[];
                          if (pivotSort === 'desc')
                            rowOrder.sort(
                              (a, b) =>
                                (rowTotalMap.get(String(b)) || 0) -
                                (rowTotalMap.get(String(a)) || 0),
                            );
                          if (pivotSort === 'asc')
                            rowOrder.sort(
                              (a, b) =>
                                (rowTotalMap.get(String(a)) || 0) -
                                (rowTotalMap.get(String(b)) || 0),
                            );
                          const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                          const totals = rowsL.map((rk) => rowTotalMap.get(String(rk)) || 0);
                          const sum = totals.reduce((a, b) => a + b, 0) || 1;
                          const cx = 420,
                            cy = 350,
                            r = 220;
                          let angle = -Math.PI / 2;
                          const hashString = (str: string): number => {
                            let h = 2166136261 >>> 0;
                            for (let i = 0; i < str.length; i++) {
                              h ^= str.charCodeAt(i);
                              h = Math.imul(h, 16777619);
                            }
                            return h >>> 0;
                          };
                          const mulberry32 = (a: number) => () => {
                            let t = (a += 0x6d2b79f5);
                            t = Math.imul(t ^ (t >>> 15), t | 1);
                            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                          };
                          const colorForLabel = (label: string): string => {
                            const seed = hashString(label);
                            const rand = mulberry32(seed);
                            const h = Math.floor(rand() * 360);
                            const s = Math.floor(60 + rand() * 30);
                            const l = Math.floor(45 + rand() * 15);
                            return `hsl(${h}, ${s}%, ${l}%)`;
                          };
                          // Build entries with totals, apply sort and grouping
                          let entries = rowsL.map((rk, i) => ({
                            label: String(rk),
                            total: totals[i],
                          }));
                          if (pivotSort === 'desc' || pivotSort === 'none')
                            entries.sort((a, b) => b.total - a.total);
                          else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
                          if (pieGroupSmall) {
                            const min = (pieMinPercent / 100) * sum;
                            const small = entries.filter((e) => e.total < min);
                            const big = entries.filter((e) => e.total >= min);
                            const otherTotal = small.reduce((a, b) => a + b.total, 0);
                            entries =
                              otherTotal > 0
                                ? [...big, { label: 'Other', total: otherTotal }]
                                : big;
                          }
                          if (entries.length > pieMaxCategories) {
                            const head = entries.slice(0, pieMaxCategories - 1);
                            const tail = entries.slice(pieMaxCategories - 1);
                            const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                            entries = [...head, { label: 'Other', total: otherTotal }];
                          }
                          angle = -Math.PI / 2;
                          return (
                            <>
                              {entries.map((e, i) => {
                                const theta = (e.total / sum) * Math.PI * 2;
                                const x1 = cx + r * Math.cos(angle);
                                const y1 = cy + r * Math.sin(angle);
                                const x2 = cx + r * Math.cos(angle + theta);
                                const y2 = cy + r * Math.sin(angle + theta);
                                const large = theta > Math.PI ? 1 : 0;
                                const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                                const elem = (
                                  <path
                                    key={e.label + i}
                                    d={d}
                                    fill={colorForLabel(e.label)}
                                    stroke="#fff"
                                    strokeWidth={1}
                                  />
                                );
                                angle += theta;
                                return elem;
                              })}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    {(() => {
                      const rowTotalMap = new Map<string, number>();
                      pivotData.rList.forEach((rk: any, i: number) =>
                        rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                      );
                      let rowOrder = [...pivotData.rList] as any[];
                      if (pivotSort === 'desc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                        );
                      if (pivotSort === 'asc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                        );
                      const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                      const totals = rowsL.map((rk) => rowTotalMap.get(String(rk)) || 0);
                      const hashString = (str: string): number => {
                        let h = 2166136261 >>> 0;
                        for (let i = 0; i < str.length; i++) {
                          h ^= str.charCodeAt(i);
                          h = Math.imul(h, 16777619);
                        }
                        return h >>> 0;
                      };
                      const mulberry32 = (a: number) => () => {
                        let t = (a += 0x6d2b79f5);
                        t = Math.imul(t ^ (t >>> 15), t | 1);
                        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                      };
                      const colorForLabel = (label: string): string => {
                        const seed = hashString(label);
                        const rand = mulberry32(seed);
                        const h = Math.floor(rand() * 360);
                        const s = Math.floor(60 + rand() * 30);
                        const l = Math.floor(45 + rand() * 15);
                        return `hsl(${h}, ${s}%, ${l}%)`;
                      };
                      let entries = rowsL.map((rk, i) => ({ label: String(rk), total: totals[i] }));
                      if (pivotSort === 'desc' || pivotSort === 'none')
                        entries.sort((a, b) => b.total - a.total);
                      else if (pivotSort === 'asc') entries.sort((a, b) => a.total - b.total);
                      const grand = entries.reduce((a, b) => a + b.total, 0) || 1;
                      if (pieGroupSmall) {
                        const min = (pieMinPercent / 100) * grand;
                        const small = entries.filter((e) => e.total < min);
                        const big = entries.filter((e) => e.total >= min);
                        const otherTotal = small.reduce((a, b) => a + b.total, 0);
                        entries =
                          otherTotal > 0 ? [...big, { label: 'Other', total: otherTotal }] : big;
                      }
                      if (entries.length > pieMaxCategories) {
                        const head = entries.slice(0, pieMaxCategories - 1);
                        const tail = entries.slice(pieMaxCategories - 1);
                        const otherTotal = tail.reduce((a, b) => a + b.total, 0);
                        entries = [...head, { label: 'Other', total: otherTotal }];
                      }
                      return (
                        <div className="w-96 max-h-[70vh] overflow-auto pr-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {entries.map((e, i) => (
                              <div
                                key={e.label + i}
                                className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                              >
                                <span
                                  className="inline-block w-3.5 h-3.5 rounded-sm"
                                  style={{
                                    backgroundColor:
                                      e.label === 'Other' ? '#9CA3AF' : colorForLabel(e.label),
                                  }}
                                ></span>
                                <span className="truncate" title={`${e.label} (${e.total})`}>
                                  {e.label} ({e.total})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <svg viewBox="0 0 1400 900" className="w-full h-[70vh]">
                    {(() => {
                      const rowTotalMap = new Map<string, number>();
                      pivotData.rList.forEach((rk: any, i: number) =>
                        rowTotalMap.set(String(rk), pivotData.rowTotals[i] || 0),
                      );
                      let rowOrder = [...pivotData.rList] as any[];
                      if (pivotSort === 'desc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(b)) || 0) - (rowTotalMap.get(String(a)) || 0),
                        );
                      if (pivotSort === 'asc')
                        rowOrder.sort(
                          (a, b) =>
                            (rowTotalMap.get(String(a)) || 0) - (rowTotalMap.get(String(b)) || 0),
                        );
                      const rowsL = limitEnabled ? rowOrder.slice(0, limitN) : rowOrder;
                      const colTotalMap = new Map<string, number>();
                      (pivotData.cList as any[]).forEach((ck: any, i: number) =>
                        colTotalMap.set(String(ck), pivotData.colTotals?.[i] || 0),
                      );
                      let colOrder = [...pivotData.cList] as any[];
                      if (pivotSort === 'desc')
                        colOrder.sort(
                          (a, b) =>
                            (colTotalMap.get(String(b)) || 0) - (colTotalMap.get(String(a)) || 0),
                        );
                      if (pivotSort === 'asc')
                        colOrder.sort(
                          (a, b) =>
                            (colTotalMap.get(String(a)) || 0) - (colTotalMap.get(String(b)) || 0),
                        );
                      const colsL = limitEnabled ? colOrder.slice(0, limitN) : colOrder;
                      const cellW = 1360 / Math.max(1, colsL.length);
                      const cellH = 820 / Math.max(1, rowsL.length);
                      const valMax = Math.max(1, pivotData.maxVal);
                      return rowsL.map((rk, ri) =>
                        colsL.map((ck, ci) => {
                          const v = (pivotData.matrix.get(rk) || [])[ci] || 0;
                          const intensity = Math.floor((v / valMax) * 255);
                          const color = `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
                          return (
                            <rect
                              key={`${ri}-${ci}`}
                              x={20 + ci * cellW}
                              y={20 + ri * cellH}
                              width={cellW - 4}
                              height={cellH - 4}
                              fill={color}
                            />
                          );
                        }),
                      );
                    })()}
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg text-sm min-w-[240px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.columnName && (
              <>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    copyCellValue();
                    setContextMenu(null);
                    contextMenuColumnRef.current = null;
                    contextMenuCellValueRef.current = null;
                  }}
                >
                  Copy Cell Value
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const columnName = contextMenuColumnRef.current!;
                    setContextMenu(null);
                    contextMenuColumnRef.current = null;
                    contextMenuCellValueRef.current = null;
                    generateUpdateQuery(columnName);
                  }}
                >
                  Generate UPDATE Query for '{contextMenu.columnName}'
                </button>
                <div className="border-t border-gray-200 my-1"></div>
              </>
            )}
            {Object.keys(rowSelection).length > 0 && (
              <>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    generateInsertQuery();
                    setContextMenu(null);
                  }}
                >
                  Generate INSERT Query
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    generateDeleteQuery();
                    setContextMenu(null);
                  }}
                >
                  Generate DELETE Query
                </button>
                <button
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  onClick={() => {
                    generateCreateTableAs();
                    setContextMenu(null);
                  }}
                >
                  Generate CREATE TABLE AS
                </button>
                <div className="border-t border-gray-200 my-1"></div>
              </>
            )}
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                copyColumnNames();
                setContextMenu(null);
              }}
            >
              Copy Column Names
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                copyAsJSON();
                setContextMenu(null);
              }}
            >
              Copy as JSON
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                copyAsTSV();
                setContextMenu(null);
              }}
            >
              Copy as TSV
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                generateRawQueryResult();
                setContextMenu(null);
              }}
            >
              Copy as MySQL CLI Format
            </button>
          </div>
        )}

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
