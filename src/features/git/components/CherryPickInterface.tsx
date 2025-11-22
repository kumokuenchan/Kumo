import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitPullRequest, CheckCircle, XCircle, AlertTriangle, Calendar, User, Search, Filter, GitCompare } from 'lucide-react';

interface CherryPickCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  status: 'pending' | 'success' | 'conflict' | 'failed';
  conflicts?: string[];
  selected: boolean;
}

interface CherryPickInterfaceProps {
  gitService: any;
  targetBranch: string;
  onComplete?: (success: boolean) => void;
}

export default function CherryPickInterface({ gitService, targetBranch, onComplete }: CherryPickInterfaceProps) {
  const [commits, setCommits] = useState<CherryPickCommit[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'resolve' | 'abort'>('merge');

  useEffect(() => {
    loadBranches();
  }, [gitService]);

  useEffect(() => {
    if (selectedBranch) {
      loadCommits(selectedBranch);
    }
  }, [selectedBranch, gitService]);

  const loadBranches = async () => {
    try {
      const branchList = await gitService.getBranches();
      setBranches(branchList.map((b: any) => b.name).filter(b => b !== targetBranch));
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadCommits = async (branch: string) => {
    setLoading(true);
    try {
      const commitList = await gitService.getLog();
      const cherryPickCommits: CherryPickCommit[] = commitList.map((commit: any) => ({
        id: commit.oid,
        hash: commit.oid.substring(0, 7),
        message: commit.message.split('\n')[0],
        author: commit.author.name,
        date: new Date(commit.author.timestamp * 1000).toISOString(),
        branch,
        status: 'pending',
        selected: false
      }));

      setCommits(cherryPickCommits);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommitSelection = (commitId: string) => {
    setCommits(prev => prev.map(commit =>
      commit.id === commitId ? { ...commit, selected: !commit.selected } : commit
    ));
  };

  const selectAllCommits = () => {
    setCommits(prev => prev.map(commit => ({ ...commit, selected: true })));
  };

  const deselectAllCommits = () => {
    setCommits(prev => prev.map(commit => ({ ...commit, selected: false })));
  };

  const executeCherryPick = async () => {
    const selectedCommits = commits.filter(c => c.selected);
    if (selectedCommits.length === 0) return;

    setExecuting(true);
    try {
      for (const commit of selectedCommits) {
        try {
          // Simulate cherry-pick operation
    console.log('Would cherry-pick commit', commit.id, 'to', targetBranch, 'with strategy', conflictStrategy);
    const result = { success: true };

          setCommits(prev => prev.map(c =>
            c.id === commit.id
              ? { ...c, status: result.success ? 'success' : 'conflict', conflicts: result.conflicts }
              : c
          ));

          if (!result.success && mergeStrategy === 'abort') {
            break;
          }
        } catch (error) {
          setCommits(prev => prev.map(c =>
            c.id === commit.id ? { ...c, status: 'failed' } : c
          ));
        }
      }

      const allSuccessful = commits.filter(c => c.selected).every(c => c.status === 'success');
      onComplete?.(allSuccessful);
    } catch (error) {
      console.error('Cherry-pick failed:', error);
      onComplete?.(false);
    } finally {
      setExecuting(false);
    }
  };

  const filteredCommits = commits.filter(commit => {
    if (showOnlyConflicts && commit.status !== 'conflict') return false;
    if (searchQuery && !commit.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const selectedCount = commits.filter(c => c.selected).length;
  const successCount = commits.filter(c => c.selected && c.status === 'success').length;
  const conflictCount = commits.filter(c => c.selected && c.status === 'conflict').length;
  const failedCount = commits.filter(c => c.selected && c.status === 'failed').length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5" />
            Cherry-pick Commits
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Target: <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">{targetBranch}</code>
          </div>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
          >
            <option value="">Select source branch...</option>
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commits..."
              className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
            />
          </div>

          <select
            value={mergeStrategy}
            onChange={(e) => setMergeStrategy(e.target.value as any)}
            className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
          >
            <option value="merge">Merge</option>
            <option value="resolve">Resolve</option>
            <option value="abort">Abort on conflict</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllCommits}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select All
            </button>
            <button
              onClick={deselectAllCommits}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Deselect All
            </button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyConflicts}
                onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show conflicts only</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCount} selected
                {successCount > 0 && <span className="text-green-600 ml-1">({successCount} success)</span>}
                {conflictCount > 0 && <span className="text-orange-600 ml-1">({conflictCount} conflicts)</span>}
                {failedCount > 0 && <span className="text-red-600 ml-1">({failedCount} failed)</span>}
              </div>
            )}

            <button
              onClick={executeCherryPick}
              disabled={selectedCount === 0 || executing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {executing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Cherry-picking...
                </>
              ) : (
                <>
                  <GitPullRequest className="w-4 h-4" />
                  Cherry-pick ({selectedCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading commits...</p>
          </div>
        ) : filteredCommits.length === 0 ? (
          <div className="p-8 text-center">
            <GitCommit className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No commits found matching your search' : 'No commits available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredCommits.map(commit => (
              <div
                key={commit.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700 ${commit.selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={commit.selected}
                    onChange={() => toggleCommitSelection(commit.id)}
                    className="mt-1 rounded"
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {commit.hash}
                        </span>
                        {commit.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {commit.status === 'conflict' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {commit.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 rounded">
                        {commit.branch}
                      </span>
                    </div>

                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {commit.message}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {commit.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(commit.date).toLocaleDateString()}
                      </span>
                    </div>

                    {commit.conflicts && commit.conflicts.length > 0 && (
                      <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
                        <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                          Conflicts in:
                        </div>
                        <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                          {commit.conflicts.map((conflict, index) => (
                            <li key={index}>• {conflict}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Ready to cherry-pick {selectedCount} commit{selectedCount !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              {conflictCount > 0 && (
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} expected
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}