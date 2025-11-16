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
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
            {/* Diff Header */}
            <div className="bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Diff View</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {diff.split('\n').filter(l => l.startsWith('+')).length} additions, {diff.split('\n').filter(l => l.startsWith('-')).length} deletions
              </div>
            </div>

            {/* Diff Content */}
            <div className="overflow-auto bg-white dark:bg-gray-950">
              {(() => {
                const lines = diff.split('\n');
                let oldLineNum = 0;
                let newLineNum = 0;

                return lines.map((line, index) => {
                  const isAddition = line.startsWith('+') && !line.startsWith('+++');
                  const isDeletion = line.startsWith('-') && !line.startsWith('---');
                  const isContext = line.startsWith('@@');
                  const isFileHeader = line.startsWith('+++') || line.startsWith('---');
                  const lineContent = (isAddition || isDeletion) ? line.substring(1) : line;

                  // Skip file headers
                  if (isFileHeader) return null;

                  // Parse @@ header to get line numbers
                  if (isContext) {
                    const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                    if (match) {
                      oldLineNum = parseInt(match[1]);
                      newLineNum = parseInt(match[2]);
                    }

                    return (
                      <div
                        key={index}
                        className="bg-blue-50 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900/50 px-3 py-2 my-2"
                      >
                        <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400">{line}</span>
                      </div>
                    );
                  }

                  // Track current line numbers
                  const currentOldLine = oldLineNum;
                  const currentNewLine = newLineNum;

                  // Increment line numbers based on line type
                  if (!isAddition) oldLineNum++;
                  if (!isDeletion) newLineNum++;

                  return (
                    <div
                      key={index}
                      className={`group flex items-stretch hover:bg-opacity-70 transition-colors ${
                        isAddition
                          ? 'bg-green-50 dark:bg-green-950/20'
                          : isDeletion
                          ? 'bg-red-50 dark:bg-red-950/20'
                          : 'bg-white dark:bg-gray-950'
                      }`}
                    >
                      {/* Line Numbers (dual column like GitHub) */}
                      <div className="flex flex-shrink-0">
                        {/* Old line number */}
                        <div
                          className={`w-12 px-2 py-0.5 text-right select-none border-r ${
                            isAddition
                              ? 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-transparent'
                              : isDeletion
                              ? 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-600'
                          }`}
                        >
                          <span className="text-xs font-mono">{!isAddition ? currentOldLine : ''}</span>
                        </div>

                        {/* New line number */}
                        <div
                          className={`w-12 px-2 py-0.5 text-right select-none border-r ${
                            isAddition
                              ? 'bg-green-100 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400'
                              : isDeletion
                              ? 'bg-red-100 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-transparent'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-600'
                          }`}
                        >
                          <span className="text-xs font-mono">{!isDeletion ? currentNewLine : ''}</span>
                        </div>
                      </div>

                      {/* Symbol Column */}
                      <div
                        className={`flex-shrink-0 w-8 px-2 py-0.5 text-center select-none ${
                          isAddition
                            ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                            : isDeletion
                            ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                            : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        <span className="text-xs font-bold">{isAddition ? '+' : isDeletion ? '-' : ' '}</span>
                      </div>

                      {/* Code Content */}
                      <div
                        className={`flex-1 px-3 py-0.5 font-mono text-xs whitespace-pre overflow-x-auto ${
                          isAddition
                            ? 'text-gray-900 dark:text-gray-100'
                            : isDeletion
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
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
                });
              })()}
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