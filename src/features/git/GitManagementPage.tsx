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
      <div className="flex flex-col h-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Git Managementasd</h1>
            <div className="flex items-center gap-2">
              <DirectorySelector />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('status')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'status'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Changes
              </button>
              <button
                onClick={() => setActiveTab('commit')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'commit'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Commit
              </button>
              <button
                onClick={() => setActiveTab('branches')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'branches'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Branches
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'log'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('remotes')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'remotes'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Remotes
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <GitInitComponent />
            
            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'status' && <GitStatusComponent />}
              {activeTab === 'commit' && <GitCommitComponent />}
              {activeTab === 'branches' && <GitBranchComponent />}
              {activeTab === 'log' && <GitLogComponent />}
              {activeTab === 'remotes' && <GitRemoteComponent />}
            </div>
            
            {/* Git Diff in bottom panel when viewing changes */}
            {activeTab === 'status' && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <GitDiffComponent />
              </div>
            )}
          </div>
        </div>
      </div>
    </GitProvider>
  );
};

export default GitManagementPage;