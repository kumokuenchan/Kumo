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
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Commit</h3>
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Summary (required)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-sm h-full resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={authorInfo.name}
            onChange={(e) => setAuthorInfo({...authorInfo, name: e.target.value})}
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
            placeholder="Author name"
          />
          <input
            type="email"
            value={authorInfo.email}
            onChange={(e) => setAuthorInfo({...authorInfo, email: e.target.value})}
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all text-xs"
            placeholder="Author email"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCommit}
            disabled={loading || !message.trim() || !gitService}
            className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
              loading || !message.trim() || !gitService
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? 'Committing...' : 'Commit to main'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitCommitComponent;