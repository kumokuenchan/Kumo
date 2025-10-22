interface PreferencesModalProps {
  isOpen: boolean;
  hintsEnabled: boolean;
  limit: number;
  onChange: (next: { hintsEnabled: boolean; limit: number }) => void;
  onClose: () => void;
}

export default function PreferencesModal({ isOpen, hintsEnabled, limit, onChange, onClose }: PreferencesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Editor Preferences</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">WHERE Value Hints</div>
              <div className="text-xs text-gray-500">Offer sampled values while editing WHERE</div>
            </div>
            <button
              onClick={() => onChange({ hintsEnabled: !hintsEnabled, limit })}
              className={`px-3 py-1.5 rounded text-sm ${hintsEnabled ? 'bg-green-100 text-green-700' : 'text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
            >
              {hintsEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-800">Max suggested values</label>
            <input
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) onChange({ hintsEnabled, limit: Math.max(1, Math.min(100, n)) });
              }}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Close</button>
        </div>
      </div>
    </div>
  );
}

