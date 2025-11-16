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
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={currentDir}
        onChange={handleDirectoryChange}
        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
        placeholder="Repository path"
      />
      <button
        onClick={() => {
          alert('In a real implementation, this would open a file dialog to select a directory');
        }}
        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md flex items-center gap-1 transition-colors text-xs"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Browse
      </button>
    </div>
  );
};

export default DirectorySelector;