import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileDiffPreview from './FileDiffPreview';

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

interface CommitDetailPanelProps {
  commit: GitCommit;
  fileChanges: CommitFileChange[];
  onFileSelect?: (filepath: string) => void;
}

const CommitDetailPanel: React.FC<CommitDetailPanelProps> = ({ 
  commit, 
  fileChanges,
  onFileSelect 
}) => {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
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

  const toggleFileDetails = (filepath: string) => {
    if (expandedFile === filepath) {
      setExpandedFile(null);
    } else {
      setExpandedFile(filepath);
      onFileSelect?.(filepath);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="mb-4">
        <motion.div 
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          className="flex items-center gap-3 mb-3"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0"
          >
            {commit.author.name.charAt(0).toUpperCase()}
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h3 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="font-semibold text-gray-900 dark:text-white text-lg truncate"
            >
              {commit.message.split('\n')[0]}
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {commit.author.name} committed on {formatDate(commit.author.timestamp)}
            </motion.p>
          </div>
        </motion.div>

        <AnimatePresence>
          {commit.message.split('\n').length > 1 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
            >
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {commit.message.split('\n').slice(1).join('\n')}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-2"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="font-medium text-gray-900 dark:text-white">Files Changed</h4>
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full"
            >
              {fileChanges.length}
            </motion.span>
          </motion.div>
          
          {fileChanges.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm"
            >
              No file changes
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <AnimatePresence>
                {fileChanges.map((fileChange, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                    className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all duration-200 ${
                      expandedFile === fileChange.filepath
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => toggleFileDetails(fileChange.filepath)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(fileChange.status)}
                        <span className="font-mono text-sm truncate">
                          {fileChange.filepath}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {fileChange.linesAdded > 0 && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded"
                            >
                              +{fileChange.linesAdded}
                            </motion.span>
                          )}
                          {fileChange.linesRemoved > 0 && (
                            <motion.span 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded"
                            >
                              -{fileChange.linesRemoved}
                            </motion.span>
                          )}
                        </div>
                        <motion.svg 
                          animate={{ rotate: expandedFile === fileChange.filepath ? 90 : 0 }}
                          className="w-4 h-4 text-gray-400" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </motion.svg>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedFile === fileChange.filepath && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"
                        >
                          <FileDiffPreview filepath={fileChange.filepath} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CommitDetailPanel;