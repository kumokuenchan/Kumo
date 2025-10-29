import { useState } from 'react';
import { schemaApi } from '../../api/schema';

interface BackupRestoreDialogProps {
  type: 'backup' | 'restore';
  database: string;
  connectionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BackupRestoreDialog({
  type,
  database,
  connectionId,
  onClose,
  onSuccess,
}: BackupRestoreDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [includeData, setIncludeData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBackup = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const schema = await schemaApi.exportDatabaseSchema(connectionId, database, includeData);

      // Create and download the file
      const blob = new Blob([schema], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `${database}_backup_${timestamp}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to backup database');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('Please select a backup file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const fileContent = await selectedFile.text();

      // Use the new restore API endpoint
      const result = await schemaApi.restoreDatabaseSchema(
        connectionId,
        database,
        fileContent
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        // Show errors if any
        const errorMsg = result.message;
        const errorDetails = result.errors?.slice(0, 5).join('\n') || '';
        setError(`${errorMsg}\n\nFirst few errors:\n${errorDetails}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore database');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === 'backup' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {type === 'backup' ? (
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {type === 'backup' ? 'Backup Database' : 'Restore Database'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{database}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {type === 'backup' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Create a backup of your database</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      This will export all table structures{includeData && ' and data'} to a SQL file that can be used to restore the database later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeData"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="includeData" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include table data in backup
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-900 dark:text-yellow-100">
                    <p className="font-medium mb-1">Warning: This will restore the database</p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      All existing data may be modified or replaced. Make sure you have a backup before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select SQL backup file
                </label>
                <input
                  type="file"
                  accept=".sql,.txt"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-700 focus:outline-none"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-h-64 overflow-y-auto">
              <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {type === 'backup' ? 'Backup completed successfully!' : 'Restore completed successfully!'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={type === 'backup' ? handleBackup : handleRestore}
            disabled={isProcessing || (type === 'restore' && !selectedFile)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
              type === 'backup'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {type === 'backup' ? 'Backing up...' : 'Restoring...'}
              </>
            ) : (
              <>
                {type === 'backup' ? 'Backup Now' : 'Restore Now'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
