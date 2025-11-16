import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitRemote {
  name: string;
  url: string;
}

interface GitRemoteComponentProps {
  onRemoteChange?: () => void;
}

const GitRemoteComponent: React.FC<GitRemoteComponentProps> = ({ onRemoteChange }) => {
  const { gitService, isInitialized } = useGit();
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRemoteName, setNewRemoteName] = useState('origin');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [operation, setOperation] = useState<'fetch' | 'pull' | 'push' | null>(null);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadRemotes();
    }
  }, [gitService, isInitialized]);

  const loadRemotes = async () => {
    if (!gitService) return;
    
    setLoading(true);
    try {
      const remoteData = await gitService.getRemotes();
      setRemotes(remoteData);
    } catch (error) {
      console.error('Error loading remotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemote = async () => {
    if (!gitService || !newRemoteName.trim() || !newRemoteUrl.trim()) return;

    const success = await gitService.addRemote(newRemoteName.trim(), newRemoteUrl.trim());
    if (success) {
      setNewRemoteName('origin');
      setNewRemoteUrl('');
      loadRemotes();
      onRemoteChange?.();
    }
  };

  const handleOperation = async (op: 'fetch' | 'pull' | 'push', remoteName: string) => {
    if (!gitService) return;
    
    setOperation(op);
    try {
      if (op === 'fetch') {
        await gitService.fetch(remoteName);
      } else if (op === 'pull') {
        await gitService.pull(remoteName);
      } else if (op === 'push') {
        await gitService.push(remoteName);
      }
      onRemoteChange?.();
    } catch (error) {
      console.error(`Error during ${op}:`, error);
    } finally {
      setOperation(null);
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
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Remotes</h3>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRemoteName}
            onChange={(e) => setNewRemoteName(e.target.value)}
            placeholder="Name"
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
          />
          <input
            type="url"
            value={newRemoteUrl}
            onChange={(e) => setNewRemoteUrl(e.target.value)}
            placeholder="URL"
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
          />
        </div>
        <button
          onClick={handleAddRemote}
          disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || !gitService}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs ${
            !newRemoteName.trim() || !newRemoteUrl.trim() || !gitService
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          Add Remote
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : remotes.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p>No remotes configured</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-md">
          {remotes.map((remote) => (
            <div
              key={remote.name}
              className={`flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                remote.name === 'origin'
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{remote.name}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{remote.url}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOperation('fetch', remote.name)}
                  disabled={operation === 'fetch' || !gitService}
                  className={`px-2 py-1 text-xs rounded ${
                    operation === 'fetch'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {operation === 'fetch' ? '...' : 'Fetch'}
                </button>
                <button
                  onClick={() => handleOperation('pull', remote.name)}
                  disabled={operation === 'pull' || !gitService}
                  className={`px-2 py-1 text-xs rounded ${
                    operation === 'pull'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  {operation === 'pull' ? '...' : 'Pull'}
                </button>
                <button
                  onClick={() => handleOperation('push', remote.name)}
                  disabled={operation === 'push' || !gitService}
                  className={`px-2 py-1 text-xs rounded ${
                    operation === 'push'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {operation === 'push' ? '...' : 'Push'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GitRemoteComponent;