import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGit } from '../GitContext';
import BranchFileDiffViewer from './BranchFileDiffViewer';

interface BranchComparisonViewProps {}

interface FileChange {
  filepath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  linesAdded: number;
  linesRemoved: number;
}

const BranchComparisonView: React.FC<BranchComparisonViewProps> = () => {
  const { gitService, isInitialized } = useGit();
  const [branches, setBranches] = useState<string[]>([]);
  const [branchA, setBranchA] = useState<string>('');
  const [branchB, setBranchB] = useState<string>('');
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      if (!gitService || !isInitialized) return;

      try {
        const branchList = await gitService.getBranches();
        console.log('Branch list:', branchList);
        const branchNames = branchList.map(b => b.name);
        console.log('Branch names:', branchNames);
        setBranches(branchNames);

        // Set default branches if available
        if (branchNames.length >= 2) {
          const currentBranch = branchList.find(b => b.current);
          const firstBranch = currentBranch?.name || branchNames[0];
          const secondBranch = branchNames.find(n => n !== firstBranch) || branchNames[1];
          console.log('Setting branches:', firstBranch, secondBranch);
          setBranchA(firstBranch);
          setBranchB(secondBranch);
        } else if (branchNames.length === 1) {
          setBranchA(branchNames[0]);
          setBranchB('');
        } else {
          // No branches
          setBranchA('');
          setBranchB('');
        }
      } catch (error) {
        console.error('Error loading branches:', error);
      }
    };

    loadBranches();
  }, [gitService, isInitialized]);

  // Load diff when branches change
  useEffect(() => {
    const loadDiff = async () => {
      if (!gitService || !branchA || !branchB || branchA === branchB) {
        setFileChanges([]);
        setSelectedFile(null);
        return;
      }

      setLoading(true);
      try {
        const changes = await gitService.getBranchDiff(branchA, branchB);
        setFileChanges(changes);

        // Auto-select first file
        if (changes.length > 0) {
          setSelectedFile(changes[0].filepath);
        } else {
          setSelectedFile(null);
        }
      } catch (error) {
        console.error('Error loading branch diff:', error);
        setFileChanges([]);
        setSelectedFile(null);
      } finally {
        setLoading(false);
      }
    };

    loadDiff();
  }, [gitService, branchA, branchB]);

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

  const handleSwapBranches = () => {
    const temp = branchA;
    setBranchA(branchB);
    setBranchB(temp);
  };

  // Debug info
  console.log('Render - branches:', branches, 'branchA:', branchA, 'branchB:', branchB);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col"
    >
      {/* Header with branch selectors */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Branch A selector */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Compare
            </label>
            <select
              value={branchA}
              onChange={(e) => setBranchA(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading || branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">No branches available</option>
              ) : (
                branches.map(branch => (
                  <option key={`a-${branch}`} value={branch}>{branch}</option>
                ))
              )}
            </select>
          </div>

          {/* Swap button */}
          <button
            onClick={handleSwapBranches}
            disabled={loading || !branchA || !branchB}
            className="mt-5 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Swap branches"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* Branch B selector */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              With
            </label>
            <select
              value={branchB}
              onChange={(e) => setBranchB(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading || branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">No branches available</option>
              ) : (
                branches.map(branch => (
                  <option key={`b-${branch}`} value={branch}>{branch}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Warning for same branch */}
        {branchA && branchB && branchA === branchB && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-800 dark:text-yellow-200"
          >
            Please select different branches to compare
          </motion.div>
        )}
      </div>

      {/* Two-panel layout */}
      {branchA && branchB && branchA !== branchB ? (
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
                  </div>
                </div>
              ) : fileChanges.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No differences found
                </div>
              ) : (
                <div className="space-y-1">
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
                      onClick={() => setSelectedFile(fileChange.filepath)}
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
                </div>
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
                    <BranchFileDiffViewer
                      filepath={selectedFile}
                      branchA={branchA}
                      branchB={branchB}
                    />
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
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-sm font-medium mb-1">Branch Comparison</p>
            <p className="text-xs text-gray-400">Select two different branches to compare</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BranchComparisonView;
