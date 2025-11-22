import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Edit2, Save, Users, GitBranch, CheckCircle, AlertTriangle, Settings, Lock, Unlock, Eye, EyeOff, GitCommit, Activity, Calendar, RefreshCw } from 'lucide-react';

interface ProtectionRule {
  id: string;
  branchPattern: string;
  enabled: boolean;
  requireReviews: boolean;
  minReviewers: number;
  requireCodeOwnerReviews: boolean;
  dismissStaleReviews: boolean;
  requireUpToDateBranch: boolean;
  requireStatusChecks: boolean;
  requiredStatusChecks: string[];
  enforceAdmins: boolean;
  restrictions: {
    push: {
      enabled: boolean;
      users: string[];
      teams: string[];
    };
    forcePush: {
      enabled: boolean;
      users: string[];
      teams: string[];
    };
    delete: {
      enabled: boolean;
      users: string[];
      teams: string[];
    };
  };
  allowForcePushes: boolean;
  allowDeletions: boolean;
  created: string;
  updated: string;
}

interface BranchProtectionRulesProps {
  gitService: any;
}

export default function BranchProtectionRules({ gitService }: BranchProtectionRulesProps) {
  const [rules, setRules] = useState<ProtectionRule[]>([]);
  const [editingRule, setEditingRule] = useState<ProtectionRule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRules();
    loadTeamMembers();
    loadTeams();
  }, [gitService]);

  const loadRules = async () => {
    try {
      // Try to load real rules from GitHub API
      const githubRules = await loadGitHubProtectionRules();
      setRules(githubRules);
    } catch (error) {
      console.error('Failed to load protection rules from GitHub:', error);
      // If GitHub API fails, load empty array instead of mock data
      setRules([]);
    }
  };

  const loadGitHubProtectionRules = async (): Promise<ProtectionRule[]> => {
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
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const protectionData = await response.json();
    
    // Transform GitHub API response to our format
    const rule: ProtectionRule = {
      id: 'main-protection',
      branchPattern: 'main',
      enabled: true,
      requireReviews: protectionData.required_pull_request_reviews?.required_approving_review_count > 0,
      minReviewers: protectionData.required_pull_request_reviews?.required_approving_review_count || 0,
      requireCodeOwnerReviews: protectionData.required_pull_request_reviews?.require_code_owner_reviews || false,
      dismissStaleReviews: protectionData.required_pull_request_reviews?.dismiss_stale_reviews || false,
      requireUpToDateBranch: protectionData.required_pull_request_reviews?.require_up_to_date || false,
      requireStatusChecks: protectionData.required_status_checks?.strict || false,
      requiredStatusChecks: protectionData.required_status_checks?.contexts || [],
      enforceAdmins: protectionData.enforce_admins || false,
      restrictions: {
        push: {
          enabled: !!protectionData.restrictions?.users || !!protectionData.restrictions?.teams,
          users: protectionData.restrictions?.users?.map((u: any) => u.login) || [],
          teams: protectionData.restrictions?.teams?.map((t: any) => t.name) || []
        },
        forcePush: {
          enabled: protectionData.allow_force_pushes === false,
          users: protectionData.restrictions?.users?.map((u: any) => u.login) || [],
          teams: protectionData.restrictions?.teams?.map((t: any) => t.name) || []
        },
        delete: {
          enabled: protectionData.allow_deletions === false,
          users: protectionData.restrictions?.users?.map((u: any) => u.login) || [],
          teams: protectionData.restrictions?.teams?.map((t: any) => t.name) || []
        }
      },
      allowForcePushes: protectionData.allow_force_pushes || false,
      allowDeletions: protectionData.allow_deletions || false,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    return [rule];
  };

  const loadTeamMembers = async () => {
    try {
      // Try to load real collaborators from GitHub API
      const collaborators = await loadGitHubCollaborators();
      setTeamMembers(collaborators);
    } catch (error) {
      console.error('Failed to load team members from GitHub:', error);
      setTeamMembers([]);
    }
  };

  const loadGitHubCollaborators = async (): Promise<string[]> => {
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

    // Get collaborators from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/collaborators`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const collaborators = await response.json();
    return collaborators.map((c: any) => c.login);
  };

  const loadTeams = async () => {
    try {
      // Try to load real teams from GitHub API
      const githubTeams = await loadGitHubTeams();
      setTeams(githubTeams);
    } catch (error) {
      console.error('Failed to load teams from GitHub:', error);
      setTeams([]);
    }
  };

  const loadGitHubTeams = async (): Promise<string[]> => {
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

    // Get teams from GitHub API
    const response = await fetch(`https://api.github.com/orgs/${owner}/teams`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const teams = await response.json();
    return teams.map((t: any) => t.name);
  };

  const createRule = async (ruleData: Omit<ProtectionRule, 'id' | 'created' | 'updated'>) => {
    setLoading(true);
    try {
      const newRule: ProtectionRule = {
        ...ruleData,
        id: `rule-${Date.now()}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      // Create protection rule via API
      // Simulate creating branch protection rule
      console.log('Would create branch protection rule:', newRule);

      setRules(prev => [...prev, newRule]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create protection rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<ProtectionRule>) => {
    setLoading(true);
    try {
      // Update protection rule via API
      // Simulate updating branch protection rule
      console.log('Would update branch protection rule:', ruleId, updates);

      setRules(prev => prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, ...updates, updated: new Date().toISOString() }
          : rule
      ));
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to update protection rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this protection rule?')) return;

    setLoading(true);
    try {
      // Delete protection rule via API
      // Simulate deleting branch protection rule
      console.log('Would delete branch protection rule:', ruleId);

      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    } catch (error) {
      console.error('Failed to delete protection rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    await updateRule(ruleId, { enabled: !rule.enabled });
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-600' : 'text-gray-400';
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Branch Protection Rules
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadRules();
                loadTeamMembers();
                loadTeams();
              }}
              className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
              title="Refresh protection rules"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Configure who can push to branches and enforce review requirements
        </div>
      </div>

      <div className="max-h-96 overflow-auto">
        {rules.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">No protection rules configured</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Create your first rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {rules.map(rule => (
              <div key={rule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1 ${getStatusColor(rule.enabled)}`}>
                        {getStatusIcon(rule.enabled)}
                        <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm">
                          {rule.branchPattern}
                        </code>
                      </div>
                      {rule.enabled && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">Review Requirements</h5>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                          {rule.requireReviews && (
                            <li>• Minimum {rule.minReviewers} reviewer{rule.minReviewers !== 1 ? 's' : ''}</li>
                          )}
                          {rule.requireCodeOwnerReviews && (
                            <li>• Code owner reviews required</li>
                          )}
                          {rule.dismissStaleReviews && (
                            <li>• Dismiss stale PRs</li>
                          )}
                          {rule.requireUpToDateBranch && (
                            <li>• Up-to-date branch required</li>
                          )}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">Status Checks</h5>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                          {rule.requireStatusChecks && (
                            <li>• Required: {rule.requiredStatusChecks.join(', ')}</li>
                          )}
                          <li>• Enforce admins: {rule.enforceAdmins ? 'Yes' : 'No'}</li>
                          <li>• Force pushes: {rule.allowForcePushes ? 'Allowed' : 'Blocked'}</li>
                          <li>• Deletions: {rule.allowDeletions ? 'Allowed' : 'Blocked'}</li>
                        </ul>
                      </div>
                    </div>

                    {(rule.restrictions.push.enabled || rule.restrictions.forcePush.enabled || rule.restrictions.delete.enabled) && (
                      <div className="mt-3">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">Restrictions</h5>
                        <div className="flex flex-wrap gap-2">
                          {rule.restrictions.push.enabled && (
                            <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">
                              Push: {rule.restrictions.push.users.length + rule.restrictions.push.teams.length} allowed
                            </div>
                          )}
                          {rule.restrictions.forcePush.enabled && (
                            <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">
                              Force Push: {rule.restrictions.forcePush.users.length + rule.restrictions.forcePush.teams.length} allowed
                            </div>
                          )}
                          {rule.restrictions.delete.enabled && (
                            <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">
                              Delete: {rule.restrictions.delete.users.length + rule.restrictions.delete.teams.length} allowed
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Created {new Date(rule.created).toLocaleDateString()}
                      {rule.updated !== rule.created && (
                        <>
                          <span>•</span>
                          Updated {new Date(rule.updated).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-2 rounded-lg ${rule.enabled ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : 'hover:bg-green-100 dark:hover:bg-green-900/30'}`}
                    >
                      {rule.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingRule) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingRule ? 'Edit Protection Rule' : 'Create Protection Rule'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch Pattern
                </label>
                <input
                  type="text"
                  defaultValue={editingRule?.branchPattern || ''}
                  placeholder="main, release/*, feature/*"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Require Reviews
                  </label>
                  <input
                    type="checkbox"
                    defaultChecked={editingRule?.requireReviews || false}
                    className="rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Reviewers
                  </label>
                  <input
                    type="number"
                    min="1"
                    defaultValue={editingRule?.minReviewers || 1}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Required Status Checks
                </label>
                <input
                  type="text"
                  defaultValue={editingRule?.requiredStatusChecks.join(', ') || ''}
                  placeholder="ci/build, ci/test, security/scan"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Push Restrictions
                  </label>
                  <select className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg">
                    <option value="none">No restrictions</option>
                    <option value="users">Specific users</option>
                    <option value="teams">Specific teams</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Force Push
                  </label>
                  <select className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg">
                    <option value="blocked">Blocked</option>
                    <option value="allowed">Allowed</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  if (editingRule) {
                    updateRule(editingRule.id, {});
                  } else {
                    createRule({
                      branchPattern: '',
                      enabled: true,
                      requireReviews: true,
                      minReviewers: 1,
                      requireCodeOwnerReviews: false,
                      dismissStaleReviews: true,
                      requireUpToDateBranch: true,
                      requireStatusChecks: true,
                      requiredStatusChecks: [],
                      enforceAdmins: false,
                      restrictions: {
                        push: { enabled: false, users: [], teams: [] },
                        forcePush: { enabled: false, users: [], teams: [] },
                        delete: { enabled: false, users: [], teams: [] }
                      },
                      allowForcePushes: false,
                      allowDeletions: false
                    });
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}