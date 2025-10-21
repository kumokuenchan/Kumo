import { useState } from 'react';
import type { ColumnInfo } from '../../types/dataViewer';

interface BulkEditDialogProps {
  isOpen: boolean;
  columns: ColumnInfo[];
  onClose: () => void;
  onApply: (column: string, value: any) => void;
}

export default function BulkEditDialog({ isOpen, columns, onClose, onApply }: BulkEditDialogProps) {
  const [column, setColumn] = useState('');
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
        <h3 className="text-lg font-semibold mb-2">Bulk Edit</h3>
        <p className="text-sm text-gray-600 mb-4">Apply a value to the selected rows.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700">Column</label>
            <select
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
            >
              <option value="">-- Choose column --</option>
              {columns.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Value</label>
            <input
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button
            onClick={() => { if (column) onApply(column, value); }}
            className="px-3 py-1 bg-blue-600 text-white rounded"
            disabled={!column}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

