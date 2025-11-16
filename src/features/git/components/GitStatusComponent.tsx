import React, { useState, useEffect, useRef } from 'react';
import { useGit } from '../GitContext';
import Toast, { ToastContainer, ToastType } from '../../../components/Toast';

interface GitStatusComponentProps {
  onStatusUpdate?: () => void;
  onFileSelect?: (filepath: string) => void;
  onViewFileHistory?: (filepath: string) => void;
  viewingFile?: string | null;
}

interface FileStatus {
  filepath: string;
  index: string;
  workdir: string;
  stage: string;
}

const GitStatusComponent: React.FC<GitStatusComponentProps> = ({ onStatusUpdate, onFileSelect, onViewFileHistory, viewingFile }) => {
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

  const getStatusIconElement = (workdirStatus: string, indexStatus: string) => {
    if (workdirStatus === 'added' || indexStatus === 'added') {
      return (
        <div className="w-3 h-3 flex items-center justify-center">
          <div className="w-3 h-3 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-[8px] leading-none font-bold">+</span>
            </div>
          </div>
        </div>
      );
    }
    if (workdirStatus === 'modified' || indexStatus === 'modified') {
      return (
        <div className="w-3 h-3 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-[8px] leading-none font-bold">M</span>
          </div>
        </div>
      );
    }
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') {
      return (
        <div className="w-3 h-3 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-[8px] leading-none font-bold">D</span>
          </div>
        </div>
      );
    }
    if (workdirStatus === 'untracked') {
      return (
        <div className="w-3 h-3 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500 flex items-center justify-center">
            <span className="text-white text-[8px] leading-none font-bold">?</span>
          </div>
        </div>
      );
    }
    if (workdirStatus === 'renamed') {
      return (
        <div className="w-3 h-3 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.025 1l-2.847 2.828 2.847 2.828 2.847-2.828-2.847-2.828zm-6.025 6.025l-2.847 2.828 2.847 2.828 2.847-2.828-2.847-2.828zm12 6l-2.847 2.828 2.847 2.828 2.847-2.828-2.847-2.828z" />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div className="w-3 h-3 flex items-center justify-center">
        <span className="text-gray-500 text-xs"> </span>
      </div>
    );
  };

  const getStatusIcon = (workdirStatus: string, indexStatus: string) => {
    if (workdirStatus === 'added' || indexStatus === 'added') return '+';
    if (workdirStatus === 'modified' || indexStatus === 'modified') return 'M';
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') return 'D';
    if (workdirStatus === 'untracked') return '?';
    if (workdirStatus === 'renamed') return 'R';
    return ' ';
  };
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

  // Group files by directory for tree view
  const groupFilesByDirectory = (files: FileStatus[]) => {
    const grouped: { [key: string]: FileStatus[] } = {};
    const rootFiles: FileStatus[] = [];
    
    files.forEach(file => {
      const parts = file.filepath.split('/');
      if (parts.length === 1) {
        rootFiles.push(file);
      } else {
        const dir = parts[0];
        if (!grouped[dir]) {
          grouped[dir] = [];
        }
        grouped[dir].push(file);
      }
    });
    
    return { grouped, rootFiles };
  };

  // Render directory tree
  const renderDirectoryTree = (dirName: string, files: FileStatus[]) => {
    return (
      <div key={dirName} className="ml-4">
        <div 
          className="flex items-center p-2 hover:bg-gray-100/70 dark:hover:bg-gray-700/30 rounded-lg cursor-pointer transition-all duration-150"
          onClick={() => {
            // Expand directory logic could go here
          }}
        >
          <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dirName}</span>
          <span className="ml-2 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-1.5 py-0.5 rounded-full">
            {files.length}
          </span>
        </div>
        <div className="ml-4">
                            {files.map((file, index) => {
            const isViewing = viewingFile === file.filepath;
            const relativePath = file.filepath.split('/').slice(1).join('/');
            const isSelected = selectedFiles.includes(file.filepath);
            return (
              <div
                key={index}
                className={`flex items-center p-2.5 pl-6 border-b border-gray-100/50 dark:border-gray-700/30 last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 cursor-pointer transition-all duration-150 rounded-r ${
                  isViewing
                    ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-2 border-l-blue-400'
                    : isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-900/15'
                    : ''
                }`}
                onClick={() => onFileSelect?.(file.filepath)}
                onContextMenu={(e) => handleContextMenu(e, file.filepath)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectFile(file.filepath);
                  }}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 shadow-sm mr-2"
                />
                {getStatusIconElement(file.workdir, file.index)}
                <span className={`text-sm truncate flex-1 ml-2 ${getStatusColor(file.workdir, file.index)}`}>
                  {relativePath}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
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
      <div className="mb-2.5 pb-2.5 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="p-1 rounded-md bg-gray-100 dark:bg-gray-700/50">
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Files</h3>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
            {status.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedFiles.length === status.length && status.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 shadow-sm"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Select All
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/60 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs transition-all duration-200 flex items-center gap-1 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleAddAll}
              disabled={status.length === 0}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all duration-200 flex items-center gap-1 shadow-sm ${
                status.length === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Stage All
            </button>
            {status.length > 0 && (
              <button
                onClick={() => confirmDiscardChanges(status.map(s => s.filepath), true)}
                className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition-all duration-200 flex items-center gap-1 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
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
          {status.length > 0 ? (
            (() => {
              const { grouped, rootFiles } = groupFilesByDirectory(status);
              return (
                <div>
                  {/* Root level files */}
                  {rootFiles.map((file, index) => {
                    const isViewing = viewingFile === file.filepath;
                    const isSelected = selectedFiles.includes(file.filepath);
                    return (
                      <div
                        key={`root-${index}`}
                        className={`flex items-center p-2.5 border-b border-gray-100/50 dark:border-gray-700/30 last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 cursor-pointer transition-all duration-150 rounded-r ${
                          isViewing
                            ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-2 border-l-blue-400'
                            : isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-900/15'
                            : ''
                        }`}
                        onClick={() => onFileSelect?.(file.filepath)}
                        onContextMenu={(e) => handleContextMenu(e, file.filepath)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectFile(file.filepath);
                          }}
                          className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 shadow-sm mr-2"
                        />
                        {getStatusIconElement(file.workdir, file.index)}
                        <span className={`text-sm truncate flex-1 ml-2 ${getStatusColor(file.workdir, file.index)}`}>
                          {file.filepath}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Directory groups */}
                  {Object.entries(grouped).map(([dirName, files]) => renderDirectoryTree(dirName, files))}
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No changes to commit</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Commit Panel */}
      {status.length > 0 && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50 rounded-xl shadow-sm">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">📝 Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Summary (required)"
              className="w-full px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
            />
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/40 dark:border-gray-700/40">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="commit-to-master"
                checked={selectedFiles.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 shadow-sm"
              />
              <label htmlFor="commit-to-master" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {selectedFiles.length > 0 
                  ? `Commit ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}` 
                  : 'Select files to commit'}
              </label>
            </div>
            <button
              onClick={handleQuickCommit}
              disabled={committing || !commitMessage.trim() || selectedFiles.length === 0}
              className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 shadow-sm ${
                committing || !commitMessage.trim() || selectedFiles.length === 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              }`}
            >
              {committing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Committing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Recent Commits Section */}
      <div className="mt-5">
        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2.5 uppercase tracking-wide">Recent Commits</h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-gray-600">
          {(() => {
            // Get recent commits - in a real implementation this would fetch from gitService.getLog(5)
            // For now, showing placeholder data
            const recentCommits = [
              { message: "feat: Add user authentication", time: "2 min ago" },
              { message: "fix: Fix login bug", time: "1 hour ago" },
              { message: "docs: Update README", time: "yesterday" },
              { message: "refactor: Improve code organization", time: "2 days ago" },
              { message: "test: Add unit tests for auth module", time: "3 days ago" }
            ];
            
            return recentCommits.map((commit, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400 p-2 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-all duration-150">
                <div className="w-2 h-2 rounded-full bg-green-500/80 mr-2.5"></div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{commit.message}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">{commit.time}</div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

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
          <button
            onClick={() => {
              if (contextMenu.file) {
                onViewFileHistory?.(contextMenu.file);
              }
              setContextMenu({ visible: false, x: 0, y: 0, file: null });
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            View File History
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