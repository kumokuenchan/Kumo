import { useState, useEffect } from 'react';
import { Beaker } from 'lucide-react';

interface GenerateTestDataModalProps {
  isOpen: boolean;
  tables: string[];
  database?: string;
  onGenerate: (tableName: string, rowCount: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function GenerateTestDataModal({
  isOpen,
  tables,
  database,
  onGenerate,
  onCancel,
  isLoading = false,
}: GenerateTestDataModalProps) {
  const [selectedTable, setSelectedTable] = useState('');
  const [rowCount, setRowCount] = useState(10);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && tables.length > 0) {
      setSelectedTable(tables[0]);
      setRowCount(10);
      setError('');
    }
  }, [isOpen, tables]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTable) {
      setError('Please select a table');
      return;
    }

    if (rowCount < 1 || rowCount > 100) {
      setError('Row count must be between 1 and 100');
      return;
    }

    onGenerate(selectedTable, rowCount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Test Data</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {tables.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No tables available. Please select a database first.</p>
            </div>
          ) : (
            <>
              {database && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    <strong>Database:</strong> {database}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Table
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => { setSelectedTable(e.target.value); if (error) setError(''); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {tables.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Rows
                </label>
                <input
                  type="number"
                  value={rowCount}
                  onChange={(e) => {
                    setRowCount(parseInt(e.target.value) || 10);
                    if (error) setError('');
                  }}
                  min="1"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  AI will generate realistic INSERT statements for {rowCount} row{rowCount !== 1 ? 's' : ''}
                </p>
                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  <strong>Note:</strong> The AI will analyze the table schema and generate realistic test data
                  based on column types, constraints, and naming patterns.
                </p>
              </div>
            </>
          )}
        </div>

        {tables.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <Beaker className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
