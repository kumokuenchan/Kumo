import { flexRender, Table as TanStackTable } from '@tanstack/react-table';

interface ResultTableProps {
  table: TanStackTable<any>;
  rows: any[];
  fullHeight?: boolean;
  editable: boolean;
  isCellHovered: { row: number; col: string } | null;
  setIsCellHovered: (value: { row: number; col: string } | null) => void;
  setContextMenu: (value: any) => void;
  handleCellClick: (rowIndex: number, colName: string, e: React.MouseEvent) => void;
  contextMenuColumnRef: React.MutableRefObject<string | null>;
  contextMenuCellValueRef: React.MutableRefObject<any>;
  tableContainerRef2: React.RefObject<HTMLDivElement>;
}

export default function ResultTable({
  table,
  rows,
  fullHeight = false,
  editable,
  isCellHovered,
  setIsCellHovered,
  setContextMenu,
  handleCellClick,
  contextMenuColumnRef,
  contextMenuCellValueRef,
  tableContainerRef2,
}: ResultTableProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        No rows returned
      </div>
    );
  }

  return (
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
                      {header.column.getIsSorted() === 'asc' && (
                        <span className="text-xs">↑</span>
                      )}
                      {header.column.getIsSorted() === 'desc' && (
                        <span className="text-xs">↓</span>
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
  );
}
