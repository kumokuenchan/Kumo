import React, { useState, useEffect } from 'react';
import { GitPullRequest, GitCommit, GitBranch, Plus, Eye, MessageSquare, Users, Calendar, CheckCircle, XCircle, AlertTriangle, Code, FileText, Settings, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';

interface PullRequest {
  id: string;
  number?: number;
  title: string;
  description: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'closed' | 'merged' | 'draft';
  createdAt: string;
  updatedAt: string;
  reviewers: string[];
  assignees: string[];
  labels: string[];
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  comments: number;
  conflicts: boolean;
  mergeable: boolean;
  url?: string;
}

interface CodeReview {
  id: string;
  pullRequestNumber: number;
  reviewer: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'commented';
  body: string;
  createdAt: string;
  updatedAt: string;
  commitId: string;
  filePath?: string;
  lineNumber?: number;
}

interface ReviewComment {
  id: string;
  reviewId: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  path?: string;
  position?: number;
  diffHunk?: string;
}

interface Review {
  id: string;
  prId: string;
  author: string;
  status: 'pending' | 'approved' | 'changes_requested';
  body: string;
  createdAt: string;
}

interface PullRequestManagerProps {
  gitService: any;
  onPRCreate?: (pr: PullRequest) => void;
}

export default function PullRequestManager({ gitService, onPRCreate }: PullRequestManagerProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'reviews'>('list');
  const [loading, setLoading] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [hasTokenInRemote, setHasTokenInRemote] = useState(false);
  const [reviews, setReviews] = useState<CodeReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<CodeReview | null>(null);
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approve' | 'request_changes' | 'comment'>('comment');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sourceBranch: '',
    targetBranch: 'main',
    draft: false,
    reviewers: [] as string[],
    assignees: [] as string[],
    labels: [] as string[]
  });

  useEffect(() => {
    loadBranches();
    loadPullRequests();
    loadGitHubToken();
    checkTokenInRemote();
  }, [gitService]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab, gitService]);

  useEffect(() => {
    console.log('pullRequests changed:', pullRequests.length, pullRequests.map(pr => pr.title));
  }, [pullRequests]);

  const loadGitHubToken = () => {
    const token = localStorage.getItem('github_token') || '';
    setGithubToken(token);
  };

  const saveGitHubToken = (token: string) => {
    localStorage.setItem('github_token', token);
    setGithubToken(token);
    setShowTokenDialog(false);
  };

  const checkTokenInRemote = async () => {
    try {
      const remotes = await gitService.getRemotes();
      const originRemote = remotes.find(r => r.name === 'origin');
      
      if (originRemote && originRemote.url) {
        const hasToken = originRemote.url.includes('ghp_') && originRemote.url.includes('@github.com');
        setHasTokenInRemote(hasToken);
        return hasToken;
      }
    } catch (error) {
      console.log('Could not check remote for token:', error);
    }
    return false;
  };

  const loadReviews = async () => {
    try {
      const githubReviews = await loadGitHubReviews();
      setReviews(githubReviews);
    } catch (error) {
      console.error('Failed to load reviews from GitHub:', error);
      setReviews([]);
    }
  };

  const loadGitHubReviews = async (): Promise<CodeReview[]> => {
    // Get GitHub token
    let token = '';
    
    try {
      const remotes = await gitService.getRemotes();
      const originRemote = remotes.find(r => r.name === 'origin');
      
      if (originRemote && originRemote.url) {
        const urlMatch = originRemote.url.match(/https:\/\/(ghp_[^@]+)@github\.com/);
        if (urlMatch) {
          token = urlMatch[1];
        }
      }
    } catch (error) {
      console.log('Could not extract token from remote URL:', error);
    }
    
    if (!token) {
      token = localStorage.getItem('github_token') || '';
    }
    
    if (!token) {
      throw new Error('GitHub token not found');
    }

    // Get repository info
    const remotes = await gitService.getRemotes();
    const originRemote = remotes.find(r => r.name === 'origin');
    
    if (!originRemote) {
      throw new Error('No origin remote found');
    }

    const repoUrl = originRemote.url;
    const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/(.+?)(\.git)?$/);
    
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');

    // Get all PRs first
    const prsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!prsResponse.ok) {
      console.warn(`Failed to fetch PRs for reviews: ${prsResponse.status}`);
      return [];
    }

    const pullRequests = await prsResponse.json();

    // Get reviews for each PR
    const allReviews: CodeReview[] = [];
    
    for (const pr of pullRequests) {
      const reviewsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${pr.number}/reviews`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (reviewsResponse.ok) {
        const prReviews = await reviewsResponse.json();
        
        const transformedReviews = prReviews.map((review: any) => ({
          id: review.id.toString(),
          pullRequestNumber: pr.number,
          reviewer: review.user.login,
          status: review.state === 'APPROVED' ? 'approved' : 
                  review.state === 'CHANGES_REQUESTED' ? 'changes_requested' : 
                  review.state === 'COMMENTED' ? 'commented' : 'pending',
          body: review.body || '',
          createdAt: review.submitted_at,
          updatedAt: new Date().toISOString(),
          commitId: review.commit_id,
          filePath: review.path,
          lineNumber: review.line
        }));
        
        allReviews.push(...transformedReviews);
      }
    }

    return allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const submitReview = async (pullRequestNumber: number) => {
    if (!newReviewBody.trim()) return;

    setLoading(true);
    try {
      // Get GitHub token
      let token = '';
      
      try {
        const remotes = await gitService.getRemotes();
        const originRemote = remotes.find(r => r.name === 'origin');
        
        if (originRemote && originRemote.url) {
          const urlMatch = originRemote.url.match(/https:\/\/(ghp_[^@]+)@github\.com/);
          if (urlMatch) {
            token = urlMatch[1];
          }
        }
      } catch (error) {
        console.log('Could not extract token from remote URL:', error);
      }
      
      if (!token) {
        token = localStorage.getItem('github_token') || '';
      }
      
      if (!token) {
        throw new Error('GitHub token not found');
      }

      // Get repository info
      const remotes = await gitService.getRemotes();
      const originRemote = remotes.find(r => r.name === 'origin');
      
      if (!originRemote) {
        throw new Error('No origin remote found');
      }

      const repoUrl = originRemote.url;
      const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/(.+?)(\.git)?$/);
      
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const repoName = repo.replace('.git', '');

      // Submit review to GitHub API
      const reviewData = {
        body: newReviewBody,
        event: reviewStatus === 'approve' ? 'APPROVE' : 
               reviewStatus === 'request_changes' ? 'REQUEST_CHANGES' : 'COMMENT'
      };

      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${pullRequestNumber}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.status}`);
      }

      // Refresh reviews
      await loadReviews();
      setNewReviewBody('');
      
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await gitService.getBranches();
      setBranches(branchList.map((b: any) => b.name));
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadPullRequests = async () => {
    try {
      // Always try to load real PRs from GitHub
      const githubPRs = await loadGitHubPullRequests();
      setPullRequests(githubPRs);
    } catch (error) {
      console.error('Failed to load pull requests from GitHub:', error);
      
      // Only load mock PRs if there's no token available
      const hasToken = githubToken || hasTokenInRemote;
      if (!hasToken) {
        const mockPRs: PullRequest[] = [
          {
            id: 'pr-1',
            title: 'Add new feature to user dashboard',
            description: 'This PR adds a new feature to the user dashboard that allows users to customize their view preferences.',
            author: 'John Doe',
            sourceBranch: 'feature/dashboard-customization',
            targetBranch: 'main',
            status: 'open',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-16T14:20:00Z',
            reviewers: ['jane@example.com', 'bob@example.com'],
            assignees: ['john@example.com'],
            labels: ['enhancement', 'ui'],
            commits: 5,
            additions: 234,
            deletions: 89,
            changedFiles: 12,
            comments: 8,
            conflicts: false,
            mergeable: true,
            url: 'https://github.com/example/repo/pull/123'
          }
        ];
        setPullRequests(mockPRs);
      } else {
        // If there's a token but loading failed, show empty state
        setPullRequests([]);
      }
    }
  };

  const loadGitHubPullRequests = async (): Promise<PullRequest[]> => {
    // Try to get GitHub token from remote URL first, then fallback to localStorage
    let token = '';
    
    try {
      // Get repository info from git remote
      const remotes = await gitService.getRemotes();
      const originRemote = remotes.find(r => r.name === 'origin');
      
      if (originRemote && originRemote.url) {
        // Extract token from URL if present
        const urlMatch = originRemote.url.match(/https:\/\/(ghp_[^@]+)@github\.com/);
        if (urlMatch) {
          token = urlMatch[1];
          console.log('Using token from remote URL for loading PRs');
        }
      }
    } catch (error) {
      console.log('Could not extract token from remote URL:', error);
    }
    
    // Fallback to localStorage
    if (!token) {
      token = localStorage.getItem('github_token') || '';
    }
    
    if (!token) {
      throw new Error('GitHub token not found');
    }

    // Get repository info from git remote
    const remotes = await gitService.getRemotes();
    const originRemote = remotes.find(r => r.name === 'origin');
    
    if (!originRemote) {
      throw new Error('No origin remote found');
    }

    const repoUrl = originRemote.url;
    const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/(.+?)(\.git)?$/);
    
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = match;
    const repoName = repo.replace('.git', '');

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const githubData = await response.json();
    
    return githubData.map((pr: any) => ({
      id: pr.id.toString(),
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      author: pr.user.login,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      status: pr.draft ? 'draft' : pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      reviewers: pr.requested_reviewers?.map((r: any) => r.login) || [],
      assignees: pr.assignees?.map((a: any) => a.login) || [],
      labels: pr.labels?.map((l: any) => l.name) || [],
      commits: pr.commits || 0,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      comments: pr.comments || 0,
      conflicts: pr.mergeable === false,
      mergeable: pr.mergeable !== false,
      url: pr.html_url
    }));
  };

  const createGitHubPullRequest = async (formData: any, diffStats: any) => {
  // Try to get GitHub token from remote URL first, then fallback to localStorage
  let token = '';
  
  try {
    // Get repository info from git remote
    const remotes = await gitService.getRemotes();
    const originRemote = remotes.find(r => r.name === 'origin');
    
    if (originRemote && originRemote.url) {
      // Extract token from URL if present
      const urlMatch = originRemote.url.match(/https:\/\/(ghp_[^@]+)@github\.com/);
      if (urlMatch) {
        token = urlMatch[1];
        console.log('Using token from remote URL');
      }
    }
  } catch (error) {
    console.log('Could not extract token from remote URL:', error);
  }
  
  // Fallback to localStorage
  if (!token) {
    token = localStorage.getItem('github_token') || '';
  }
  
  if (!token) {
    throw new Error('GitHub token not found. Please set up GitHub authentication.');
  }

  // Get repository info from git remote
  const remotes = await gitService.getRemotes();
  const originRemote = remotes.find(r => r.name === 'origin');
  
  if (!originRemote) {
    throw new Error('No origin remote found. Please add a GitHub remote.');
  }

  // Parse GitHub repository URL to get owner and repo
  const repoUrl = originRemote.url;
  const match = repoUrl.match(/github\.com[\/:]([^\/]+)\/(.+?)(\.git)?$/);
  
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }

  const [, owner, repo] = match;
  const repoName = repo.replace('.git', '');

  // Create GitHub PR
  const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: formData.title,
      body: formData.description,
      head: formData.sourceBranch,
      base: formData.targetBranch,
      draft: formData.draft,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GitHub API error: ${response.status} - ${errorData.message || response.statusText}`);
  }

  return await response.json();
};

const createPullRequest = async () => {
    if (!formData.title || !formData.sourceBranch) return;

    setLoading(true);
    try {
      // Check if PR would have conflicts
      const hasConflicts = await checkForConflicts(formData.sourceBranch, formData.targetBranch);
      
      // Get diff stats
      const diffStats = await getDiffStats(formData.sourceBranch, formData.targetBranch);

      const newPR: PullRequest = {
        id: `pr-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        author: 'Current User', // Would get from git config
        sourceBranch: formData.sourceBranch,
        targetBranch: formData.targetBranch,
        status: formData.draft ? 'draft' : 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewers: formData.reviewers,
        assignees: formData.assignees,
        labels: formData.labels,
        commits: diffStats.commits,
        additions: diffStats.additions,
        deletions: diffStats.deletions,
        changedFiles: diffStats.changedFiles,
        comments: 0,
        conflicts: hasConflicts,
        mergeable: !hasConflicts
      };

      // Push branch to remote if needed
      try {
        await gitService.push('origin', formData.sourceBranch);
        console.log('Branch pushed successfully:', formData.sourceBranch);
      } catch (pushError) {
        console.error('Failed to push branch:', pushError);
        throw new Error('Failed to push branch to remote');
      }

      // Create PR on GitHub
      try {
        const githubPR = await createGitHubPullRequest(formData, diffStats);
        console.log('GitHub PR created:', githubPR);
        
        // Update our local PR with GitHub data
        newPR.id = githubPR.id.toString();
        newPR.url = githubPR.html_url;
        newPR.number = githubPR.number;
      } catch (apiError) {
        console.error('Failed to create GitHub PR:', apiError);
        
        // If token is missing, show the token dialog
        if (apiError.message.includes('GitHub token not found')) {
          setShowTokenDialog(true);
          throw new Error('Please set up your GitHub token first');
        }
        
        throw new Error('Failed to create pull request on GitHub: ' + apiError.message);
      }

      console.log('Adding PR to list:', newPR);
      console.log('Current PR count before:', pullRequests.length);
      
      setPullRequests(prev => {
        const newList = [newPR, ...prev];
        console.log('New PR count:', newList.length);
        console.log('New PR list:', newList);
        return newList;
      });
      
      // Force a re-render by updating a dummy state
      setTimeout(() => {
        setPullRequests(current => [...current]);
      }, 100);
      
      onPRCreate?.(newPR);
      setShowCreateForm(false);
      setActiveTab('list'); // Switch back to list view to see the new PR
      resetForm();
    } catch (error) {
      console.error('Failed to create pull request:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForConflicts = async (source: string, target: string): Promise<boolean> => {
    try {
      // Simulate conflict detection
      const mergeResult = { conflicts: [] }; // No conflicts for demo
      
      if (mergeResult.conflicts && mergeResult.conflicts.length > 0) {
        return true; // Has conflicts
      }
      
      const diff = await gitService.getBranchDiff(target, source);
      const log = await gitService.getLog();
      return false; // No conflicts
    } catch {
      return false;
    }
  };

  const getDiffStats = async (source: string, target: string) => {
    try {
      const diffData = await gitService.getBranchDiff(target, source);
      
      let additions = 0;
      let deletions = 0;
      let changedFiles = 0;
      let commits = 0;

      // If diffData is an array of changes objects
      if (Array.isArray(diffData)) {
        changedFiles = diffData.length;
        for (const change of diffData) {
          if (change.linesAdded) additions += change.linesAdded;
          if (change.linesRemoved) deletions += change.linesRemoved;
        }
      } else if (typeof diffData === 'string') {
        // Parse string diff format
        const lines = diffData.split('\n');
        for (const line of lines) {
          if (line.startsWith('diff --git')) {
            changedFiles++;
          } else if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
          }
        }
      }

      // Get commit count
      const log = await gitService.getLog();
      commits = log.length;

      return { additions, deletions, changedFiles, commits };
    } catch {
      return { additions: 0, deletions: 0, changedFiles: 0, commits: 0 };
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      sourceBranch: '',
      targetBranch: 'main',
      draft: false,
      reviewers: [],
      assignees: [],
      labels: []
    });
  };

  const mergePullRequest = async (prId: string) => {
    try {
      const pr = pullRequests.find(p => p.id === prId);
      if (!pr) return;

      // Merge the branch
      // Simulate merge branch
      console.log('Would merge', pr.sourceBranch, 'into', pr.targetBranch);
      
      // Update PR status
      setPullRequests(prev => prev.map(p => 
        p.id === prId ? { ...p, status: 'merged' as const } : p
      ));
    } catch (error) {
      console.error('Failed to merge pull request:', error);
    }
  };

  const closePullRequest = async (prId: string) => {
    try {
      const pr = pullRequests.find(p => p.id === prId);
      if (!pr) return;

      // Delete branch if configured
      // Simulate delete branch
      console.log('Would delete branch:', pr.sourceBranch);
      
      // Update PR status
      setPullRequests(prev => prev.map(p => 
        p.id === prId ? { ...p, status: 'closed' as const } : p
      ));
    } catch (error) {
      console.error('Failed to close pull request:', error);
    }
  };

  const getStatusColor = (status: PullRequest['status']) => {
    switch (status) {
      case 'open': return 'text-green-600';
      case 'closed': return 'text-red-600';
      case 'merged': return 'text-purple-600';
      case 'draft': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: PullRequest['status']) => {
    switch (status) {
      case 'open': return <GitPullRequest className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      case 'merged': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Pull Requests
            {(githubToken || hasTokenInRemote) ? (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                {hasTokenInRemote ? 'Connected (Remote)' : 'Connected (Local)'}
              </span>
            ) : (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Not Connected</span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPullRequests()}
              className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
              title="Refresh pull requests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTokenDialog(true)}
              className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
              title="Configure GitHub token"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Pull Request
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1 text-sm rounded-lg ${activeTab === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            All ({pullRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1 text-sm rounded-lg ${activeTab === 'create' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1 text-sm rounded-lg ${activeTab === 'reviews' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            Reviews
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="max-h-96 overflow-auto">
          {pullRequests.length === 0 ? (
            <div className="p-8 text-center">
              <GitPullRequest className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-600 dark:text-gray-400">No pull requests yet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Create your first pull request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {pullRequests.map(pr => (
                <div key={pr.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(pr.status)}
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 flex items-center gap-1"
                        >
                          {pr.title}
                          {pr.url && <ExternalLink className="w-3 h-3" />}
                        </a>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pr.status)} bg-opacity-10`}>
                          {pr.status}
                        </span>
                        {pr.conflicts && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            conflicts
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {pr.sourceBranch} → {pr.targetBranch}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {pr.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <span className="font-mono">+{pr.additions}</span>
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <span className="font-mono">-{pr.deletions}</span>
                        </span>
                        <span className="text-gray-600">
                          {pr.commits} commits
                        </span>
                        <span className="text-gray-600">
                          {pr.changedFiles} files
                        </span>
                        {pr.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {pr.comments}
                          </span>
                        )}
                      </div>

                      {pr.reviewers.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Reviewers:</span>
                          {pr.reviewers.map((reviewer, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 rounded">
                              {reviewer}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pr.status === 'open' && pr.mergeable && (
                        <button
                          onClick={() => mergePullRequest(pr.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          Merge
                        </button>
                      )}
                      {pr.status === 'open' && (
                        <button
                          onClick={() => closePullRequest(pr.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Close
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPR(pr)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Pull request title"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your changes..."
                rows={4}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source Branch
                </label>
                <select
                  value={formData.sourceBranch}
                  onChange={(e) => setFormData({ ...formData, sourceBranch: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                >
                  <option value="">Select branch...</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Branch
                </label>
                <select
                  value={formData.targetBranch}
                  onChange={(e) => setFormData({ ...formData, targetBranch: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                >
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.draft}
                onChange={(e) => setFormData({ ...formData, draft: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Create as draft
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => createPullRequest()}
                disabled={loading || !formData.title || !formData.sourceBranch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Pull Request'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Code Reviews</h4>
            <div className="flex items-center gap-4 mb-4">
              <select
                className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-sm"
                onChange={(e) => {
                  const prNumber = parseInt(e.target.value);
                  if (prNumber) {
                    const prReviews = reviews.filter(r => r.pullRequestNumber === prNumber);
                    setSelectedReview(prReviews[0] || null);
                    setReviewComments([]);
                  }
                }}
              >
                <option value="">All Pull Requests</option>
                {Array.from(new Set(reviews.map(r => r.pullRequestNumber))).map(prNumber => (
                  <option key={prNumber} value={prNumber}>PR #{prNumber}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{reviews.length} total reviews</span>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Submit Review</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Review Action
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewStatus('approve')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      reviewStatus === 'approve' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewStatus('request_changes')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      reviewStatus === 'request_changes' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => setReviewStatus('comment')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      reviewStatus === 'comment' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    Comment
                  </button>
                </div>
              </div>
              <textarea
                value={newReviewBody}
                onChange={(e) => setNewReviewBody(e.target.value)}
                placeholder="Write your review comments..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
                rows={4}
              />
              <button
                onClick={() => selectedReview && submitReview(selectedReview.pullRequestNumber)}
                disabled={loading || !newReviewBody.trim() || !selectedReview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400">No reviews yet</p>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {review.reviewer.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{review.reviewer}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PR #{review.pullRequestNumber} • {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      review.status === 'approved' ? 'bg-green-100 text-green-700' :
                      review.status === 'changes_requested' ? 'bg-red-100 text-red-700' :
                      review.status === 'commented' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {review.status.replace('_', ' ')}
                    </span>
                  </div>
                  {review.body && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 p-3 rounded">
                      {review.body}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* GitHub Token Dialog */}
      {showTokenDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configure GitHub Access Token
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
                  How to create a GitHub token:
                </p>
                <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Click "Generate new token (classic)"</li>
                  <li>Give it a name (e.g., "KumoDB PR Manager")</li>
                  <li>Select the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">repo</code> scope</li>
                  <li>Click "Generate token" and copy the token</li>
                </ol>
                <a 
                  href="https://github.com/settings/tokens/new?scopes=repo&description=KumoDB%20PR%20Manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Create token on GitHub
                </a>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTokenDialog(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => saveGitHubToken(githubToken)}
                disabled={!githubToken || !githubToken.startsWith('ghp_')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}