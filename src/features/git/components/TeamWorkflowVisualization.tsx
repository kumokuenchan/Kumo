import React, { useState, useEffect } from 'react';
import { GitBranch, Users, GitCommit, AlertTriangle, CheckCircle, Clock, Activity, GitPullRequest, GitMerge, Shield, Settings, Calendar, BarChart3, RefreshCw } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role: 'owner' | 'maintainer' | 'contributor';
  permissions?: any;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'branch' | 'pr' | 'review' | 'merge' | 'deploy';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  assignee?: string;
  reviewer?: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  dependencies: string[];
}

interface BranchProtection {
  branch: string;
  rules: {
    requireReviews: boolean;
    minReviewers: number;
    requireStatusChecks: boolean;
    requiredStatusChecks: string[];
    enforceAdmins: boolean;
    restrictions: {
      users: string[];
      teams: string[];
    };
  };
}

interface TeamWorkflowVisualizationProps {
  gitService: any;
}

export default function TeamWorkflowVisualization({ gitService }: TeamWorkflowVisualizationProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowStep[]>([]);
  const [branchProtections, setBranchProtections] = useState<BranchProtection[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'analytics'>('kanban');

  useEffect(() => {
    loadTeamData();
    loadWorkflows();
    loadBranchProtections();
  }, [gitService]);

  const loadTeamData = async () => {
    try {
      // Try to load real team data from GitHub API
      const githubTeam = await loadGitHubTeamData();
      setTeamMembers(githubTeam);
    } catch (error) {
      console.error('Failed to load team data from GitHub:', error);
      // If GitHub API fails, load empty array instead of mock data
      setTeamMembers([]);
    }
  };

  const loadGitHubTeamData = async (): Promise<TeamMember[]> => {
    // Get GitHub token from remote URL or localStorage
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

    // Get collaborators and their permissions from GitHub API
    const collaboratorsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/collaborators`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!collaboratorsResponse.ok) {
      throw new Error(`GitHub API error: ${collaboratorsResponse.status}`);
    }

    const collaborators = await collaboratorsResponse.json();

    // Transform to TeamMember format
    const teamMembers: TeamMember[] = collaborators.map((collab: any, index: number) => {
      // Determine role based on permissions
      let role = 'contributor';
      if (collab.permissions.admin) {
        role = 'owner';
      } else if (collab.permissions.maintain) {
        role = 'maintainer';
      } else if (collab.permissions.push) {
        role = 'contributor';
      }

      return {
        id: collab.id.toString(),
        name: collab.login,
        email: collab.email || `${collab.login}@users.noreply.github.com`,
        role: role,
        avatarUrl: collab.avatar_url,
        permissions: collab.permissions
      };
    });

    return teamMembers;
  };

  const loadWorkflows = async () => {
    try {
      // Load real workflows from GitHub API
      const githubWorkflows = await loadGitHubWorkflows();
      setWorkflows(githubWorkflows);
    } catch (error) {
      console.error('Failed to load workflows from GitHub:', error);
      // If GitHub API fails, load empty array instead of mock data
      setWorkflows([]);
    }
  };

  const loadGitHubWorkflows = async (): Promise<WorkflowStep[]> => {
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

    // Get branches from GitHub API
    const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!branchesResponse.ok) {
      console.warn(`Failed to fetch branches: ${branchesResponse.status}`);
      return [];
    }

    const branches = await branchesResponse.json();

    // Get pull requests from GitHub API
    const prsResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls?state=all`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!prsResponse.ok) {
      console.warn(`Failed to fetch pull requests: ${prsResponse.status}`);
      return [];
    }

    const pullRequests = await prsResponse.json();

    // Transform branches and PRs to workflow steps
    const workflows: WorkflowStep[] = [];

    // Add branches (excluding main)
    branches
      .filter((branch: any) => branch.name !== 'main' && branch.name !== 'master')
      .slice(0, 10) // Limit to 10 branches
      .forEach((branch: any, index: number) => {
        // Calculate duration for branches (time since creation)
        const created = new Date(branch.commit?.commit?.author?.date || new Date().toISOString()).getTime();
        const now = new Date().getTime();
        const duration = Math.floor((now - created) / 1000); // Convert to seconds

        workflows.push({
          id: `branch-${branch.name}`,
          name: `Feature/${branch.name}`,
          type: 'branch',
          status: 'in_progress',
          assignee: branch.commit?.commit?.author?.id?.toString() || '',
          createdAt: branch.commit?.commit?.author?.date || new Date().toISOString(),
          duration: duration,
          dependencies: []
        });
      });

    // Add pull requests
    pullRequests
      .slice(0, 20) // Limit to 20 PRs
      .forEach((pr: any) => {
        // Calculate duration in seconds
        let duration = 0;
        if (pr.state === 'closed' || pr.merged) {
          const created = new Date(pr.created_at).getTime();
          const updated = new Date(pr.updated_at).getTime();
          duration = Math.floor((updated - created) / 1000); // Convert to seconds
        }

        workflows.push({
          id: `pr-${pr.number}`,
          name: `PR #${pr.number}: ${pr.title}`,
          type: 'pr',
          status: pr.state === 'open' ? 'pending' : pr.merged ? 'completed' : 'failed',
          assignee: pr.user?.id?.toString() || '',
          reviewer: pr.requested_reviewers?.[0]?.id?.toString() || '',
          createdAt: pr.created_at,
          completedAt: (pr.state === 'closed' || pr.merged) ? pr.updated_at : undefined,
          duration: duration,
          dependencies: []
        });
      });

    return workflows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const loadBranchProtections = async () => {
    try {
      // Load real branch protections from GitHub API
      const githubProtections = await loadGitHubBranchProtections();
      setBranchProtections(githubProtections);
    } catch (error) {
      console.error('Failed to load branch protections from GitHub:', error);
      // If GitHub API fails, load empty array instead of mock data
      setBranchProtections([]);
    }
  };

  const loadGitHubBranchProtections = async (): Promise<BranchProtection[]> => {
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

    // Get branch protection rules from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches/main/protection`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No protection rules configured
        return [];
      }
      console.warn(`Failed to fetch branch protections: ${response.status}`);
      return [];
    }

    const protectionData = await response.json();

    // Transform to BranchProtection format
    const protection: BranchProtection = {
      branch: 'main',
      rules: {
        requireReviews: protectionData.required_pull_request_reviews?.required_approving_review_count > 0,
        minReviewers: protectionData.required_pull_request_reviews?.required_approving_review_count || 0,
        requireStatusChecks: protectionData.required_status_checks?.strict || false,
        requiredStatusChecks: protectionData.required_status_checks?.contexts || [],
        enforceAdmins: protectionData.enforce_admins || false,
        restrictions: {
          users: protectionData.restrictions?.users?.map((u: any) => u.login) || [],
          teams: protectionData.restrictions?.teams?.map((t: any) => t.name) || []
        }
      }
    };

    return [protection];
  };

  const getStepIcon = (type: WorkflowStep['type']) => {
    switch (type) {
      case 'branch': return <GitBranch className="w-4 h-4" />;
      case 'pr': return <GitPullRequest className="w-4 h-4" />;
      case 'review': return <Users className="w-4 h-4" />;
      case 'merge': return <GitMerge className="w-4 h-4" />;
      case 'deploy': return <Activity className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'pending': return 'border-gray-300 dark:border-gray-600';
      case 'in_progress': return 'border-blue-500';
      case 'completed': return 'border-green-500';
      case 'blocked': return 'border-red-500';
      case 'failed': return 'border-red-500';
      default: return 'border-gray-300';
    }
  };

  const getStatusBg = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-50 dark:bg-gray-900';
      case 'in_progress': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'completed': return 'bg-green-50 dark:bg-green-900/20';
      case 'blocked': return 'bg-red-50 dark:bg-red-900/20';
      case 'failed': return 'bg-red-50 dark:bg-red-900/20';
      default: return 'bg-gray-50 dark:bg-gray-900';
    }
  };

  const getTeamMetrics = () => {
    const totalSteps = workflows.length;
    const completedSteps = workflows.filter(w => w.status === 'completed').length;
    const blockedSteps = workflows.filter(w => w.status === 'blocked' || w.status === 'failed').length;
    
    const workflowsWithDuration = workflows.filter(w => w.duration);
    console.log('Workflows with duration:', workflowsWithDuration.length, 'Total workflows:', workflows.length);
    
    const avgDuration = workflowsWithDuration.length > 0
      ? workflowsWithDuration.reduce((sum, w) => sum + w.duration!, 0) / workflowsWithDuration.length
      : 0;

    return { totalSteps, completedSteps, blockedSteps, avgDuration };
  };

  const metrics = getTeamMetrics();

  if (viewMode === 'kanban') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Workflow
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadTeamData();
                  loadWorkflows();
                  loadBranchProtections();
                }}
                className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
                title="Refresh team data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'timeline' ? 'bg-blue-100 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1 text-sm rounded-lg ${viewMode === 'analytics' ? 'bg-blue-100 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                Analytics
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg ${showSettings ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                <GitCommit className="w-4 h-4" />
                <span className="text-sm font-medium">Total Tasks</span>
              </div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {metrics.totalSteps}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {metrics.completedSteps}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Blocked</span>
              </div>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                {metrics.blockedSteps}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Avg Duration</span>
              </div>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {metrics.avgDuration > 0 
                  ? metrics.avgDuration >= 3600 
                    ? `${Math.round(metrics.avgDuration / 3600)}h`
                    : metrics.avgDuration >= 60
                    ? `${Math.round(metrics.avgDuration / 60)}m`
                    : `${Math.round(metrics.avgDuration)}s`
                  : '0h'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="p-4">
          <div className="grid grid-cols-5 gap-4">
            {['pending', 'in_progress', 'review', 'completed', 'blocked'].map(status => (
              <div key={status} className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                  {status.replace('_', ' ')}
                  <span className="ml-2 text-xs text-gray-500">
                    ({workflows.filter(w => w.status === status).length})
                  </span>
                </h4>

                <div className="space-y-2 min-h-[100px]">
                  {workflows
                    .filter(w => w.status === status)
                    .map(step => {
                      const assignee = teamMembers.find(m => m.id === step.assignee);
                      const reviewer = teamMembers.find(m => m.id === step.reviewer);

                      return (
                        <div
                          key={step.id}
                          onClick={() => setSelectedWorkflow(step.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${getStatusColor(step.status)} ${getStatusBg(step.status)}`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {getStepIcon(step.type)}
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                {step.name}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {assignee && (
                                <div
                                  className="w-6 h-6 rounded-full overflow-hidden"
                                  title={assignee.name}
                                >
                                  {assignee.avatarUrl ? (
                                    <img 
                                      src={(assignee as any).avatarUrl} 
                                      alt={assignee.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement!.innerHTML = `
                                          <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                            ${assignee.name.charAt(0)}
                                          </div>
                                        `;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                      {assignee.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {reviewer && reviewer.id !== assignee?.id && (
                                <div
                                  className="w-6 h-6 rounded-full overflow-hidden"
                                  title={reviewer.name}
                                >
                                  {reviewer.avatarUrl ? (
                                    <img 
                                      src={(reviewer as any).avatarUrl} 
                                      alt={reviewer.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement!.innerHTML = `
                                          <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                                            ${reviewer.name.charAt(0)}
                                          </div>
                                        `;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                                      {reviewer.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              {new Date(step.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {step.dependencies.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                              Depends on: {step.dependencies.length} step{step.dependencies.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'timeline') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Workflow Timeline
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('kanban')}
                className="px-3 py-1 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className="px-3 py-1 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

            {/* Timeline items */}
            <div className="space-y-6">
              {workflows.map((step, index) => {
                const assignee = teamMembers.find(m => m.id === step.assignee);
                return (
                  <div key={step.id} className="relative flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${getStatusColor(step.status)} ${getStatusBg(step.status)}`}>
                      {getStepIcon(step.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {step.name}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {new Date(step.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Type: {step.type} • Status: {step.status.replace('_', ' ')}
                      </p>

                      {assignee && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            {assignee.avatarUrl ? (
                              <img 
                                src={(assignee as any).avatarUrl} 
                                alt={assignee.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = `
                                    <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                      ${assignee.name.charAt(0)}
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                {assignee.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Assigned to {assignee.name}
                          </span>
                        </div>
                      )}

                      {step.dependencies.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          Dependencies: {step.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'analytics') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Team Analytics
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('kanban')}
                className="px-3 py-1 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className="px-3 py-1 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Team Members */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Team Members</h4>
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {member.avatarUrl ? (
                          <img 
                            src={(member as any).avatarUrl} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initial if image fails
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                                  ${member.name.charAt(0)}
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {member.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.role}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {workflows.filter(w => w.assignee === member.id).length}
                      </div>
                      <div className="text-xs text-gray-500">tasks</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch Protections */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Branch Protections
              </h4>
              <div className="space-y-3">
                {branchProtections.map((protection, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {protection.branch}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Active
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {protection.rules.requireReviews && (
                        <div>• Requires {protection.rules.minReviewers} reviewer{protection.rules.minReviewers !== 1 ? 's' : ''}</div>
                      )}
                      {protection.rules.requireStatusChecks && (
                        <div>• Requires status checks: {protection.rules.requiredStatusChecks.join(', ')}</div>
                      )}
                      {protection.rules.restrictions.users.length > 0 && (
                        <div>• Restricted to: {protection.rules.restrictions.users.length} users</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Efficiency */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Workflow Efficiency</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {Math.round((metrics.completedSteps / metrics.totalSteps) * 100)}%
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Completion Rate</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {Math.round(metrics.avgDuration / 3600)}h
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Avg Duration</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                  {metrics.blockedSteps}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Blocked Tasks</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}