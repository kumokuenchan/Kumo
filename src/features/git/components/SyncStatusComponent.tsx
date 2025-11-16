import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface SyncStatus {
  ahead: number;
  behind: number;
}

const SyncStatusComponent: React.FC = () => {
  const { gitService, isInitialized, currentBranch } = useGit();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gitService && isInitialized && currentBranch) {
      loadSyncStatus();
    }
  }, [gitService, isInitialized, currentBranch]);

  const loadSyncStatus = async () => {
    if (!gitService || !currentBranch) return;

    setLoading(true);
    try {
      const status = await gitService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized || !currentBranch) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">[{currentBranch}]</span>
        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!syncStatus) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span className="bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full font-mono">[{currentBranch}]</span>
      {syncStatus.behind > 0 && (
        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          {syncStatus.behind}
        </span>
      )}
      {syncStatus.ahead > 0 && (
        <span className="text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {syncStatus.ahead}
        </span>
      )}
    </div>
  );
};

export default SyncStatusComponent;