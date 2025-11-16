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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Changes</h3>
        {selectedFile && (
          <>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{selectedFile}</span>
            <button
              onClick={() => selectedFile && loadDiff(selectedFile)}
              disabled={!gitService}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs disabled:opacity-50 transition-colors"
            >
              Refresh
            </button>
          </>
        )}
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading changes...</p>
            </div>
          </div>
        ) : diff ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Diff</span>
            </div>
            <div className="overflow-auto">
              {diff.split('\n').map((line, index) => {
                const isAddition = line.startsWith('+');
                const isDeletion = line.startsWith('-');
                const isContext = line.startsWith('@@');
                const lineContent = line.substring(1); // Remove the +/- prefix
                const symbol = line.charAt(0);

                return (
                  <div
                    key={index}
                    className={`flex items-start font-mono text-sm border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                      isAddition
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : isDeletion
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : isContext
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Line Number */}
                    <div
                      className={`flex-shrink-0 w-12 px-2 py-1.5 text-right select-none ${
                        isAddition
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : isDeletion
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : isContext
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-500'
                      }`}
                    >
                      <span className="text-xs">{index + 1}</span>
                    </div>

                    {/* Symbol Column */}
                    <div
                      className={`flex-shrink-0 w-8 px-2 py-1.5 text-center font-bold ${
                        isAddition
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : isDeletion
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : isContext
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {isAddition ? '+' : isDeletion ? '-' : isContext ? '@' : ' '}
                    </div>

                    {/* Code Content */}
                    <div
                      className={`flex-1 px-4 py-1.5 whitespace-pre overflow-x-auto ${
                        isAddition
                          ? 'text-green-900 dark:text-green-200'
                          : isDeletion
                          ? 'text-red-900 dark:text-red-200'
                          : isContext
                          ? 'text-blue-900 dark:text-blue-200 font-semibold'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                      style={{
                        tabSize: 2,
                        MozTabSize: 2,
                      }}
                    >
                      {lineContent || ' '}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No changes to display</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitDiffComponent;