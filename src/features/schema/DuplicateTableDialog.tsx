import { useState, useRef, useEffect } from 'react';

interface DuplicateTableDialogProps {
  isOpen: boolean;
  currentTableName: string;
  includeData: boolean;
  onConfirm: (newTableName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function DuplicateTableDialog({
  isOpen,
  currentTableName,
  includeData,
  onConfirm,
  onCancel,
  isLoading = false,
}: DuplicateTableDialogProps) {
  const [newTableName, setNewTableName] = useState(`${currentTableName}_copy`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset to default name when dialog opens
      setNewTableName(`${currentTableName}_copy`);

      // Auto-focus and select the text when dialog opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, currentTableName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTableName && newTableName !== currentTableName) {
      onConfirm(newTableName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Duplicate Table {includeData ? '(Structure and Data)' : '(Structure Only)'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current table: <span className="font-mono text-blue-600">{currentTableName}</span>
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New table name:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new table name"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onCancel();
                }
              }}
            />
          </div>

          {includeData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  All data from the original table will be copied to the new table.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTableName || newTableName === currentTableName || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Duplicating...' : 'Duplicate Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
