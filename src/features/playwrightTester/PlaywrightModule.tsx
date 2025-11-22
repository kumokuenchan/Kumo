import { useState, useMemo } from 'react';
import {
  Plus, Play, FolderOpen, Search, Filter, Tag, Settings,
  ChevronRight, MoreVertical, Trash2, Copy, Edit2, CheckCircle2,
  XCircle, Clock, Monitor, Globe, Code, X
} from 'lucide-react';
import {
  playwrightStorage,
  type PlaywrightTest,
  type PlaywrightSuite,
  type TestStep,
  defaultTestConfig
} from '../../services/playwrightStorage';
import TestEditor from './TestEditor';
import TestRunner from './TestRunner';

export default function PlaywrightModule() {
  // Test management state
  const [tests, setTests] = useState<PlaywrightTest[]>(playwrightStorage.getTests());
  const [suites, setSuites] = useState<PlaywrightSuite[]>(playwrightStorage.getSuites());
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showRunner, setShowRunner] = useState(false);
  const [runningTestIds, setRunningTestIds] = useState<string[]>([]);

  // Refresh data
  const refresh = () => {
    setTests(playwrightStorage.getTests());
    setSuites(playwrightStorage.getSuites());
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    return Array.from(new Set(tests.flatMap(t => t.tags)));
  }, [tests]);

  // Filter tests
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!test.name.toLowerCase().includes(query) &&
            !test.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Tag filter
      if (selectedTags.length > 0) {
        if (!selectedTags.some(tag => test.tags.includes(tag))) {
          return false;
        }
      }

      // Suite filter
      if (selectedSuiteId) {
        if (test.suiteId !== selectedSuiteId) {
          return false;
        }
      }

      return true;
    });
  }, [tests, searchQuery, selectedTags, selectedSuiteId]);

  // Get selected test
  const selectedTest = selectedTestId ? tests.find(t => t.id === selectedTestId) : null;

  // Create new test
  const createTest = () => {
    const newTest = playwrightStorage.saveTest({
      name: 'New Test',
      steps: [],
      config: { ...defaultTestConfig },
      tags: [],
      suiteId: selectedSuiteId || undefined
    });
    refresh();
    setSelectedTestId(newTest.id);
  };

  // Create new suite
  const createSuite = () => {
    const name = prompt('Suite name:');
    if (!name) return;

    playwrightStorage.saveSuite({
      name,
      testIds: [],
      tags: []
    });
    refresh();
  };

  // Delete test
  const deleteTest = (id: string) => {
    if (!confirm('Delete this test?')) return;
    playwrightStorage.deleteTest(id);
    if (selectedTestId === id) {
      setSelectedTestId(null);
    }
    refresh();
  };

  // Duplicate test
  const duplicateTest = (id: string) => {
    const newTest = playwrightStorage.duplicateTest(id);
    if (newTest) {
      refresh();
      setSelectedTestId(newTest.id);
    }
  };

  // Update test
  const updateTest = (id: string, updates: Partial<PlaywrightTest>) => {
    playwrightStorage.updateTest(id, updates);
    refresh();
  };

  // Run single test
  const runTest = (testId: string) => {
    setRunningTestIds([testId]);
    setShowRunner(true);
  };

  // Run all filtered tests
  const runAllTests = () => {
    setRunningTestIds(filteredTests.map(t => t.id));
    setShowRunner(true);
  };

  // Toggle tag filter
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-slate-900">
      {/* Left Panel - Test List */}
      <div className="w-80 border-r border-gray-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-green-500" />
              E2E Tests
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={createSuite}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                title="New Suite"
              >
                <FolderOpen className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={createTest}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                title="New Test"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tests..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
            />
          </div>

          {/* Filters */}
          {allTags.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Filters {selectedTags.length > 0 && `(${selectedTags.length})`}
              </button>
              {showFilters && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        selectedTags.includes(tag)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suite Tabs */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => setSelectedSuiteId(null)}
            className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap ${
              !selectedSuiteId
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            All ({tests.length})
          </button>
          {suites.map(suite => (
            <button
              key={suite.id}
              onClick={() => setSelectedSuiteId(suite.id)}
              className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap ${
                selectedSuiteId === suite.id
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {suite.name} ({suite.testIds.length})
            </button>
          ))}
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-auto p-2">
          {filteredTests.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No tests found</p>
              <button
                onClick={createTest}
                className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Create your first test
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTests.map(test => (
                <div
                  key={test.id}
                  onClick={() => setSelectedTestId(test.id)}
                  className={`p-2 rounded-lg cursor-pointer group ${
                    selectedTestId === test.id
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {test.lastResult ? (
                        test.lastResult.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {test.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); runTest(test.id); }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600"
                        title="Run Test"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateTest(test.id); }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTest(test.id); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{test.steps.length} steps</span>
                    {test.lastResult && (
                      <>
                        <span>•</span>
                        <span>{test.lastResult.duration}ms</span>
                      </>
                    )}
                  </div>
                  {test.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {test.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run All Button */}
        {filteredTests.length > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={runAllTests}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run {filteredTests.length} Tests
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Test Editor */}
      <div className="flex-1 flex flex-col">
        {selectedTest ? (
          <TestEditor
            test={selectedTest}
            onUpdate={(updates) => updateTest(selectedTest.id, updates)}
            onRun={() => runTest(selectedTest.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Playwright E2E Testing
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Select a test to edit or create a new one
              </p>
              <button
                onClick={createTest}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Test
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Runner Modal */}
      {showRunner && (
        <TestRunner
          testIds={runningTestIds}
          onClose={() => {
            setShowRunner(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
