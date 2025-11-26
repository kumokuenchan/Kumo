import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitProvider, useGit } from './GitContext';
import GitInitComponent from './components/GitInitComponent';
import GitStatusComponent from './components/GitStatusComponent';
import GitCommitComponent from './components/GitCommitComponent';
import GitBranchComponent from './components/GitBranchComponent';
import GitRemoteComponent from './components/GitRemoteComponent';
import GitDiffComponent from './components/GitDiffComponent';
import GitSearchComponent from './components/GitSearchComponent';
import GitStashComponent from './components/GitStashComponent';
import GitTagComponent from './components/GitTagComponent';
import RepositorySelector from './components/RepositorySelector';
import GitHistoryComponent from './components/GitHistoryComponent';
import SyncStatusComponent from './components/SyncStatusComponent';
// Advanced components
import AdvancedSearchComponent from './components/AdvancedSearchComponent';
import CrossBranchComparison from './components/CrossBranchComparison';
import MergeConflictResolver from './components/MergeConflictResolver';
import VisualRebasePlanner from './components/VisualRebasePlanner';
import CherryPickInterface from './components/CherryPickInterface';
import PullRequestManager from './components/PullRequestManager';
import TeamWorkflowVisualization from './components/TeamWorkflowVisualization';
import BranchProtectionRules from './components/BranchProtectionRules';
import MultiRepoPRViewer from './components/MultiRepoPRViewer';

const GitManagementPageContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'commit' | 'branches' | 'log' | 'remotes' | 'stash' | 'tags' | 'search' | 'compare' | 'merge' | 'rebase' | 'cherry-pick' | 'pull-requests' | 'team' | 'protection' | 'multi-repo'>('status');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [syncStatus, setSyncStatus] = useState<{ behind: number; ahead: number }>({ behind: 0, ahead: 0 });
  const [status, setStatus] = useState<any[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any>(null);
  const { gitService, isInitialized } = useGit();

  // Load current branch and sync status
  useEffect(() => {
    if (gitService && isInitialized) {
      loadBranchInfo();
    }
  }, [gitService, isInitialized]);

  // Load status when component mounts or git service changes
  useEffect(() => {
    if (gitService && isInitialized) {
      loadStatus();
    }
  }, [gitService, isInitialized]);

  const loadStatus = async () => {
    if (!gitService) return;

    try {
      const statusData = await gitService.getStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading git status:', error);
    }
  };

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
    // Switch to the history tab
    setActiveTab('log');
  };

  const handleSearchResults = (results: any[]) => {
    // This would update the status component with filtered results
    // For now, we'll just log it
    console.log('Search results:', results);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full"
    >
      

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar Toggle Button - Bottom Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`fixed bottom-6 z-50 flex items-center justify-center transition-all duration-300 ease-out group ${
            isSidebarCollapsed ? 'left-3' : 'left-40'
          }`}
        >
          <div className={`relative px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
            isSidebarCollapsed ? 'translate-x-0' : '-translate-x-1/2'
          }`}>
            {/* Icon container */}
            <div className="flex items-center justify-center w-5 h-5">
              <svg 
                className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
                  isSidebarCollapsed ? 'rotate-0' : 'rotate-180'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </div>
            
            {/* Hover hint */}
            <div className={`absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none ${
              isSidebarCollapsed ? 'translate-x-0' : 'translate-x-0'
            }`}>
              {isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
            </div>
          </div>
        </button>

        {/* Compact Sidebar */}
        <motion.div 
          initial={{ x: -20 }}
          animate={{ x: isSidebarCollapsed ? -192 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`${isSidebarCollapsed ? 'w-0' : 'w-48'} border-r border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 py-3 px-2 overflow-visible flex-shrink-0 relative z-40`}
        >
          {/* Repository Selector */}
          <div className="mb-3">
            <RepositorySelector 
              onRepositoryChange={(path) => {
                // Load status for the new repository
                loadStatus();
                loadBranchInfo();
              }} 
            />
          </div>

          {/* Current Branch Indicator */}
          {isInitialized && (
            <div className="mb-3 px-3">
              <div className="flex items-center gap-2 py-2 group">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-20"></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{currentBranch}</span>
                  {(syncStatus.ahead > 0 || syncStatus.behind > 0) && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {syncStatus.ahead > 0 && `↑${syncStatus.ahead}`}
                      {syncStatus.ahead > 0 && syncStatus.behind > 0 && ' '}
                      {syncStatus.behind > 0 && `↓${syncStatus.behind}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <nav className="space-y-0.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('stash')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'stash'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Stash
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('tags')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'tags'
                  ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
            </motion.button>

            {/* Advanced Features Divider */}
            <div className="my-2 border-t border-gray-200 dark:border-gray-700/30"></div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('search')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'search'
                  ? 'bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0m-14-7v6m6 6v6m6-6H9" />
              </svg>
              Search
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('compare')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'compare'
                  ? 'bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V7z" />
              </svg>
              Compare
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('merge')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'merge'
                  ? 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4-4 4m0 6l4-4-4 4" />
              </svg>
              Merge
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('rebase')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'rebase'
                  ? 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.242 4.242m-15.356 2A8.001 8.001 0 004.242 4.242m0 0V4m0 0h.582m15.356 2A8.001 8.001 0 014.242 4.242M4 4v5h.582m15.356-2A8.001 8.001 0 004.242-4.242M4 4v5h.582" />
              </svg>
              Rebase
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('cherry-pick')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'cherry-pick'
                  ? 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6V8m8 0l2-2m4 0l2-2m-6-2v8m0 0l2-2m4 0l2-2" />
              </svg>
              Cherry-pick
            </motion.button>

            {/* Collaborative Features Divider */}
            <div className="my-2 border-t border-gray-200 dark:border-gray-700/30"></div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('pull-requests')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'pull-requests'
                  ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 002-2h14a2 2 0 002 2zM9 9a6 6 0 016 6v0m-6 0V9m0 0h3m-3 0h3" />
              </svg>
              Pull Requests
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('team')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'team'
                  ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2M3 12h3m-3 4h1m0 0h6m0 0h2m-6 0h2m3-12h6m0 0h6m-6 0h6m-3-6h6" />
              </svg>
              Team
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('protection')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'protection'
                  ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-4m0-8s-8 4-8 4m0 8l-3-3m3 3l3-3m-3-3l-3-3" />
              </svg>
              Protection
            </motion.button>

            {/* Multi-Repo Features Divider */}
            <div className="my-2 border-t border-gray-200 dark:border-gray-700/30"></div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('multi-repo')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                activeTab === 'multi-repo'
                  ? 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Multi-Repo PRs
            </motion.button>
          </nav>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <GitInitComponent />

          {/* Side-by-side layout for status tab (like GitHub Desktop) */}
          {activeTab === 'status' ? (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Panel - File List */}
              <motion.div 
                initial={{ x: -10 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 overflow-hidden flex flex-col"
              >
                <div className="p-3 pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
                  <GitSearchComponent 
                    statusFiles={status} 
                    onFileSelect={handleFileSelect} 
                    onSearchResults={handleSearchResults} 
                  />
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <GitStatusComponent 
                    onFileSelect={handleFileSelect} 
                    onViewFileHistory={handleViewFileHistory}
                    viewingFile={viewingFile} 
                  />
                </div>
              </motion.div>

              {/* Divider */}
              <div className="w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>

              {/* Right Panel - Diff Viewer */}
              <motion.div 
                initial={{ x: 10 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 overflow-hidden bg-white dark:bg-gray-800 flex flex-col min-w-0"
              >
                <div className="flex-1 overflow-auto p-3">
                  <GitDiffComponent selectedFile={selectedFile || undefined} />
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === 'commit' && <GitCommitComponent />}
                  {activeTab === 'branches' && <GitBranchComponent />}
                  {activeTab === 'log' && <GitHistoryComponent selectedCommit={selectedCommit} onCommitSelect={setSelectedCommit} />}
                  {activeTab === 'remotes' && <GitRemoteComponent />}
                  {activeTab === 'stash' && <GitStashComponent />}
                  {activeTab === 'tags' && <GitTagComponent />}
                  
                  {/* Advanced Features */}
                  {activeTab === 'search' && <AdvancedSearchComponent gitService={gitService} />}
                  {activeTab === 'compare' && <CrossBranchComparison gitService={gitService} />}
                  {activeTab === 'merge' && <MergeConflictResolver gitService={gitService} branch1="main" branch2="feature/test" />}
                  {activeTab === 'rebase' && <VisualRebasePlanner gitService={gitService} />}
                  {activeTab === 'cherry-pick' && <CherryPickInterface gitService={gitService} targetBranch="main" />}
                  
                  {/* Collaborative Features */}
                  {activeTab === 'pull-requests' && <PullRequestManager gitService={gitService} />}
                  {activeTab === 'team' && <TeamWorkflowVisualization gitService={gitService} />}
                  {activeTab === 'protection' && <BranchProtectionRules gitService={gitService} />}
                  
                  {/* Multi-Repo Features */}
                  {activeTab === 'multi-repo' && <MultiRepoPRViewer />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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