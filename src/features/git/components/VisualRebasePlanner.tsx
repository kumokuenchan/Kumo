import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, ArrowRight, Zap, Eye, Settings, Play, RotateCcw, AlertTriangle, CheckCircle, GitPullRequest, Calendar, User } from 'lucide-react';

interface RebaseCommit {
  id: string;
  message: string;
  author: string;
  date: string;
  hash: string;
  parents: string[];
  children: string[];
  status: 'pending' | 'conflict' | 'success' | 'skipped';
  action?: 'pick' | 'squash' | 'fixup' | 'drop' | 'reword' | 'edit';
  newMessage?: string;
}

interface RebasePlan {
  baseBranch: string;
  targetBranch: string;
  commits: RebaseCommit[];
  interactive: boolean;
  autosquash: boolean;
  autosignoff: boolean;
}

interface VisualRebasePlannerProps {
  gitService: any;
  onRebaseComplete?: (success: boolean) => void;
}

export default function VisualRebasePlanner({ gitService, onRebaseComplete }: VisualRebasePlannerProps) {
  const [plan, setPlan] = useState<RebasePlan | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedCommit, setDraggedCommit] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, [gitService]);

  const loadBranches = async () => {
    try {
      const branchList = await gitService.getBranches();
      setBranches(branchList.map((b: any) => b.name));
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const createRebasePlan = async (baseBranch: string, targetBranch: string) => {
    setLoading(true);
    try {
      // Get commits that will be rebased
      const commits = await gitService.getLog();
      
      const rebaseCommits: RebaseCommit[] = commits.map((commit: any, index: number) => ({
        id: commit.oid,
        message: commit.message.split('\n')[0],
        author: commit.author.name,
        date: new Date(commit.author.timestamp * 1000).toISOString(),
        hash: commit.oid.substring(0, 7),
        parents: commit.parent || [],
        children: [],
        status: 'pending',
        action: index === 0 ? 'pick' : 'pick'
      }));

      // Build parent-child relationships
      for (let i = 0; i < rebaseCommits.length - 1; i++) {
        rebaseCommits[i].children.push(rebaseCommits[i + 1].id);
      }

      setPlan({
        baseBranch,
        targetBranch,
        commits: rebaseCommits,
        interactive: true,
        autosquash: false,
        autosignoff: false
      });
    } catch (error) {
      console.error('Failed to create rebase plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCommitAction = (commitId: string, action: RebaseCommit['action']) => {
    if (!plan) return;

    setPlan({
      ...plan,
      commits: plan.commits.map(commit =>
        commit.id === commitId ? { ...commit, action } : commit
      )
    });
  };

  const updateCommitMessage = (commitId: string, newMessage: string) => {
    if (!plan) return;

    setPlan({
      ...plan,
      commits: plan.commits.map(commit =>
        commit.id === commitId ? { ...commit, newMessage } : commit
      )
    });
  };

  const reorderCommits = (draggedId: string, targetId: string, position: 'before' | 'after') => {
    if (!plan) return;

    const draggedIndex = plan.commits.findIndex(c => c.id === draggedId);
    const targetIndex = plan.commits.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCommits = [...plan.commits];
    const [draggedCommit] = newCommits.splice(draggedIndex, 1);

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    newCommits.splice(insertIndex, 0, draggedCommit);

    setPlan({ ...plan, commits: newCommits });
  };

  const executeRebase = async () => {
    if (!plan) return;

    setExecuting(true);
    try {
      // Create rebase instructions
      const instructions = plan.commits
        .filter(commit => commit.action !== 'drop')
        .map(commit => {
          let instruction = commit.action || 'pick';
          if (commit.action === 'reword' && commit.newMessage) {
            instruction = `reword ${commit.hash} ${commit.newMessage}`;
          } else {
            instruction = `${instruction} ${commit.hash}`;
          }
          return instruction;
        });

      // Execute rebase
      // Simulate rebase execution
    console.log('Would execute rebase with planned commits:', plannedCommits);
    const result = { success: true };

      if (result.success) {
        onRebaseComplete?.(true);
      } else {
        // Handle conflicts
        setPlan({
          ...plan,
          commits: plan.commits.map(commit => ({
            ...commit,
            status: result.conflicts?.includes(commit.id) ? 'conflict' : 'success'
          }))
        });
      }
    } catch (error) {
      console.error('Rebase failed:', error);
      onRebaseComplete?.(false);
    } finally {
      setExecuting(false);
    }
  };

  const simulateRebase = () => {
    if (!plan) return;

    // Simulate rebase execution
    setPlan({
      ...plan,
      commits: plan.commits.map(commit => ({
        ...commit,
        status: commit.action === 'drop' ? 'skipped' : 'success'
      }))
    });
  };

  const getActionColor = (action: RebaseCommit['action']) => {
    switch (action) {
      case 'pick': return 'text-blue-600';
      case 'squash': return 'text-purple-600';
      case 'fixup': return 'text-pink-600';
      case 'drop': return 'text-red-600';
      case 'reword': return 'text-orange-600';
      case 'edit': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getActionIcon = (action: RebaseCommit['action']) => {
    switch (action) {
      case 'pick': return <CheckCircle className="w-4 h-4" />;
      case 'squash': return <GitPullRequest className="w-4 h-4" />;
      case 'fixup': return <Zap className="w-4 h-4" />;
      case 'drop': return <XCircle className="w-4 h-4" />;
      case 'reword': return <Eye className="w-4 h-4" />;
      case 'edit': return <Settings className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Visual Rebase Planner
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${showSettings ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!plan ? (
          <div className="flex gap-3">
            <select
              onChange={(e) => {
                const base = e.target.value;
                const target = branches.find(b => b !== base);
                if (target) createRebasePlan(base, target);
              }}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              defaultValue=""
            >
              <option value="">Select base branch...</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <span className="self-center text-gray-500">into</span>
            <select
              onChange={(e) => {
                const target = e.target.value;
                const base = branches.find(b => b !== target);
                if (base) createRebasePlan(base, target);
              }}
              className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              defaultValue=""
            >
              <option value="">Select target branch...</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Rebase
              </span>
              <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm">
                {plan.targetBranch}
              </code>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                onto
              </span>
              <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-sm">
                {plan.baseBranch}
              </code>
            </div>
            <button
              onClick={() => setPlan(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showSettings && plan && (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Rebase Settings</h4>
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plan.interactive}
                onChange={(e) => setPlan({ ...plan, interactive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Interactive</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plan.autosquash}
                onChange={(e) => setPlan({ ...plan, autosquash: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-squash</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={plan.autosignoff}
                onChange={(e) => setPlan({ ...plan, autosignoff: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-signoff</span>
            </label>
          </div>
        </div>
      )}

      {plan && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Commits to Rebase ({plan.commits.length})
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={simulateRebase}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Simulate
              </button>
              <button
                onClick={executeRebase}
                disabled={executing}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {executing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Rebasing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Rebase
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {plan.commits.map((commit, index) => (
              <div
                key={commit.id}
                draggable
                onDragStart={() => setDraggedCommit(commit.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedCommit && draggedCommit !== commit.id) {
                    reorderCommits(draggedCommit, commit.id, 'after');
                  }
                  setDraggedCommit(null);
                }}
                onClick={() => setSelectedCommit(commit.id)}
                className={`p-3 rounded-lg border cursor-move ${
                  selectedCommit === commit.id
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        commit.status === 'success' ? 'bg-green-100 text-green-600' :
                        commit.status === 'conflict' ? 'bg-red-100 text-red-600' :
                        commit.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {commit.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                         commit.status === 'conflict' ? <AlertTriangle className="w-4 h-4" /> :
                         commit.status === 'skipped' ? <RotateCcw className="w-4 h-4" /> :
                         <GitCommit className="w-4 h-4" />}
                      </div>
                      {index < plan.commits.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {commit.hash}
                        </span>
                        {getActionIcon(commit.action)}
                        <select
                          value={commit.action}
                          onChange={(e) => updateCommitAction(commit.id, e.target.value as any)}
                          className={`text-xs px-2 py-0.5 rounded border-none ${getActionColor(commit.action)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="pick">pick</option>
                          <option value="squash">squash</option>
                          <option value="fixup">fixup</option>
                          <option value="drop">drop</option>
                          <option value="reword">reword</option>
                          <option value="edit">edit</option>
                        </select>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {commit.action === 'reword' && commit.newMessage ? commit.newMessage : commit.message}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {commit.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(commit.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Commit Message Editor */}
          {selectedCommit && plan.commits.find(c => c.id === selectedCommit)?.action === 'reword' && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Reword Commit Message</h5>
              <textarea
                className="w-full p-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm"
                rows={3}
                value={plan.commits.find(c => c.id === selectedCommit)?.newMessage || ''}
                onChange={(e) => updateCommitMessage(selectedCommit, e.target.value)}
                placeholder="Enter new commit message..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}