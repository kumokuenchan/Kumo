import React, { useState, useEffect } from 'react';
import { GitBranch, GitMerge, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, ChevronDown, ChevronRight, FileText, Zap, ArrowLeft, ArrowRight, Save, RefreshCw } from 'lucide-react';

interface ConflictFile {
  path: string;
  conflicts: Conflict[];
  resolved: boolean;
}

interface Conflict {
  id: string;
  startLine: number;
  endLine: number;
  ours: string[];
  theirs: string[];
  base?: string[];
  markers: {
    start: string;
    ours: string;
    theirs: string;
    end: string;
  };
}

interface MergeConflictResolverProps {
  gitService: any;
  branch1: string;
  branch2: string;
  onResolved?: (resolved: boolean) => void;
}

export default function MergeConflictResolver({ gitService, branch1, branch2, onResolved }: MergeConflictResolverProps) {
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [mergedContent, setMergedContent] = useState<Map<string, string>>(new Map());
  const [showDiff, setShowDiff] = useState(false);
  const [currentResolution, setCurrentResolution] = useState<Map<string, 'ours' | 'theirs' | 'merged'>>(new Map());

  useEffect(() => {
    detectConflicts();
  }, [gitService, branch1, branch2]);

  const detectConflicts = async () => {
    setLoading(true);
    try {
      // Try to perform a real merge conflict detection
      const conflicts = await checkForMergeConflicts(branch1, branch2);
      setConflictFiles(conflicts);
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      // If real detection fails, show empty state
      setConflictFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const checkForMergeConflicts = async (sourceBranch: string, targetBranch: string): Promise<ConflictFile[]> => {
    try {
      // Get the diff between branches to check for potential conflicts
      const diffData = await gitService.getBranchDiff(targetBranch, sourceBranch);
      const conflicts: ConflictFile[] = [];

      if (Array.isArray(diffData)) {
        // For each modified file, check if it might have conflicts
        for (const change of diffData) {
          if (change.status === 'modified' || change.status === 'added') {
            // Try to get the actual file content to detect conflicts
            const fileConflicts = await detectFileConflicts(change.filepath, sourceBranch, targetBranch);
            if (fileConflicts.length > 0) {
              conflicts.push({
                path: change.filepath,
                conflicts: fileConflicts,
                resolved: false
              });
            }
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking merge conflicts:', error);
      return [];
    }
  };

  const detectFileConflicts = async (filepath: string, sourceBranch: string, targetBranch: string): Promise<any[]> => {
    try {
      // Get diff for this specific file
      const fileDiff = await gitService.getBranchFileDiff(targetBranch, sourceBranch, filepath);
      
      if (!fileDiff) return [];

      // Parse the diff for conflict markers
      const conflicts = [];
      const lines = fileDiff.split('\n');
      let currentConflict: any = null;
      let lineNum = 0;

      for (const line of lines) {
        lineNum++;
        
        if (line.startsWith('<<<<<<<')) {
          // Start of a conflict
          currentConflict = {
            id: `conflict-${Date.now()}-${Math.random()}`,
            startLine: lineNum,
            endLine: lineNum,
            ours: [],
            theirs: [],
            markers: {
              start: '<<<<<<<',
              ours: '=======',
              theirs: '>>>>>>>',
              end: '>>>>>>>'
            }
          };
        } else if (line.startsWith('=======') && currentConflict) {
          // Separator between ours and theirs
          currentConflict.ours = [...currentConflict.ours];
        } else if (line.startsWith('>>>>>>>') && currentConflict) {
          // End of conflict
          currentConflict.endLine = lineNum;
          conflicts.push(currentConflict);
          currentConflict = null;
        } else if (currentConflict) {
          // Inside a conflict
          if (!line.startsWith('=======') && !line.startsWith('>>>>>>>')) {
            if (currentConflict.ours.length === 0 || lineNum <= currentConflict.startLine + 10) {
              currentConflict.ours.push(line);
            } else {
              currentConflict.theirs.push(line);
            }
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error detecting file conflicts:', error);
      return [];
    }
  };

  const parseConflictFiles = async (conflictData: any): Promise<ConflictFile[]> => {
    // Parse conflict data into structured format
    const files: ConflictFile[] = [];
    
    // This is a simplified parser - in a real implementation, you'd parse the actual git conflict markers
    for (const [filePath, conflictInfo] of Object.entries(conflictData)) {
      const conflicts: Conflict[] = [];
      const lines = conflictInfo.split('\n');
      let currentConflict: Partial<Conflict> | null = null;
      let state: 'start' | 'ours' | 'theirs' | 'base' | 'end' = 'start';
      let lineNum = 0;

      for (const line of lines) {
        lineNum++;
        
        if (line.startsWith('<<<<<<<')) {
          if (currentConflict) {
            conflicts.push(currentConflict as Conflict);
          }
          currentConflict = {
            id: `${filePath}-${conflicts.length}`,
            startLine: lineNum,
            ours: [],
            theirs: [],
            markers: {
              start: line,
              ours: '',
              theirs: '',
              end: ''
            }
          };
          currentConflict.markers.start = line;
          state = 'ours';
        } else if (line.startsWith('=======')) {
          state = 'theirs';
          if (currentConflict) {
            currentConflict.markers.theirs = line;
          }
        } else if (line.startsWith('>>>>>>>')) {
          if (currentConflict) {
            currentConflict.markers.end = line;
            currentConflict.endLine = lineNum;
            conflicts.push(currentConflict as Conflict);
          }
          currentConflict = null;
          state = 'start';
        } else if (currentConflict) {
          if (state === 'ours') {
            currentConflict.ours.push(line);
          } else if (state === 'theirs') {
            currentConflict.theirs.push(line);
          }
        }
      }

      if (currentConflict) {
        conflicts.push(currentConflict as Conflict);
      }

      files.push({
        path: filePath,
        conflicts,
        resolved: false
      });
    }

    return files;
  };

  const resolveConflict = (filePath: string, conflictId: string, resolution: 'ours' | 'theirs' | 'merged') => {
    const resolutionMap = new Map(currentResolution);
    resolutionMap.set(conflictId, resolution);
    setCurrentResolution(resolutionMap);

    // Update merged content
    const file = conflictFiles.find(f => f.path === filePath);
    if (!file) return;

    const conflict = file.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    let resolvedContent = '';
    switch (resolution) {
      case 'ours':
        resolvedContent = conflict.ours.join('\n');
        break;
      case 'theirs':
        resolvedContent = conflict.theirs.join('\n');
        break;
      case 'merged':
        // Custom merged content would be edited by user
        const existing = mergedContent.get(filePath) || '';
        resolvedContent = existing;
        break;
    }

    const contentMap = new Map(mergedContent);
    contentMap.set(conflictId, resolvedContent);
    setMergedContent(contentMap);

    // Check if all conflicts in file are resolved
    const allResolved = file.conflicts.every(c => 
      resolutionMap.has(c.id) && resolutionMap.get(c.id) !== 'merged' ||
      contentMap.has(c.id)
    );

    if (allResolved) {
      setConflictFiles(prev => prev.map(f => 
        f.path === filePath ? { ...f, resolved: true } : f
      ));
    }
  };

  const applyResolution = async () => {
    try {
      // Apply the resolved changes
      for (const file of conflictFiles) {
        if (file.resolved) {
          let finalContent = '';
          
          // Reconstruct file content with resolved conflicts
          for (const conflict of file.conflicts) {
            const resolution = currentResolution.get(conflict.id);
            if (resolution === 'ours') {
              finalContent += conflict.ours.join('\n') + '\n';
            } else if (resolution === 'theirs') {
              finalContent += conflict.theirs.join('\n') + '\n';
            } else {
              const merged = mergedContent.get(conflict.id);
              if (merged) {
                finalContent += merged + '\n';
              }
            }
          }

          // Save the resolved content (simulated)
      console.log('Would save resolved content to:', file.path);
        }
      }

      // Continue the merge (simulated)
      console.log('Would continue merge between', branch1, 'and', branch2);
      
      onResolved?.(true);
    } catch (error) {
      console.error('Failed to apply resolution:', error);
      onResolved?.(false);
    }
  };

  const abortMerge = async () => {
    try {
      // Abort the merge (simulated)
      console.log('Would abort merge');
      onResolved?.(false);
    } catch (error) {
      console.error('Failed to abort merge:', error);
    }
  };

  const selectedFileData = selectedFile ? conflictFiles.find(f => f.path === selectedFile) : null;
  const selectedConflictData = selectedFileData?.conflicts[selectedConflict];

  const allConflictsResolved = conflictFiles.length > 0 && conflictFiles.every(f => f.resolved);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Merge Conflict Resolver
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={detectConflicts}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
              title="Refresh conflicts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`p-2 rounded-lg ${showDiff ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              {showDiff ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {conflictFiles.filter(f => f.resolved).length}/{conflictFiles.length} files resolved
            </span>
            {conflictFiles.length === 0 && !loading && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                No conflicts
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Merging</span>
          <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">{branch1}</code>
          <span>into</span>
          <code className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded">{branch2}</code>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Detecting conflicts...</p>
        </div>
      ) : conflictFiles.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No conflicts detected</p>
        </div>
      ) : (
        <div className="flex h-96">
          {/* File List */}
          <div className="w-80 border-r border-gray-200 dark:border-slate-700 overflow-auto">
            <div className="p-3">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Conflicted Files</h4>
              <div className="space-y-1">
                {conflictFiles.map((file, index) => (
                  <div
                    key={file.path}
                    onClick={() => {
                      setSelectedFile(file.path);
                      setSelectedConflict(0);
                    }}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedFile === file.path
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.path}
                        </span>
                      </div>
                      {file.resolved ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {file.conflicts.length} conflict{file.conflicts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 flex flex-col">
            {selectedFileData && selectedConflictData ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Conflict {selectedConflict + 1} of {selectedFileData.conflicts.length}
                    </h4>
                    <div className="flex items-center gap-1">
                      {selectedFileData.conflicts.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedConflict(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === selectedConflict
                              ? 'bg-blue-500'
                              : currentResolution.has(selectedConflictData.id)
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Line {selectedConflictData.startLine} - {selectedConflictData.endLine}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    {/* Our Version */}
                    <div>
                      <h5 className="font-medium text-green-700 dark:text-green-300 mb-2">Our Version ({branch1})</h5>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                          {selectedConflictData.ours.join('\n')}
                        </pre>
                      </div>
                      <button
                        onClick={() => resolveConflict(selectedFile, selectedConflictData.id, 'ours')}
                        className={`mt-2 px-3 py-1 text-sm rounded-lg ${
                          currentResolution.get(selectedConflictData.id) === 'ours'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-green-100 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Use This Version
                      </button>
                    </div>

                    {/* Their Version */}
                    <div>
                      <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Their Version ({branch2})</h5>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <pre className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                          {selectedConflictData.theirs.join('\n')}
                        </pre>
                      </div>
                      <button
                        onClick={() => resolveConflict(selectedFile, selectedConflictData.id, 'theirs')}
                        className={`mt-2 px-3 py-1 text-sm rounded-lg ${
                          currentResolution.get(selectedConflictData.id) === 'theirs'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-blue-100 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Use This Version
                      </button>
                    </div>

                    {/* Custom Merge */}
                    <div>
                      <h5 className="font-medium text-purple-700 dark:text-purple-300 mb-2">Custom Merge</h5>
                      <textarea
                        className="w-full h-32 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-800 dark:text-purple-200 font-mono"
                        placeholder="Edit merged content here..."
                        value={mergedContent.get(selectedConflictData.id) || ''}
                        onChange={(e) => {
                          const contentMap = new Map(mergedContent);
                          contentMap.set(selectedConflictData.id, e.target.value);
                          setMergedContent(contentMap);
                          resolveConflict(selectedFile, selectedConflictData.id, 'merged');
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedConflict(Math.max(0, selectedConflict - 1))}
                    disabled={selectedConflict === 0}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={abortMerge}
                      className="px-4 py-2 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40"
                    >
                      Abort Merge
                    </button>
                    <button
                      onClick={applyResolution}
                      disabled={!allConflictsResolved}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply Resolution
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedConflict(Math.min(selectedFileData.conflicts.length - 1, selectedConflict + 1))}
                    disabled={selectedConflict === selectedFileData.conflicts.length - 1}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <GitMerge className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a file to view conflicts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}