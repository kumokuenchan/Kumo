import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface Stash {
  ref: string;
  message: string;
  author: string;
  date: string;
}

interface GitStashComponentProps {
  onStashListUpdate?: () => void;
}

const GitStashComponent: React.FC<GitStashComponentProps> = ({ onStashListUpdate }) => {
  const { gitService } = useGit();
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [stashMessage, setStashMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadStashes();
  }, [gitService]);

  const loadStashes = async () => {
    if (!gitService) return;

    try {
      setLoading(true);
      const stashesData = await gitService.getStashes();
      setStashes(stashesData);
    } catch (error) {
      console.error('Error loading stashes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStash = async () => {
    if (!gitService) return;

    setIsCreating(true);
    try {
      const success = await gitService.createStash(stashMessage.trim() || undefined);
      if (success) {
        setStashMessage('');
        onStashListUpdate?.();
        await loadStashes();
      }
    } catch (error) {
      console.error('Error creating stash:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const applyStash = async (ref: string) => {
    if (!gitService) return;

    try {
      const success = await gitService.applyStash(ref);
      if (success) {
        onStashListUpdate?.();
        await loadStashes();
      }
    } catch (error) {
      console.error('Error applying stash:', error);
    }
  };

  const dropStash = async (ref: string) => {
    if (!gitService) return;

    try {
      const success = await gitService.dropStash(ref);
      if (success) {
        onStashListUpdate?.();
        await loadStashes();
      }
    } catch (error) {
      console.error('Error dropping stash:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Create Stash</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            placeholder="Stash message (optional)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
          />
          <button
            onClick={createStash}
            disabled={isCreating}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Stash
              </>
            )}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Stashed Changes</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : stashes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No stashed changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stashes.map((stash, index) => (
              <div 
                key={stash.ref} 
                className="p-3 bg-gray-50/70 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {stash.ref}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {stash.message}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {stash.author} • {formatDate(stash.date)}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyStash(stash.ref)}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs transition-all duration-200 shadow-sm"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => dropStash(stash.ref)}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition-all duration-200 shadow-sm"
                  >
                    Drop
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitStashComponent;