import React, { useState } from 'react';
import { GitProvider } from './GitContext';
import DirectorySelector from './components/DirectorySelector';
import GitInitComponent from './components/GitInitComponent';
import GitStatusComponent from './components/GitStatusComponent';
import GitCommitComponent from './components/GitCommitComponent';
import GitBranchComponent from './components/GitBranchComponent';
import GitLogComponent from './components/GitLogComponent';
import GitRemoteComponent from './components/GitRemoteComponent';
import GitDiffComponent from './components/GitDiffComponent';

const GitManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'commit' | 'branches' | 'log' | 'remotes'>('status');

  return (
    <GitProvider>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Git Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your Git repositories and perform common Git operations
          </p>
        </div>

        <DirectorySelector />

        <GitInitComponent />

        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'status'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('commit')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'commit'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            Commit
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'branches'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            Branches
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'log'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            Log
          </button>
          <button
            onClick={() => setActiveTab('remotes')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'remotes'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            Remotes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {activeTab === 'status' && <GitStatusComponent />}
              {activeTab === 'commit' && <GitCommitComponent />}
              {activeTab === 'branches' && <GitBranchComponent />}
              {activeTab === 'log' && <GitLogComponent />}
              {activeTab === 'remotes' && <GitRemoteComponent />}
            </div>
          </div>
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full">
              <GitDiffComponent />
            </div>
          </div>
        </div>
      </div>
    </GitProvider>
  );
};

export default GitManagementPage;