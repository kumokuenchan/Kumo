interface ProductionWarningDialogProps {
  connectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ProductionWarningDialog({
  connectionName,
  onConfirm,
  onCancel,
}: ProductionWarningDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
            Production Database Warning!
          </h3>

          {/* Message */}
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-600 text-center">
              You are about to connect to a <span className="font-bold text-red-600">PRODUCTION</span> database:
            </p>
            <div className="bg-red-50 border-2 border-red-200 rounded p-3">
              <p className="text-sm font-semibold text-red-900 text-center">
                {connectionName}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-900">
                <strong>Warning:</strong> Any operations you perform on this database will affect the production environment.
                Please double-check all queries before execution.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onConfirm();
                }
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
            >
              I Understand, Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
