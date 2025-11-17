import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGit } from '../GitContext';
import CommitDetailPanel from './CommitDetailPanel';

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': 
        return <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-xs">+A</span>;
      case 'modified': 
        return <span className="text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded text-xs">~M</span>;
      case 'deleted': 
        return <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">-D</span>;
      case 'renamed': 
        return <span className="text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded text-xs">→R</span>;
      default: 
        return <span className="text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded text-xs">?</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Commit History</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.select
            whileFocus={{ scale: 1.02 }}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white text-sm"
          >
            <option value={10}>10 commits</option>
            <option value={20}>20 commits</option>
            <option value={50}>50 commits</option>
          </motion.select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadHistory}
            disabled={!gitService}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Commits List */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 pr-2 overflow-y-auto">
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
            <div className="space-y-3">
              <AnimatePresence>
                {commits.map((commit, index) => (
                  <motion.div
                    key={commit.oid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -2, boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.1)" }}
                    className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedCommit?.oid === commit.oid
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-sm'
                        : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => onCommitSelect?.(commit)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                            {commit.author.name.charAt(0).toUpperCase()}
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                            {commit.message.split('\n')[0]}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div>{commit.author.name} • {formatDate(commit.author.timestamp)} {formatTime(commit.author.timestamp)}</div>
                          <div className="font-mono text-gray-400">{commit.oid.substring(0, 7)}</div>
                        </div>
                        
                        {/* File changes summary */}
                        {commitFileChanges[commit.oid] && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {commitFileChanges[commit.oid].slice(0, 3).map((fileChange, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded"
                              >
                                {getStatusIcon(fileChange.status)}
                                <span className="truncate max-w-[100px]">{fileChange.filepath.split('/').pop()}</span>
                              </motion.div>
                            ))}
                            {commitFileChanges[commit.oid].length > 3 && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-gray-500 dark:text-gray-400"
                              >
                                +{commitFileChanges[commit.oid].length - 3} more
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Commit Details */}
        <div className="w-1/2 pl-2 overflow-y-auto">
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
    </motion.div>
  );
};

export default GitHistoryComponent;