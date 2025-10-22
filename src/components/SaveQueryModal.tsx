import { useEffect, useState } from 'react';

interface SaveQueryModalProps {
  isOpen: boolean;
  title?: string;
  defaultName?: string;
  sqlPreview?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function SaveQueryModal({
  isOpen,
  title = 'Save Query',
  defaultName = 'My Query',
  sqlPreview,
  onSubmit,
  onCancel,
  isLoading = false,
}: SaveQueryModalProps) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || 'My Query');
      setError('');
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (name || '').trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }
    onSubmit(trimmed);
  };

  const prettyPreview = (sqlPreview || '').trim().slice(0, 500);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., Top 100 Users"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {prettyPreview && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
              <pre className="max-h-40 overflow-auto bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-800 whitespace-pre-wrap break-words">{prettyPreview}</pre>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save Query'}
          </button>
        </div>
      </form>
    </div>
  );
}
