import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitPullRequest, GitBranch, Plus, X, ExternalLink, RefreshCw, GitCommit, FileText, Diff, Eye, Settings, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import MultiRepoDiffViewer from './MultiRepoDiffViewer';

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  token?: string;
  isActive: boolean;
}

interface PullRequest {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      full_name: string;
    };
  };
  base: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      full_name: string;
    };
  };
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  comments?: number;
  review_status?: string;
  repository: Repository;
}

interface FileChange {
  filepath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  linesAdded: number;
  linesRemoved: number;
  diff?: string;
}

const MultiRepoPRViewer: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoToken, setNewRepoToken] = useState('');
  // Separate state for loading and errors to avoid infinite loops
  const [repoLoadingStates, setRepoLoadingStates] = useState<Record<string, boolean>>({});
  const [repoErrorStates, setRepoErrorStates] = useState<Record<string, string>>({});
  const [prStatusFilter, setPrStatusFilter] = useState<'all' | 'open' | 'closed' | 'merged'>('all');

  // Load repositories from localStorage
  useEffect(() => {
    const savedRepos = localStorage.getItem('multi_repo_pr_repositories');
    if (savedRepos) {
      try {
        const parsed = JSON.parse(savedRepos);
        setRepositories(parsed);
      } catch (error) {
        console.error('Failed to parse saved repositories:', error);
      }
    }
  }, []);

  // Load PRs when repositories change - but only when the active repos actually change
  useEffect(() => {
    const activeRepos = repositories.filter(repo => repo.isActive);
    if (activeRepos.length > 0) {
      loadAllPullRequests(activeRepos);
    }
  }, [repositories.map(r => `${r.id}-${r.isActive}`).join(',')]); // Only track id and isActive changes

  const loadAllPullRequests = async (repos: Repository[]) => {
    setLoading(true);
    try {
      const allPRs: PullRequest[] = [];
      
      // Load PRs in parallel but with a small delay between each to avoid rate limiting
      const promises = repos.map(async (repo, index) => {
        // Add a small delay between requests
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return loadRepositoryPullRequests(repo);
      });
      
      const results = await Promise.all(promises);
      results.forEach(repoPRs => {
        allPRs.push(...repoPRs);
      });
      
      // Sort by updated date (most recent first)
      allPRs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setPullRequests(allPRs);
    } catch (error) {
      console.error('Failed to load pull requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepositoryPullRequests = async (repo: Repository): Promise<PullRequest[]> => {
    try {
      // Update loading state using separate state
      setRepoLoadingStates(prev => ({ ...prev, [repo.id]: true }));
      setRepoErrorStates(prev => {
        const newStates = { ...prev };
        delete newStates[repo.id];
        return newStates;
      });

      // Get token from repo config or localStorage
      let token = repo.token;
      if (!token) {
        token = localStorage.getItem(`github_token_${repo.id}`) || '';
      }
      if (!token) {
        token = localStorage.getItem('github_token') || '';
      }

      const response = await fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.name}/pulls?state=all&sort=updated&direction=desc`,
        {
          headers: {
            'Authorization': token ? `token ${token}` : '',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to fetch PRs: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
        
        // Update error state
        setRepoErrorStates(prev => ({ ...prev, [repo.id]: errorMessage }));
        setRepoLoadingStates(prev => ({ ...prev, [repo.id]: false }));
        
        console.warn(`${repo.owner}/${repo.name}: ${errorMessage}`);
        return [];
      }

      const prs = await response.json();
      
      // Clear loading state on success
      setRepoLoadingStates(prev => ({ ...prev, [repo.id]: false }));
      
      return prs.map((pr: any) => ({
        ...pr,
        repository: repo,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update error state
      setRepoErrorStates(prev => ({ ...prev, [repo.id]: errorMessage }));
      setRepoLoadingStates(prev => ({ ...prev, [repo.id]: false }));
      
      console.error(`Error loading PRs for ${repo.owner}/${repo.name}:`, error);
      return [];
    }
  };

  const addRepository = async () => {
    if (!newRepoUrl.trim()) return;

    try {
      // Parse GitHub URL
      const match = newRepoUrl.match(/github\.com[\/:]([^\/]+)\/(.+?)(\.git)?$/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repoName] = match;
      const cleanRepoName = repoName.replace('.git', '');

      // Check if repository already exists
      const existing = repositories.find(
        r => r.owner === owner && r.name === cleanRepoName
      );
      if (existing) {
        throw new Error('Repository already added');
      }

      // Test the repository access
      let token = newRepoToken.trim();
      if (!token) {
        token = localStorage.getItem('github_token') || '';
      }

      const testResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepoName}`,
        {
          headers: {
            'Authorization': token ? `token ${token}` : '',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!testResponse.ok) {
        let errorMessage = `Cannot access repository: ${testResponse.status}`;
        try {
          const errorData = await testResponse.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
        
        if (testResponse.status === 404) {
          errorMessage = `Repository not found: ${owner}/${cleanRepoName}. Please check the repository name and your access permissions.`;
        } else if (testResponse.status === 403) {
          errorMessage = `Access denied. Please check your GitHub token and permissions.`;
        }
        
        throw new Error(errorMessage);
      }

      const newRepo: Repository = {
        id: `${owner}/${cleanRepoName}`,
        name: cleanRepoName,
        owner,
        url: newRepoUrl,
        token: token || undefined,
        isActive: true,
      };

      const updatedRepos = [...repositories, newRepo];
      setRepositories(updatedRepos);
      localStorage.setItem('multi_repo_pr_repositories', JSON.stringify(updatedRepos));

      // Save token if provided
      if (newRepoToken.trim()) {
        localStorage.setItem(`github_token_${newRepo.id}`, newRepoToken.trim());
      }

      setNewRepoUrl('');
      setNewRepoToken('');
      setShowAddRepo(false);
    } catch (error) {
      console.error('Failed to add repository:', error);
      alert(error instanceof Error ? error.message : 'Failed to add repository');
    }
  };

  const removeRepository = (repoId: string) => {
    const updatedRepos = repositories.filter(r => r.id !== repoId);
    setRepositories(updatedRepos);
    localStorage.setItem('multi_repo_pr_repositories', JSON.stringify(updatedRepos));
    
    // Remove saved token
    localStorage.removeItem(`github_token_${repoId}`);
  };

  const toggleRepository = (repoId: string) => {
    const updatedRepos = repositories.map(r =>
      r.id === repoId ? { ...r, isActive: !r.isActive } : r
    );
    setRepositories(updatedRepos);
    localStorage.setItem('multi_repo_pr_repositories', JSON.stringify(updatedRepos));
  };

  const toggleRepoExpansion = (repoId: string) => {
    const newExpanded = new Set(expandedRepos);
    if (newExpanded.has(repoId)) {
      newExpanded.delete(repoId);
    } else {
      newExpanded.add(repoId);
    }
    setExpandedRepos(newExpanded);
  };

  const loadPRChanges = async (pr: PullRequest) => {
    try {
      // Get token for this repository
      let token = pr.repository.token;
      if (!token) {
        token = localStorage.getItem(`github_token_${pr.repository.id}`) || '';
      }
      if (!token) {
        token = localStorage.getItem('github_token') || '';
      }

      const response = await fetch(
        `https://api.github.com/repos/${pr.repository.owner}/${pr.repository.name}/pulls/${pr.number}/files`,
        {
          headers: {
            'Authorization': token ? `token ${token}` : '',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch PR files: ${response.status}`);
        return;
      }

      const files = await response.json();
      
      const changes: FileChange[] = files.map((file: any) => ({
        filepath: file.filename,
        status: file.status,
        linesAdded: file.additions || 0,
        linesRemoved: file.deletions || 0,
        diff: file.patch,
      }));

      setFileChanges(changes);
      if (changes.length > 0) {
        setSelectedFile(changes[0].filepath);
      }
    } catch (error) {
      console.error('Failed to load PR changes:', error);
    }
  };

  const selectPR = (pr: PullRequest) => {
    setSelectedPR(pr);
    setFileChanges([]);
    setSelectedFile(null);
    loadPRChanges(pr);
  };

  const refreshAll = () => {
    const activeRepos = repositories.filter(repo => repo.isActive);
    if (activeRepos.length > 0) {
      loadAllPullRequests(activeRepos);
    }
  };

  const getPRStatusColor = (state: string) => {
    switch (state) {
      case 'open': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-red-600 bg-red-100';
      case 'merged': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const groupPRsByRepository = () => {
    const grouped: Record<string, PullRequest[]> = {};
    
    pullRequests.forEach(pr => {
      const repoKey = pr.repository.id;
      if (!grouped[repoKey]) {
        grouped[repoKey] = [];
      }
      grouped[repoKey].push(pr);
    });

    return grouped;
  };

  const groupedPRs = groupPRsByRepository();

  // Filter PRs based on status
  const filteredPullRequests = pullRequests.filter(pr => {
    if (prStatusFilter === 'all') return true;
    if (prStatusFilter === 'open') return pr.state === 'open';
    if (prStatusFilter === 'closed') return pr.state === 'closed';
    if (prStatusFilter === 'merged') return pr.state === 'merged';
    return true;
  });

  const filteredGroupedPRs: Record<string, PullRequest[]> = {};
  Object.entries(groupedPRs).forEach(([repoId, prs]) => {
    filteredGroupedPRs[repoId] = prs.filter(pr => {
      if (prStatusFilter === 'all') return true;
      if (prStatusFilter === 'open') return pr.state === 'open';
      if (prStatusFilter === 'closed') return pr.state === 'closed';
      if (prStatusFilter === 'merged') return pr.state === 'merged';
      return true;
    });
  });

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Multi-Repository PR Viewer
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRepo(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* PR Status Filter */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All', count: pullRequests.length },
              { value: 'open', label: 'Open', count: pullRequests.filter(pr => pr.state === 'open').length },
              { value: 'closed', label: 'Closed', count: pullRequests.filter(pr => pr.state === 'closed').length },
              { value: 'merged', label: 'Merged', count: pullRequests.filter(pr => pr.state === 'merged').length }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setPrStatusFilter(filter.value as any)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  prStatusFilter === filter.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {filter.label}
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-xs">
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Repository Summary */}
        <div className="flex gap-2 flex-wrap">
          {repositories.map(repo => {
            const isLoading = repoLoadingStates[repo.id];
            const hasError = repoErrorStates[repo.id];
            
            return (
              <div
                key={repo.id}
                className={`px-3 py-1 rounded-full text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                  hasError
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : repo.isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}
                onClick={() => toggleRepository(repo.id)}
                title={hasError || ''}
              >
                {isLoading && (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                )}
                <span>{repo.owner}/{repo.name}</span>
                {hasError && (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRepository(repo.id);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading pull requests...</p>
          </div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitPullRequest className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">No repositories added</p>
            <button
              onClick={() => setShowAddRepo(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* PR List */}
          <div className="w-96 flex-shrink-0 overflow-y-auto">
            <div className="space-y-2">
              {Object.entries(filteredGroupedPRs).map(([repoId, repoPRs]) => {
                const repo = repositories.find(r => r.id === repoId);
                const isExpanded = expandedRepos.has(repoId);
                const totalRepoPRs = groupedPRs[repoId]?.length || 0;
                
                // Only show repositories that have PRs matching the filter
                if (repoPRs.length === 0 && prStatusFilter !== 'all') return null;
                
                return (
                  <div key={repoId} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toggleRepoExpansion(repoId)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-sm">
                          {repo?.owner}/{repo?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({prStatusFilter === 'all' ? totalRepoPRs : repoPRs.length} PRs)
                        </span>
                        {prStatusFilter !== 'all' && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            ({totalRepoPRs} total)
                          </span>
                        )}
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            {repoPRs.filter(pr => {
                              if (prStatusFilter === 'all') return true;
                              if (prStatusFilter === 'open') return pr.state === 'open';
                              if (prStatusFilter === 'closed') return pr.state === 'closed';
                              if (prStatusFilter === 'merged') return pr.state === 'merged';
                              return true;
                            }).map(pr => (
                              <div
                                key={`${pr.repository.id}-${pr.number}`}
                                onClick={() => selectPR(pr)}
                                className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                  selectedPR?.repository.id === pr.repository.id && selectedPR?.number === pr.number
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                                        #{pr.number}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${getPRStatusColor(pr.state)}`}>
                                        {pr.state}
                                      </span>
                                    </div>
                                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                      {pr.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                      <span>{pr.head.ref} → {pr.base.ref}</span>
                                      <span>•</span>
                                      <span>{pr.user.login}</span>
                                    </div>
                                  </div>
                                  <a
                                    href={pr.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PR Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedPR ? (
              <>
                {/* PR Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                          #{selectedPR.number}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getPRStatusColor(selectedPR.state)}`}>
                          {selectedPR.state}
                        </span>
                        <a
                          href={selectedPR.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedPR.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{selectedPR.repository.owner}/{selectedPR.repository.name}</span>
                        <span>{selectedPR.head.ref} → {selectedPR.base.ref}</span>
                        <span>by {selectedPR.user.login}</span>
                      </div>
                    </div>
                    {selectedPR.user.avatar_url && (
                      <img
                        src={selectedPR.user.avatar_url}
                        alt={selectedPR.user.login}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                  </div>
                  
                  {selectedPR.body && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {selectedPR.body}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {selectedPR.additions !== undefined && (
                      <span className="text-green-600">+{selectedPR.additions}</span>
                    )}
                    {selectedPR.deletions !== undefined && (
                      <span className="text-red-600">-{selectedPR.deletions}</span>
                    )}
                    {selectedPR.changed_files && (
                      <span>{selectedPR.changed_files} files</span>
                    )}
                    {selectedPR.comments && (
                      <span>{selectedPR.comments} comments</span>
                    )}
                    <span>Updated {new Date(selectedPR.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* File Changes */}
                <div className="flex-1 flex gap-4 overflow-hidden">
                  <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                        Files Changed ({fileChanges.length})
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {fileChanges.map((file, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedFile(file.filepath)}
                          className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                            selectedFile === file.filepath ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono truncate flex-1">
                              {file.filepath}
                            </span>
                            <div className="flex items-center gap-1 text-xs">
                              {file.linesAdded > 0 && (
                                <span className="text-green-600">+{file.linesAdded}</span>
                              )}
                              {file.linesRemoved > 0 && (
                                <span className="text-red-600">-{file.linesRemoved}</span>
                              )}
                            </div>
                          </div>
                          <div className="mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              file.status === 'added' ? 'bg-green-100 text-green-700' :
                              file.status === 'deleted' ? 'bg-red-100 text-red-700' :
                              file.status === 'renamed' ? 'bg-purple-100 text-purple-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {file.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {selectedFile ? (
                      <MultiRepoDiffViewer
                        filePath={selectedFile}
                        diff={fileChanges.find(f => f.filepath === selectedFile)?.diff || ''}
                        repository={selectedPR.repository}
                        headBranch={selectedPR.head.ref}
                        baseBranch={selectedPR.base.ref}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Select a file to view changes</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <GitPullRequest className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a pull request to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Repository Modal */}
      {showAddRepo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Repository
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GitHub Token (optional)
                </label>
                <input
                  type="password"
                  value={newRepoToken}
                  onChange={(e) => setNewRepoToken(e.target.value)}
                  placeholder="Personal access token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={addRepository}
                disabled={!newRepoUrl.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Repository
              </button>
              <button
                onClick={() => {
                  setShowAddRepo(false);
                  setNewRepoUrl('');
                  setNewRepoToken('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiRepoPRViewer;