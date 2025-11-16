import React, { useState, useEffect, useRef } from 'react';
import { useGit } from '../GitContext';
import Toast, { ToastContainer, ToastType } from '../../../components/Toast';

interface GitStatusComponentProps {
  onStatusUpdate?: () => void;
  onFileSelect?: (filepath: string) => void;
  viewingFile?: string | null;
}

interface FileStatus {
  filepath: string;
  index: string;
  workdir: string;
  stage: string;
}

const GitStatusComponent: React.FC<GitStatusComponentProps> = ({ onStatusUpdate, onFileSelect, viewingFile }) => {
  const { gitService, isInitialized, setCurrentDir } = useGit();
  const [status, setStatus] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    file: string | null 
  }>({ visible: false, x: 0, y: 0, file: null });
  const [showDiscardDialog, setShowDiscardDialog] = useState<{
    show: boolean;
    files: string[];
    isAll: boolean
  }>({ show: false, files: [], isAll: false });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadStatus();
    }
  }, [gitService, isInitialized]);

  // Handle clicks outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, file: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadStatus = async () => {
    if (!gitService) return;

    setLoading(true);
    try {
      const statusData = await gitService.getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading git status:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to load git status',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStatus();
    onStatusUpdate?.();
  };

  const handleSelectFile = (filepath: string) => {
    setSelectedFiles(prev =>
      prev.includes(filepath)
        ? prev.filter(f => f !== filepath)
        : [...prev, filepath]
    );
    // Also trigger diff view when selecting a file
    onFileSelect?.(filepath);
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === status.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(status.map(s => s.filepath));
    }
  };

  const handleAddToStaging = async () => {
    if (!gitService || selectedFiles.length === 0) return;
    
    const success = await gitService.add(selectedFiles);
    if (success) {
      setSelectedFiles([]);
      loadStatus();
      onStatusUpdate?.();
    }
  };

  const handleAddAll = async () => {
    if (!gitService) return;
    
    const success = await gitService.addAll();
    if (success) {
      setSelectedFiles([]);
      loadStatus();
      onStatusUpdate?.();
    }
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, filepath: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file: filepath
    });
  };

  const handleDiscardChanges = async (files: string[], isAll: boolean = false) => {
    if (!gitService) return;

    try {
      if (isAll) {
        // Discard all changes
        await gitService.checkoutAllFiles();
      } else {
        // Discard changes for specific files
        for (const file of files) {
          await gitService.checkoutFile(file);
        }
      }

      // Refresh the status after discarding changes
      loadStatus();
      onStatusUpdate?.();

      // Clear selection if we discarded selected files
      if (!isAll) {
        setSelectedFiles(prev => prev.filter(f => !files.includes(f)));
      } else {
        setSelectedFiles([]);
      }

      // Show success toast
      setToast({
        message: isAll ? 'All changes discarded successfully' : `Discarded changes for ${files.length} file${files.length > 1 ? 's' : ''}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error discarding changes:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to discard changes',
        type: 'error'
      });
    }

    // Close dialog and context menu
    setShowDiscardDialog({ show: false, files: [], isAll: false });
    setContextMenu({ visible: false, x: 0, y: 0, file: null });
  };

  const confirmDiscardChanges = (files: string[], isAll: boolean = false) => {
    setShowDiscardDialog({ show: true, files, isAll });
  };

  const getStatusColor = (workdirStatus: string, indexStatus: string) => {
    if (workdirStatus === 'added' || indexStatus === 'added') return 'text-green-600 dark:text-green-400';
    if (workdirStatus === 'modified' || indexStatus === 'modified') return 'text-yellow-600 dark:text-yellow-400';
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') return 'text-red-600 dark:text-red-400';
    if (workdirStatus === 'untracked') return 'text-gray-600 dark:text-gray-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getStatusIcon = (workdirStatus: string, indexStatus: string) => {
    if (workdirStatus === 'added' || indexStatus === 'added') return '+';
    if (workdirStatus === 'modified' || indexStatus === 'modified') return 'M';
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') return 'D';
    if (workdirStatus === 'untracked') return 'U';
    return ' ';
  };

  // Quick commit functionality
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [committing, setCommitting] = useState(false);

  const handleQuickCommit = async () => {
    if (!gitService || !commitMessage.trim() || selectedFiles.length === 0) return;

    setCommitting(true);
    try {
      // Add selected files to staging area first if they're not already there
      if (selectedFiles.length > 0) {
        await gitService.add(selectedFiles);
      }

      // Then commit
      const authorInfo = await gitService.getAuthorInfo();
      const success = await gitService.commit(commitMessage, authorInfo.name, authorInfo.email);
      if (success) {
        setCommitMessage('');
        setCommitDescription('');
        setSelectedFiles([]);
        loadStatus(); // Refresh the status after commit
        onStatusUpdate?.();

        // Show success toast
        setToast({
          message: 'Changes committed successfully',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error making commit:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to commit changes',
        type: 'error'
      });
    } finally {
      setCommitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No Git repository</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Initialize a repository to get started</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Files</h3>
          <span className="ml-auto text-xs text-gray-600 dark:text-gray-400">
            {status.length}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={selectedFiles.length === status.length && status.length > 0}
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              All
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleAddAll}
              disabled={status.length === 0}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                status.length === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              Stage
            </button>
            {status.length > 0 && (
              <button
                onClick={() => confirmDiscardChanges(status.map(s => s.filepath), true)}
                className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors"
              >
                Discard All
              </button>
            )}
          </div>
        </div>
      </div>

      {status.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No changes to commit</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          {status.map((file, index) => {
            const isViewing = viewingFile === file.filepath;
            return (
              <div
                key={index}
                className={`flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors ${
                  isViewing
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                    : selectedFiles.includes(file.filepath)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
                onClick={() => onFileSelect?.(file.filepath)}
                onContextMenu={(e) => handleContextMenu(e, file.filepath)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.filepath)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectFile(file.filepath);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2"
                />
                <div className={`w-5 h-5 flex items-center justify-center text-xs mr-2 rounded ${
                  file.workdir === 'added' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  file.workdir === 'modified' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  file.workdir === 'deleted' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                  file.workdir === 'untracked' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {getStatusIcon(file.workdir, file.index)}
                </div>
                <span className={`text-sm truncate flex-1 ${getStatusColor(file.workdir, file.index)}`}>
                  {file.filepath}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Commit Panel */}
      {status.length > 0 && (
        <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-800/50">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">📝 Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Summary (required)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            />
          </div>
          <div className="mb-2">
            <input
              type="text"
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="commit-to-master"
                checked={selectedFiles.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="commit-to-master" className="ml-1 text-xs text-gray-700 dark:text-gray-300">
                {selectedFiles.length > 0 
                  ? `Commit ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}` 
                  : 'Commit to master'}
              </label>
            </div>
            <button
              onClick={handleQuickCommit}
              disabled={committing || !commitMessage.trim() || selectedFiles.length === 0}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                committing || !commitMessage.trim() || selectedFiles.length === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {committing ? 'Committing...' : 'Commit'}
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              if (contextMenu.file) {
                confirmDiscardChanges([contextMenu.file]);
              }
              setContextMenu({ visible: false, x: 0, y: 0, file: null });
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Discard changes
          </button>
        </div>
      )}

      {/* Discard Changes Dialog */}
      {showDiscardDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Discard Changes</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {showDiscardDialog.isAll
                ? 'Are you sure you want to discard all changes? This action cannot be undone.'
                : `Are you sure you want to discard changes to ${showDiscardDialog.files.length} file${showDiscardDialog.files.length > 1 ? 's' : ''}? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDiscardDialog({ show: false, files: [], isAll: false })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDiscardChanges(showDiscardDialog.files, showDiscardDialog.isAll)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </ToastContainer>
    </div>
  );
};

export default GitStatusComponent;