import React, { useState, useEffect, useContext } from 'react';
import { GitProvider, useGit } from './GitContext';
import DirectorySelector from './components/DirectorySelector';
import GitInitComponent from './components/GitInitComponent';
import GitStatusComponent from './components/GitStatusComponent';
import GitCommitComponent from './components/GitCommitComponent';
import GitBranchComponent from './components/GitBranchComponent';
import GitLogComponent from './components/GitLogComponent';
import GitRemoteComponent from './components/GitRemoteComponent';
import GitDiffComponent from './components/GitDiffComponent';
import SyncStatusComponent from './components/SyncStatusComponent';

const GitManagementPageContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'commit' | 'branches' | 'log' | 'remotes'>('status');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [syncStatus, setSyncStatus] = useState<{ behind: number; ahead: number }>({ behind: 0, ahead: 0 });
  const { gitService, isInitialized } = useGit();

  // Load current branch and sync status
  useEffect(() => {
    if (gitService && isInitialized) {
      loadBranchInfo();
    }
  }, [gitService, isInitialized]);

  const loadBranchInfo = async () => {
    if (!gitService) return;

    try {
      // Get current branch
      const branches = await gitService.getBranches();
      const current = branches.find(b => b.current);
      if (current) {
        setCurrentBranch(current.name);
      }

      // Get sync status
      const sync = await gitService.getSyncStatus();
      setSyncStatus(sync);
    } catch (error) {
      console.error('Error loading branch info:', error);
      // Fallback to default values
      setSyncStatus({ behind: 0, ahead: 0 });
    }
  };

  const handleFileSelect = (filepath: string) => {
    setViewingFile(filepath);
    setSelectedFile(filepath);
  };

  const handleViewFileHistory = (filepath: string) => {
    // Switch to the log tab and set the file path for history view
    setActiveTab('log');
    setLogFilePath(filepath);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.53 1.53 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.9c.146.071.286.169.407.29a1.537 1.537 0 0 1 0 2.166 1.536 1.536 0 0 1-2.174 0 1.528 1.528 0 0 1 0-2.164c.152-.15.322-.264.504-.339v-5.49a1.529 1.529 0 0 1-.83-2.008l-2.26-2.271-5.987 5.982c-.5.504-.5 1.32 0 1.824l8.731 8.729a1.286 1.286 0 0 0 1.821 0l8.69-8.689a1.284 1.284 0 0 0 .003-1.822"></path>
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Git</h1>
          {isInitialized && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100/80 dark:bg-gray-700/80 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm">
                <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-4m0 0l4 4m-4-4V4" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{currentBranch}</span>
                <svg className="w-3 h-3 ml-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <SyncStatusComponent />
            </div>
          )}
        </div>
        <DirectorySelector />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Compact Sidebar */}
        <div className="w-40 border-r border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 py-3 px-2">
          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveTab('status')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'status'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Changes
            </button>
            <button
              onClick={() => setActiveTab('commit')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'commit'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              Commit
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'branches'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Branches
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'log'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button
              onClick={() => setActiveTab('remotes')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'remotes'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
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
                  <GitStatusComponent 
                    onFileSelect={handleFileSelect} 
                    onViewFileHistory={handleViewFileHistory}
                    viewingFile={viewingFile} 
                  />
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
              {activeTab === 'log' && <GitLogComponent filePath={logFilePath} />}
              {activeTab === 'remotes' && <GitRemoteComponent />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GitManagementPage: React.FC = () => {
  return (
    <GitProvider>
      <GitManagementPageContent />
    </GitProvider>
  );
};

export default GitManagementPage;