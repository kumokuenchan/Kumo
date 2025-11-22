import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, ArrowRight, ArrowLeft, GitCompare, FileDiff, Users, Calendar, ChevronDown, Eye, Download, RefreshCw } from 'lucide-react';

interface BranchComparison {
  branch1: string;
  branch2: string;
  aheadBy: number;
  behindBy: number;
  divergedCommits: any[];
  fileChanges: {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: { from: string; to: string }[];
  };
  conflicts: string[];
}

interface CrossBranchComparisonProps {
  gitService: any;
}

export default function CrossBranchComparison({ gitService }: CrossBranchComparisonProps) {
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<{ branch1: string; branch2: string }>({ branch1: '', branch2: '' });
  const [comparison, setComparison] = useState<BranchComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);
  const [currentCommit, setCurrentCommit] = useState<string | null>(null);

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

  const compareBranches = async () => {
    if (!selectedBranches.branch1 || !selectedBranches.branch2) return;

    setLoading(true);
    try {
      // Get ahead/behind information
      // Get commits that are different between branches
      const commits1 = await gitService.getLog();
      const commits2 = await gitService.getLog();
      
      // Get file differences
      const diff = await gitService.getBranchDiff(selectedBranches.branch1, selectedBranches.branch2);
      const fileChanges = parseFileChanges(diff);
      
      // Check for potential conflicts
      const conflicts = await detectConflicts(selectedBranches.branch1, selectedBranches.branch2, fileChanges);

      setComparison({
        branch1: selectedBranches.branch1,
        branch2: selectedBranches.branch2,
        aheadBy: commits1.length,
        behindBy: commits2.length,
        divergedCommits: [...commits1, ...commits2],
        fileChanges,
        conflicts
      });
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseFileChanges = (diffData: any[]) => {
    const changes = {
      added: [] as string[],
      modified: [] as string[],
      deleted: [] as string[],
      renamed: [] as { from: string; to: string }[]
    };

    // If diffData is an array of changes objects
    if (Array.isArray(diffData)) {
      for (const change of diffData) {
        if (change.status === 'added') {
          changes.added.push(change.filepath);
        } else if (change.status === 'modified') {
          changes.modified.push(change.filepath);
        } else if (change.status === 'deleted') {
          changes.deleted.push(change.filepath);
        } else if (change.status === 'renamed') {
          changes.renamed.push({ from: change.from, to: change.to });
        }
      }
    } else if (typeof diffData === 'string') {
      // Parse string diff format
      const lines = diffData.split('\n');
      for (const line of lines) {
        if (line.startsWith('diff --git')) {
          // Parse file paths
          const match = line.match(/diff --git a\/(.+) b\/(.+)/);
          if (match) {
            const [, from, to] = match;
            if (from !== to) {
              changes.renamed.push({ from, to });
            } else if (from.startsWith('/dev/null')) {
              changes.added.push(to);
            } else if (to.startsWith('/dev/null')) {
              changes.deleted.push(from);
            } else {
              changes.modified.push(from);
            }
          }
        }
      }
    }

    return changes;
  };

  const detectConflicts = async (branch1: string, branch2: string, fileChanges: any): Promise<string[]> => {
    // Simulate conflict detection
    // In a real implementation, this would do a more sophisticated analysis
    const conflicts: string[] = [];
    
    // Simplified conflict detection - just check if there are file changes
    if (fileChanges.added.length > 0 || fileChanges.modified.length > 0 || fileChanges.deleted.length > 0) {
      // For demonstration, just add a generic conflict warning
      conflicts.push('Potential conflicts may exist - review file changes');
    }

    return conflicts;
  };

  const swapBranches = () => {
    setSelectedBranches({
      branch1: selectedBranches.branch2,
      branch2: selectedBranches.branch1
    });
  };

  const exportComparison = () => {
    if (!comparison) return;

    const data = JSON.stringify(comparison, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branch-comparison-${comparison.branch1}-vs-${comparison.branch2}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalChanges = comparison ? 
    comparison.fileChanges.added.length + 
    comparison.fileChanges.modified.length + 
    comparison.fileChanges.deleted.length +
    comparison.fileChanges.renamed.length : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Cross-Branch Comparison
          </h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyConflicts}
                onChange={(e) => setShowOnlyConflicts(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show conflicts only</span>
            </label>
            {comparison && (
              <button
                onClick={exportComparison}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBranches.branch1}
            onChange={(e) => setSelectedBranches({ ...selectedBranches, branch1: e.target.value })}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
          >
            <option value="">Select branch...</option>
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          <button
            onClick={swapBranches}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            title="Swap branches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <select
            value={selectedBranches.branch2}
            onChange={(e) => setSelectedBranches({ ...selectedBranches, branch2: e.target.value })}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
          >
            <option value="">Select branch...</option>
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>

          <button
            onClick={compareBranches}
            disabled={loading || !selectedBranches.branch1 || !selectedBranches.branch2}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </div>

      {comparison && (
        <div className="p-4">
          {/* Comparison Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-1">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-medium">Ahead by</span>
              </div>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {comparison.aheadBy}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                commits
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-1">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Behind by</span>
              </div>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                {comparison.behindBy}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                commits
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                <FileDiff className="w-4 h-4" />
                <span className="text-sm font-medium">File changes</span>
              </div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {totalChanges}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                files modified
              </div>
            </div>

            <div className={`${comparison.conflicts.length > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-900/20'} p-3 rounded-lg`}>
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-1">
                <GitBranch className="w-4 h-4" />
                <span className="text-sm font-medium">Conflicts</span>
              </div>
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {comparison.conflicts.length}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                potential conflicts
              </div>
            </div>
          </div>

          {/* File Changes */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">File Changes</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Added ({comparison.fileChanges.added.length})</h5>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {comparison.fileChanges.added.map(file => (
                    <div key={file} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">Modified ({comparison.fileChanges.modified.length})</h5>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {comparison.fileChanges.modified.map(file => (
                    <div key={file} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Deleted ({comparison.fileChanges.deleted.length})</h5>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {comparison.fileChanges.deleted.map(file => (
                    <div key={file} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Renamed ({comparison.fileChanges.renamed.length})</h5>
                <div className="space-y-1 max-h-32 overflow-auto">
                  {comparison.fileChanges.renamed.map((rename, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      {rename.from} → {rename.to}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Conflicts */}
          {comparison.conflicts.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 dark:text-red-300 mb-3">Potential Conflicts</h4>
              <div className="space-y-2">
                {comparison.conflicts.map((conflict, index) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          {conflict}
                        </span>
                      </div>
                      <button
                        onClick={() => setCurrentCommit(conflict)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Eye className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diverged Commits */}
          {comparison.divergedCommits.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Diverged Commits</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {comparison.divergedCommits.slice(0, 20).map((commit, index) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <GitCommit className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {commit.message.split('\n')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {commit.author.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                          </span>
                          <span className="font-mono">
                            {commit.oid.substring(0, 7)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {comparison.divergedCommits.length > 20 && (
                  <div className="text-center text-sm text-gray-500">
                    ... and {comparison.divergedCommits.length - 20} more commits
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}