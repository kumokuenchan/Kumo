import React, { useState } from 'react';
import GitStatusComponent from './components/GitStatusComponent';
import GitCommitComponent from './components/GitCommitComponent';
import GitBranchComponent from './components/GitBranchComponent';
import GitLogComponent from './components/GitLogComponent';
import GitRemoteComponent from './components/GitRemoteComponent';
import GitDiffComponent from './components/GitDiffComponent';
import GitInitComponent from './components/GitInitComponent';
import DirectorySelector from './components/DirectorySelector';
import { GitProvider } from './GitContext';

const GitManagementPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'log' | 'branches' | 'remotes' | 'commit'>('status');

  const handleStatusUpdate = () => {
    // Refresh any necessary data when status changes
  };

  const handleCommit = () => {
    // Refresh after commit
    setActiveTab('log');
  };

  const handleBranchChange = () => {
    // Refresh after branch operations
  };

  const handleRemoteChange = () => {
    // Refresh after remote operations
  };

  const handleRepoInitialized = () => {
    // Refresh all data after repo is initialized
    setActiveTab('status');
  };

  return (
    <GitProvider>
      <div className="p-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              Git Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive Git tools for managing your repositories
            </p>
          </div>

          <DirectorySelector />

          <GitInitComponent 
            onRepoInitialized={handleRepoInitialized} 
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'status'
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('status')}
                >
                  Changes
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'log'
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('log')}
                >
                  History
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'branches'
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('branches')}
                >
                  Branches
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'remotes'
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('remotes')}
                >
                  Remotes
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === 'commit'
                      ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('commit')}
                >
                  Commit
                </button>
              </div>

              {/* Tab Content */}
              <div className="py-4">
                {activeTab === 'status' && (
                  <GitStatusComponent 
                    onStatusUpdate={handleStatusUpdate}
                  />
                )}
                {activeTab === 'log' && (
                  <GitLogComponent />
                )}
                {activeTab === 'branches' && (
                  <GitBranchComponent 
                    onBranchChange={handleBranchChange}
                  />
                )}
                {activeTab === 'remotes' && (
                  <GitRemoteComponent 
                    onRemoteChange={handleRemoteChange}
                  />
                )}
                {activeTab === 'commit' && (
                  <GitCommitComponent 
                    onCommit={handleCommit}
                  />
                )}
              </div>
            </div>

            {/* Sidebar with file diff */}
            <div className="space-y-6">
              <GitDiffComponent 
                selectedFile={selectedFile || undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </GitProvider>
  );
};

export default GitManagementPage;