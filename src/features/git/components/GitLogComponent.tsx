import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

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
}

const GitLogComponent: React.FC<GitLogComponentProps> = () => {
  const { gitService, isInitialized } = useGit();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadCommits();
    }
  }, [gitService, isInitialized, limit]);

  const loadCommits = async () => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      const commitData = await gitService.getLog(limit);
      setCommits(commitData);
    } catch (error) {
      console.error('Error loading commits:', error);
    } finally {
      setLoading(false);
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
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit History</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Repository not initialized. Please initialize a Git repository first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit History</h3>
        <div className="flex gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
          >
            <option value={10}>10 commits</option>
            <option value={25}>25 commits</option>
            <option value={50}>50 commits</option>
            <option value={100}>100 commits</option>
          </select>
          <button
            onClick={loadCommits}
            disabled={!gitService}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : commits.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No commits found</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {commits.map((commit) => (
            <div
              key={commit.oid}
              className="p-5 border-b last:border-b-0 bg-white dark:bg-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">
                  {commit.author.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {commit.message.split('\n')[0]}
                    </h4>
                    <span className="ml-2 px-2.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 rounded-full">
                      {commit.oid.substring(0, 7)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {commit.author.name} committed on {formatDate(commit.author.timestamp)}
                  </p>
                  {commit.message.split('\n').length > 1 && (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
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
        <div className="mt-5 text-center">
          <button
            onClick={handleLoadMore}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default GitLogComponent;