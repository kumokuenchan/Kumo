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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Auto-select first file when commit changes
  React.useEffect(() => {
    if (fileChanges.length > 0) {
      const firstFile = fileChanges[0].filepath;
      setSelectedFile(firstFile);
      onFileSelect?.(firstFile);
    } else {
      setSelectedFile(null);
    }
  }, [commit.oid, fileChanges]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-xs font-medium">A</span>;
      case 'modified':
        return <span className="text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded text-xs font-medium">M</span>;
      case 'deleted':
        return <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded text-xs font-medium">D</span>;
      case 'renamed':
        return <span className="text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded text-xs font-medium">R</span>;
      default:
        return <span className="text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded text-xs font-medium">?</span>;
    }
  };

  const handleFileSelect = (filepath: string) => {
    setSelectedFile(filepath);
    onFileSelect?.(filepath);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Commit Header */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {commit.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">
              {commit.message.split('\n')[0]}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>{commit.author.name}</span>
              <span>•</span>
              <span>{formatDate(commit.author.timestamp)}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-gray-400 dark:text-gray-500">
              {commit.oid.substring(0, 7)}
            </div>
          </div>
        </div>

        {commit.message.split('\n').length > 1 && (
          <div className="mt-2.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5 border border-gray-200 dark:border-gray-700">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
              {commit.message.split('\n').slice(1).join('\n')}
            </pre>
          </div>
        )}
      </div>

      {/* Two-Panel Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel - Files Changed List */}
        <div className="w-[280px] flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wide">
              Changed
            </h4>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              {fileChanges.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {fileChanges.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm"
              >
                No file changes
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-1"
              >
                {fileChanges.map((fileChange, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className={`px-2.5 py-2 rounded-md cursor-pointer transition-all duration-150 ${
                      selectedFile === fileChange.filepath
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                    }`}
                    onClick={() => handleFileSelect(fileChange.filepath)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(fileChange.status)}
                      <span className="font-mono text-[11px] truncate text-gray-900 dark:text-white">
                        {fileChange.filepath.split('/').pop()}
                      </span>
                    </div>
                    <div className="flex gap-2 ml-6 text-[10px]">
                      {fileChange.linesAdded > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{fileChange.linesAdded}
                        </span>
                      )}
                      {fileChange.linesRemoved > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{fileChange.linesRemoved}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Panel - File Diff Preview */}
        <div className="flex-1 flex flex-col border-l border-gray-200 dark:border-gray-700 pl-4">
          <div className="mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wide">
              Diff
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {selectedFile ? (
                <motion.div
                  key={selectedFile}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <FileDiffPreview filepath={selectedFile} commitOid={commit.oid} />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"
                >
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <p className="text-sm">Select a file to view changes</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CommitDetailPanel;