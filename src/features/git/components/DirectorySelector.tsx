import React from 'react';
import { useGit } from '../GitContext';

interface DirectorySelectorProps {
  onDirectoryChange?: (dir: string) => void;
}

const DirectorySelector: React.FC<DirectorySelectorProps> = ({ onDirectoryChange }) => {
  const { currentDir, setCurrentDir } = useGit();

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDir = e.target.value;
    setCurrentDir(newDir);
    onDirectoryChange?.(newDir);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Repository Directory</h3>
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Directory
          </label>
          <input
            type="text"
            value={currentDir}
            onChange={handleDirectoryChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter repository path"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              // In a real implementation, this would open a file dialog
              // For now, we'll just show an alert
              alert('In a real implementation, this would open a file dialog to select a directory');
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Browse
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        <p>Select the directory containing your Git repository</p>
      </div>
    </div>
  );
};

export default DirectorySelector;