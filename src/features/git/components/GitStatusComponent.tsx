import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitStatusComponentProps {
  onStatusUpdate?: () => void;
}

interface FileStatus {
  filepath: string;
  index: string;
  workdir: string;
  stage: string;
}

const GitStatusComponent: React.FC<GitStatusComponentProps> = ({ onStatusUpdate }) => {
  const { gitService, isInitialized, setCurrentDir } = useGit();
  const [status, setStatus] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadStatus();
    }
  }, [gitService, isInitialized]);

  const loadStatus = async () => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      const statusData = await gitService.getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading git status:', error);
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedFiles.length === status.length && status.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {status.length} {status.length === 1 ? 'file' : 'files'} changed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleAddAll}
            disabled={status.length === 0}
            className={`px-2.5 py-1 rounded text-sm transition-colors ${
              status.length === 0 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Stage All
          </button>
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
          {status.map((file, index) => (
            <div
              key={index}
              className={`flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                selectedFiles.includes(file.filepath) 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : ''
              }`}
              onClick={() => handleSelectFile(file.filepath)}
            >
              <input
                type="checkbox"
                checked={selectedFiles.includes(file.filepath)}
                onChange={(e) => e.stopPropagation()}
                onClick={() => handleSelectFile(file.filepath)}
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
              <span className={`text-sm truncate ${getStatusColor(file.workdir, file.index)}`}>
                {file.filepath}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GitStatusComponent;