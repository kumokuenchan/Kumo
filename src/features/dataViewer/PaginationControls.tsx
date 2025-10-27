interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

export default function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalRows,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
      {/* Left: Row count info */}
      <div className="text-sm text-gray-600 dark:text-white">
        Showing <span className="font-medium">{startRow}</span> to{' '}
        <span className="font-medium">{endRow}</span> of{' '}
        <span className="font-medium">{totalRows.toLocaleString()}</span> rows
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="First page"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page"
        >
          ‹
        </button>

        <div className="flex items-center gap-2 px-3">
          <span className="text-sm text-gray-600 dark:text-white">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 dark:text-white"
          />
          <span className="text-sm text-gray-600 dark:text-white">of {totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Last page"
        >
          »
        </button>
      </div>

      {/* Right: Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-white">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
