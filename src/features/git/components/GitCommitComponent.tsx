import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitCommitComponentProps {
  onCommit?: () => void;
}

interface AuthorInfo {
  name: string;
  email: string;
}

const GitCommitComponent: React.FC<GitCommitComponentProps> = ({ onCommit }) => {
  const { gitService, isInitialized } = useGit();
  const [message, setMessage] = useState('');
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo>({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (gitService && isInitialized) {
      loadAuthorInfo();
    }
  }, [gitService, isInitialized]);

  const loadAuthorInfo = async () => {
    if (!gitService) return;
    
    const info = await gitService.getAuthorInfo();
    setAuthorInfo(info);
  };

  const handleCommit = async () => {
    if (!gitService || !message.trim()) return;

    setLoading(true);
    try {
      const success = await gitService.commit(message, authorInfo.name, authorInfo.email);
      if (success) {
        setMessage('');
        onCommit?.();
      }
    } catch (error) {
      console.error('Error making commit:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit Changes</h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Repository not initialized. Please initialize a Git repository first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit Changes</h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Commit Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter commit message..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author Name
            </label>
            <input
              type="text"
              value={authorInfo.name}
              onChange={(e) => setAuthorInfo({...authorInfo, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
              placeholder="Author name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author Email
            </label>
            <input
              type="email"
              value={authorInfo.email}
              onChange={(e) => setAuthorInfo({...authorInfo, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
              placeholder="Author email"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleCommit}
            disabled={loading || !message.trim() || !gitService}
            className={`px-5 py-3 rounded-xl font-medium transition-colors ${
              loading || !message.trim() || !gitService
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? 'Committing...' : 'Commit Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitCommitComponent;