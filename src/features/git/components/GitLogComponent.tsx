import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';
import FileHistoryComponent from './FileHistoryComponent';

interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  parent: string[];
  tree: string;
}

interface GitLogComponentProps {
  filePath?: string;  // When showing file history
  onCommitSelect?: (commit: GitCommit) => void;  // When selected as part of file history view
}

const GitLogComponent: React.FC<GitLogComponentProps> = ({ filePath, onCommitSelect }) => {
  const { gitService, isInitialized } = useGit();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadCommits();
    }
  }, [gitService, isInitialized, limit, filePath]);

  const loadCommits = async () => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      let commitData: GitCommit[] = [];
      
      if (filePath) {
        // Load history for specific file
        commitData = await gitService.getFileHistory(filePath, limit);
      } else {
        // Load general commit history
        commitData = await gitService.getLog(limit);
      }
      
      setCommits(commitData);
    } catch (error) {
      console.error('Error loading commits:', error);
    } finally {
      setLoading(false);
    }
  };

  const undoLastCommit = async () => {
    if (!gitService) return;
    
    if (window.confirm('Are you sure you want to undo the last commit? This will keep your changes in the working directory.')) {
      try {
        const success = await gitService.undoLastCommit();
        if (success) {
          // Reload commits after undo
          loadCommits();
          // Notify parent component if needed
          if (onCommitSelect) {
            onCommitSelect(undefined as any); // Clear selection
          }
        }
      } catch (error) {
        console.error('Error undoing last commit:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 10);
  };

  if (!isInitialized) {
    return (
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit History</h3>
        </div>
        <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
          <p>Repository not initialized. Please initialize a Git repository first.</p>
        </div>
      </div>
    );
  }

  // If we have a filePath, show the FileHistoryComponent
  if (filePath) {
    return (
      <div className="h-full">
        <FileHistoryComponent 
          filepath={filePath} 
          onBack={() => {
            if (onCommitSelect) {
              onCommitSelect(undefined as any);
            }
          }} 
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {filePath && (
            <button
              onClick={() => {
                // Clear file path to go back to general history
                if (onCommitSelect) {
                  onCommitSelect(undefined as any);
                }
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {filePath ? `File History: ${filePath}` : 'Commit History'}
          </h3>
        </div>
        <div className="flex gap-2">
          {!filePath && (
            <button
              onClick={undoLastCommit}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              Undo Last Commit
            </button>
          )}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-sm sm:text-base"
          >
            <option value={10}>10 commits</option>
            <option value={25}>25 commits</option>
            <option value={50}>50 commits</option>
            <option value={100}>100 commits</option>
          </select>
          <button
            onClick={loadCommits}
            disabled={!gitService}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg sm:rounded-xl text-sm sm:text-sm disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3 sm:mr-4"></div>
              <div className="flex-1">
                <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1 sm:mb-2"></div>
                <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : commits.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
          <p>No commits found</p>
        </div>
      ) : (
        <div className="rounded-lg sm:rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-96 sm:max-h-[500px] overflow-y-auto">
          {commits.map((commit) => (
            <div
              key={commit.oid}
              className="p-3 sm:p-4 border-b last:border-b-0 bg-white dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3 sm:mr-4 flex-shrink-0 text-sm sm:text-base">
                  {commit.author.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {commit.message.split('\n')[0]}
                    </h4>
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 rounded-full">
                      {commit.oid.substring(0, 7)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {commit.author.name} committed on {formatDate(commit.author.timestamp)}
                  </p>
                  {commit.message.split('\n').length > 1 && (
                    <div className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 sm:p-3">
                      {commit.message.split('\n').slice(1).join('\n')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && commits.length > 0 && (
        <div className="mt-4 sm:mt-5 text-center">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default GitLogComponent;