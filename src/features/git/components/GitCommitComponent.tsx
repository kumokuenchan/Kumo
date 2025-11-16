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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Commit Changes</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Commit Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter commit message..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Author Name
            </label>
            <input
              type="text"
              value={authorInfo.name}
              onChange={(e) => setAuthorInfo({...authorInfo, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Author name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Author Email
            </label>
            <input
              type="email"
              value={authorInfo.email}
              onChange={(e) => setAuthorInfo({...authorInfo, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Author email"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCommit}
            disabled={loading || !message.trim() || !gitService}
            className={`px-4 py-2 rounded-md ${
              loading || !message.trim() || !gitService
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitCommitComponent;