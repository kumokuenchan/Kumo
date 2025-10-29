import { useMemo, useState, useEffect, useRef, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  VisibilityState,
  RowSelectionState,
  ColumnSizingState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TableDataRow, ColumnInfo, SortOption, FilterCondition } from '../../types/dataViewer';
import FKEditor from './FKEditor';

interface DataGridProps {
  data: TableDataRow[];
  columns: ColumnInfo[];
  isLoading?: boolean;
  sortBy?: SortOption[];
  onSortChange?: (sort: SortOption[]) => void;
  filters?: FilterCondition[];
  onFilterChange?: (filters: FilterCondition[]) => void;
  onSelectionChange?: (selectedRows: TableDataRow[]) => void;
  editable?: boolean;
  getEditedValue?: (row: TableDataRow, columnName: string) => any | undefined;
  onEditCell?: (row: TableDataRow, column: ColumnInfo, value: any) => void;
  isCellDirty?: (row: TableDataRow, columnName: string) => boolean;
  connectionId?: string;
  database?: string;
  table?: string;
  selectedRows?: TableDataRow[];
  getCellError?: (row: TableDataRow, columnName: string) => string | undefined;
  showFilters?: boolean;
  showColumnMenu?: boolean;
  onShowColumnMenuChange?: (show: boolean) => void;
  onColumnsReady?: (columns: Array<{ id: string; isVisible: boolean; toggle: () => void }>) => void;
  clearSelectionTrigger?: number;
}

export default function DataGrid({
  data,
  columns: columnInfo,
  isLoading = false,
  sortBy = [],
  onSortChange,
  filters = [],
  onFilterChange,
  onSelectionChange,
  editable = false,
  getEditedValue,
  onEditCell,
  isCellDirty,
  connectionId,
  database,
  table,
  selectedRows = [],
  getCellError,
  showFilters = false,
  showColumnMenu = false,
  onShowColumnMenuChange,
  onColumnsReady,
  clearSelectionTrigger = 0,
}: DataGridProps) {
  // Calculate optimal column widths based on content
  const calculateColumnWidths = useMemo(() => {
    const widths: ColumnSizingState = {};
    const sampleSize = Math.min(50, data.length); // Sample first 50 rows for performance

    columnInfo.forEach((col) => {
      // Calculate header width (in characters)
      const headerLength = col.name.length;

      // Calculate max content width from sample data
      let maxContentLength = 0;
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i]?.[col.name];
        const valueStr = value !== null && value !== undefined ? String(value) : '';
        // Cap individual value length check at 50 characters to avoid super wide columns
        maxContentLength = Math.max(maxContentLength, Math.min(50, valueStr.length));
      }

      // Use the larger of header or content, with some padding
      const charCount = Math.max(headerLength, maxContentLength);

      // Convert characters to pixels (rough estimate: 8px per character + 10px extra)
      // Add padding for cell padding (32px for px-4 on both sides)
      let width = (charCount * 8) + 42;

      // Apply min/max bounds
      width = Math.max(120, Math.min(400, width));

      widths[col.name] = width;
    });

    return widths;
  }, [columnInfo, data]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(calculateColumnWidths);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columnInfo.map((col) => col.name)
  );

  // Update column sizing when data or columns change
  useEffect(() => {
    setColumnSizing(calculateColumnWidths);
  }, [calculateColumnWidths]);

  // Clear selection when triggered from parent
  useEffect(() => {
    if (clearSelectionTrigger > 0) {
      setRowSelection({});
    }
  }, [clearSelectionTrigger]);

  const [contextMenu, setContextMenu] = useState<
    null | { x: number; y: number; row: TableDataRow; column: ColumnInfo | null }
  >(null);
  // Track which cell is currently being edited (rowIndex-columnName)
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Ref for the scrollable container (for virtual scrolling)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const headerContainerRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scroll between header and body
  useEffect(() => {
    const bodyContainer = tableContainerRef.current;
    const headerContainer = headerContainerRef.current;

    if (!bodyContainer || !headerContainer) return;

    let isScrolling = false;

    const handleBodyScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(() => {
          if (headerContainer && bodyContainer) {
            headerContainer.scrollLeft = bodyContainer.scrollLeft;
          }
          isScrolling = false;
        });
      }
    };

    // Wait for DOM to be fully rendered before setting up sync
    const setupSync = () => {
      // Set initial scroll position
      headerContainer.scrollLeft = bodyContainer.scrollLeft;

      // Attach scroll listener
      bodyContainer.addEventListener('scroll', handleBodyScroll, { passive: true });
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(setupSync, 100);

    return () => {
      clearTimeout(timeoutId);
      bodyContainer.removeEventListener('scroll', handleBodyScroll);
    };
  }, [data, columnInfo, columnSizing]);

  // Stable refs for frequently changing callbacks
  const getEditedValueRef = useRef<typeof getEditedValue>(getEditedValue);
  const isCellDirtyRef = useRef<typeof isCellDirty>(isCellDirty);
  const onEditCellRef = useRef<typeof onEditCell>(onEditCell);
  const getCellErrorRef = useRef<typeof getCellError>(getCellError);
  useEffect(() => { getEditedValueRef.current = getEditedValue; }, [getEditedValue]);
  useEffect(() => { isCellDirtyRef.current = isCellDirty; }, [isCellDirty]);
  useEffect(() => { onEditCellRef.current = onEditCell; }, [onEditCell]);
  useEffect(() => { getCellErrorRef.current = getCellError; }, [getCellError]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update column order when columns list changes
  useEffect(() => {
    setColumnOrder(columnInfo.map((col) => col.name));
    // Intentionally only depend on columnInfo to avoid remounts on every edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnInfo]);

  // Create TanStack Table column definitions
  const columns = useMemo<ColumnDef<TableDataRow>[]>(() => {
    return columnInfo.map((col) => ({
      id: col.name,
      accessorKey: col.name,
      header: () => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{col.name}</span>
          {col.key === 'PRI' && (
            <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border dark:border-yellow-700/30 px-1 rounded">
              PK
            </span>
          )}
          {col.key === 'MUL' && (
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-slate-700/40 dark:text-gray-100 dark:border dark:border-slate-600/60 px-1 rounded">
              FK
            </span>
          )}
        </div>
      ),
      cell: (info) => {
        const original = info.getValue();
        const edited = getEditedValueRef.current?.(info.row.original, col.name);
        const value = edited !== undefined ? edited : original;
        const dirty = isCellDirtyRef.current?.(info.row.original, col.name);
        const cellKey = `${info.row.index}-${col.name}`;
        const isEditing = editingCell === cellKey;

        if (editable && onEditCellRef.current) {
          const errorMsg = getCellErrorRef.current?.(info.row.original, col.name);

          // If not in editing mode, show read-only view with click to edit
          if (!isEditing) {
            return (
              <div
                className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-indigo-900/20 px-2 py-1 -mx-2 -my-1 rounded ${
                  dirty ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''
                }`}
                onClick={() => setEditingCell(cellKey)}
                onDoubleClick={() => setEditingCell(cellKey)}
                title={`Click to edit: ${value ?? ''}`}
              >
                <CellRenderer value={value} columnType={col.type} />
                {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
              </div>
            );
          }

          // In editing mode, show the editor
          // FK editor when column has FK key hint
          if (col.key === 'MUL' && connectionId && database && table) {
            return (
              <div className={`${dirty ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-white dark:bg-slate-700'} rounded px-1 -mx-1`}>
                <FKEditor
                  connectionId={connectionId}
                  database={database}
                  table={table}
                  column={col.name}
                  value={value}
                  onChange={(v) => onEditCellRef.current?.(info.row.original, col, v)}
                />
                {errorMsg && <div className="text-xs text-red-600 mt-1">{errorMsg}</div>}
              </div>
            );
          }
          // Type-specific editors: boolean/date/datetime/number/text
          const isNumeric = /int|decimal|float|double|numeric/i.test(col.type);
          const isBoolean = /tinyint\(1\)|bool|boolean/i.test(col.type);
          const isDate = /^date$/i.test(col.type);
          const isDateTime = /datetime|timestamp/i.test(col.type);
          const isJSON = /json/i.test(col.type);
          const enumParsed = parseEnumOptions(col.type);
          const isEnum = !!enumParsed && enumParsed.kind === 'enum';
          const isSet = !!enumParsed && enumParsed.kind === 'set';
          const nullable = !!col.nullable;
          return (
            <div className={`${dirty ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-white dark:bg-slate-700'} rounded -mx-1 px-1`}>
              <div className="flex items-center gap-1">
              {isBoolean ? (
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={Boolean(value)}
                  onChange={(e) => onEditCellRef.current?.(info.row.original, col, e.target.checked ? 1 : 0)}
                  onBlur={() => setEditingCell(null)}
                  autoFocus
                />
              ) : isDate ? (
                <input
                  type="date"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white"
                  value={value ? String(value).slice(0, 10) : ''}
                  onChange={(e) => onEditCellRef.current?.(info.row.original, col, e.target.value || null)}
                  onBlur={() => setEditingCell(null)}
                  autoFocus
                />
              ) : isDateTime ? (
                <input
                  type="datetime-local"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white"
                  value={value ? toLocalInputDateTime(String(value)) : ''}
                  onChange={(e) => {
                    const v = e.target.value; // YYYY-MM-DDTHH:mm
                    onEditCellRef.current?.(
                      info.row.original,
                      col,
                      v ? v.replace('T', ' ') + ':00' : null
                    );
                  }}
                  onBlur={() => setEditingCell(null)}
                  autoFocus
                />
              ) : isEnum ? (
                <select
                  className="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white"
                  value={value ?? ''}
                  onChange={(e) => onEditCellRef.current?.(info.row.original, col, e.target.value)}
                  onBlur={() => setEditingCell(null)}
                  autoFocus
                >
                  <option value="">--</option>
                  {enumParsed!.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : isSet ? (
                <select
                  multiple
                  className="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-white"
                  value={Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean)}
                  onChange={(e) => {
                    const selected = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
                    onEditCellRef.current?.(info.row.original, col, selected.join(','));
                  }}
                  onBlur={() => setEditingCell(null)}
                  autoFocus
                >
                  {enumParsed!.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : isJSON ? (
                <textarea
                  className={`w-full border rounded px-2 py-1 text-sm ${isValidJSON(value) ? 'border-gray-300 dark:border-slate-600' : 'border-red-500'} bg-white dark:bg-slate-700 dark:text-white`}
                  rows={3}
                  value={value ?? ''}
                  onChange={(e) => onEditCellRef.current?.(info.row.original, col, e.target.value)}
                  onBlur={() => setEditingCell(null)}
                  placeholder='{"key": "value"}'
                  autoFocus
                />
              ) : (
                <input
                  type={isNumeric ? 'number' : 'text'}
                  className={`w-full border rounded px-2 py-1 text-sm ${errorMsg ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} bg-white dark:bg-slate-700 dark:text-white`}
                  value={value ?? ''}
                  onChange={(e) => {
                    const v = isNumeric ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                    onEditCellRef.current?.(info.row.original, col, v);
                  }}
                  onBlur={() => setEditingCell(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setEditingCell(null);
                    } else {
                      handleCopyColumn(e, col.name);
                    }
                  }}
                  onPaste={(e) => handlePasteToColumn(e, col.name, info.row.index)}
                  autoFocus
                />
              )}
              {nullable && (
                <button
                  type="button"
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 whitespace-nowrap"
                  onClick={() => {
                    onEditCellRef.current?.(info.row.original, col, null);
                    setEditingCell(null);
                  }}
                  title="Set NULL"
                >
                  NULL
                </button>
              )}
              {errorMsg && <div className="text-xs text-red-600 ml-2" title={errorMsg}>!</div>}
              </div>
            </div>
          );
        }
        return <CellRenderer value={value} columnType={col.type} />;
      },
      meta: {
        type: col.type,
        nullable: col.nullable,
      },
    }));
  // Keep deps minimal to avoid remounting editors on each keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnInfo, editable, connectionId, database, table, sortBy, editingCell]);

  const sortingState = useMemo(() => (sortBy || []).map((s) => ({ id: s.column, desc: s.direction === 'DESC' })), [sortBy]);
  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    defaultColumn: {
      minSize: 120, // Minimum column width
      maxSize: 400, // Maximum column width
    },
    state: {
      columnVisibility,
      rowSelection,
      columnSizing,
      columnOrder,
      sorting: sortingState,
    },
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      const mapped = (next || []).map((s: any) => ({
        column: String(s.id),
        direction: (s.desc ? 'DESC' : 'ASC') as 'ASC' | 'DESC'
      }));
      onSortChange(mapped);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // Virtual scrolling setup
  const rows = tableInstance.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 53, // Estimated row height in pixels (px-4 py-3 = ~53px)
    overscan: 10, // Render 10 extra rows above and below viewport for smooth scrolling
  });

  // Calculate total table width for consistent column alignment
  const totalTableWidth = useMemo(() => {
    const checkboxWidth = 48;
    const columnsWidth = tableInstance.getAllLeafColumns().reduce(
      (sum, col) => sum + col.getSize(),
      0
    );
    return checkboxWidth + columnsWidth;
  }, [tableInstance, columnSizing]);

  // Copy/paste helpers scoped to this component
  const handlePasteToColumn = (e: React.ClipboardEvent<HTMLInputElement>, columnName: string, rowIndex: number) => {
    if (!editable || !onEditCell) return;
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const lines = splitLines(text).filter((l) => l.length > 0);
    if (lines.length <= 1 && selectedRows.length <= 1) return; // normal paste into single cell
    e.preventDefault();
    // Determine start index based on the focused row
    const startIdx = rowIndex;
    const allRows = tableInstance.getRowModel().rows.map((r) => r.original as TableDataRow);
    const targets = selectedRows.length > 0 ? selectedRows : allRows.slice(startIdx, startIdx + lines.length);
    targets.forEach((r, i) => {
      const val = lines[i] !== undefined ? lines[i] : lines[lines.length - 1];
      const col = columnInfo.find((c) => c.name === columnName)!;
      onEditCell(r, col, val);
    });
  };

  const handleCopyColumn = async (e: React.KeyboardEvent<HTMLInputElement>, columnName: string) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
    if (selectedRows.length <= 1) return; // let default copy when single
    try {
      const values = selectedRows.map((r) => String((r as any)[columnName] ?? ''));
      await navigator.clipboard.writeText(values.join('\n'));
      e.preventDefault();
    } catch {
      // ignore
    }
  };

  // Handle drag end for column reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Notify parent of selection changes (side-effect)
  useEffect(() => {
    if (!onSelectionChange) return;
    const selected = tableInstance.getSelectedRowModel().rows.map((row) => row.original);
    onSelectionChange(selected);
    // Intentionally omit tableInstance and onSelectionChange to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  // Notify parent of available columns for visibility control
  useEffect(() => {
    if (!onColumnsReady) return;
    const cols = tableInstance.getAllLeafColumns().map((col) => ({
      id: col.id,
      isVisible: col.getIsVisible(),
      toggle: col.getToggleVisibilityHandler(),
    }));
    onColumnsReady(cols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnVisibility, columnInfo]);

  // Custom sort handler: click to toggle between DESC and ASC
  const handleColumnSort = (columnId: string) => {
    if (!onSortChange) return;

    const currentSort = sortBy.find((s) => s.column === columnId);

    if (!currentSort) {
      // No sort on this column, start with DESC
      onSortChange([{ column: columnId, direction: 'DESC' }]);
    } else if (currentSort.direction === 'DESC') {
      // Currently DESC, switch to ASC
      onSortChange([{ column: columnId, direction: 'ASC' }]);
    } else {
      // Currently ASC, switch back to DESC
      onSortChange([{ column: columnId, direction: 'DESC' }]);
    }
  };

  const getSortIcon = (headerId: string) => {
    const sort = sortBy.find((s) => s.column === headerId);
    if (!sort) return null;

    const arrow = sort.direction === 'ASC' ? (
      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 10l5-5 5 5H5z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M15 10l-5 5-5-5h10z" />
      </svg>
    );
    return (
      <span className="flex items-center gap-1 animate-pulse">
        {arrow}
      </span>
    );
  };

  const handleFilterChange = (columnId: string, operator: FilterCondition['operator'], value?: any) => {
    if (!onFilterChange) return;

    // Remove existing filter for this column
    const newFilters = filters.filter((f) => f.column !== columnId);

    // Add new filter if value is provided
    if (value !== undefined && value !== '') {
      newFilters.push({
        column: columnId,
        operator,
        value,
      });
    }

    onFilterChange(newFilters);
  };

  const getFilterValue = (columnId: string): string => {
    const filter = filters.find((f) => f.column === columnId);
    return filter?.value?.toString() || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-gray-200 dark:border-slate-700 rounded">
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-gray-600 font-medium">No data found</p>
          <p className="text-gray-500 text-sm">This table is empty</p>
        </div>
      </div>
    );
  }

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 h-full w-full overflow-hidden" onClick={() => setContextMenu(null)}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-lg shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden" style={{ maxWidth: '100%' }}>
          {/* Header section (fixed) */}
          <div
            ref={headerContainerRef}
            className="overflow-x-scroll flex-shrink-0 hide-scrollbar bg-white dark:bg-slate-900"
            style={{
              overflowY: 'hidden',
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
              maxWidth: '100%',
            }}
          >
            <table className="text-sm bg-white dark:bg-slate-900" style={{ tableLayout: 'fixed', width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
              <colgroup>
                <col style={{ width: '48px' }} />
                {tableInstance.getAllLeafColumns().map((column) => (
                  <col key={column.id} style={{ width: `${column.getSize()}px` }} />
                ))}
              </colgroup>
              <thead className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-b-2 border-gray-300 dark:border-slate-600">
            {tableInstance.getHeaderGroups().map((headerGroup) => (
                <Fragment key={headerGroup.id}>
                  {/* Header row */}
                  <tr key={headerGroup.id}>
                    {/* Selection checkbox column */}
                    <th className="px-4 py-3" style={{ width: '48px', maxWidth: '48px', minWidth: '48px' }}>
                      <input
                        type="checkbox"
                        checked={tableInstance.getIsAllRowsSelected()}
                        ref={(el) => { if (el) el.indeterminate = tableInstance.getIsSomeRowsSelected(); }}
                        onChange={tableInstance.getToggleAllRowsSelectedHandler()}
                        className="w-4 h-4"
                      />
                    </th>
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {headerGroup.headers.map((header) => (
                        <DraggableHeaderCell key={header.id} header={header}>
                          <>
                            <button
                              type="button"
                              className="flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-gray-200 select-none flex-1 text-left font-semibold text-gray-700 dark:text-white hover:scale-105 transition-transform"
                              onClick={(e) => { e.stopPropagation(); handleColumnSort(header.id); }}
                              title="Click to sort: Toggle between DESC ▼ and ASC ▲"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {getSortIcon(header.id)}
                            </button>
                            {/* Resize handle */}
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-blue-500 ${
                                header.column.getIsResizing() ? 'bg-blue-500' : ''
                              }`}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            />
                          </>
                        </DraggableHeaderCell>
                      ))}
                    </SortableContext>
                </tr>

                {/* Filter row */}
                {showFilters && (
                  <tr key={`${headerGroup.id}-filter`} className="bg-gray-100 dark:bg-slate-800">
                    <th className="px-4 py-2" style={{ width: '48px', maxWidth: '48px', minWidth: '48px' }}></th>
                    {headerGroup.headers.map((header) => {
                      const colInfo = columnInfo.find((col) => col.name === header.id);
                      return (
                        <th
                          key={`${header.id}-filter`}
                          className="px-4 py-2"
                          style={{ width: `${header.getSize()}px`, maxWidth: `${header.getSize()}px`, minWidth: `${header.getSize()}px` }}
                        >
                          <ColumnFilter
                            columnId={header.id}
                            columnType={colInfo?.type || 'text'}
                            value={getFilterValue(header.id)}
                            onChange={(operator, value) =>
                              handleFilterChange(header.id, operator, value)
                            }
                          />
                        </th>
                      );
                    })}
                  </tr>
                )}
              </Fragment>
            ))}
              </thead>
            </table>
          </div>

          {/* Virtual scrolling body */}
          <div
            ref={tableContainerRef}
            className="flex-1 bg-white dark:bg-slate-900"
            style={{
              overflow: 'auto',
              maxWidth: '100%',
            }}
          >
            <table className="text-sm bg-white dark:bg-slate-900" style={{ tableLayout: 'fixed', width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
              <colgroup>
                <col style={{ width: '48px' }} />
                {tableInstance.getAllLeafColumns().map((column) => (
                  <col key={column.id} style={{ width: `${column.getSize()}px` }} />
                ))}
              </colgroup>
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      onClick={() => row.toggleSelected()}
                      className={`border-b border-gray-200 dark:border-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-slate-700/30 dark:hover:to-slate-700/30 hover:shadow-sm transition-all cursor-pointer ${
                        row.getIsSelected()
                          ? 'bg-blue-100 dark:bg-slate-700/40 shadow-md'
                          : virtualRow.index % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-gray-50 dark:bg-slate-800'
                      }`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Selection checkbox */}
                      <td className="px-4 py-3" style={{ width: '48px', maxWidth: '48px', minWidth: '48px' }}>
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 border-r border-gray-100 dark:border-slate-700 last:border-r-0 overflow-hidden"
                          style={{ width: `${cell.column.getSize()}px`, maxWidth: `${cell.column.getSize()}px`, minWidth: `${cell.column.getSize()}px` }}
                        >
                          <div className="truncate">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DndContext>

    {/* Cell context menu */}
    {contextMenu && (
      <div
        className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow text-sm"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseLeave={() => setContextMenu(null)}
      >
        <button
          className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
          onClick={async () => {
            try { await navigator.clipboard.writeText(String((contextMenu.row as any)[contextMenu.column!.name] ?? '')); } catch {}
            setContextMenu(null);
          }}
        >Copy Cell</button>
        <button
          className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
          onClick={async () => {
            try {
              const txt = await navigator.clipboard.readText();
              const col = contextMenu.column!;
              onEditCell?.(contextMenu.row, col, txt);
            } catch {}
            setContextMenu(null);
          }}
        >Paste</button>
        {contextMenu.column && contextMenu.column.nullable !== false && (
          <button
            className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={() => { onEditCell?.(contextMenu.row, contextMenu.column!, null); setContextMenu(null); }}
          >Set NULL</button>
        )}
        <button
          className="block w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
          onClick={async () => {
            const cols = tableInstance.getAllLeafColumns().map((c) => c.id as string);
            const csv = buildCSV([contextMenu.row], cols);
            try { await navigator.clipboard.writeText(csv); } catch {}
            setContextMenu(null);
          }}
        >Copy Row (CSV)</button>
      </div>
    )}
    </div>
  );
}

function toLocalInputDateTime(value: string): string {
  try {
    if (!value) return '';
    if (value.includes('T')) return value.slice(0, 16);
    const parts = value.trim().split(/\s+/);
    if (parts.length === 2) {
      const [d, t] = parts;
      return `${d}T${t.slice(0, 5)}`;
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }
  } catch {}
  return '';
}

/**
 * Draggable Header Cell - Wraps a header cell with drag-and-drop functionality
 */
function DraggableHeaderCell({
  header,
  children,
}: {
  header: any;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: `${header.getSize()}px`,
    maxWidth: `${header.getSize()}px`,
    minWidth: `${header.getSize()}px`,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 text-left bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-indigo-700/30 dark:hover:to-indigo-800/30 transition-all duration-200 relative border-r border-gray-200 dark:border-slate-600 last:border-r-0"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle - only this area triggers drag */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 flex-shrink-0 transition-colors"
          title="Drag to reorder columns"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
          </svg>
        </div>
        {/* Content area - clicks work normally here */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </th>
  );
}

/**
 * Column Filter Component - Renders filter inputs based on column type
 */
function ColumnFilter({
  columnId,
  columnType,
  value,
  onChange,
}: {
  columnId: string;
  columnType: string;
  value: string;
  onChange: (operator: FilterCondition['operator'], value: any) => void;
}) {
  // Determine if column is numeric
  const isNumeric = /int|decimal|float|double|numeric/i.test(columnType);
  const isDate = /date|time/i.test(columnType);

  // Set default operator based on type
  const defaultOperator = isNumeric || isDate ? '=' : 'LIKE';

  const [localValue, setLocalValue] = useState(value);
  const [operator, setOperator] = useState<FilterCondition['operator']>(defaultOperator);

  // Sync local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    if (localValue === '') {
      onChange(operator, undefined);
    } else {
      onChange(operator, localValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onChange(operator, undefined);
  };

  if (isNumeric) {
    return (
      <div className="flex gap-1">
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as FilterCondition['operator'])}
          className="text-xs border border-gray-300 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-700 dark:text-white"
        >
          <option value="=">=</option>
          <option value="!=">≠</option>
          <option value="<">&lt;</option>
          <option value=">">&gt;</option>
          <option value="<=">≤</option>
          <option value=">=">≥</option>
        </select>
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          onBlur={handleApply}
          placeholder="Filter..."
          className="flex-1 text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 min-w-0 bg-white dark:bg-slate-700 dark:text-white"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  if (isDate) {
    return (
      <div className="flex gap-1">
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value as FilterCondition['operator'])}
          className="text-xs border border-gray-300 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-700 dark:text-white"
        >
          <option value="=">=</option>
          <option value="!=">≠</option>
          <option value="<">Before</option>
          <option value=">">After</option>
        </select>
        <input
          type="date"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleApply}
          className="flex-1 text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 min-w-0 bg-white dark:bg-slate-700 dark:text-white"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  // Text filter (default)
  return (
    <div className="flex gap-1">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        onBlur={handleApply}
        placeholder="Filter..."
        className="flex-1 text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 min-w-0 bg-white dark:bg-slate-700 dark:text-white"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-gray-700 px-1"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * Cell Renderer - Handles different data types
 */
function CellRenderer({
  value,
  columnType,
}: {
  value: any;
  columnType: string;
}) {
  // Handle NULL values
  if (value === null || value === undefined) {
    return (
      <span className="text-gray-400 italic font-mono text-xs">NULL</span>
    );
  }

  // Handle JSON data
  if (typeof value === 'object') {
    try {
      const jsonStr = JSON.stringify(value);
      return (
        <span className="font-mono text-xs text-purple-600 block truncate" title={jsonStr}>
          {jsonStr}
        </span>
      );
    } catch {
      return <span className="text-gray-500">[Object]</span>;
    }
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${
          value
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {value ? 'TRUE' : 'FALSE'}
      </span>
    );
  }

  // Handle numbers
  if (typeof value === 'number') {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  // Handle all text as single line with ellipsis
  const stringValue = String(value);
  return (
    <span className="block truncate" title={stringValue}>
      {stringValue}
    </span>
  );
}
function isValidJSON(v: any): boolean {
  if (v == null || v === '') return true;
  try {
    JSON.parse(typeof v === 'string' ? v : JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

function parseEnumOptions(type: string): { kind: 'enum' | 'set'; options: string[] } | null {
  if (!type) return null;
  const m = type.match(/^(enum|set)\((.*)\)$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase() as 'enum' | 'set';
  const inner = m[2];
  const re = /'([^']*)'/g;
  const options: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    options.push(match[1].replace(/''/g, "'"));
  }
  return { kind, options };
}

function buildCSV(rows: TableDataRow[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((row) => {
    return columns.map((col) => {
      const val = (row as any)[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  }).join('\n');
  return `${header}\n${body}`;
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}
