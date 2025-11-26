import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        className="group flex items-center gap-2 px-3 py-2 bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm transition-all duration-200 hover:shadow-md hover:border-gray-300/80 dark:hover:border-gray-600/80"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate max-w-xs font-medium text-gray-900 dark:text-gray-100">
          {currentDir ? currentDir.split('/').pop() : 'Select Repository'}
        </span>
        <motion.svg 
          animate={{ rotate: showDropdown ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 mt-2 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-[9999] overflow-hidden"
            onMouseLeave={() => setShowDropdown(false)}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100/80 dark:border-gray-800/60">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Repositories</h3>
            </div>

            {/* Add Repository Section */}
            <div className="px-4 py-3 border-b border-gray-100/60 dark:border-gray-800/40">
              {isAddingRepo ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    value={newRepoPath}
                    onChange={(e) => setNewRepoPath(e.target.value)}
                    placeholder="Enter repository path..."
                    className="w-full px-3 py-2.5 text-sm bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddRepo}
                      disabled={!newRepoPath.trim()}
                      className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        !newRepoPath.trim()
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      Add Repository
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingRepo(false);
                        setNewRepoPath('');
                      }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setIsAddingRepo(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 rounded-xl transition-all duration-200 group"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span className="font-medium">Add New Repository</span>
                </button>
              )}
            </div>

            {/* Repository List */}
            <div className="max-h-80 overflow-y-auto">
              {repositories.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No repositories yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first repository to get started</p>
                </div>
              ) : (
                <div className="py-1">
                  {repositories.map((repo) => (
                    <motion.div
                      key={repo.path}
                      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                      className={`px-4 py-2.5 cursor-pointer transition-all duration-150 flex items-center justify-between group ${
                        currentDir === repo.path
                          ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                          : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
                      }`}
                      onClick={() => switchRepository(repo.path)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          currentDir === repo.path
                            ? 'bg-blue-100 dark:bg-blue-900/40'
                            : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                        } transition-colors`}>
                          <svg className={`w-4 h-4 ${
                            currentDir === repo.path
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                          } transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            currentDir === repo.path
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {repo.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                            {repo.path}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
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
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100/80 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-800/40">
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
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/80 dark:hover:bg-gray-700/60 rounded-xl transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="font-medium">Browse for Repository</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RepositorySelector;