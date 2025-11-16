import React, { useState, useEffect } from 'react';
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
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branch Management</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branch Management</h3>
      </div>

      <div className="mb-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="New branch name"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
          />
          <button
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim() || !gitService}
            className={`px-5 py-3 rounded-xl font-medium transition-colors ${
              !newBranchName.trim() || !gitService
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className={`flex items-center justify-between p-4 ${
                branch.current
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'bg-white dark:bg-gray-800/50'
              } ${branch.name !== branches[branches.length - 1].name ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
            >
              <div className="flex items-center">
                {branch.current ? (
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                ) : (
                  <span className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></span>
                )}
                <span className={`font-medium ${branch.current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {branch.name}
                </span>
                {branch.current && (
                  <span className="ml-2 px-2.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!branch.current && (
                  <button
                    onClick={() => handleCheckoutBranch(branch.name)}
                    disabled={!gitService}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
                  >
                    Checkout
                  </button>
                )}
                {!branch.current && (
                  <button
                    onClick={() => handleDeleteBranch(branch.name)}
                    disabled={!gitService}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GitBranchComponent;