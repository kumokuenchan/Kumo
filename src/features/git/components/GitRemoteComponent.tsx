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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remote Management</h3>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remote Management</h3>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newRemoteName}
            onChange={(e) => setNewRemoteName(e.target.value)}
            placeholder="Remote name (e.g., origin)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <input
            type="url"
            value={newRemoteUrl}
            onChange={(e) => setNewRemoteUrl(e.target.value)}
            placeholder="Remote URL (e.g., https://github.com/user/repo.git)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleAddRemote}
            disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || !gitService}
            className={`px-4 py-2 rounded-md ${
              !newRemoteName.trim() || !newRemoteUrl.trim() || !gitService
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Add Remote
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      ) : remotes.length === 0 ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p>No remotes configured</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {remotes.map((remote) => (
            <div
              key={remote.name}
              className="p-4 border-b last:border-b-0 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{remote.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">{remote.url}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOperation('fetch', remote.name)}
                    disabled={operation === 'fetch' || !gitService}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {operation === 'fetch' ? 'Fetching...' : 'Fetch'}
                  </button>
                  <button
                    onClick={() => handleOperation('pull', remote.name)}
                    disabled={operation === 'pull' || !gitService}
                    className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {operation === 'pull' ? 'Pulling...' : 'Pull'}
                  </button>
                  <button
                    onClick={() => handleOperation('push', remote.name)}
                    disabled={operation === 'push' || !gitService}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                  >
                    {operation === 'push' ? 'Pushing...' : 'Push'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GitRemoteComponent;