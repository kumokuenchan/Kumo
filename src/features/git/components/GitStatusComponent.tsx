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
  const { gitService, isInitialized } = useGit();
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
    if (workdirStatus === 'added' || indexStatus === 'added') return 'text-green-500';
    if (workdirStatus === 'modified' || indexStatus === 'modified') return 'text-yellow-500';
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') return 'text-red-500';
    if (workdirStatus === 'untracked') return 'text-gray-500';
    return 'text-blue-500';
  };

  const getStatusIcon = (workdirStatus: string, indexStatus: string) => {
    if (workdirStatus === 'added' || indexStatus === 'added') return '✓';
    if (workdirStatus === 'modified' || indexStatus === 'modified') return 'M';
    if (workdirStatus === 'deleted' || indexStatus === 'deleted') return 'D';
    if (workdirStatus === 'untracked') return '?';
    return ' ';
  };

  if (!isInitialized) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Git Status</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Repository not initialized. Please initialize a Git repository first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Git Status</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl text-sm">Loading...</button>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Git Status</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleAddAll}
            disabled={status.length === 0}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No changes detected</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={selectedFiles.length === status.length && status.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedFiles.length} of {status.length} files selected
              </span>
              {selectedFiles.length > 0 && (
                <button
                  onClick={handleAddToStaging}
                  className="ml-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm transition-colors"
                >
                  Stage Selected
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {status.map((file, index) => (
              <div
                key={index}
                className={`flex items-center p-4 ${
                  selectedFiles.includes(file.filepath)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : index % 2 === 0
                    ? 'bg-gray-50/50 dark:bg-gray-700/30'
                    : 'bg-white dark:bg-gray-800/50'
                } ${index !== status.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.filepath)}
                  onChange={() => handleSelectFile(file.filepath)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-3"
                />
                <div className={`w-5 h-5 flex items-center justify-center text-xs mr-3 rounded-full ${
                  file.workdir === 'added' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300' :
                  file.workdir === 'modified' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  file.workdir === 'deleted' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' :
                  file.workdir === 'untracked' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {getStatusIcon(file.workdir, file.index)}
                </div>
                <span className={`font-mono text-sm ${getStatusColor(file.workdir, file.index)}`}>
                  {file.filepath}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GitStatusComponent;