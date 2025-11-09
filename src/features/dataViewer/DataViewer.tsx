import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import DataGrid from "./DataGrid";
import PaginationControls from "./PaginationControls";
import {
  useTableData,
  useTableStats,
  useExportData,
  useRefreshTableData,
} from "../../hooks/useDataViewer";
import { useTableColumns } from "../../hooks/useDataViewer";
import { useUpdateRow } from "../../hooks/useDataEditing";
import { dataEditingApi } from "../../api/dataEditing";
import BulkEditDialog from "./BulkEditDialog";
import ImportDialog from "../data/ImportDialog";
import ExportDataDialog from "../data/ExportDataDialog";
import GenerateDataDialog from "./GenerateDataDialog";
import Toast from "../../components/Toast";
import type {
  DataViewerQuery,
  SortOption,
  FilterCondition,
} from "../../types/dataViewer";

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
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: -9999, y: -9999 }); // Hidden off-screen by default
  const [isPositioningComplete, setIsPositioningComplete] = useState(false);
  const columnMenuButtonRef = useRef<HTMLButtonElement>(null);
  const columnMenuDropdownRef = useRef<HTMLDivElement>(null);
  // Reset paging when search/filters/sort change
  useEffect(() => {
    setPage(1);
  }, [search, filters, sortBy]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("ASC");

  // Reset sorting when table or database changes
  useEffect(() => {
    setSortBy([]);
    setSortColumn("");
    setSortDirection("ASC");
  }, [database, table]);

  // Update dropdown position when column menu is shown
  useEffect(() => {
    if (showColumnMenu && columnMenuButtonRef.current) {
      setIsPositioningComplete(false); // Start positioning process

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const buttonRect = columnMenuButtonRef.current!.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        const dropdownWidth = 384; // 96 * 4 (sm:w-96 in Tailwind)
        const dropdownHeight = 484; // max-h-96 (24rem = 384px)
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const padding = 10;

        // Position dropdown below button, aligned to the right edge of button
        let x = buttonRect.right + scrollX - dropdownWidth + 30;
        let y = buttonRect.bottom + scrollY;

        // Ensure dropdown fits horizontally
        if (x < padding) {
          // If it goes off left edge, align with left edge of button
          x = buttonRect.left + scrollX;
        }
        if (x + dropdownWidth > screenWidth - padding) {
          // If still off right edge, align to right edge of screen
          x = screenWidth - dropdownWidth - padding;
        }

        // Ensure dropdown fits vertically
        if (y + dropdownHeight > screenHeight + scrollY - padding) {
          // Position above button if it doesn't fit below
          y = buttonRect.top + scrollY - dropdownHeight - 8;
        }
        if (y < padding + scrollY) {
          // If still off top edge, position at top of screen
          y = padding + scrollY;
        }

        // Final bounds check
        x = Math.max(padding, Math.min(x, screenWidth - dropdownWidth - padding));

        setDropdownPosition({ x, y });
        setIsPositioningComplete(true); // Positioning is complete
      });
    } else if (showColumnMenu) {
      // Fallback: position at center of screen if button ref is not available
      setIsPositioningComplete(false);

      requestAnimationFrame(() => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const dropdownWidth = 384;
        const dropdownHeight = 384;

        setDropdownPosition({
          x: Math.max(10, (screenWidth - dropdownWidth) / 2),
          y: Math.max(10, (screenHeight - dropdownHeight) / 2),
        });
        setIsPositioningComplete(true);
      });
    } else {
      // Hide dropdown when closed
      setIsPositioningComplete(false);
      setDropdownPosition({ x: -9999, y: -9999 });
    }
  }, [showColumnMenu]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColumnMenu) {
        const target = event.target as Node;

        // Check if click is inside button or dropdown
        const clickedButton = columnMenuButtonRef.current?.contains(target);
        const clickedDropdown = columnMenuDropdownRef.current?.contains(target);

        // Only close if clicked outside both button and dropdown
        if (!clickedButton && !clickedDropdown) {
          setShowColumnMenu(false);
        }
      }
    };

    if (showColumnMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showColumnMenu]);

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
  const {
    data: tableData,
    isLoading,
    error,
  } = useTableData(connectionId, query);
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
  const displayData = isLoading && !tableData ? previousData : tableData;

  // In-memory edits map: rowKey -> { changes }
  const [edits, setEdits] = useState<Record<string, Record<string, any>>>({});
  // Per-cell error map: rowKey -> { columnName: message }
  const [cellErrors, setCellErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  // Primary key columns
  const pkColumns = columns
    .filter((c: any) => c.key === "PRI")
    .map((c: any) => c.name);

  const makeRowKey = (row: any) => {
    if (pkColumns.length === 0) return JSON.stringify(row);
    const parts = pkColumns.map((k) => String(row[k]));
    return `${table}|${parts.join("|")}`;
  };

  const getEditedValue = (row: any, columnName: string) => {
    const key = makeRowKey(row);
    return edits[key]?.[columnName];
  };

  const isCellDirty = (row: any, columnName: string) => {
    const key = makeRowKey(row);
    return (
      edits[key] && Object.prototype.hasOwnProperty.call(edits[key], columnName)
    );
  };

  const [undoStack, setUndoStack] = useState<
    Array<{ rowKey: string; column: string; prev: any; next: any }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ rowKey: string; column: string; prev: any; next: any }>
  >([]);

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
    setUndoStack((s) => [
      ...s,
      { rowKey: key, column: column.name, prev: prevVal, next: value },
    ]);
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
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<
    Array<{
      id: string;
      isVisible: boolean;
      toggle: () => void;
      setVisible: (show: boolean) => void;
    }>
  >([]);
  // Track whether we've applied persisted visibility for this table
  const [appliedVisibility, setAppliedVisibility] = useState(false);
  const [columnMenuQuery, setColumnMenuQuery] = useState("");
  const [visibleFirst, setVisibleFirst] = useState<boolean>(() => {
    try {
      return localStorage.getItem("datagrid:colmenu:visibleFirst") !== "false";
    } catch {
      return true;
    }
  });
  // Sorting is off by default; user can enable via button
  const [sortEnabled, setSortEnabled] = useState(false);

  // Build storage key for column visibility per connection/db/table
  const getVisibilityStorageKey = () =>
    `datagrid:colvis:${connectionId}|${database}|${table}`;

  // Reset the applied flag when table context changes
  useEffect(() => {
    setAppliedVisibility(false);
  }, [connectionId, database, table]);

  // Apply persisted visibility once when columns become available
  useEffect(() => {
    if (appliedVisibility || availableColumns.length === 0) return;
    try {
      const raw = localStorage.getItem(getVisibilityStorageKey());
      if (raw) {
        const saved: Record<string, boolean> = JSON.parse(raw);
        availableColumns.forEach((c) => {
          if (Object.prototype.hasOwnProperty.call(saved, c.id)) {
            c.setVisible(!!saved[c.id]);
          }
        });
      }
    } catch {}
    setAppliedVisibility(true);
  }, [availableColumns, appliedVisibility]);

  // Persist visibility whenever it changes
  useEffect(() => {
    if (availableColumns.length === 0) return;
    try {
      const map: Record<string, boolean> = {};
      availableColumns.forEach((c) => {
        map[c.id] = !!c.isVisible;
      });
      localStorage.setItem(getVisibilityStorageKey(), JSON.stringify(map));
    } catch {}
  }, [availableColumns]);
  // Persist column menu preference
  useEffect(() => {
    try {
      localStorage.setItem(
        "datagrid:colmenu:visibleFirst",
        visibleFirst ? "true" : "false"
      );
    } catch {}
  }, [visibleFirst]);
  const [showGenerateDataDialog, setShowGenerateDataDialog] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const handleCommit = async () => {
    if (!hasEdits) return;
    try {
      let updatedCount = 0;
      let insertedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Existing rows updates (batch)
      const updates: Array<{
        key: Record<string, any>;
        changes: Record<string, any>;
      }> = [];
      for (const [rowKey, changes] of Object.entries(edits)) {
        if (rowKey.includes("|__temp:")) continue; // skip new rows
        const row = result?.rows.find((r: any) => makeRowKey(r) === rowKey);
        if (!row) continue;
        if (pkColumns.length === 0)
          throw new Error("Cannot commit without a primary key on this table");
        const key: Record<string, any> = {};
        pkColumns.forEach((k) => (key[k] = row[k]));
        updates.push({ key, changes });
      }
      if (updates.length > 0) {
        const res = await dataEditingApi.batchUpdate(
          connectionId,
          database,
          table,
          updates,
          true
        );
        if (res && Array.isArray((res as any).results)) {
          const results = (res as any).results as Array<{
            success: boolean;
            error?: string;
          }>;
          const nextErrors: Record<string, Record<string, string>> = {
            ...cellErrors,
          };
          results.forEach((r, i) => {
            const upd = updates[i];
            if (!upd) return;
            const matched = result?.rows.find((rr: any) =>
              pkColumns.every((k) => rr[k] === upd.key[k])
            );
            const rk = matched ? makeRowKey(matched) : undefined;
            if (!rk) return;
            if (!r.success) {
              const msg = r.error || "Update failed";
              const rowErr = { ...(nextErrors[rk] || {}) } as Record<
                string,
                string
              >;
              Object.keys(upd.changes || {}).forEach((c) => {
                rowErr[c] = msg;
              });
              nextErrors[rk] = rowErr;
              errorCount++;
              if (errors.length < 3 && !errors.includes(msg)) {
                errors.push(msg);
              }
            } else {
              updatedCount++;
              if (nextErrors[rk]) {
                const cleaned = { ...nextErrors[rk] } as Record<string, string>;
                Object.keys(upd.changes || {}).forEach(
                  (c) => delete cleaned[c]
                );
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
            if (c.default !== null && c.default !== undefined)
              values[c.name] = c.default;
          });
        }
        if (Object.keys(values).length === 0) continue;
        try {
          await dataEditingApi.insertRow(connectionId, database, table, values);
          insertedCount++;
        } catch (e: any) {
          const msg = e?.message || "Insert failed";
          const rowErr: Record<string, string> = {};
          Object.keys(values).forEach((c) => {
            rowErr[c] = msg;
          });
          setCellErrors((prev) => ({ ...prev, [key]: rowErr }));
          errorCount++;
          if (errors.length < 3 && !errors.includes(msg)) {
            errors.push(msg);
          }
        }
      }
      setEdits({});
      setNewRows([]);
      setSelectedKeys(new Set());
      refresh(connectionId, database, table);

      // Show toast notification
      if (errorCount === 0) {
        let message = "Successfully committed changes";
        if (updatedCount > 0 && insertedCount > 0) {
          message = `Successfully updated ${updatedCount} row(s) and inserted ${insertedCount} row(s)`;
        } else if (updatedCount > 0) {
          message = `Successfully updated ${updatedCount} row(s)`;
        } else if (insertedCount > 0) {
          message = `Successfully inserted ${insertedCount} row(s)`;
        }
        setToast({ message, type: "success" });
      } else {
        let message = `Committed with errors: ${
          updatedCount + insertedCount
        } succeeded, ${errorCount} failed`;
        if (errors.length > 0) {
          message += "\n\nErrors:\n• " + errors.join("\n• ");
        }
        setToast({ message, type: "error" });
      }
    } catch (e: any) {
      setToast({
        message: e?.message || "Failed to commit changes",
        type: "error",
      });
    }
  };

  const handleRollback = () => {
    setEdits({});
    setNewRows([]);
    setSelectedKeys(new Set());
  };

  const handleAddRow = () => {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const base: any = { __isNew: true, __tempId: tempId };
    // Prefill defaults from schema if present
    columns.forEach((c: any) => {
      if (c.default !== null && c.default !== undefined)
        base[c.name] = c.default;
    });
    setNewRows((prev) => [base, ...prev]);
  };

  const handleDeleteRows = async () => {
    try {
      // Check for primary key first
      const existingSelected = (result?.rows || []).filter((r: any) =>
        selectedKeys.has(makeRowKey(r))
      );
      if (existingSelected.length > 0 && pkColumns.length === 0) {
        setToast({
          message: "Cannot delete without a primary key on this table",
          type: "error",
        });
        return;
      }

      let deletedCount = 0;
      let newRowsDeleted = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Remove selected new rows locally
      const newRowsToDelete = newRows.filter((r) =>
        selectedKeys.has(makeRowKey(r))
      );
      newRowsDeleted = newRowsToDelete.length;
      setNewRows((prev) =>
        prev.filter((r) => !selectedKeys.has(makeRowKey(r)))
      );

      // Delete existing rows via API
      for (const row of existingSelected) {
        const keyObj: Record<string, any> = {};
        pkColumns.forEach((k) => (keyObj[k] = row[k]));
        try {
          await (
            await import("../../api/dataEditing")
          ).dataEditingApi.deleteRow(connectionId, database, table, keyObj);
          deletedCount++;
        } catch (e: any) {
          failedCount++;
          const msg = e?.message || "Delete failed";
          if (errors.length < 3 && !errors.includes(msg)) {
            errors.push(msg);
          }
        }
      }

      // Clear edits for deleted rows
      setEdits((prev) => {
        const next = { ...prev } as Record<string, Record<string, any>>;
        for (const k of Array.from(selectedKeys)) delete next[k];
        return next;
      });
      setSelectedKeys(new Set());
      setSelectedRows([]);
      refresh(connectionId, database, table);

      // Trigger selection clear in DataGrid after refresh
      setClearSelectionTrigger((prev) => prev + 1);

      // Show toast notification
      const totalDeleted = deletedCount + newRowsDeleted;
      if (failedCount === 0 && totalDeleted > 0) {
        setToast({
          message: `Successfully deleted ${totalDeleted} row(s)`,
          type: "success",
        });
      } else if (failedCount > 0) {
        let message = `Deleted ${deletedCount} row(s), failed to delete ${failedCount} row(s)`;
        if (errors.length > 0) {
          message += "\n\nErrors:\n• " + errors.join("\n• ");
        }
        setToast({ message, type: "error" });
      }
    } catch (e: any) {
      setToast({
        message: e?.message || "Failed to delete rows",
        type: "error",
      });
    }
  };

  const handleGenerateData = async (rowCount: number) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/data-editing/${connectionId}/generate-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ database, table, rowCount }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate data");
      }

      const result = await response.json();

      // Show detailed results
      let message = `Successfully generated ${result.rowsGenerated} rows of dummy data`;
      if (result.failedRows > 0) {
        message += `\n\nFailed to insert ${result.failedRows} rows`;
        if (result.errors && result.errors.length > 0) {
          message += ":\n• " + result.errors.join("\n• ");
        }
      }

      setToast({ message, type: result.failedRows > 0 ? "info" : "success" });
      refresh(connectionId, database, table);
    } catch (e: any) {
      setToast({
        message: e?.message || "Failed to generate dummy data",
        type: "error",
      });
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

  const handleExport = (format: "csv" | "json") => {
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
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
            {(error as Error).message}
          </p>
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
    <div className="flex flex-col h-full bg-gray-50/30 dark:bg-gray-950/30">
      {/* Toolbar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Table info and sort controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <div className="w-5 h-5 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-white dark:text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
                title={`Table: ${table}`}
              >
                {table}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <select
                className="px-2 py-1.5 text-sm bg-transparent border-0 focus:outline-none text-gray-900 dark:text-gray-100 min-w-[120px]"
                value={sortColumn}
                onChange={(e) => setSortColumn(e.target.value)}
                title="Sort by column"
              >
                <option value="">Sort by...</option>
                {columns.map((c: any) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <select
                className="px-2 py-1.5 text-sm bg-transparent border-0 focus:outline-none text-gray-700 dark:text-gray-300"
                value={sortDirection}
                onChange={(e) =>
                  setSortDirection(e.target.value as "ASC" | "DESC")
                }
              >
                <option value="ASC">ASC</option>
                <option value="DESC">DESC</option>
              </select>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <button
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                title="Apply sort"
                onClick={() => {
                  if (sortColumn)
                    setSortBy([
                      { column: sortColumn, direction: sortDirection },
                    ]);
                }}
              >
                Apply
              </button>
              {sortBy.length > 0 && (
                <>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                  <button
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="Clear sort"
                    onClick={() => {
                      setSortBy([]);
                      setSortColumn("");
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={handleAddRow}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200"
                title="Add row"
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
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={() => setBulkOpen(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit selected rows"
                disabled={selectedKeys.size === 0}
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
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={handleDeleteRows}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete selected rows"
                disabled={selectedKeys.size === 0}
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
                    strokeWidth={1.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={() => setShowGenerateDataDialog(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/60 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200"
                title="Generate dummy data"
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
                    strokeWidth={1.5}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Search and controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search all columns..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-4 pr-10 py-2.5 text-sm bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 backdrop-blur-sm"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                title="Search"
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
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showFilters
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
                }`}
                title="Toggle column filters"
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
                    strokeWidth={1.5}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="relative">
                <button
                  ref={columnMenuButtonRef}
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    showColumnMenu
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60"
                  }`}
                  title="Show/hide columns"
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
                      strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Import/Export actions */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={async () => {
                  const cols = columns.map((c: any) => c.name);
                  const rows = [...newRows, ...(result?.rows || [])];
                  const csv = buildCSV(rows, cols);
                  try {
                    await navigator.clipboard.writeText(csv);
                    setToast({
                      message: "Copied CSV to clipboard",
                      type: "success",
                    });
                  } catch (e: any) {
                    setToast({
                      message: e?.message || "Failed to copy to clipboard",
                      type: "error",
                    });
                  }
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-200"
                title="Copy CSV"
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
                    strokeWidth={1.5}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={() => setShowImportDialog(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
                title="Import data"
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
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Export data"
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
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Edits indicator */}
        {hasEdits && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-800/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-lg">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {Object.keys(edits).length} modified
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRollback}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 rounded-lg transition-all duration-200"
                title="Discard changes"
              >
                Rollback
              </button>
              <button
                onClick={handleCommit}
                className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={updateRowMutation.isPending}
                title="Commit changes"
              >
                Commit Changes
              </button>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {(search || filters.length > 0 || sortBy.length > 0) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {sortBy.length > 0 &&
              sortBy.map((sort) => (
                <div
                  key={sort.column}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sort: {sort.column} {sort.direction}
                  </span>
                  <button
                    onClick={() => setSortBy([])}
                    className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    title="Clear sort"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            {search && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search: {search}
                </span>
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                  }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  title="Clear search"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            {filters.map((filter) => (
              <div
                key={filter.column}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter: {filter.column} {filter.operator} {filter.value}
                </span>
                <button
                  onClick={() =>
                    setFilters(
                      filters.filter((f) => f.column !== filter.column)
                    )
                  }
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  title="Remove filter"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 min-w-0 overflow-hidden p-6 flex flex-col relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-950/80 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl px-8 py-6 border border-gray-200/60 dark:border-gray-800/60">
                <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Loading data...
                </p>
              </div>
            </div>
          )}

          {/* Combine new rows with existing */}
          {(() => {
            const combinedRows = [...newRows, ...(result?.rows || [])];
            return (
              <motion.div
                key={`${database}-${table}-${page}-${pageSize}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.06, ease: "easeOut" }}
                className="flex-1 min-h-0 min-w-0 overflow-hidden"
              >
                <DataGrid
                  data={combinedRows}
                  columns={(columns as any) || result?.columns || []}
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
                  clearSelectionTrigger={clearSelectionTrigger}
                />
              </motion.div>
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
                setUndoStack((s) => [
                  ...s,
                  { rowKey: rk, column: col, prev: prevVal, next: val },
                ]);
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

      {/* Column visibility dropdown */}
      {showColumnMenu && isPositioningComplete && (
        <div
          ref={columnMenuDropdownRef}
          className="fixed w-80 sm:w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800/60 rounded-xl shadow-xl z-[9999] transition-all duration-200 ease-out"
          style={{
            left: `${dropdownPosition.x}px`,
            top: `${dropdownPosition.y}px`,
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/60 dark:border-gray-800/60">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Show/Hide Columns
              </span>
              <button
                onClick={() => setShowColumnMenu(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={columnMenuQuery}
                  onChange={(e) => setColumnMenuQuery(e.target.value)}
                  placeholder="Search columns..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-50/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 text-gray-900 dark:text-gray-100"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleFirst}
                    onChange={(e) => setVisibleFirst(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-900/20"
                  />
                  Visible first
                </label>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    availableColumns.forEach((c) => c.setVisible(true));
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
                  title="Select all columns"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    availableColumns.forEach((c) => c.setVisible(false));
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
                  title="Deselect all columns"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => {
                    availableColumns.forEach((c) => c.setVisible(!c.isVisible));
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
                  title="Toggle all columns"
                >
                  Toggle
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem(getVisibilityStorageKey());
                    } catch {}
                    availableColumns.forEach((c) => c.setVisible(true));
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300/60 dark:border-gray-700/60 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-all duration-200"
                  title="Reset to default visibility"
                >
                  Reset
                </button>
              </div>
              <div className="mb-4">
                <button
                  onClick={() => setSortEnabled((v) => !v)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    sortEnabled
                      ? "bg-emerald-50/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {sortEnabled ? "Sorted" : "Sort"}
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                {availableColumns
                  .filter((column) => {
                    if (!columnMenuQuery) return true;
                    return column.id
                      .toLowerCase()
                      .includes(columnMenuQuery.toLowerCase());
                  })
                  .sort((a, b) => {
                    if (visibleFirst) {
                      if (a.isVisible !== b.isVisible) {
                        return a.isVisible ? -1 : 1;
                      }
                    }
                    return a.id.localeCompare(b.id, undefined, {
                      sensitivity: "base",
                    });
                  })
                  .map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 rounded-lg transition-all duration-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={column.isVisible}
                        onChange={column.toggle}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-900/20"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {column.id}
                      </span>
                    </label>
                  ))}
                {columnMenuQuery &&
                  availableColumns.filter((c) =>
                    c.id.toLowerCase().includes(columnMenuQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      No columns found
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function buildCSV(rows: any[], columns: string[]): string {
  const header = columns.join(",");
  const body = rows
    .map((row) => {
      return columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",");
    })
    .join("\n");
  return `${header}\n${body}`;
}
