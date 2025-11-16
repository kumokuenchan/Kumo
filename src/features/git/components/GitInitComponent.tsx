import React, { useState } from 'react';
import { useGit } from '../GitContext';

interface GitInitComponentProps {
  onRepoInitialized?: () => void;
}

const GitInitComponent: React.FC<GitInitComponentProps> = ({ onRepoInitialized }) => {
  const { gitService, currentDir, isInitialized, refresh } = useGit();
  const [initializing, setInitializing] = useState(false);

  const handleInitialize = async () => {
    if (!gitService) return;
    
    setInitializing(true);
    try {
      const success = await gitService.init();
      if (success) {
        refresh();
        onRepoInitialized?.();
      }
    } catch (error) {
      console.error('Error initializing repository:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (isInitialized) {
    return null; // Don't show anything if repo is initialized
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            This directory is not a Git repository. Initialize to start tracking changes.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 truncate">
            {currentDir}
          </p>
        </div>
        <button
          onClick={handleInitialize}
          disabled={initializing || !gitService}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
            initializing || !gitService
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {initializing ? 'Initializing...' : 'Initialize'}
        </button>
      </div>
    </div>
  );
};

export default GitInitComponent;