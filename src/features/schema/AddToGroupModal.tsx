import { useEffect, useState, useMemo } from 'react';

interface AddToGroupModalProps {
  isOpen: boolean;
  tableFullName: string; // e.g., db.table (for display)
  existingGroups?: string[];
  onSubmit: (groupName: string) => void;
  onCancel: () => void;
}

export default function AddToGroupModal({ isOpen, tableFullName, existingGroups = [], onSubmit, onCancel }: AddToGroupModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const suggestions = useMemo(() => Array.from(new Set(existingGroups)).sort(), [existingGroups]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (name || '').trim();
    if (!trimmed) { setError('Please enter a group name'); return; }
    onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add to Custom Group</h3>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">Table: <span className="font-mono">{tableFullName}</span></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
              list="schema-custom-group-suggestions"
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
              placeholder="e.g., Reporting, Favorites, Metrics"
              autoFocus
            />
            <datalist id="schema-custom-group-suggestions">
              {suggestions.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 bg-gray-50 dark:bg-gray-800">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
        </div>
      </form>
    </div>
  );
}

