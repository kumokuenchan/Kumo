import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGit } from '../GitContext';
import CommitDetailPanel from './CommitDetailPanel';
import BranchComparisonView from './BranchComparisonView';

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

interface CommitFileChange {
  filepath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  linesAdded: number;
  linesRemoved: number;
  diff?: string;
}

interface GitHistoryComponentProps {
  onCommitSelect?: (commit: GitCommit) => void;
  selectedCommit?: GitCommit;
}

type ViewMode = 'history' | 'compare';

const GitHistoryComponent: React.FC<GitHistoryComponentProps> = ({
  onCommitSelect,
  selectedCommit
}) => {
  const { gitService, isInitialized } = useGit();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [commitFileChanges, setCommitFileChanges] = useState<Record<string, CommitFileChange[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [viewMode, setViewMode] = useState<ViewMode>('history');

  useEffect(() => {
    if (gitService && isInitialized) {
      loadHistory();
    }
  }, [gitService, isInitialized, limit]);

  const loadHistory = async () => {
    if (!gitService) return;

    setLoading(true);
    try {
      const commitData = await gitService.getLog(limit);
      setCommits(commitData);

      // For each commit, get the file changes
      const changesMap: Record<string, CommitFileChange[]> = {};
      for (const commit of commitData) {
        const changes = await gitService.getCommitChanges(commit.oid);
        changesMap[commit.oid] = changes;
      }
      setCommitFileChanges(changesMap);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header with tabs */}
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between">
          {/* View mode tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'history'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'compare'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Compare
            </button>
          </div>

          {/* History controls - only show in history view */}
          {viewMode === 'history' && (
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-gray-300 transition-all"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                onClick={loadHistory}
                disabled={!gitService}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-xs disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      {viewMode === 'history' ? (
        <div className="flex flex-1 overflow-hidden gap-4">
          {/* Commits List */}
          <div className="w-[320px] flex-shrink-0 overflow-y-auto">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                ></motion.div>
                <motion.p 
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  Loading history...
                </motion.p>
              </div>
            </motion.div>
          ) : commits.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No commits found</p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence>
                {commits.map((commit, index) => (
                  <motion.div
                    key={commit.oid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                      selectedCommit?.oid === commit.oid
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                    }`}
                    onClick={() => onCommitSelect?.(commit)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                        {commit.author.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm leading-tight mb-1">
                          {commit.message.split('\n')[0]}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="truncate">{commit.author.name}</span>
                          <span>•</span>
                          <span className="whitespace-nowrap">{formatTime(commit.author.timestamp)}</span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
                          {commit.oid.substring(0, 7)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Commit Details */}
        <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedCommit ? (
              <motion.div
                key="commit-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <CommitDetailPanel 
                  commit={selectedCommit} 
                  fileChanges={commitFileChanges[selectedCommit.oid] || []} 
                  onFileSelect={setSelectedFile}
                />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
              >
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Select a commit to view details</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <BranchComparisonView />
        </div>
      )}
    </motion.div>
  );
};

export default GitHistoryComponent;