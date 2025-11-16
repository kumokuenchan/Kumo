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

  if (!isInitialized || !selectedFile) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <p className="text-sm">Select a file to view changes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{selectedFile}</h4>
        <button
          onClick={() => selectedFile && loadDiff(selectedFile)}
          disabled={!gitService}
          className="ml-auto px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : diff ? (
        <div className="text-xs font-mono overflow-auto max-h-64 border border-gray-200 dark:border-gray-700 rounded">
          {diff.split('\n').map((line, index) => (
            <div 
              key={index} 
              className={`whitespace-pre-wrap break-words px-3 py-0.5 ${
                line.startsWith('+') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : line.startsWith('-') 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                  : line.startsWith('@@') 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                  : 'bg-white dark:bg-gray-800'
              } ${index % 2 === 0 ? 'bg-opacity-80' : ''}`}
            >
              {line}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          <p>No changes to display</p>
        </div>
      )}
    </div>
  );
};

export default GitDiffComponent;