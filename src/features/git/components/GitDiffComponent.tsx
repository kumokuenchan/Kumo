import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitDiffComponentProps {
  selectedFile?: string;
}

const GitDiffComponent: React.FC<GitDiffComponentProps> = ({ selectedFile }) => {
  const { gitService, isInitialized } = useGit();
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gitService && isInitialized && selectedFile) {
      loadDiff(selectedFile);
    }
  }, [gitService, isInitialized, selectedFile]);

  const loadDiff = async (filepath: string) => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      const diffData = await gitService.getDiff(filepath);
      setDiff(diffData);
    } catch (error) {
      console.error('Error loading diff:', error);
      setDiff('');
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Changes</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Repository not initialized. Please initialize a Git repository first.</p>
        </div>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Changes</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Select a file to view changes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Changes for {selectedFile}</h3>
        <button
          onClick={() => selectedFile && loadDiff(selectedFile)}
          disabled={!gitService}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      ) : diff ? (
        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 dark:bg-gray-900 p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap break-words">
            {diff.split('\n').map((line, index) => (
              <div 
                key={index} 
                className={
                  line.startsWith('+') ? 'text-green-600 dark:text-green-400' :
                  line.startsWith('-') ? 'text-red-600 dark:text-red-400' :
                  line.startsWith('@@') ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-800 dark:text-gray-200'
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No changes to display</p>
        </div>
      )}
    </div>
  );
};

export default GitDiffComponent;