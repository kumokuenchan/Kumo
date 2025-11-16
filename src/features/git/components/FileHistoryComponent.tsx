import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset: number;
  };
  parent: string[];
  tree: string;
}

interface BlameLine {
  commit: string;
  originalLine: number;
  finalLine: number;
  author: string;
  authorMail: string;
  authorTime: number;
  authorTz: string;
  committer: string;
  committerMail: string;
  committerTime: number;
  committerTz: string;
  summary: string;
  previous: string;
  filename: string;
  line: string;
}

interface FileHistoryComponentProps {
  filepath: string;
  onBack?: () => void;
}

const FileHistoryComponent: React.FC<FileHistoryComponentProps> = ({ filepath, onBack }) => {
  const { gitService, isInitialized } = useGit();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [blameData, setBlameData] = useState<BlameLine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBlame, setLoadingBlame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'commits' | 'blame'>('commits');

  useEffect(() => {
    if (gitService && isInitialized && filepath) {
      loadFileHistory();
    }
  }, [gitService, isInitialized, filepath]);

  const loadFileHistory = async () => {
    if (!gitService || !filepath) return;

    setLoading(true);
    setError(null);
    try {
      const commitHistory = await gitService.getFileHistory(filepath, 50);
      setCommits(commitHistory);
    } catch (err) {
      console.error('Error loading file history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file history');
    } finally {
      setLoading(false);
    }
  };

  const loadBlameData = async (commitOid: string) => {
    if (!gitService || !filepath) return;

    setLoadingBlame(true);
    try {
      // In a real implementation, we would call gitService.getBlame(filepath, commitOid)
      // For now, we'll simulate the blame data
      // This is a placeholder implementation since isomorphic-git doesn't have full blame support
      const simulatedBlame: BlameLine[] = [
        {
          commit: commitOid,
          originalLine: 1,
          finalLine: 1,
          author: 'KumoDB User',
          authorMail: 'user@kumodb.com',
          authorTime: Date.now() / 1000,
          authorTz: '+0000',
          committer: 'KumoDB User',
          committerMail: 'user@kumodb.com',
          committerTime: Date.now() / 1000,
          committerTz: '+0000',
          summary: 'Initial commit',
          previous: '',
          filename: filepath,
          line: `// This is a sample line from ${filepath}`
        },
        {
          commit: commitOid,
          originalLine: 2,
          finalLine: 2,
          author: 'KumoDB User',
          authorMail: 'user@kumodb.com',
          authorTime: Date.now() / 1000,
          authorTz: '+0000',
          committer: 'KumoDB User',
          committerMail: 'user@kumodb.com',
          committerTime: Date.now() / 1000,
          committerTz: '+0000',
          summary: 'Update file',
          previous: '',
          filename: filepath,
          line: `// More content in ${filepath}`
        }
      ];
      
      setBlameData(simulatedBlame);
    } catch (err) {
      console.error('Error loading blame data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blame data');
    } finally {
      setLoadingBlame(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleCommitSelect = (commit: GitCommit) => {
    setSelectedCommit(commit);
    setActiveTab('commits');
    loadBlameData(commit.oid);
  };

  const handleViewBlame = () => {
    if (selectedCommit) {
      loadBlameData(selectedCommit.oid);
      setActiveTab('blame');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white">File History: {filepath}</h3>
        </div>
        <button
          onClick={() => loadFileHistory()}
          disabled={!gitService}
          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading file history...</p>
          </div>
        </div>
      ) : commits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No commit history found for this file</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
            <button
              className={`px-3 py-1.5 text-xs font-medium ${
                activeTab === 'commits'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('commits')}
            >
              Commits
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium ${
                activeTab === 'blame'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
              onClick={handleViewBlame}
              disabled={!selectedCommit}
            >
              Blame View
            </button>
          </div>

          {activeTab === 'commits' ? (
            <div className="flex-1 overflow-auto">
              <div className="space-y-1">
                {commits.map((commit) => (
                  <div
                    key={commit.oid}
                    className={`p-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                      selectedCommit?.oid === commit.oid
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                        : ''
                    }`}
                    onClick={() => handleCommitSelect(commit)}
                  >
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0">
                        {commit.author.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {commit.message.split('\n')[0]}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            {commit.oid.substring(0, 7)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {commit.author.name} • {formatDate(commit.author.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              {loadingBlame ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading blame data...</p>
                  </div>
                </div>
              ) : blameData ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="font-mono text-xs">
                    {blameData.map((line, index) => (
                      <div key={index} className="flex border-b border-gray-100 dark:border-gray-700">
                        <div className="w-16 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 px-2 py-1 text-right">
                          {line.finalLine}
                        </div>
                        <div className="w-32 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 px-2 py-1 border-r border-gray-200 dark:border-gray-700 truncate">
                          {line.author}
                        </div>
                        <div className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                          {line.line}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <p>No blame data available</p>
                    <p className="text-xs mt-1">Select a commit to view blame information</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileHistoryComponent;