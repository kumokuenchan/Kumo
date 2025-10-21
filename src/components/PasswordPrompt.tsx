import { useState } from 'react';

interface PasswordPromptProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PasswordPrompt({
  isOpen,
  title = 'Enter Password',
  message = 'Please enter the database password to connect.',
  onSubmit,
  onCancel,
  isLoading = false,
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    onSubmit(password);
    setPassword('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          className={`w-full px-3 py-2 border rounded text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Password"
          autoFocus
        />
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </form>
    </div>
  );
}

