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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">No Git repository</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Initialize a repository to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Branches</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newBranchName}
          onChange={(e) => setNewBranchName(e.target.value)}
          placeholder="New branch name"
          className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
        />
        <button
          onClick={handleCreateBranch}
          disabled={!newBranchName.trim() || !gitService}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs ${
            !newBranchName.trim() || !gitService
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          Create
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className={`flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                branch.current
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-center flex-1">
                {branch.current ? (
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                ) : (
                  <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-2"></span>
                )}
                <span className={`text-sm ${branch.current ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                  {branch.name}
                </span>
                {branch.current && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {!branch.current && (
                  <button
                    onClick={() => handleCheckoutBranch(branch.name)}
                    disabled={!gitService}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded disabled:opacity-50 transition-colors"
                  >
                    Checkout
                  </button>
                )}
                {!branch.current && (
                  <button
                    onClick={() => handleDeleteBranch(branch.name)}
                    disabled={!gitService}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded disabled:opacity-50 transition-colors"
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