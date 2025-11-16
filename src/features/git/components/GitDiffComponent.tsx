import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';
import EnhancedDiffView from './EnhancedDiffView';

interface GitDiffComponentProps {
  selectedFile?: string;
}

const GitDiffComponent: React.FC<GitDiffComponentProps> = ({ selectedFile }) => {
  const { gitService, isInitialized } = useGit();
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [fileType, setFileType] = useState<string>('');

  useEffect(() => {
    if (gitService && isInitialized && selectedFile) {
      loadDiff(selectedFile);
      // Set file type for syntax highlighting
      const extension = selectedFile.split('.').pop()?.toLowerCase() || '';
      setFileType(extension);
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-2 py-1 text-xs rounded-l ${
                  viewMode === 'unified'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-1 text-xs rounded-r ${
                  viewMode === 'split'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                }`}
              >
                Split
              </button>
            </div>
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
          <EnhancedDiffView 
            diff={diff} 
            fileType={fileType} 
            viewMode={viewMode}
            onModeChange={setViewMode}
          />
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