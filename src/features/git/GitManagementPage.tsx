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
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const handleFileSelect = (filepath: string) => {
    setViewingFile(filepath);
    setSelectedFile(filepath);
  };

  return (
    <GitProvider>
      <div className="flex flex-col h-full w-full">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.53 1.53 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.9c.146.071.286.169.407.29a1.537 1.537 0 0 1 0 2.166 1.536 1.536 0 0 1-2.174 0 1.528 1.528 0 0 1 0-2.164c.152-.15.322-.264.504-.339v-5.49a1.529 1.529 0 0 1-.83-2.008l-2.26-2.271-5.987 5.982c-.5.504-.5 1.32 0 1.824l8.731 8.729a1.286 1.286 0 0 0 1.821 0l8.69-8.689a1.284 1.284 0 0 0 .003-1.822"></path>
            </svg>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">Git</h1>
          </div>
          <DirectorySelector />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Compact Sidebar */}
          <div className="w-40 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 py-2 px-1.5">
            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveTab('status')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'status'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Changes
              </button>
              <button
                onClick={() => setActiveTab('commit')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'commit'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Commit
              </button>
              <button
                onClick={() => setActiveTab('branches')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'branches'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Branches
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === 'log'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('remotes')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
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

            {/* Side-by-side layout for status tab (like GitHub Desktop) */}
            {activeTab === 'status' ? (
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Panel - File List */}
                <div className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-auto p-3">
                    <GitStatusComponent onFileSelect={handleFileSelect} viewingFile={viewingFile} />
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>

                {/* Right Panel - Diff Viewer */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 flex flex-col min-w-0">
                  <div className="flex-1 overflow-auto p-3">
                    <GitDiffComponent selectedFile={selectedFile || undefined} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-3">
                {activeTab === 'commit' && <GitCommitComponent />}
                {activeTab === 'branches' && <GitBranchComponent />}
                {activeTab === 'log' && <GitLogComponent />}
                {activeTab === 'remotes' && <GitRemoteComponent />}
              </div>
            )}
          </div>
        </div>
      </div>
    </GitProvider>
  );
};

export default GitManagementPage;