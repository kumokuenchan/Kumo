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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Repository Status</h3>
        </div>
        <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Initialize Repository</h3>
      </div>
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-5">
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
          className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
            initializing || !gitService
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
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