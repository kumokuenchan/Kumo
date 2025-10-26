import { useState, useEffect } from 'react';
import DataGrid from './DataGrid';
import PaginationControls from './PaginationControls';
import { useTableData, useTableStats, useExportData, useRefreshTableData } from '../../hooks/useDataViewer';
import { useTableColumns } from '../../hooks/useDataViewer';
import { useUpdateRow } from '../../hooks/useDataEditing';
import { dataEditingApi } from '../../api/dataEditing';
import BulkEditDialog from './BulkEditDialog';
import ImportDialog from '../data/ImportDialog';
import ExportDataDialog from '../data/ExportDataDialog';
import GenerateDataDialog from './GenerateDataDialog';
import Toast from '../../components/Toast';
import type { DataViewerQuery, SortOption, FilterCondition } from '../../types/dataViewer';

interface DataViewerProps {
  connectionId: string;
  database: string;
  table: string;
}

export default function DataViewer({
  connectionId,
  database,
  table,
}: DataViewerProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<SortOption[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  // Reset paging when search/filters/sort change
  useEffect(() => {
    setPage(1);
  }, [search, filters, sortBy]);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  // Reset sorting when table or database changes
  useEffect(() => {
    setSortBy([]);
    setSortColumn('');
    setSortDirection('ASC');
  }, [database, table]);

  // Build query
  const query: DataViewerQuery = {
    database,
    table,
    page,
    pageSize,
    sort: sortBy.length > 0 ? sortBy : undefined,
    search: search || undefined,
    filters: filters.length > 0 ? filters : undefined,
  };

  // Fetch data
  const { data: tableData, isLoading, error } = useTableData(connectionId, query);
  const { data: statsData } = useTableStats(connectionId, database, table);
  const exportMutation = useExportData();
  const refresh = useRefreshTableData();
  const updateRowMutation = useUpdateRow();
  const { data: columnsInfo } = useTableColumns(connectionId, database, table);
  const columns = columnsInfo?.columns || [];

  // Keep previous data while loading new data
  const [previousData, setPreviousData] = useState<typeof tableData>(null);
  useEffect(() => {
    // Save data immediately when it's available, regardless of loading state
    if (tableData) {
      setPreviousData(tableData);
    }
  }, [tableData]);

  // Use current data if available, otherwise show previous data
  const displayData = (isLoading && !tableData) ? previousData : tableData;

  // In-memory edits map: rowKey -> { changes }
  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});
  // Per-cell error map: rowKey -> { columnName: message }
  const [cellErrors, setCellErrors] = useState<Record<string, Record<string, string>>>({});

  // Primary key columns
  const pkColumns = columns.filter((c: any) => c.key === 'PRI').map((c: any) => c.name);

  const makeRowKey = (row: any) => {
    if (pkColumns.length === 0) return JSON.stringify(row);
    const parts = pkColumns.map((k) => String(row[k]));
    return `${table}|${parts.join('|')}`;
  };

  const getEditedValue = (row: any, columnName: string) => {
    const key = makeRowKey(row);
    return edits[key]?.[columnName];
  };

  const isCellDirty = (row: any, columnName: string) => {
    const key = makeRowKey(row);
    return edits[key] && Object.prototype.hasOwnProperty.call(edits[key], columnName);
  };

  const [undoStack, setUndoStack] = useState<Array<{ rowKey: string; column: string; prev: any; next: any }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ rowKey: string; column: string; prev: any; next: any }>>([]);

  const onEditCell = (row: any, column: any, value: any) => {
    const key = makeRowKey(row);
    const prevVal = getEditedValue(row, column.name) ?? row[column.name];
    setEdits((prev) => {
      const next = { ...prev };
      const rowEdits = { ...(next[key] || {}) };
      rowEdits[column.name] = value;
      next[key] = rowEdits;
      return next;
    });
    setUndoStack((s) => [...s, { rowKey: key, column: column.name, prev: prevVal, next: value }]);
    setRedoStack([]);
    // Clear error for this cell on edit
    setCellErrors((prev) => {
      if (!prev[key]?.[column.name]) return prev;
      const n = { ...prev } as Record<string, Record<string, string>>;
      const rowMap = { ...(n[key] || {}) };
      delete rowMap[column.name];
      n[key] = rowMap;
      return n;
    });
  };

  const hasEdits = Object.keys(edits).length > 0;
  const [newRows, setNewRows] = useState<any[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<Array<{ id: string; isVisible: boolean; toggle: () => void }>>([]);
  const [showGenerateDataDialog, setShowGenerateDataDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleCommit = async () => {
    if (!hasEdits) return;
    try {
      let updatedCount = 0;
      let insertedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Existing rows updates (batch)
      const updates: Array<{ key: Record<string, any>; changes: Record<string, any> }> = [];
      for (const [rowKey, changes] of Object.entries(edits)) {
        if (rowKey.includes('|__temp:')) continue; // skip new rows
        const row = result?.rows.find((r: any) => makeRowKey(r) === rowKey);
        if (!row) continue;
        if (pkColumns.length === 0) throw new Error('Cannot commit without a primary key on this table');
        const key: Record<string, any> = {};
        pkColumns.forEach((k) => (key[k] = row[k]));
        updates.push({ key, changes });
      }
      if (updates.length > 0) {
        const res = await dataEditingApi.batchUpdate(connectionId, database, table, updates, true);
        if (res && Array.isArray((res as any).results)) {
          const results = (res as any).results as Array<{ success: boolean; error?: string }>;
          const nextErrors: Record<string, Record<string, string>> = { ...cellErrors };
          results.forEach((r, i) => {
            const upd = updates[i];
            if (!upd) return;
            const matched = result?.rows.find((rr: any) => pkColumns.every((k) => rr[k] === upd.key[k]));
            const rk = matched ? makeRowKey(matched) : undefined;
            if (!rk) return;
            if (!r.success) {
              const msg = r.error || 'Update failed';
              const rowErr = { ...(nextErrors[rk] || {}) } as Record<string, string>;
              Object.keys(upd.changes || {}).forEach((c) => { rowErr[c] = msg; });
              nextErrors[rk] = rowErr;
              errorCount++;
              if (errors.length < 3 && !errors.includes(msg)) {
                errors.push(msg);
              }
            } else {
              updatedCount++;
              if (nextErrors[rk]) {
                const cleaned = { ...nextErrors[rk] } as Record<string, string>;
                Object.keys(upd.changes || {}).forEach((c) => delete cleaned[c]);
                nextErrors[rk] = cleaned;
              }
            }
          });
          setCellErrors(nextErrors);
        }
      }
      // New rows inserts
      for (const newRow of newRows) {
        const key = makeRowKey(newRow);
        const changes = edits[key] || {};
        let values: Record<string, any> = { ...changes };
        if (Object.keys(values).length === 0) {
          columns.forEach((c: any) => {
            if (c.default !== null && c.default !== undefined) values[c.name] = c.default;
          });
        }
        if (Object.keys(values).length === 0) continue;
        try {
          await dataEditingApi.insertRow(connectionId, database, table, values);
          insertedCount++;
        } catch (e: any) {
          const msg = e?.message || 'Insert failed';
          const rowErr: Record<string, string> = {};
          Object.keys(values).forEach((c) => { rowErr[c] = msg; });
          setCellErrors((prev) => ({ ...prev, [key]: rowErr }));
          errorCount++;
          if (errors.length < 3 && !errors.includes(msg)) {
            errors.push(msg);
          }
        }
      }
      setEdits({}); setNewRows([]); setSelectedKeys(new Set());
      refresh(connectionId, database, table);

      // Show toast notification
      if (errorCount === 0) {
        let message = 'Successfully committed changes';
        if (updatedCount > 0 && insertedCount > 0) {
          message = `Successfully updated ${updatedCount} row(s) and inserted ${insertedCount} row(s)`;
        } else if (updatedCount > 0) {
          message = `Successfully updated ${updatedCount} row(s)`;
        } else if (insertedCount > 0) {
          message = `Successfully inserted ${insertedCount} row(s)`;
        }
        setToast({ message, type: 'success' });
      } else {
        let message = `Committed with errors: ${updatedCount + insertedCount} succeeded, ${errorCount} failed`;
        if (errors.length > 0) {
          message += '\n\nErrors:\n• ' + errors.join('\n• ');
        }
        setToast({ message, type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Failed to commit changes', type: 'error' });
    }
  };

  const handleRollback = () => {
    setEdits({}); setNewRows([]); setSelectedKeys(new Set());
  };

  const handleAddRow = () => {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const base: any = { __isNew: true, __tempId: tempId };
    // Prefill defaults from schema if present
    columns.forEach((c: any) => {
      if (c.default !== null && c.default !== undefined) base[c.name] = c.default;
    });
    setNewRows((prev) => [base, ...prev]);
  };

  const handleDeleteRows = async () => {
    try {
      // Check for primary key first
      const existingSelected = (result?.rows || []).filter((r: any) => selectedKeys.has(makeRowKey(r)));
      if (existingSelected.length > 0 && pkColumns.length === 0) {
        setToast({ message: 'Cannot delete without a primary key on this table', type: 'error' });
        return;
      }

      let deletedCount = 0;
      let newRowsDeleted = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Remove selected new rows locally
      const newRowsToDelete = newRows.filter((r) => selectedKeys.has(makeRowKey(r)));
      newRowsDeleted = newRowsToDelete.length;
      setNewRows((prev) => prev.filter((r) => !selectedKeys.has(makeRowKey(r))));

      // Delete existing rows via API
      for (const row of existingSelected) {
        const keyObj: Record<string, any> = {};
        pkColumns.forEach((k) => (keyObj[k] = row[k]));
        try {
          await (await import('../../api/dataEditing')).dataEditingApi.deleteRow(connectionId, database, table, keyObj);
          deletedCount++;
        } catch (e: any) {
          failedCount++;
          const msg = e?.message || 'Delete failed';
          if (errors.length < 3 && !errors.includes(msg)) {
            errors.push(msg);
          }
        }
      }

      // Clear edits for deleted rows
      setEdits((prev) => {
        const next = { ...prev} as Record<string, Record<string, any>>;
        for (const k of Array.from(selectedKeys)) delete next[k];
        return next;
      });
      setSelectedKeys(new Set());
      refresh(connectionId, database, table);

      // Show toast notification
      const totalDeleted = deletedCount + newRowsDeleted;
      if (failedCount === 0 && totalDeleted > 0) {
        setToast({ message: `Successfully deleted ${totalDeleted} row(s)`, type: 'success' });
      } else if (failedCount > 0) {
        let message = `Deleted ${deletedCount} row(s), failed to delete ${failedCount} row(s)`;
        if (errors.length > 0) {
          message += '\n\nErrors:\n• ' + errors.join('\n• ');
        }
        setToast({ message, type: 'error' });
      }
    } catch (e: any) {
      setToast({ message: e?.message || 'Failed to delete rows', type: 'error' });
    }
  };

  const handleGenerateData = async (rowCount: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/data-editing/${connectionId}/generate-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database, table, rowCount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate data');
      }

      const result = await response.json();

      // Show detailed results
      let message = `Successfully generated ${result.rowsGenerated} rows of dummy data`;
      if (result.failedRows > 0) {
        message += `\n\nFailed to insert ${result.failedRows} rows`;
        if (result.errors && result.errors.length > 0) {
          message += ':\n• ' + result.errors.join('\n• ');
        }
      }

      setToast({ message, type: result.failedRows > 0 ? 'info' : 'success' });
      refresh(connectionId, database, table);
    } catch (e: any) {
      setToast({ message: e?.message || 'Failed to generate dummy data', type: 'error' });
      throw e;
    }
  };

  // Reset page when filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [search, sortBy, filters]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
  };

  const handleSortChange = (newSort: SortOption[]) => {
    setSortBy(newSort);
    // Trigger a refresh to ensure new sort is applied immediately
    refresh(connectionId, database, table);
  };

  const handleFilterChange = (newFilters: FilterCondition[]) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleRefresh = () => {
    refresh(connectionId, database, table);
  };

  const handleExport = (format: 'csv' | 'json') => {
    exportMutation.mutate({
      connectionId,
      query: { ...query, format },
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 font-medium mb-2">Failed to load data</p>
          <p className="text-gray-600 text-sm mb-4">{(error as Error).message}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const result = displayData?.data;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Sort controls */}
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1.5 text-sm border border-gray-300 rounded"
              value={sortColumn}
              onChange={(e) => setSortColumn(e.target.value)}
            >
              <option value="">Sort updates</option>
              {columns.map((c: any) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              className="px-2 py-1.5 text-sm border border-gray-300 rounded"
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'ASC' | 'DESC')}
            >
              <option value="ASC">ASC</option>
              <option value="DESC">DESC</option>
            </select>
            <button
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              title="Apply sort"
              onClick={() => {
                if (sortColumn) setSortBy([{ column: sortColumn, direction: sortDirection }]);
              }}
            >
              Apply
            </button>
            <button
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              title="Clear sort"
              onClick={() => { setSortBy([]); setSortColumn(''); }}
            >
              Clear
            </button>

            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleAddRow}
                className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                title="Add row"
              >
                Add Row
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit selected rows"
                disabled={selectedKeys.size === 0}
              >
                Edit Row
              </button>
              <button
                onClick={handleDeleteRows}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete selected rows"
                disabled={selectedKeys.size === 0}
              >
                Delete Row
              </button>
              <button
                onClick={() => setShowGenerateDataDialog(true)}
                className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                title="Generate dummy data"
              >
                Generate Data
              </button>
            </div>
          </div>

          {/* Right: Search and controls */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search all columns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded w-64"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-sm rounded font-medium ${
                showFilters
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-white text-purple-600 hover:bg-purple-50 border border-purple-600'
              }`}
              title="Toggle column filters"
            >
              Filters
            </button>
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className={`px-3 py-1.5 text-sm rounded font-medium ${
                  showColumnMenu
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-600'
                }`}
                title="Show/hide columns"
              >
                Columns
              </button>
              {showColumnMenu && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <span className="text-sm font-semibold">Show/Hide Columns</span>
                      <button
                        onClick={() => setShowColumnMenu(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    {availableColumns.map((column) => (
                      <label
                        key={column.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={column.isVisible}
                          onChange={column.toggle}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{column.id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                const cols = columns.map((c: any) => c.name);
                const rows = [...newRows, ...(result?.rows || [])];
                const csv = buildCSV(rows, cols);
                try {
                  await navigator.clipboard.writeText(csv);
                  setToast({ message: 'Copied CSV to clipboard', type: 'success' });
                } catch (e: any) {
                  setToast({ message: e?.message || 'Failed to copy to clipboard', type: 'error' });
                }
              }}
              className="px-3 py-1.5 text-sm bg-white text-slate-600 rounded hover:bg-slate-50 border border-slate-600 font-medium"
              title="Copy CSV"
            >
              Copy CSV
            </button>

            {/* Import button */}
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-3 py-1.5 text-sm bg-white text-green-600 rounded hover:bg-green-50 border border-green-600 font-medium"
              title="Import data"
            >
              Import
            </button>

            {/* Export button */}
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-3 py-1.5 text-sm bg-white text-blue-600 rounded hover:bg-blue-50 border border-blue-600 font-medium"
              title="Export data"
            >
              Export
            </button>
          </div>
        </div>

        {/* Edits indicator */}
        {hasEdits && (
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">{Object.keys(edits).length} modified</span>
            <button
              onClick={handleCommit}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 font-medium disabled:opacity-50"
              disabled={updateRowMutation.isPending}
              title="Commit changes"
            >
              Commit
            </button>
            <button
              onClick={handleRollback}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
              title="Discard changes"
            >
              Rollback
            </button>
          </div>
        )}

        {/* Active filters display */}
        {(search || filters.length > 0 || sortBy.length > 0) && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {sortBy.length > 0 && sortBy.map((sort) => (
              <div
                key={sort.column}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center gap-2"
              >
                <span>Sort: {sort.column} {sort.direction}</span>
                <button
                  onClick={() => setSortBy([])}
                  className="hover:text-blue-900"
                  title="Clear sort"
                >
                  ×
                </button>
              </div>
            ))}
            {search && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center gap-2">
                <span>Search: {search}</span>
                <button
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                  }}
                  className="hover:text-blue-900"
                  title="Clear search"
                >
                  ×
                </button>
              </div>
            )}
            {filters.map((filter) => (
              <div
                key={filter.column}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center gap-2"
              >
                <span>Filter: {filter.column} {filter.operator} {filter.value}</span>
                <button
                  onClick={() => setFilters(filters.filter((f) => f.column !== filter.column))}
                  className="hover:text-blue-900"
                  title="Remove filter"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 bg-white rounded-lg shadow-xl px-6 py-4 border-2 border-blue-300">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-gray-700">Loading data...</p>
            </div>
          </div>
        )}

        {/* Combine new rows with existing */}
        {(() => {
          const combinedRows = [...newRows, ...(result?.rows || [])];
          return (
          <div className="flex-1 min-h-0">
            <DataGrid
              data={combinedRows}
              columns={(columns as any) || (result?.columns || [])}
              isLoading={isLoading}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            editable={columns.length > 0}
            getEditedValue={getEditedValue}
            onEditCell={onEditCell}
            isCellDirty={isCellDirty}
            onSelectionChange={(rows) => {
              const keys = new Set<string>();
              for (const r of rows as any[]) keys.add(makeRowKey(r));
              setSelectedKeys(keys);
              setSelectedRows(rows as any[]);
            }}
            connectionId={connectionId}
            database={database}
            table={table}
            selectedRows={selectedRows}
            getCellError={(row, col) => {
              const rk = makeRowKey(row);
              return cellErrors[rk]?.[col];
            }}
            showFilters={showFilters}
            showColumnMenu={showColumnMenu}
            onShowColumnMenuChange={setShowColumnMenu}
            onColumnsReady={setAvailableColumns}
            />
          </div>
          );
        })()}
      </div>

      {/* Pagination */}
      {result && (
        <PaginationControls
          currentPage={result.page}
          totalPages={result.totalPages}
          pageSize={result.pageSize}
          totalRows={result.totalRows}
          hasNextPage={result.hasNextPage}
          hasPreviousPage={result.hasPreviousPage}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
      <BulkEditDialog
        isOpen={bulkOpen}
        columns={columns}
        onClose={() => setBulkOpen(false)}
        onApply={(col, val) => {
          setBulkOpen(false);
          setEdits((prev) => {
            const next = { ...prev } as Record<string, Record<string, any>>;
            const allRows = [...newRows, ...(result?.rows || [])];
            for (const r of allRows) {
              const rk = makeRowKey(r);
              if (!selectedKeys.has(rk)) continue;
              const rowEdits = { ...(next[rk] || {}) };
              const prevVal = getEditedValue(r, col) ?? (r as any)[col];
              rowEdits[col] = val;
              next[rk] = rowEdits;
              setUndoStack((s) => [...s, { rowKey: rk, column: col, prev: prevVal, next: val }]);
            }
            setRedoStack([]);
            return next;
          });
        }}
      />

      {/* Import Dialog */}
      <ImportDialog
        connectionId={connectionId}
        database={database}
        table={table}
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={() => {
          handleRefresh();
          setShowImportDialog(false);
        }}
      />

      {/* Export Dialog */}
      <ExportDataDialog
        connectionId={connectionId}
        database={database}
        table={table}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        whereClause={search}
      />

      {/* Generate Data Dialog */}
      <GenerateDataDialog
        isOpen={showGenerateDataDialog}
        onClose={() => setShowGenerateDataDialog(false)}
        onGenerate={handleGenerateData}
        tableName={table}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function buildCSV(rows: any[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows.map((row) => {
    return columns.map((col) => {
      const val = row[col];
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
