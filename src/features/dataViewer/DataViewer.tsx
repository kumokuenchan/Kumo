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

  const handleCommit = async () => {
    if (!hasEdits) return;
    try {
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
            } else if (nextErrors[rk]) {
              const cleaned = { ...nextErrors[rk] } as Record<string, string>;
              Object.keys(upd.changes || {}).forEach((c) => delete cleaned[c]);
              nextErrors[rk] = cleaned;
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
        } catch (e: any) {
          const msg = e?.message || 'Insert failed';
          const rowErr: Record<string, string> = {};
          Object.keys(values).forEach((c) => { rowErr[c] = msg; });
          setCellErrors((prev) => ({ ...prev, [key]: rowErr }));
        }
      }
      setEdits({}); setNewRows([]); setSelectedKeys(new Set());
      refresh(connectionId, database, table);
    } catch (e: any) {
      alert(e?.message || 'Failed to commit changes');
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
      // Remove selected new rows locally
      setNewRows((prev) => prev.filter((r) => !selectedKeys.has(makeRowKey(r))));
      // Delete existing rows via API
      const existingSelected = (result?.rows || []).filter((r: any) => selectedKeys.has(makeRowKey(r)));
      for (const row of existingSelected) {
        if (pkColumns.length === 0) {
          alert('Cannot delete without a primary key on this table');
          return;
        }
        const keyObj: Record<string, any> = {};
        pkColumns.forEach((k) => (keyObj[k] = row[k]));
        await (await import('../../api/dataEditing')).dataEditingApi.deleteRow(connectionId, database, table, keyObj);
      }
      // Clear edits for deleted rows
      setEdits((prev) => {
        const next = { ...prev } as Record<string, Record<string, any>>;
        for (const k of Array.from(selectedKeys)) delete next[k];
        return next;
      });
      setSelectedKeys(new Set());
      refresh(connectionId, database, table);
    } catch (e: any) {
      alert(e?.message || 'Failed to delete rows');
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

  const result = tableData?.data;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Table info */}
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {database}.{table}
              </h2>
              {statsData?.stats && (
                <div className="text-xs text-gray-500">
                  {statsData.stats.totalRows.toLocaleString()} rows •{' '}
                  {(statsData.stats.totalSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Active sort indicator */}
            {sortBy.length > 0 && (
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
                {sortBy.map((sort) => (
                  <div
                    key={sort.column}
                    className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded flex items-center gap-1"
                  >
                    <span>
                      Sort: {sort.column} {sort.direction}
                    </span>
                    <button
                      onClick={() => setSortBy([])}
                      className="hover:bg-purple-200 rounded"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Sort controls */}
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
              <select
                className="px-2 py-1 text-sm border border-gray-300 rounded"
                value={sortColumn}
                onChange={(e) => setSortColumn(e.target.value)}
              >
                <option value="">Sort column…</option>
                {columns.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                className="px-2 py-1 text-sm border border-gray-300 rounded"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'ASC' | 'DESC')}
              >
                <option value="ASC">ASC</option>
                <option value="DESC">DESC</option>
              </select>
              <button
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="Apply sort"
                onClick={() => {
                  if (sortColumn) setSortBy([{ column: sortColumn, direction: sortDirection }]);
                }}
              >
                Apply
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="Clear sort"
                onClick={() => { setSortBy([]); setSortColumn(''); }}
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              title="Add row"
            >
              + Add Row
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              title="Bulk edit selected rows"
              disabled={selectedKeys.size === 0}
            >
              Bulk Edit
            </button>
              <button
                onClick={handleDeleteRows}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                title="Delete selected rows"
                disabled={selectedKeys.size === 0}
              >
                Delete Row
              </button>
            </div>
            {hasEdits && (
              <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
                <span className="text-sm text-gray-700">{Object.keys(edits).length} row(s) modified</span>
              <button
                onClick={handleCommit}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                disabled={updateRowMutation.isPending}
                title="Commit changes"
              >
                Commit
              </button>
                <button
                  onClick={handleRollback}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Discard changes"
                >
                  Rollback
                </button>
              </div>
            )}
            {/* Search */}
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
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Search
              </button>
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Import button */}
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              title="Import data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import
            </button>

            {/* Export button */}
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              title="Export data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Active filters display */}
        {(search || filters.length > 0) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {search && (
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1">
                <span>Search: {search}</span>
                <button
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                  }}
                  className="hover:bg-blue-200 rounded"
                >
                  ×
                </button>
              </div>
            )}
            {filters.map((filter) => (
              <div
                key={filter.column}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1"
              >
                <span>
                  Filter: {filter.column} {filter.operator} {filter.value}
                </span>
                <button
                  onClick={() => setFilters(filters.filter((f) => f.column !== filter.column))}
                  className="hover:bg-green-200 rounded"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Combine new rows with existing */}
        {(() => {
          const combinedRows = [...newRows, ...(result?.rows || [])];
          return (
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
          />
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
    </div>
  );
}
