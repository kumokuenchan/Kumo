import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { QueryResult } from '../../api/query';

interface ResultGridProps {
  result: QueryResult;
  index: number;
}

export default function ResultGrid({ result, index }: ResultGridProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | null>(null);

  // Generate columns from fields
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (result.type === 'select' && result.fields) {
      return result.fields.map((field) => ({
        accessorKey: field.name,
        header: field.name,
        cell: (info) => {
          const value = info.getValue();
          if (value === null) {
            return <span className="text-gray-400 italic">NULL</span>;
          }
          if (typeof value === 'object') {
            return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
          }
          return <span>{String(value)}</span>;
        },
      }));
    }
    return [];
  }, [result.fields]);

  const table = useReactTable({
    data: result.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Export to CSV
  const exportToCSV = () => {
    if (result.type !== 'select' || !result.rows || !result.fields) return;

    const headers = result.fields.map((f) => f.name).join(',');
    const rows = result.rows
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

    const csv = `${headers}\n${rows}`;
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
    if (result.type !== 'select' || !result.rows) return;

    const json = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render based on query type
  if (result.type === 'select') {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header with stats and export */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold">Result Set {index + 1}</span>
            <span className="text-gray-600">
              {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
            </span>
            <span className="text-gray-600">{result.executionTime}ms</span>
          </div>

          <div className="relative">
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
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {result.rows && result.rows.length > 0 ? (
          <div className="overflow-auto max-h-96">
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
                        className="px-4 py-2 border-b border-gray-200 max-w-md truncate"
                        title={String(cell.getValue())}
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
