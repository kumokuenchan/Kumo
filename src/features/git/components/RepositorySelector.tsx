import React, { useState, useEffect } from 'react';
import { useGit } from '../GitContext';

interface Repository {
  name: string;
  path: string;
  lastAccessed?: string;
}

interface RepositorySelectorProps {
  onRepositoryChange?: (path: string) => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ onRepositoryChange }) => {
  const { setCurrentDir, currentDir } = useGit();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newRepoPath, setNewRepoPath] = useState('');
  const [isAddingRepo, setIsAddingRepo] = useState(false);

  // Load recent repositories from localStorage
  useEffect(() => {
    const savedRepos = localStorage.getItem('git-repositories');
    if (savedRepos) {
      try {
        const parsedRepos = JSON.parse(savedRepos);
        setRepositories(parsedRepos);
      } catch (e) {
        console.error('Failed to parse repositories', e);
      }
    }
  }, []);

  // Save repositories to localStorage when they change
  useEffect(() => {
    if (repositories.length > 0) {
      localStorage.setItem('git-repositories', JSON.stringify(repositories));
    }
  }, [repositories]);

  const addRepository = (path: string, name?: string) => {
    if (!path) return;

    const newRepo: Repository = {
      name: name || path.split('/').pop() || path,
      path,
      lastAccessed: new Date().toISOString()
    };

    // Check if repo already exists
    const existingIndex = repositories.findIndex(repo => repo.path === path);
    let updatedRepos: Repository[] = [];

    if (existingIndex >= 0) {
      // Update existing repo
      updatedRepos = repositories.map((repo, index) => 
        index === existingIndex 
          ? { ...newRepo, lastAccessed: new Date().toISOString() } 
          : repo
      );
    } else {
      // Add new repo
      updatedRepos = [newRepo, ...repositories];
    }

    setRepositories(updatedRepos);
    setNewRepoPath('');
    setIsAddingRepo(false);
  };

  const removeRepository = (path: string) => {
    setRepositories(repositories.filter(repo => repo.path !== path));
  };

  const switchRepository = (path: string) => {
    setCurrentDir(path);
    onRepositoryChange?.(path);
    setShowDropdown(false);
    
    // Update last accessed time
    const updatedRepos = repositories.map(repo => 
      repo.path === path 
        ? { ...repo, lastAccessed: new Date().toISOString() } 
        : repo
    );
    setRepositories(updatedRepos);
  };

  const handleAddRepo = () => {
    if (newRepoPath.trim()) {
      addRepository(newRepoPath);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-700/60 dark:hover:bg-gray-600/60 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-all duration-200 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate max-w-xs">
          {currentDir ? currentDir.split('/').pop() : 'Select Repository'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div 
          className="absolute right-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden"
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Repositories</h3>
            
            {isAddingRepo ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newRepoPath}
                  onChange={(e) => setNewRepoPath(e.target.value)}
                  placeholder="Enter repository path"
                  className="w-full px-3 py-2 text-sm border border-gray-300/60 dark:border-gray-600/60 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:bg-gray-700/30 dark:text-white transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRepo}
                    disabled={!newRepoPath.trim()}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      !newRepoPath.trim()
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingRepo(false);
                      setNewRepoPath('');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingRepo(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Repository
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto">
            {repositories.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No repositories added yet
              </div>
            ) : (
              <ul>
                {repositories.map((repo) => (
                  <li 
                    key={repo.path}
                    className={`px-3 py-2.5 text-sm cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      currentDir === repo.path
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => switchRepository(repo.path)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{repo.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                        {repo.path}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {repo.lastAccessed && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(repo.lastAccessed)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRepository(repo.path);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-700/30">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.files && target.files.length > 0) {
                    const path = (target.files[0] as any).path || target.files[0].webkitRelativePath.split('/')[0];
                    addRepository(path);
                  }
                };
                input.click();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Browse for Repository
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositorySelector;