import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Database,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HardDrive
} from 'lucide-react';
import {
  downloadBackup,
  importFromFile,
  clearLocalStorage,
  getLocalStorageStats,
  formatBytes,
  RestoreResult
} from '../utils/localStorageBackup';
import Toast, { ToastContainer, ToastType } from './Toast';

export default function BackupManager() {
  const [stats, setStats] = useState(getLocalStorageStats());
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importResult, setImportResult] = useState<RestoreResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  // Confirmation states
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Toast notification helper
  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Refresh stats
  const refreshStats = () => {
    setStats(getLocalStorageStats());
  };

  // Handle export
  const handleExport = () => {
    const result = downloadBackup();
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(`${result.message} ${result.error || ''}`, 'error');
    }
  };

  // Handle import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const result = await importFromFile(file, {
        overwrite: overwriteExisting
      });

      setImportResult(result);
      refreshStats();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Failed to process backup file',
        itemsRestored: 0,
        itemsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle clear - toggle confirmation
  const handleClear = () => {
    setShowClearConfirm(!showClearConfirm);
  };

  // Handle clear - execute
  const handleClearConfirmed = () => {
    const result = clearLocalStorage();
    if (result.success) {
      showToast(result.message, 'success');
      refreshStats();
      setImportResult(null);
      setShowClearConfirm(false);
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <Database className="w-6 h-6" />
          LocalStorage Backup & Restore
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Export and import your localStorage data for backup and migration purposes
        </p>
      </div>

      {/* Statistics Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Current Storage
          </h3>
          <button
            onClick={refreshStats}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Items Stored</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.itemCount}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Size</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatBytes(stats.totalSize)}
            </div>
          </div>
        </div>

        {/* Top 5 Largest Items */}
        {stats.itemCount > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Largest Items:
            </div>
            <div className="space-y-1">
              {Object.entries(stats.sizeByKey)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key, size]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
                  >
                    <span className="font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                      {key}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {formatBytes(size)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex flex-col items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Download className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
          <span className="font-semibold text-gray-900 dark:text-white mb-1">
            Export Backup
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Download all localStorage data as JSON
          </span>
        </button>

        {/* Import */}
        <button
          onClick={() => setShowImportOptions(!showImportOptions)}
          className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <Upload className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
          <span className="font-semibold text-gray-900 dark:text-white mb-1">
            Import Backup
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Restore localStorage from JSON file
          </span>
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          disabled={stats.itemCount === 0}
        >
          <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400 mb-2" />
          <span className="font-semibold text-gray-900 dark:text-white mb-1">
            Clear All
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
            Delete all localStorage data
          </span>
        </button>
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-6 mb-6 animate-fadeIn">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-bold text-red-900 dark:text-red-100 text-lg mb-2">
                ⚠️ Clear All Data - Final Warning
              </h4>
              <p className="text-gray-800 dark:text-gray-200 mb-3">
                This will <span className="font-bold">permanently delete</span> all saved data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-3 pl-2">
                <li>Terminal sessions and command history</li>
                <li>Bookmarks and saved commands</li>
                <li>Database connections and credentials</li>
                <li>Settings and preferences</li>
                <li>{stats.itemCount} total items ({formatBytes(stats.totalSize)})</li>
              </ul>
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-3 mb-4">
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  ⚠️ This action cannot be undone! Make sure you have a backup if needed.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClearConfirmed}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Options */}
      {showImportOptions && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Import Options</h4>

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Overwrite existing items (if unchecked, existing items will be skipped)
            </span>
          </label>

          <button
            onClick={handleImportClick}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Select Backup File'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div
          className={`border rounded-lg p-4 mb-6 ${
            importResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {importResult.success ? 'Import Successful' : 'Import Failed'}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {importResult.message}
              </p>

              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span>✅ Restored: {importResult.itemsRestored}</span>
                <span>⏭️ Skipped: {importResult.itemsSkipped}</span>
                {importResult.errors.length > 0 && (
                  <span>❌ Errors: {importResult.errors.length}</span>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                    Show Errors
                  </summary>
                  <div className="mt-2 space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div
                        key={index}
                        className="text-xs text-red-700 dark:text-red-300 font-mono bg-red-100 dark:bg-red-900/30 rounded p-2"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              What gets backed up?
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li>Terminal sessions and command history</li>
              <li>Terminal bookmarks and saved commands</li>
              <li>Database connections and credentials</li>
              <li>Application settings and preferences</li>
              <li>Query history and saved queries</li>
              <li>Notes, tasks, and documentation</li>
              <li>Theme and UI customization settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Important Notes
            </h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li>Backup files may contain sensitive data (credentials, connection strings)</li>
              <li>Store backup files securely and do not share them publicly</li>
              <li>When importing, existing data can be overwritten if the option is enabled</li>
              <li>Always export a backup before clearing or importing data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={4000}
          />
        ))}
      </ToastContainer>
    </div>
  );
}
