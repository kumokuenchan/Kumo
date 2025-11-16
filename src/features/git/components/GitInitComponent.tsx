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
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Repository Status</h3>
        </div>
        <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Git repository initialized</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">{currentDir}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Initialize Repository</h3>
      </div>
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg mb-4">
        <p className="text-blue-800 dark:text-blue-200">
          This directory is not a Git repository. Initialize a new Git repository to start tracking changes.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
          Repository path: {currentDir}
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleInitialize}
          disabled={initializing || !gitService}
          className={`px-4 py-2 rounded-md ${
            initializing || !gitService
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {initializing ? 'Initializing...' : 'Initialize Git Repository'}
        </button>
      </div>
    </div>
  );
};

export default GitInitComponent;