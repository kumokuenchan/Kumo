interface ToastNotificationProps {
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export default function ToastNotification({ toast, setToast }: ToastNotificationProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-up ${
        toast.type === 'success'
          ? 'bg-green-500'
          : toast.type === 'error'
            ? 'bg-red-500'
            : 'bg-blue-500'
      }`}
    >
      <div className="flex items-center gap-2">
        {toast.type === 'success' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="ml-4 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}