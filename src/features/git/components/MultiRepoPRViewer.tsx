import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitPullRequest, GitBranch, Plus, X, ExternalLink, RefreshCw, GitCommit, FileText, Diff, Eye, Settings, ChevronDown, ChevronRight, AlertTriangle, Bot, Copy, Check, User, Maximize2, Minimize2, Filter, BarChart3, Users, AtSign } from 'lucide-react';
import MultiRepoDiffViewer from './MultiRepoDiffViewer';
import AvatarManagerModal from '../../../components/AvatarManagerModal';
import { avatarStorageService } from '../../../services/AvatarStorageService';

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
  const [selectedFile, setSelectedFile] = useState<string | null>(() => {
    return localStorage.getItem('multi_repo_pr_selected_file') || null;
  });
  const [loading, setLoading] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('multi_repo_pr_expanded');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoToken, setNewRepoToken] = useState('');
  const [repoLoadingStates, setRepoLoadingStates] = useState<Record<string, boolean>>({});
  const [repoErrorStates, setRepoErrorStates] = useState<Record<string, string>>({});
  const [prStatusFilter, setPrStatusFilter] = useState<'all' | 'open' | 'closed' | 'merged'>(() => {
    const saved = localStorage.getItem('multi_repo_pr_status_filter');
    return (saved as 'all' | 'open' | 'closed' | 'merged') || 'all';
  });

  // Track selected PR by repo and number for persistence
  const [selectedPRKey, setSelectedPRKey] = useState<string | null>(() => {
    return localStorage.getItem('multi_repo_pr_selected') || null;
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [avatarManagerState, setAvatarManagerState] = useState<{
    isOpen: boolean;
    username: string;
    currentAvatarUrl?: string;
  }>({
    isOpen: false,
    username: '',
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [reviewerFilter, setReviewerFilter] = useState('');
  const [showReviewerFilter, setShowReviewerFilter] = useState(false);
  const [currentUser, setCurrentUser] = useState(''); // Current logged-in user
  const [showAnalytics, setShowAnalytics] = useState(false);

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
    
    // Load current user from localStorage or GitHub token
    const savedUser = localStorage.getItem('github_current_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F11 or Ctrl/Cmd + F for fullscreen
      if (event.key === 'F11' || (event.key === 'f' && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
      // Escape to exit fullscreen
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Restore selected PR when PRs are loaded
  useEffect(() => {
    if (pullRequests.length > 0 && selectedPRKey && !selectedPR) {
      const [repoId, prNumber] = selectedPRKey.split(':');
      const pr = pullRequests.find(
        p => p.repository.id === repoId && p.number === parseInt(prNumber)
      );
      if (pr) {
        setSelectedPR(pr);
        loadPRChanges(pr);
      }
    }
  }, [pullRequests, selectedPRKey]);

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
          `https://api.github.com/repos/${repo.owner}/${repo.name}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
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

        const allPRs = await response.json();
      
      // Clear loading state on success
      setRepoLoadingStates(prev => ({ ...prev, [repo.id]: false }));
      
      return allPRs.map((pr: any) => ({
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

      // Auto-expand the new repository
      const newExpanded = new Set(expandedRepos);
      newExpanded.add(newRepo.id);
      setExpandedRepos(newExpanded);
      localStorage.setItem('multi_repo_pr_expanded', JSON.stringify([...newExpanded]));

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
    // Save to localStorage
    localStorage.setItem('multi_repo_pr_expanded', JSON.stringify([...newExpanded]));
  };

  // Auto-expand all repos if no saved state exists
  useEffect(() => {
    if (repositories.length > 0 && expandedRepos.size === 0) {
      const savedExpanded = localStorage.getItem('multi_repo_pr_expanded');
      if (!savedExpanded) {
        // No saved state - expand all repos by default
        const allRepoIds = new Set(repositories.map(r => r.id));
        setExpandedRepos(allRepoIds);
        localStorage.setItem('multi_repo_pr_expanded', JSON.stringify([...allRepoIds]));
      }
    }
  }, [repositories]);

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

      // Restore saved file selection or select first file
      if (changes.length > 0) {
        const savedFile = localStorage.getItem('multi_repo_pr_selected_file');
        const fileToSelect = savedFile && changes.find(f => f.filepath === savedFile)
          ? savedFile
          : changes[0].filepath;
        setSelectedFile(fileToSelect);
        localStorage.setItem('multi_repo_pr_selected_file', fileToSelect);
      }
    } catch (error) {
      console.error('Failed to load PR changes:', error);
    }
  };

  const selectPR = (pr: PullRequest) => {
    setSelectedPR(pr);
    setFileChanges([]);
    setSelectedFile(null);
    localStorage.removeItem('multi_repo_pr_selected_file');

    // Save selected PR key
    const prKey = `${pr.repository.id}:${pr.number}`;
    setSelectedPRKey(prKey);
    localStorage.setItem('multi_repo_pr_selected', prKey);

    loadPRChanges(pr);
  };

  // Helper to update selected file with localStorage
  const handleSelectFile = (filepath: string) => {
    setSelectedFile(filepath);
    localStorage.setItem('multi_repo_pr_selected_file', filepath);
  };

  // Helper to update filter with localStorage
  const handleFilterChange = (filter: 'all' | 'open' | 'closed' | 'merged') => {
    setPrStatusFilter(filter);
    localStorage.setItem('multi_repo_pr_status_filter', filter);
  };

  const refreshAll = () => {
    const activeRepos = repositories.filter(repo => repo.isActive);
    if (activeRepos.length > 0) {
      loadAllPullRequests(activeRepos);
    }
  };

  const generateAIPrompt = (pr: PullRequest) => {
    const prompt = `Please review this Pull Request:

**PR Details:**
- Title: ${pr.title}
- Number: #${pr.number}
- Repository: ${pr.repository.owner}/${pr.repository.name}
- Source Branch: ${pr.head.ref}
- Target Branch: ${pr.base.ref}
- State: ${pr.state}
- Author: ${pr.user.login}
- Created: ${new Date(pr.created_at).toLocaleDateString()}
- Updated: ${new Date(pr.updated_at).toLocaleDateString()}
${pr.closed_at ? `- Closed: ${new Date(pr.closed_at).toLocaleDateString()}` : ''}
${pr.merged_at ? `- Merged: ${new Date(pr.merged_at).toLocaleDateString()}` : ''}

**Description:**
${pr.body || 'No description provided'}

**Changes:**
${pr.additions !== undefined && pr.deletions !== undefined ? `- Lines Added: ${pr.additions}\n- Lines Deleted: ${pr.deletions}\n- Net Change: ${pr.additions - pr.deletions}` : ''}
${pr.changed_files ? `- Files Changed: ${pr.changed_files}` : ''}
${pr.comments !== undefined ? `- Comments: ${pr.comments}` : ''}

**Labels:**
${pr.labels && pr.labels.length > 0 ? pr.labels.map(label => `- ${label.name}`).join('\n') : 'No labels'}

**Reviewers:**
${pr.requested_reviewers && pr.requested_reviewers.length > 0 ? pr.requested_reviewers.map(reviewer => `- ${reviewer.login}`).join('\n') : 'No requested reviewers'}

**Assignees:**
${pr.assignees && pr.assignees.length > 0 ? pr.assignees.map(assignee => `- ${assignee.login}`).join('\n') : 'No assignees'}

---

**Review Instructions:**
1. Compare the changes between the source branch (${pr.head.ref}) and target branch (${pr.base.ref})
2. Assess the code quality, logic, and potential issues
3. Check for any conflicts or breaking changes
4. Verify that tests are included and passing
5. Ensure the PR description clearly explains the changes
6. Review for security vulnerabilities
7. Check if documentation needs to be updated
8. Verify that the changes align with the repository's coding standards

**Agent Reviewer Prompt:**
As an expert code reviewer, please:
- Analyze the technical implementation and architecture
- Identify potential bugs or edge cases
- Suggest improvements or optimizations
- Check for adherence to best practices
- Assess the impact on existing codebase
- Provide specific, actionable feedback
- Consider performance implications
- Verify error handling and edge cases

Please provide a comprehensive review with specific recommendations and any concerns that should be addressed before merging.`;

    setAiPrompt(prompt);
    setShowAIPrompt(true);
  };

  const copyAIPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const openAvatarManager = (username: string, currentAvatarUrl?: string) => {
    setAvatarManagerState({
      isOpen: true,
      username,
      currentAvatarUrl,
    });
  };

  const closeAvatarManager = () => {
    setAvatarManagerState({
      isOpen: false,
      username: '',
    });
  };

  const handleAvatarChange = (username: string) => {
    // Force re-render of PRs to show updated avatar
    setPullRequests([...pullRequests]);
  };

  const getAvatarUrl = (user: { login: string; avatar_url?: string }) => {
    return avatarStorageService.getAvatarUrl(user.login, user.avatar_url);
  };

  // Get unique users from all PRs
  // Load saved user list from localStorage
  const getSavedUsers = () => {
    const saved = localStorage.getItem('pr_user_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse saved user list:', error);
      }
    }
    return [];
  };

  // Save user list to localStorage
  const saveUsers = (users: { login: string; avatar_url?: string; count: number }[]) => {
    localStorage.setItem('pr_user_list', JSON.stringify(users));
  };

  // Update saved user list when PRs change
  const updateUserList = () => {
    const userMap = new Map<string, { login: string; avatar_url?: string; count: number }>();
    
    pullRequests.forEach(pr => {
      const existing = userMap.get(pr.user.login);
      if (existing) {
        existing.count++;
      } else {
        userMap.set(pr.user.login, {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url,
          count: 1
        });
      }
    });
    
    const currentUsers = Array.from(userMap.values()).sort((a, b) => b.count - a.count);
    saveUsers(currentUsers);
    return currentUsers;
  };

  // Get unique users - prioritize saved list, update if new users found
  const getUniqueUsers = () => {
    const savedUsers = getSavedUsers();
    const currentUserMap = new Map<string, { login: string; avatar_url?: string; count: number }>();
    
    // Count current PR users
    pullRequests.forEach(pr => {
      const existing = currentUserMap.get(pr.user.login);
      if (existing) {
        existing.count++;
      } else {
        currentUserMap.set(pr.user.login, {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url,
          count: 1
        });
      }
    });
    
    const currentUsers = Array.from(currentUserMap.values());
    
    // If we have new users not in saved list, update the saved list
    const savedUsernames = new Set(savedUsers.map(u => u.login));
    const hasNewUsers = currentUsers.some(user => !savedUsernames.has(user.login));
    
    if (hasNewUsers || savedUsers.length === 0) {
      return updateUserList();
    }
    
    // Update counts for existing users
    const updatedUsers = savedUsers.map(savedUser => {
      const currentUser = currentUserMap.get(savedUser.login);
      return currentUser || savedUser;
    }).filter(user => user.count > 0).sort((a, b) => b.count - a.count);
    
    return updatedUsers;
  };

  const uniqueUsers = getUniqueUsers();

  // Get unique reviewers
  const getUniqueReviewers = () => {
    const reviewerMap = new Map<string, { login: string; avatar_url?: string; count: number }>();
    
    pullRequests.forEach(pr => {
      if (pr.requested_reviewers) {
        pr.requested_reviewers.forEach((reviewer: any) => {
          const existing = reviewerMap.get(reviewer.login);
          if (existing) {
            existing.count++;
          } else {
            reviewerMap.set(reviewer.login, {
              login: reviewer.login,
              avatar_url: reviewer.avatar_url,
              count: 1
            });
          }
        });
      }
    });
    
    return Array.from(reviewerMap.values()).sort((a, b) => b.count - a.count);
  };

  const uniqueReviewers = getUniqueReviewers();

  // Check if PR mentions current user
  const mentionsCurrentUser = (pr: PullRequest) => {
    if (!currentUser) return false;
    
    const mentions = [
      `@${currentUser}`,
      `**@${currentUser}**`,
      currentUser
    ];
    
    const body = (pr.body || '').toLowerCase();
    const title = pr.title.toLowerCase();
    
    return mentions.some(mention => 
      body.includes(mention.toLowerCase()) || title.includes(mention.toLowerCase())
    );
  };

  // Analytics functions
  const getPRStatistics = () => {
    const totalPRs = pullRequests.length;
    const openPRs = pullRequests.filter(pr => pr.state === 'open').length;
    const closedPRs = pullRequests.filter(pr => pr.state === 'closed').length;
    const mergedPRs = pullRequests.filter(pr => pr.state === 'merged').length;
    
    // PRs mentioning current user
    const mentioningPRs = pullRequests.filter(pr => mentionsCurrentUser(pr));
    
    // Average time to merge (for merged PRs)
    const mergedPRsWithDates = pullRequests.filter(pr => 
      pr.state === 'merged' && pr.created_at && pr.merged_at
    );
    
    const avgTimeToMerge = mergedPRsWithDates.length > 0 
      ? mergedPRsWithDates.reduce((acc, pr) => {
          const created = new Date(pr.created_at).getTime();
          const merged = new Date(pr.merged_at!).getTime();
          return acc + (merged - created);
        }, 0) / mergedPRsWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      total: totalPRs,
      open: openPRs,
      closed: closedPRs,
      merged: mergedPRs,
      mentioning: mentioningPRs.length,
      avgTimeToMerge: Math.round(avgTimeToMerge * 10) / 10
    };
  };

  const getProductivityMetrics = () => {
    const userMetrics = new Map<string, {
      created: number;
      reviewed: number;
      merged: number;
      totalAdditions: number;
      totalDeletions: number;
    }>();

    pullRequests.forEach(pr => {
      // Author metrics
      const author = pr.user.login;
      if (!userMetrics.has(author)) {
        userMetrics.set(author, {
          created: 0,
          reviewed: 0,
          merged: 0,
          totalAdditions: 0,
          totalDeletions: 0
        });
      }
      
      const metrics = userMetrics.get(author)!;
      metrics.created++;
      if (pr.state === 'merged') metrics.merged++;
      if (pr.additions) metrics.totalAdditions += pr.additions;
      if (pr.deletions) metrics.totalDeletions += pr.deletions;

      // Reviewer metrics
      if (pr.requested_reviewers) {
        pr.requested_reviewers.forEach((reviewer: any) => {
          if (!userMetrics.has(reviewer.login)) {
            userMetrics.set(reviewer.login, {
              created: 0,
              reviewed: 0,
              merged: 0,
              totalAdditions: 0,
              totalDeletions: 0
            });
          }
          userMetrics.get(reviewer.login)!.reviewed++;
        });
      }
    });

    return Array.from(userMetrics.entries())
      .map(([login, metrics]) => ({ login, ...metrics }))
      .sort((a, b) => b.created - a.created);
  };

  const getFileImpactAnalysis = () => {
    const fileMap = new Map<string, {
      changeCount: number;
      totalAdditions: number;
      totalDeletions: number;
      contributors: Set<string>;
    }>();

    // This would need to be populated when PR details are loaded
    // For now, we'll use a placeholder
    return [];
  };

  const getDependencyGraph = () => {
    // This would analyze PR relationships based on base/head branches
    // For now, we'll return a placeholder
    return [];
  };

  // Update user list when PRs are loaded
  useEffect(() => {
    if (pullRequests.length > 0) {
      updateUserList();
    }
  }, [pullRequests.length]);

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

  // Filter PRs based on status, user, and reviewer
  const filteredPullRequests = pullRequests.filter(pr => {
    // Status filter
    if (prStatusFilter !== 'all' && pr.state !== prStatusFilter) return false;
    
    // User filter
    if (userFilter) {
      const filterValue = userFilter.toLowerCase().replace('@', '');
      const username = pr.user.login.toLowerCase();
      if (!username.includes(filterValue)) return false;
    }
    
    // Reviewer filter
    if (reviewerFilter) {
      const filterValue = reviewerFilter.toLowerCase().replace('@', '');
      const hasReviewer = pr.requested_reviewers?.some((reviewer: any) => 
        reviewer.login.toLowerCase().includes(filterValue)
      );
      if (!hasReviewer) return false;
    }
    
    return true;
  });

  const filteredGroupedPRs: Record<string, PullRequest[]> = {};
  Object.entries(groupedPRs).forEach(([repoId, prs]) => {
    filteredGroupedPRs[repoId] = prs.filter(pr => {
      // Status filter
      if (prStatusFilter !== 'all' && pr.state !== prStatusFilter) return false;
      
      // User filter
      if (userFilter) {
        const filterValue = userFilter.toLowerCase().replace('@', '');
        const username = pr.user.login.toLowerCase();
        if (!username.includes(filterValue)) return false;
      }
      
      // Reviewer filter
      if (reviewerFilter) {
        const filterValue = reviewerFilter.toLowerCase().replace('@', '');
        const hasReviewer = pr.requested_reviewers?.some((reviewer: any) => 
          reviewer.login.toLowerCase().includes(filterValue)
        );
        if (!hasReviewer) return false;
      }
      
      return true;
    });
  });

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden' : 'p-4 h-full'} flex flex-col`}>
      {/* Compact Header */}
      <div className={`${isFullscreen ? 'p-4' : 'mb-3'} flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          {/* PR Status Filter - Compact */}
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-0.5 shadow-sm border border-gray-200 dark:border-gray-700">
            {[
              { value: 'all', label: 'All', count: pullRequests.length },
              { value: 'open', label: 'Open', count: pullRequests.filter(pr => pr.state === 'open').length },
              { value: 'closed', label: 'Closed', count: pullRequests.filter(pr => pr.state === 'closed').length },
              { value: 'merged', label: 'Merged', count: pullRequests.filter(pr => pr.state === 'merged').length }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  prStatusFilter === filter.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {filter.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  prStatusFilter === filter.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Repository chips - Compact */}
          {repositories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {repositories.map(repo => {
                const isLoading = repoLoadingStates[repo.id];
                const hasError = repoErrorStates[repo.id];

                return (
                  <div
                    key={repo.id}
                    className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-all border ${
                      hasError
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800'
                        : repo.isActive
                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-50'
                    }`}
                    onClick={() => toggleRepository(repo.id)}
                    title={hasError || ''}
                  >
                    {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span className="font-medium">{repo.name}</span>
                    {hasError && <AlertTriangle className="w-3 h-3" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRepository(repo.id);
                      }}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUserFilter(!showUserFilter)}
            className={`p-2 ${userFilter ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all`}
            title="Filter by User"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowReviewerFilter(!showReviewerFilter)}
            className={`p-2 ${reviewerFilter ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all`}
            title="Filter by Reviewer"
          >
            <Users className="w-4 h-4" />
          </button>
          {currentUser && pullRequests.some(pr => mentionsCurrentUser(pr)) && (
            <button
              onClick={() => setUserFilter(currentUser)}
              className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 transition-all"
              title={`PRs mentioning @${currentUser}`}
            >
              <AtSign className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`p-2 ${showAnalytics ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all`}
            title="Analytics Dashboard"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowAddRepo(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            title="Add Repository"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Filter Input */}
      {showUserFilter && (
        <div className={`${isFullscreen ? 'px-4 pb-3' : 'mb-3'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3 mb-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filter by username (e.g., john, jane, @username)"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              {userFilter && (
                <button
                  onClick={() => setUserFilter('')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Avatar Grid */}
            {uniqueUsers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Filter by user:
                  </div>
                  <button
                    onClick={updateUserList}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    title="Refresh user list"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueUsers.map((user) => (
                    <button
                      key={user.login}
                      onClick={() => setUserFilter(user.login)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        userFilter === user.login
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      title={`${user.login} (${user.count} PR${user.count > 1 ? 's' : ''})`}
                    >
                      {getAvatarUrl(user) ? (
                        <img
                          src={getAvatarUrl(user)}
                          alt={user.login}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {user.login}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({user.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {userFilter && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Showing PRs by: <span className="font-medium">{userFilter}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviewer Filter Input */}
      {showReviewerFilter && (
        <div className={`${isFullscreen ? 'px-4 pb-3' : 'mb-3'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={reviewerFilter}
                onChange={(e) => setReviewerFilter(e.target.value)}
                placeholder="Filter by reviewer (e.g., john, jane, @username)"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
              />
              {reviewerFilter && (
                <button
                  onClick={() => setReviewerFilter('')}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Reviewer Avatar Grid */}
            {uniqueReviewers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Filter by reviewer:
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueReviewers.map((reviewer) => (
                    <button
                      key={reviewer.login}
                      onClick={() => setReviewerFilter(reviewer.login)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        reviewerFilter === reviewer.login
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      title={`${reviewer.login} (${reviewer.count} review${reviewer.count > 1 ? 's' : ''})`}
                    >
                      {getAvatarUrl(reviewer) ? (
                        <img
                          src={getAvatarUrl(reviewer)}
                          alt={reviewer.login}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {reviewer.login}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({reviewer.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {reviewerFilter && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Showing PRs reviewed by: <span className="font-medium">{reviewerFilter}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className={`${isFullscreen ? 'px-4 pb-3' : 'mb-3'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                Analytics Dashboard
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* PR Statistics */}
              {(() => {
                const stats = getPRStatistics();
                return (
                  <>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total PRs</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Open PRs</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.merged}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Merged PRs</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.mentioning}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Mentions You</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Productivity Metrics */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Team Productivity</h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="space-y-2">
                  {getProductivityMetrics().slice(0, 5).map((user) => (
                    <div key={user.login} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAvatarUrl({ login: user.login }) ? (
                          <img
                            src={getAvatarUrl({ login: user.login })}
                            alt={user.login}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {user.login}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{user.created} created</span>
                        <span>{user.reviewed} reviewed</span>
                        <span>{user.merged} merged</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Merge Rate</h5>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {getPRStatistics().total > 0 
                    ? Math.round((getPRStatistics().merged / getPRStatistics().total) * 100) 
                    : 0}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Avg Time to Merge</h5>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {getPRStatistics().avgTimeToMerge} days
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isFullscreen ? 'flex-1 p-4 overflow-y-auto' : 'flex-1'}`}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">Loading Pull Requests</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fetching from your repositories...</p>
          </div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <GitPullRequest className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Repositories</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Add your first GitHub repository to start tracking pull requests across multiple projects.
            </p>
            <button
              onClick={() => setShowAddRepo(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm transition-all"
            >
              Add Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-3 overflow-hidden">
          {/* PR List - Compact */}
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <div className="space-y-2">
              {Object.entries(filteredGroupedPRs).map(([repoId, repoPRs]) => {
                const repo = repositories.find(r => r.id === repoId);
                const isExpanded = expandedRepos.has(repoId);
                const totalRepoPRs = groupedPRs[repoId]?.length || 0;

                if (repoPRs.length === 0 && prStatusFilter !== 'all') return null;

                return (
                  <div key={repoId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleRepoExpansion(repoId)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="font-medium text-xs text-gray-900 dark:text-white truncate">
                          {repo?.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500">
                        {repoPRs.length}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100 dark:border-gray-700">
                            {repoPRs.map(pr => (
                              <div
                                key={`${pr.repository.id}-${pr.number}`}
                                onClick={() => selectPR(pr)}
                                className={`px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                                  selectedPR?.repository.id === pr.repository.id && selectedPR?.number === pr.number
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                                    : mentionsCurrentUser(pr)
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-500'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="relative">
                                    {getAvatarUrl(pr.user) ? (
                                      <img
                                        src={getAvatarUrl(pr.user)}
                                        alt={pr.user.login}
                                        className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openAvatarManager(pr.user.login, pr.user.avatar_url);
                                        }}
                                        title="Click to change avatar"
                                      />
                                    ) : (
                                      <div
                                        className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openAvatarManager(pr.user.login, pr.user.avatar_url);
                                        }}
                                        title="Click to add avatar"
                                      >
                                        <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                                        #{pr.number}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPRStatusColor(pr.state)}`}>
                                        {pr.state}
                                      </span>
                                      {mentionsCurrentUser(pr) && (
                                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                          @
                                        </span>
                                      )}
                                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {pr.title}
                                      </span>
                                    </div>
                                    <div className="font-mono text-xs text-gray-500 mb-1">
                                      {pr.head.ref} → {pr.base.ref}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="font-medium">{pr.user.login}</span>
                                    </div>
                                  </div>
                                  <a
                                    href={pr.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5"
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
                {/* PR Header - Compact design */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                          #{selectedPR.number}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPRStatusColor(selectedPR.state)}`}>
                          {selectedPR.state}
                        </span>
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {selectedPR.head.ref} → {selectedPR.base.ref}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {selectedPR.user.login}
                        </span>
                        <span className="text-xs text-gray-500">
                          updated {new Date(selectedPR.updated_at).toLocaleDateString()}
                        </span>
                        <a
                          href={selectedPR.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={selectedPR.title}>
                        {selectedPR.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Stats inline */}
                      <div className="flex items-center gap-3 text-xs">
                        {selectedPR.additions !== undefined && (
                          <span className="text-green-600 font-medium">+{selectedPR.additions}</span>
                        )}
                        {selectedPR.deletions !== undefined && (
                          <span className="text-red-600 font-medium">-{selectedPR.deletions}</span>
                        )}
                        {selectedPR.changed_files && (
                          <span className="text-gray-500">{selectedPR.changed_files} files</span>
                        )}
                      </div>

                      <div className="relative">
                        {getAvatarUrl(selectedPR.user) ? (
                          <img
                            src={getAvatarUrl(selectedPR.user)}
                            alt={selectedPR.user.login}
                            className="w-7 h-7 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            title={`${selectedPR.user.login} - Click to change avatar`}
                            onClick={() => openAvatarManager(selectedPR.user.login, selectedPR.user.avatar_url)}
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            title={`${selectedPR.user.login} - Click to add avatar`}
                            onClick={() => openAvatarManager(selectedPR.user.login, selectedPR.user.avatar_url)}
                          >
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => generateAIPrompt(selectedPR)}
                        className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                        title="Generate AI Review Prompt"
                      >
                        <Bot className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Changes - Compact layout for max diff space */}
                <div className="flex-1 flex gap-3 overflow-hidden">
                  <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                      <h4 className="font-medium text-xs text-gray-700 dark:text-gray-300">
                        Files <span className="text-gray-500">({fileChanges.length})</span>
                      </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {fileChanges.map((file, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectFile(file.filepath)}
                          className={`px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 ${
                            selectedFile === file.filepath ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-gray-900 dark:text-white truncate">
                              {file.filepath.split('/').pop()}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                              {file.linesAdded > 0 && (
                                <span className="text-green-600">+{file.linesAdded}</span>
                              )}
                              {file.linesRemoved > 0 && (
                                <span className="text-red-600">-{file.linesRemoved}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {selectedFile ? (
                      <MultiRepoDiffViewer
                        filePath={selectedFile}
                        diff={fileChanges.find(f => f.filepath === selectedFile)?.diff || ''}
                        repository={selectedPR.repository}
                        headBranch={selectedPR.head.ref}
                        baseBranch={selectedPR.base.ref}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Select a file</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <GitPullRequest className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No PR Selected</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select a pull request from the list to view its details, files changed, and diff.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Repository Modal - Apple-inspired sheet design */}
      {showAddRepo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Repository
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enter the GitHub repository URL to start tracking its pull requests.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Token
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="password"
                  value={newRepoToken}
                  onChange={(e) => setNewRepoToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm transition-all"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Required for private repositories or to avoid rate limits.
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAddRepo(false);
                  setNewRepoUrl('');
                  setNewRepoToken('');
                }}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium border border-gray-200 dark:border-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addRepository}
                disabled={!newRepoUrl.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
              >
                Add Repository
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Prompt Modal - Improved design */}
      {showAIPrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Review Prompt
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Copy this prompt to use with your AI assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIPrompt(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-80 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-900 dark:text-white font-mono text-sm leading-relaxed resize-none"
                  placeholder="AI review prompt will appear here..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {aiPrompt.length} characters
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAIPrompt(false);
                    setAiPrompt('');
                    setPromptCopied(false);
                  }}
                  className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium border border-gray-200 dark:border-gray-600 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={copyAIPrompt}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  {promptCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Avatar Manager Modal */}
      <AvatarManagerModal
        isOpen={avatarManagerState.isOpen}
        onClose={closeAvatarManager}
        username={avatarManagerState.username}
        currentAvatarUrl={avatarManagerState.currentAvatarUrl}
        onAvatarChange={() => handleAvatarChange(avatarManagerState.username)}
      />
      </div>
    </div>
  );
};

export default MultiRepoPRViewer;