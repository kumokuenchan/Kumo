import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { QueryResult } from '../../api/query';

import { useQueryGenerator } from './components/QueryGenerator';
import PivotFullScreenOverlay from './components/PivotFullScreenOverlay';
import ResultTable from './components/ResultTable';
import PivotPanel from './components/PivotPanel';
import ContextMenu from './components/ContextMenu';
import ResultGridHeader from './components/ResultGridHeader';
import { useExportFunctions } from './components/ExportFunctions';
import { useResultTableColumns } from './components/TableColumns';
import { useCopyFunctions } from './components/CopyFunctions';
import { getCurrentTimeInTimezone, extractTableNames } from './components/QueryUtils';
import { usePivotFunctions } from './components/PivotFunctions';
import NonSelectResult from './components/NonSelectResult';
import ToastNotification from './components/ToastNotification';
import { useEditModeFunctions } from './components/EditModeFunctions';
import { useContextMenuLogic } from './components/ContextMenuLogic';
import { useDatabaseResolution } from './components/DatabaseResolution';

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
    getCurrentTimeInTimezone(selectedTimezone),
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

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle cell click - only for selection and context menu, not for editing
  const handleCellClick = (rowIndex: number, colName: string, event: React.MouseEvent) => {
    // Don't trigger any edit mode - only focus cell for copy operations
    if (!editableRef.current) {
      setFocusCell({ row: rowIndex, col: colName });
    }
  };

  // Use the EditModeFunctions hook for edit mode functionality
  const { enableEditMode, exitEditMode } = useEditModeFunctions({
    setEditable,
    setCanUserEnableEdit,
    setFocusCell,
    setToast,
  });

  // Use the ContextMenuLogic hook for context menu functionality
  const { contextMenuRef, contextMenuColumnRef, contextMenuCellValueRef } = useContextMenuLogic({
    contextMenu,
    setContextMenu,
  });

  // Note: Inline edit mode stays enabled once activated
  // Users can manually disable it if needed

  // Use the DatabaseResolution hook for database/table resolution
  const { effectiveDb, effectiveTable, columnsMeta, pkColumns } = useDatabaseResolution({
    connectionId,
    stableSourceSql,
    index,
  });
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
  const { generateUpdateQuery, generateCreateTableAs, generateInsertQuery, generateDeleteQuery } =
    useQueryGenerator({
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

  // Use the CopyFunctions hook for copy functionality
  const { generateRawQueryResult, copyCellValue, copyColumnNames, copyAsJSON, copyAsTSV } =
    useCopyFunctions({
      result,
      rows,
      rowSelection,
      selectedTimezone,
      stableSourceSql,
      contextMenuCellValueRef,
      setToast,
    });

  // Use the PivotFunctions hook for pivot functionality
  const { pivotRef, allColumns, pivotData, handleEscapeKey, exportPivotPNG } = usePivotFunctions({
    rows,
    result,
    showPivot,
    pivotRow,
    pivotCol,
    pivotVal,
    pivotAgg,
    setPivotRow,
    setPivotCol,
    setPivotVal,
    setPivotFullScreen,
  });

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
        <ToastNotification toast={toast} setToast={setToast} />
      </div>
    );
  }

  // For non-SELECT queries (INSERT, UPDATE, DELETE, DDL)
  return <NonSelectResult result={result} index={index} />;
}
