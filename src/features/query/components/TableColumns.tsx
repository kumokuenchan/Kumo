import { useMemo, useRef } from 'react';
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { QueryResult } from '../../../api/query';
import { dataEditingApi } from '../../../api/dataEditing';
import DateTimeDisplay, { formatDatetimeToMySQL } from './DateTimeDisplay';

interface TableColumnsProps {
  result: QueryResult;
  rows: any[];
  columnsMeta: any[];
  selectedTimezone?: string;
  editable: boolean;
  edits: Record<number, Record<string, any>>;
  setEdits: (edits: Record<number, Record<string, any>>) => void;
  focusCell: { row: number; col: string } | null;
  setRows: (rows: any[]) => void;
  setEditable: (editable: boolean) => void;
  setCanUserEnableEdit: (canEnable: boolean) => void;
  setFocusCell: (cell: { row: number; col: string } | null) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  setSaving: (saving: boolean) => void;
  connectionId?: string;
  effectiveDb?: string | null;
  effectiveTable?: string | null;
  pkColumns: string[];
  canSave: boolean;
}

export function useResultTableColumns({
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
}: TableColumnsProps) {
  const editableRef = useRef(editable);
  const editsRef = useRef(edits);
  const isComposingRef = useRef(false);

  // Update refs when values change
  editableRef.current = editable;
  editsRef.current = edits;

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
              {(field as any).key === 'PRI' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border dark:border-yellow-700/30 px-1 rounded">
                  PK
                </span>
              )}
              {(field as any).key === 'MUL' && (
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
                return <DateTimeDisplay value={value} timezone={selectedTimezone} columnType={field.type} />;
              }
              if (value instanceof Date) {
                // Format date to YYYY-MM-DD HH:MM:SS (MySQL format)
                return <DateTimeDisplay value={value} timezone={selectedTimezone} columnType={field.type} />;
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

            // Convert value to proper MySQL format for display in text input
            let displayValue = value;
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              // Convert ISO datetime to MySQL format
              displayValue = formatDatetimeToMySQL(value, selectedTimezone, field.type);
            } else if (value instanceof Date) {
              displayValue = formatDatetimeToMySQL(value, selectedTimezone, field.type);
            }

            return (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  key={`inp-${rowIndex}-${colName}`}
                  autoFocus={focusCell?.row === rowIndex && focusCell?.col === colName}
                  type="text"
                  inputMode={isNumeric ? 'decimal' : 'text'}
                  className={inputClass}
                  value={typeof displayValue === 'number' && isNaN(displayValue) ? '' : (displayValue ?? '')}
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
  }, [result.fields, columnsMeta, selectedTimezone, focusCell]);

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

  return {
    columns,
    handleSave,
  };
}