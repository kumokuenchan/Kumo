import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGit } from '../GitContext';

interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
}

interface GitBranchComponentProps {
  onBranchChange?: () => void;
}

const GitBranchComponent: React.FC<GitBranchComponentProps> = ({ onBranchChange }) => {
  const { gitService, isInitialized } = useGit();
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBranchName, setNewBranchName] = useState('');

  useEffect(() => {
    if (gitService && isInitialized) {
      loadBranches();
    }
  }, [gitService, isInitialized]);

  const loadBranches = async () => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      const branchData = await gitService.getBranches();
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!gitService || !newBranchName.trim()) return;

    const success = await gitService.createBranch(newBranchName.trim());
    if (success) {
      setNewBranchName('');
      loadBranches();
      onBranchChange?.();
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    if (!gitService) return;
    
    const success = await gitService.checkout(branchName);
    if (success) {
      loadBranches();
      onBranchChange?.();
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (!gitService) return;
    
    if (window.confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      const success = await gitService.deleteBranch(branchName);
      if (success) {
        loadBranches();
        onBranchChange?.();
      }
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4-4 4m0 6l4-4-4 4" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No Repository</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Initialize a repository to manage branches</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/60">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Branches</h3>
      </div>

      {/* Create Branch Section */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/60">
        <div className="flex gap-2">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="Create new branch..."
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim() || !gitService}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              !newBranchName.trim() || !gitService
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            Create
          </motion.button>
        </div>
      </div>

      {/* Branch List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
            ></motion.div>
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence>
              {branches.map((branch, index) => (
                <motion.div
                  key={branch.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group relative mx-3 my-1 rounded-xl transition-all duration-200 ${
                    branch.current
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        {branch.current ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-20"></div>
                          </>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          branch.current
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {branch.name}
                        </div>
                        {branch.current && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Current branch</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {!branch.current && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCheckoutBranch(branch.name)}
                            disabled={!gitService}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Checkout
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteBranch(branch.name)}
                            disabled={!gitService}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Delete
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitBranchComponent;