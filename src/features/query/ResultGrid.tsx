import { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { QueryResult } from '../../api/query';
import { useTableColumns } from '../../hooks/useDataViewer';
import { useTables } from '../../hooks/useSchema';
import { useConnection } from '../../hooks/useConnections';
import { dataEditingApi } from '../../api/dataEditing';

interface ResultGridProps {
  result: QueryResult;
  index: number;
  fullHeight?: boolean; // when true, grid expands to fill parent
  connectionId?: string;
  sourceSql?: string;
  isOnlyResult?: boolean;
}

export default function ResultGrid({ result, index, fullHeight = false, connectionId, sourceSql, isOnlyResult }: ResultGridProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | null>(null);
  // Inline edit state for ad-hoc query results (local-only edits)
  const [editable, setEditable] = useState(false);
  const [edits, setEdits] = useState<Record<number, Record<string, any>>>({});
  const [focusCell, setFocusCell] = useState<{ row: number; col: string } | null>(null);
  // Refs to avoid recreating column defs on each keystroke
  const editableRef = useRef(editable);
  const editsRef = useRef(edits);
  const isComposingRef = useRef(false);
  useEffect(() => { editableRef.current = editable; }, [editable]);
  useEffect(() => { editsRef.current = edits; }, [edits]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Local copy of rows so we can reflect saved changes without re-running query
  const [rows, setRows] = useState<any[]>(result.rows || []);
  useEffect(() => {
    setRows(result.rows || []);
    setEdits({});
    setSaveMessage(null);
  }, [result.rows, result.rowCount, index]);

  // Try to extract a simple target table from the SQL
  const parseSimpleFrom = (sql?: string): { database: string | null; table: string | null } | null => {
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

  const target = useMemo(() => parseSimpleFrom(sourceSql), [sourceSql]);
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
  const { data: columnsInfo } = useTableColumns(connectionId || null, effectiveDb || null, effectiveTable || null);
  const columnsMeta = columnsInfo?.columns || [];
  const pkColumns = useMemo(() => columnsMeta.filter((c: any) => c.key === 'PRI').map((c: any) => c.name), [columnsMeta]);
  const hasChanges = useMemo(() => Object.values(edits).some((c) => c && Object.keys(c).length > 0), [edits]);

  const canSave =
    !!connectionId &&
    result.type === 'select' &&
    !!effectiveDb &&
    !!effectiveTable &&
    Array.isArray(rows) &&
    rows.length > 0 &&
    pkColumns.length > 0 &&
    isOnlyResult !== false &&
    hasChanges; // must have edits

  // Generate columns from fields
  const columns: ColumnDef<any>[] = useMemo(() => {
    if (result.type === 'select' && result.fields) {
      return result.fields.map((field) => ({
        accessorKey: field.name,
        header: field.name,
        cell: (info) => {
          const rowIndex = info.row.index;
          const colName = String(info.column.id);
          const original = info.getValue();
          const edited = editsRef.current[rowIndex]?.[colName];
          const value = edited !== undefined ? edited : original;
          const dirty = Object.prototype.hasOwnProperty.call(editsRef.current[rowIndex] || {}, colName);

          if (!editableRef.current) {
            if (value === null) {
              return <span className="text-gray-400 italic">NULL</span>;
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
          const isNumeric = /int|decimal|float|double|numeric|bigint|smallint|mediumint|real/.test(colType)
            || (typeof original === 'number' && Number.isFinite(original));
          const inputClass = `w-full border rounded px-2 py-1 text-sm ${dirty ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}`;

          if (isBoolean) {
            const checked = Boolean(value);
            return (
              <div className="flex items-center gap-2">
                <input key={`chk-${rowIndex}-${colName}`} autoFocus={focusCell?.row === rowIndex && focusCell?.col === colName} type="checkbox"
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
                  onClick={() => setEdits((prev) => { const next = { ...prev } as Record<number, Record<string, any>>; const row = { ...(next[rowIndex] || {}) } as Record<string, any>; row[colName] = null; next[rowIndex] = row; editsRef.current = next; return next; })}
                  title="Set NULL"
                >
                  NULL
                </button>
                )}
              </div>
            );
          }

          return (
            <div className="flex items-center gap-2">
              <input
                key={`inp-${rowIndex}-${colName}`}
                autoFocus={focusCell?.row === rowIndex && focusCell?.col === colName}
                type="text"
                inputMode={isNumeric ? 'decimal' : 'text'}
                className={inputClass}
                value={value ?? ''}
                onCompositionStart={() => { isComposingRef.current = true; }}
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
                  const v = isComposingRef.current ? raw : (isNumeric ? (raw === '' ? '' : Number(raw)) : raw);
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
                    onClick={() => setEdits((prev) => { const next = { ...prev } as Record<number, Record<string, any>>; const row = { ...(next[rowIndex] || {}) } as Record<string, any>; row[colName] = null; next[rowIndex] = row; editsRef.current = next; return next; })}
                    title="Set NULL"
                  >
                    NULL
                  </button>
                )}
            </div>
          );
      }}));
    }
    return [];
  }, [result.fields, columnsMeta]);

  // Build and persist changes
  const handleSave = async () => {
    setSaveMessage(null);
    if (!canSave || !connectionId || !effectiveDb || !effectiveTable) return;

    // Disallow PK edits in this mode
    for (const [rowIdxStr, changes] of Object.entries(edits)) {
      for (const pk of pkColumns) {
        if (Object.prototype.hasOwnProperty.call(changes, pk)) {
          setSaveMessage('Saving primary key changes is not supported here. Use the Data tab.');
          return;
        }
      }
    }

    // Prepare batch updates
    const updates: Array<{ key: Record<string, any>; changes: Record<string, any>; rowIndex: number }> = [];
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
      setSaveMessage('No changes to save.');
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
        false
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
      setSaveMessage('Saved changes successfully.');
    } catch (e: any) {
      setSaveMessage(e?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const table = useReactTable({
    data: rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Export to CSV
  const exportToCSV = () => {
    if (result.type !== 'select' || !rows || !result.fields) return;

    const headers = result.fields.map((f) => f.name).join(',');
    const csvRows = rows
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
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJSON = () => {
    if (result.type !== 'select' || !rows) return;

    const json = JSON.stringify(rows, null, 2);
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
          // Convert dates to proper format
          if (value instanceof Date) {
            return value;
          }
          // Convert null to empty string
          if (value === null) {
            return '';
          }
          return value;
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
        className={`border border-gray-200 rounded-lg overflow-hidden ${fullHeight ? 'flex flex-col h-full min-h-0' : ''}`}
        
        title={editable ? '' : 'Click to enable inline editing'}
      >
        {/* Header with stats and export */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold">Result Set {index + 1}</span>
            <span className="text-gray-600">
              {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
            </span>
            <span className="text-gray-600">{result.executionTime}ms</span>
            {editable && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800" title="Edits are local for query results">
                Editing (local)
              </span>
            )}
            {editable && ( (effectiveDb || effectiveTable) ) && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800" title={`${effectiveDb || 'db?'}.${effectiveTable || 'table?'}`}>
                Target: {effectiveDb || 'db?'}.{effectiveTable || 'table?'}
              </span>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            {editable && (
              <div className="flex items-center gap-2 mr-2">
                {(effectiveDb && !targetTable) && (
                  <select
                    value={overrideTable ?? ''}
                    onChange={(e) => setOverrideTable(e.target.value || null)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                    title="Select table for saving"
                  >
                    <option value="">Table…</option>
                    {(tbls || []).map((t: any) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave || !editable || saving}
              className={`px-3 py-1 text-sm rounded border ${
                !editable || !canSave
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : saving
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-green-600 text-green-700 hover:bg-green-50'
              }`}
              title={
                !editable
                  ? 'Click grid to enable editing'
                  : canSave
                  ? 'Save changes to table'
                  : 'Saving only available for simple SELECT from a single qualified table with primary key'
              }
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setExportFormat(exportFormat ? null : 'csv')}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
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

            {exportFormat && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10">
                <button
                  onClick={() => {
                    exportToCSV();
                    setExportFormat(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    exportToJSON();
                    setExportFormat(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => {
                    exportToExcel();
                    setExportFormat(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        </div>
        {saveMessage && (
          <div className={`px-4 py-2 text-sm ${saveMessage.includes('Saved') ? 'text-green-700 bg-green-50 border-b border-green-200' : 'text-amber-700 bg-amber-50 border-b border-amber-200'}`}>{saveMessage}</div>
        )}

        {/* Table */}
        {rows && rows.length > 0 ? (
          <div className={`${fullHeight ? 'flex-1 min-h-0 overflow-auto max-h-none' : 'overflow-auto max-h-126'}`}>
            <table className="min-w-max table-auto text-sm">
              <thead className="bg-gray-100 sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-300"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2 border-b border-gray-200 ${editable ? '' : 'max-w-md truncate'}`}
                        title={String(cell.getValue())}
                        onClick={() => { if (!editableRef.current) setEditable(true); setFocusCell({ row: rowIndex, col: String(cell.column.id) }); }}
                        onDoubleClick={() => { if (!editableRef.current) setEditable(true); setFocusCell({ row: rowIndex, col: String(cell.column.id) }); }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">No rows returned</div>
        )}
      </div>
    );
  }

  // For non-SELECT queries (INSERT, UPDATE, DELETE, DDL)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <span className="font-semibold text-sm">
          {result.type.toUpperCase()} Result {index + 1}
        </span>
      </div>

      <div className="p-4">
        <div className="space-y-2 text-sm">
          {result.type === 'insert' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Affected Rows:</span>
                <span className="font-semibold">{result.affectedRows || 0}</span>
              </div>
              {result.insertId !== undefined && result.insertId > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Insert ID:</span>
                  <span className="font-semibold">{result.insertId}</span>
                </div>
              )}
            </>
          )}

          {result.type === 'update' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Rows Matched:</span>
                <span className="font-semibold">{result.affectedRows || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rows Changed:</span>
                <span className="font-semibold">{result.changedRows || 0}</span>
              </div>
            </>
          )}

          {result.type === 'delete' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Rows Deleted:</span>
              <span className="font-semibold">{result.affectedRows || 0}</span>
            </div>
          )}

          {result.type === 'ddl' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-green-600">Success</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-600">Execution Time:</span>
            <span className="font-semibold">{result.executionTime}ms</span>
          </div>

          {result.warningCount !== undefined && result.warningCount > 0 && (
            <div className="flex justify-between text-yellow-600">
              <span>Warnings:</span>
              <span className="font-semibold">{result.warningCount}</span>
            </div>
          )}

          {result.message && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-600">Message:</span>
              <p className="mt-1 text-gray-700 font-mono text-xs">{result.message}</p>
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














