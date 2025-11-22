import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, GitBranch, GitCommit, FileText, Calendar, Code, User, ChevronDown, X, Download, Eye } from 'lucide-react';

interface SearchFilters {
  query: string;
  author: string;
  dateRange: { start: string; end: string };
  filePattern: string;
  commitType: 'all' | 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  branches: string[];
  hasDiff: boolean;
}

interface SearchResult {
  type: 'commit' | 'file' | 'branch';
  id: string;
  title: string;
  description?: string;
  author?: string;
  date?: string;
  branch?: string;
  changes?: number;
  matches: Array<{
    line: number;
    content: string;
    context: string;
  }>;
}

interface AdvancedSearchProps {
  gitService: any;
  onResultSelect?: (result: SearchResult) => void;
}

export default function AdvancedSearchComponent({ gitService, onResultSelect }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    author: '',
    dateRange: { start: '', end: '' },
    filePattern: '',
    commitType: 'all',
    branches: [],
    hasDiff: false
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState<'semantic' | 'pattern' | 'history'>('semantic');
  const [branches, setBranches] = useState<string[]>([]);

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

  const performSearch = async () => {
    if (!filters.query.trim() && !filters.author && !filters.filePattern) return;

    setLoading(true);
    try {
      let searchResults: SearchResult[] = [];

      switch (searchType) {
        case 'semantic':
          searchResults = await performSemanticSearch();
          break;
        case 'pattern':
          searchResults = await performPatternSearch();
          break;
        case 'history':
          searchResults = await performHistorySearch();
          break;
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSemanticSearch = async (): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    
    // Search commits
    const commits = await gitService.getLog();

    for (const commit of commits) {
      const relevanceScore = calculateRelevanceScore(commit, filters.query);
      if (relevanceScore > 0) {
        results.push({
          type: 'commit',
          id: commit.oid,
          title: commit.message.split('\n')[0],
          description: commit.message.split('\n').slice(1).join('\n'),
          author: commit.author.name,
          date: new Date(commit.author.timestamp * 1000).toISOString(),
          changes: commit.parent?.length || 0,
          matches: [{
            line: 0,
            content: commit.message,
            context: 'commit message'
          }]
        });
      }
    }

    // Search files
    if (filters.filePattern) {
      const files = await gitService.listFiles(filters.filePattern);
      for (const file of files) {
        results.push({
          type: 'file',
          id: file.path,
          title: file.path,
          description: `Last modified: ${file.lastModified}`,
          changes: file.changes || 0,
          matches: [{
            line: 0,
            content: file.path,
            context: 'file path'
          }]
        });
      }
    }

    return results.sort((a, b) => calculateRelevanceScore(b, filters.query) - calculateRelevanceScore(a, filters.query));
  };

  const performPatternSearch = async (): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    const regex = new RegExp(filters.query, 'gi');

    const commits = await gitService.getLog();
    
    for (const commit of commits) {
      if (regex.test(commit.message)) {
        const matches = [];
        const lines = commit.message.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              line: i + 1,
              content: lines[i],
              context: 'commit message'
            });
          }
        }

        results.push({
          type: 'commit',
          id: commit.oid,
          title: commit.message.split('\n')[0],
          author: commit.author.name,
          date: new Date(commit.author.timestamp * 1000).toISOString(),
          matches
        });
      }
    }

    return results;
  };

  const performHistorySearch = async (): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    
    // Get file change history
    if (filters.filePattern) {
      const history = await gitService.getFileHistory(filters.filePattern);
      for (const entry of history) {
        results.push({
          type: 'file',
          id: `${entry.file}:${entry.commit}`,
          title: entry.file,
          description: `Modified in commit ${entry.commit.substring(0, 7)}`,
          author: entry.author,
          date: entry.date,
          branch: entry.branch,
          changes: entry.insertions + entry.deletions,
          matches: [{
            line: 0,
            content: `+${entry.insertions} -${entry.deletions}`,
            context: 'file changes'
          }]
        });
      }
    }

    return results;
  };

  const calculateRelevanceScore = (item: any, query: string): number => {
    let score = 0;
    const queryLower = query.toLowerCase();

    if (item.message) {
      if (item.message.toLowerCase().includes(queryLower)) {
        score += 10;
      }
      if (item.message.toLowerCase().startsWith(queryLower)) {
        score += 5;
      }
    }

    // Handle author field - it could be a string or an object with name property
    let authorName = '';
    if (typeof item.author === 'string') {
      authorName = item.author;
    } else if (item.author && item.author.name && typeof item.author.name === 'string') {
      authorName = item.author.name;
    }
    
    if (authorName.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    return score;
  };

  const exportResults = () => {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `git-search-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Git Search
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
            >
              <option value="semantic">Semantic Search</option>
              <option value="pattern">Pattern Match</option>
              <option value="history">History Analytics</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search commits, files, or branches..."
              className="w-full pl-10 pr-3 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            />
          </div>
          <button
            onClick={performSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                  placeholder="Filter by author..."
                  className="w-full px-3 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  File Pattern
                </label>
                <input
                  type="text"
                  value={filters.filePattern}
                  onChange={(e) => setFilters({ ...filters, filePattern: e.target.value })}
                  placeholder="*.ts, *.tsx, src/**"
                  className="w-full px-3 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                  className="w-full px-3 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                  className="w-full px-3 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Branches
              </label>
              <div className="flex flex-wrap gap-2">
                {branches.map(branch => (
                  <label key={branch} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={filters.branches.includes(branch)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ ...filters, branches: [...filters.branches, branch] });
                        } else {
                          setFilters({ ...filters, branches: filters.branches.filter(b => b !== branch) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{branch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-auto">
        {results.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No results found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {results.map(result => (
              <div
                key={result.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                onClick={() => onResultSelect?.(result)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-slate-600 rounded-lg">
                      {result.type === 'commit' && <GitCommit className="w-4 h-4" />}
                      {result.type === 'file' && <FileText className="w-4 h-4" />}
                      {result.type === 'branch' && <GitBranch className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {result.title}
                      </h4>
                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {result.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {result.author && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {result.author}
                          </span>
                        )}
                        {result.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(result.date).toLocaleDateString()}
                          </span>
                        )}
                        {result.changes !== undefined && (
                          <span className="flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            {result.changes} changes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // View details
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"
                  >
                    <Eye className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {results.length} results found
          </span>
          <button
            onClick={exportResults}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}
    </div>
  );
}
