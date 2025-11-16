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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branch Management</h3>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="New branch name"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleCreateBranch}
            disabled={!newBranchName.trim() || !gitService}
            className={`px-4 py-2 rounded-md ${
              !newBranchName.trim() || !gitService
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Create
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {branches.map((branch) => (
            <div
              key={branch.name}
              className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                branch.current
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center">
                {branch.current ? (
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                ) : (
                  <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-2"></span>
                )}
                <span className={`font-medium ${branch.current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {branch.name}
                </span>
                {branch.current && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!branch.current && (
                  <button
                    onClick={() => handleCheckoutBranch(branch.name)}
                    disabled={!gitService}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    Checkout
                  </button>
                )}
                {!branch.current && (
                  <button
                    onClick={() => handleDeleteBranch(branch.name)}
                    disabled={!gitService}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded disabled:opacity-50"
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