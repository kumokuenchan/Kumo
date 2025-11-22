import React, { useState, useEffect } from 'react';
import { GitBranch, Users, GitCommit, AlertTriangle, CheckCircle, Clock, Activity, GitPullRequest, GitMerge, Shield, Settings, Calendar, BarChart3 } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'maintainer' | 'contributor';
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
      // In a real implementation, this would fetch from GitHub/GitLab API
      const mockTeam: TeamMember[] = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'maintainer' },
        { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'contributor' },
        { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'contributor' },
      ];
      setTeamMembers(mockTeam);
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      // Simulate workflow data
      const mockWorkflows: WorkflowStep[] = [
        {
          id: '1',
          name: 'Feature/authentication',
          type: 'branch',
          status: 'in_progress',
          assignee: '2',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          dependencies: []
        },
        {
          id: '2',
          name: 'PR #123: Add OAuth support',
          type: 'pr',
          status: 'pending',
          assignee: '2',
          reviewer: '1',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          dependencies: ['1']
        },
        {
          id: '3',
          name: 'Code Review',
          type: 'review',
          status: 'pending',
          assignee: '1',
          reviewer: '3',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          dependencies: ['2']
        },
        {
          id: '4',
          name: 'Merge to main',
          type: 'merge',
          status: 'pending',
          assignee: '1',
          createdAt: new Date().toISOString(),
          dependencies: ['3']
        }
      ];
      setWorkflows(mockWorkflows);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadBranchProtections = async () => {
    try {
      const mockProtections: BranchProtection[] = [
        {
          branch: 'main',
          rules: {
            requireReviews: true,
            minReviewers: 2,
            requireStatusChecks: true,
            requiredStatusChecks: ['ci/build', 'ci/test'],
            enforceAdmins: false,
            restrictions: {
              users: ['john@example.com'],
              teams: ['core-team']
            }
          }
        },
        {
          branch: 'release/*',
          rules: {
            requireReviews: true,
            minReviewers: 1,
            requireStatusChecks: true,
            requiredStatusChecks: ['ci/build', 'ci/test', 'security/scan'],
            enforceAdmins: true,
            restrictions: {
              users: [],
              teams: ['release-team']
            }
          }
        }
      ];
      setBranchProtections(mockProtections);
    } catch (error) {
      console.error('Failed to load branch protections:', error);
    }
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
    const avgDuration = workflows
      .filter(w => w.duration)
      .reduce((sum, w) => sum + w.duration!, 0) / workflows.filter(w => w.duration).length || 0;

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
                {Math.round(metrics.avgDuration / 3600)}h
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
                                  className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"
                                  title={assignee.name}
                                >
                                  {assignee.name.charAt(0)}
                                </div>
                              )}
                              {reviewer && reviewer.id !== assignee?.id && (
                                <div
                                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs"
                                  title={reviewer.name}
                                >
                                  {reviewer.name.charAt(0)}
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
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                            {assignee.name.charAt(0)}
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
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                        {member.name.charAt(0)}
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