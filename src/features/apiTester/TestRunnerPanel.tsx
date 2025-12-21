import { useState, useRef, useEffect } from 'react';
import {
  X, Play, Square, CheckCircle2, XCircle, Clock, Filter,
  FolderOpen, Tag, RotateCcw, Download, ChevronDown, ChevronRight,
  Zap, AlertCircle, FileText, History, TrendingUp, Github, Timer,
  Trash2, BarChart3, Settings
} from 'lucide-react';
import { apiTesterStorage, type TestCase, type TestSuite, type Assertion, type TestRunHistory } from '../../services/apiTesterStorage';
import { apiTesterApi, type ApiResponse } from '../../api/apiTester';
import { evaluateAssertions } from './TestsPanel';
import {
  TestVariableStore,
  substituteRequestVariables,
  extractVariables,
  generateHTMLReport
} from './utils/testUtils';
import CICDExportPanel from './CICDExportPanel';
import SettingsPanel from './SettingsPanel';

// Scheduled test storage
interface ScheduledTest {
  id: string;
  name: string;
  mode: RunMode;
  suiteId?: string;
  tags?: string[];
  intervalMinutes: number;
  lastRun?: number;
  nextRun: number;
  enabled: boolean;
}

const SCHEDULED_TESTS_KEY = 'kumo-api-tester-scheduled-tests';

interface TestRunnerPanelProps {
  onClose: () => void;
}

interface TestRunResult {
  testId: string;
  testName: string;
  passed: boolean;
  status: number;
  duration: number;
  assertionResults: Array<{ assertion: Assertion; passed: boolean; actual?: any; message?: string }>;
  error?: string;
}

type RunMode = 'all' | 'suite' | 'tags' | 'failed';

export default function TestRunnerPanel({ onClose }: TestRunnerPanelProps) {
  const [tests] = useState<TestCase[]>(apiTesterStorage.getTests());
  const [suites] = useState<TestSuite[]>(apiTesterStorage.getSuites());

  // Run configuration
  const [runMode, setRunMode] = useState<RunMode>('all');
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [parallelExecution, setParallelExecution] = useState(false);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestRunResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [startTime, setStartTime] = useState<number | null>(null);
  const abortRef = useRef(false);

  // UI state
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'runner' | 'schedule' | 'history'>('runner');

  // CI/CD export
  const [showCICDExport, setShowCICDExport] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Scheduling
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEDULED_TESTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [scheduleInterval, setScheduleInterval] = useState(60);
  const [scheduleName, setScheduleName] = useState('');
  const schedulerRef = useRef<number | null>(null);

  // History
  const [history, setHistory] = useState<TestRunHistory[]>(() => apiTesterStorage.getTestRunHistory());
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Save scheduled tests to localStorage
  useEffect(() => {
    localStorage.setItem(SCHEDULED_TESTS_KEY, JSON.stringify(scheduledTests));
  }, [scheduledTests]);

  // Run scheduled tests checker
  useEffect(() => {
    const checkScheduled = () => {
      const now = Date.now();
      setScheduledTests(prev => prev.map(schedule => {
        if (schedule.enabled && schedule.nextRun <= now) {
          // Time to run this scheduled test
          runScheduledTest(schedule);
          return {
            ...schedule,
            lastRun: now,
            nextRun: now + schedule.intervalMinutes * 60 * 1000
          };
        }
        return schedule;
      }));
    };

    // Check every minute
    schedulerRef.current = window.setInterval(checkScheduled, 60000);
    // Also check immediately
    checkScheduled();

    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
      }
    };
  }, []);

  // Run a scheduled test
  const runScheduledTest = async (schedule: ScheduledTest) => {
    let testsToRunScheduled: TestCase[] = [];

    switch (schedule.mode) {
      case 'all':
        testsToRunScheduled = tests;
        break;
      case 'suite':
        if (schedule.suiteId) {
          testsToRunScheduled = apiTesterStorage.getTestsBySuite(schedule.suiteId);
        }
        break;
      case 'tags':
        if (schedule.tags && schedule.tags.length > 0) {
          testsToRunScheduled = tests.filter(t => schedule.tags!.some(tag => t.tags.includes(tag)));
        }
        break;
      case 'failed':
        testsToRunScheduled = tests.filter(t => t.lastResult && !t.lastResult.passed);
        break;
    }

    if (testsToRunScheduled.length === 0) return;

    const runStartTime = Date.now();
    const scheduledResults: TestRunResult[] = [];
    const tempVariableStore = new TestVariableStore();

    for (const test of testsToRunScheduled) {
      try {
        const processedRequest = substituteRequestVariables(
          test.request,
          tempVariableStore.getAll()
        );
        const res = await apiTesterApi.executeRequest(processedRequest);
        const assertionResults = evaluateAssertions(res, test.assertions);
        const passed = assertionResults.every(r => r.passed);

        if (test.variableExtractions && test.variableExtractions.length > 0) {
          const extracted = extractVariables(res, test.variableExtractions);
          tempVariableStore.merge(extracted);
        }

        apiTesterStorage.updateTest(test.id, {
          lastResult: {
            passed,
            status: res.status,
            duration: res.duration,
            at: Date.now(),
            details: assertionResults,
          },
        });

        scheduledResults.push({
          testId: test.id,
          testName: test.name,
          passed,
          status: res.status,
          duration: res.duration,
          assertionResults,
        });
      } catch (error) {
        scheduledResults.push({
          testId: test.id,
          testName: test.name,
          passed: false,
          status: 0,
          duration: 0,
          assertionResults: [],
          error: error instanceof Error ? error.message : 'Request failed',
        });
      }
    }

    // Save to history
    const historyEntry = {
      runAt: runStartTime,
      duration: Date.now() - runStartTime,
      mode: schedule.mode,
      suiteId: schedule.suiteId,
      tags: schedule.tags,
      results: scheduledResults.map(r => ({
        testId: r.testId,
        testName: r.testName,
        passed: r.passed,
        status: r.status,
        duration: r.duration,
        assertionsPassed: r.assertionResults.filter(a => a.passed).length,
        assertionsTotal: r.assertionResults.length,
      })),
      summary: {
        total: scheduledResults.length,
        passed: scheduledResults.filter(r => r.passed).length,
        failed: scheduledResults.filter(r => !r.passed).length,
        skipped: 0,
      },
    };

    apiTesterStorage.addTestRunHistory(historyEntry);

    // Send webhook notifications
    const failedCount = scheduledResults.filter(r => !r.passed).length;
    if (failedCount > 0) {
      apiTesterStorage.sendWebhookNotification('scheduledRunComplete', {
        scheduleName: schedule.name,
        ...historyEntry
      });
    }

    // Refresh history
    setHistory(apiTesterStorage.getTestRunHistory());
  };

  // Add a scheduled test
  const addScheduledTest = () => {
    if (!scheduleName.trim()) return;

    const newSchedule: ScheduledTest = {
      id: crypto.randomUUID(),
      name: scheduleName,
      mode: runMode,
      suiteId: runMode === 'suite' ? selectedSuiteId : undefined,
      tags: runMode === 'tags' ? selectedTags : undefined,
      intervalMinutes: scheduleInterval,
      nextRun: Date.now() + scheduleInterval * 60 * 1000,
      enabled: true
    };

    setScheduledTests(prev => [...prev, newSchedule]);
    setScheduleName('');
  };

  // Remove a scheduled test
  const removeScheduledTest = (id: string) => {
    setScheduledTests(prev => prev.filter(s => s.id !== id));
  };

  // Toggle scheduled test enabled state
  const toggleScheduledTest = (id: string) => {
    setScheduledTests(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // Clear all history
  const clearHistory = () => {
    apiTesterStorage.clearTestRunHistory();
    setHistory([]);
    setSelectedHistoryId(null);
  };

  // Get all unique tags from tests
  const allTags = Array.from(new Set(tests.flatMap(t => t.tags)));

  // Get tests to run based on mode
  const getTestsToRun = (): TestCase[] => {
    switch (runMode) {
      case 'all':
        return tests;
      case 'suite':
        if (!selectedSuiteId) return [];
        return apiTesterStorage.getTestsBySuite(selectedSuiteId);
      case 'tags':
        if (selectedTags.length === 0) return tests;
        return tests.filter(t => selectedTags.some(tag => t.tags.includes(tag)));
      case 'failed':
        return tests.filter(t => t.lastResult && !t.lastResult.passed);
      default:
        return tests;
    }
  };

  const testsToRun = getTestsToRun();

  // Variable store for chained requests
  const variableStoreRef = useRef(new TestVariableStore());

  // Run a single test with variable support
  const runSingleTest = async (test: TestCase): Promise<TestRunResult> => {
    try {
      // Substitute variables in request
      const processedRequest = substituteRequestVariables(
        test.request,
        variableStoreRef.current.getAll()
      );

      const res = await apiTesterApi.executeRequest(processedRequest);
      const assertionResults = evaluateAssertions(res, test.assertions);
      const passed = assertionResults.every(r => r.passed);

      // Extract variables from response
      if (test.variableExtractions && test.variableExtractions.length > 0) {
        const extracted = extractVariables(res, test.variableExtractions);
        variableStoreRef.current.merge(extracted);
      }

      // Update test in storage
      apiTesterStorage.updateTest(test.id, {
        lastResult: {
          passed,
          status: res.status,
          duration: res.duration,
          at: Date.now(),
          details: assertionResults,
        },
      });

      return {
        testId: test.id,
        testName: test.name,
        passed,
        status: res.status,
        duration: res.duration,
        assertionResults,
      };
    } catch (error) {
      return {
        testId: test.id,
        testName: test.name,
        passed: false,
        status: 0,
        duration: 0,
        assertionResults: [],
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  };

  // Run all tests
  const runTests = async () => {
    if (testsToRun.length === 0) return;

    setIsRunning(true);
    setResults([]);
    setProgress({ current: 0, total: testsToRun.length });
    const runStartTime = Date.now();
    setStartTime(runStartTime);
    abortRef.current = false;

    // Clear variable store for fresh run
    variableStoreRef.current.clear();

    const newResults: TestRunResult[] = [];

    if (parallelExecution) {
      // Parallel execution (note: variables won't chain in parallel)
      const promises = testsToRun.map(async (test, index) => {
        if (abortRef.current) return null;
        const result = await runSingleTest(test);
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        return result;
      });

      const parallelResults = await Promise.all(promises);
      newResults.push(...parallelResults.filter(Boolean) as TestRunResult[]);
    } else {
      // Sequential execution (variables will chain)
      for (let i = 0; i < testsToRun.length; i++) {
        if (abortRef.current) break;

        const result = await runSingleTest(testsToRun[i]);
        newResults.push(result);
        setResults([...newResults]);
        setProgress({ current: i + 1, total: testsToRun.length });
      }
    }

    setResults(newResults);
    setIsRunning(false);

    const totalDuration = Date.now() - runStartTime;

    // Update suite result if running a suite
    if (runMode === 'suite' && selectedSuiteId) {
      const passed = newResults.filter(r => r.passed).length;
      const failed = newResults.filter(r => !r.passed).length;
      const duration = newResults.reduce((sum, r) => sum + r.duration, 0);

      apiTesterStorage.updateSuite(selectedSuiteId, {
        lastRunResult: {
          passed,
          failed,
          skipped: 0,
          duration,
          at: Date.now(),
        },
      });
    }

    // Save test run history
    apiTesterStorage.addTestRunHistory({
      runAt: runStartTime,
      duration: totalDuration,
      mode: runMode,
      suiteId: runMode === 'suite' ? selectedSuiteId : undefined,
      tags: runMode === 'tags' ? selectedTags : undefined,
      results: newResults.map(r => ({
        testId: r.testId,
        testName: r.testName,
        passed: r.passed,
        status: r.status,
        duration: r.duration,
        assertionsPassed: r.assertionResults.filter(a => a.passed).length,
        assertionsTotal: r.assertionResults.length,
      })),
      summary: {
        total: newResults.length,
        passed: newResults.filter(r => r.passed).length,
        failed: newResults.filter(r => !r.passed).length,
        skipped: 0,
      },
    });
  };

  // Export as HTML report
  const exportHTMLReport = () => {
    if (results.length === 0 || !startTime) return;

    const html = generateHTMLReport(results, {
      title: runMode === 'suite' && selectedSuiteId
        ? `Test Suite: ${suites.find(s => s.id === selectedSuiteId)?.name || 'Unknown'}`
        : 'API Test Report',
      runAt: startTime,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const abortRun = () => {
    abortRef.current = true;
  };

  const toggleResultExpanded = (testId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Export results as JSON
  const exportResults = () => {
    const data = {
      runAt: startTime,
      duration: startTime ? Date.now() - startTime : 0,
      mode: runMode,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
      },
      results: results.map(r => ({
        testName: r.testName,
        passed: r.passed,
        status: r.status,
        duration: r.duration,
        error: r.error,
        assertions: r.assertionResults.map(ar => ({
          type: ar.assertion.type,
          passed: ar.passed,
          message: ar.message,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  // Get trends data for chart
  const trends = apiTesterStorage.getDailyTrends(7);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Runner</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tests.length} tests • {suites.length} suites
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setShowCICDExport(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="CI/CD Export"
            >
              <Github className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('runner')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'runner'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Play className="w-4 h-4" />
              Runner
            </span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              Schedule
              {scheduledTests.filter(s => s.enabled).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                  {scheduledTests.filter(s => s.enabled).length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4" />
              History
              {history.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  {history.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Runner Tab */}
        {activeTab === 'runner' && (
          <>
            {/* Run Configuration */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 space-y-4">
              {/* Mode Selection */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Run:</span>
            <button
              onClick={() => setRunMode('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                runMode === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              All Tests ({tests.length})
            </button>
            <button
              onClick={() => setRunMode('failed')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                runMode === 'failed'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Failed ({tests.filter(t => t.lastResult && !t.lastResult.passed).length})
            </button>
            <button
              onClick={() => { setRunMode('suite'); setShowFilters(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                runMode === 'suite'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Suite
            </button>
            <button
              onClick={() => { setRunMode('tags'); setShowFilters(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                runMode === 'tags'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              By Tags
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (runMode === 'suite' || runMode === 'tags') && (
            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
              {runMode === 'suite' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Suite
                  </label>
                  <select
                    value={selectedSuiteId}
                    onChange={(e) => setSelectedSuiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-sm"
                  >
                    <option value="">Choose a suite...</option>
                    {suites.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.testIds.length} tests)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {runMode === 'tags' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.length === 0 ? (
                      <span className="text-sm text-gray-500">No tags found</span>
                    ) : (
                      allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options & Run Button */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={parallelExecution}
                onChange={(e) => setParallelExecution(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              Parallel execution
            </label>

            <div className="flex items-center gap-2">
              {results.length > 0 && (
                <>
                  <button
                    onClick={exportHTMLReport}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg flex items-center gap-1"
                    title="Export as HTML Report"
                  >
                    <FileText className="w-4 h-4" />
                    HTML
                  </button>
                  <button
                    onClick={exportResults}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg flex items-center gap-1"
                    title="Export as JSON"
                  >
                    <Download className="w-4 h-4" />
                    JSON
                  </button>
                </>
              )}
              {isRunning ? (
                <button
                  onClick={abortRun}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={runTests}
                  disabled={testsToRun.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 rounded-lg flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run {testsToRun.length} Tests
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                Running test {progress.current} of {progress.total}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Summary */}
        {results.length > 0 && !isRunning && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {passedCount} passed
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {failedCount} failed
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {totalDuration}ms
                  </span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                failedCount === 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {failedCount === 0 ? 'All Passed' : `${failedCount} Failed`}
              </div>
            </div>
          </div>
        )}

            {/* Results List */}
            <div className="flex-1 overflow-auto p-4">
              {results.length === 0 && !isRunning ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click "Run" to start testing
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {testsToRun.length} tests ready to run
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.testId}
                      className={`border rounded-lg overflow-hidden ${
                        result.passed
                          ? 'border-green-200 dark:border-green-800'
                          : 'border-red-200 dark:border-red-800'
                      }`}
                    >
                      <button
                        onClick={() => toggleResultExpanded(result.testId)}
                        className={`w-full px-3 py-2 flex items-center justify-between ${
                          result.passed
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {result.testName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {result.error ? (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              {result.error}
                            </span>
                          ) : (
                            <>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                result.status >= 200 && result.status < 300
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {result.status}
                              </span>
                              <span className="text-xs text-gray-500">{result.duration}ms</span>
                            </>
                          )}
                          {expandedResults.has(result.testId) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {expandedResults.has(result.testId) && (
                        <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            Assertions ({result.assertionResults.filter(a => a.passed).length}/{result.assertionResults.length} passed)
                          </div>
                          <div className="space-y-1">
                            {result.assertionResults.map((ar, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  ar.passed
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                }`}
                              >
                                <span className="font-mono">
                                  {ar.assertion.type}
                                  {ar.assertion.type === 'json' && ` (${(ar.assertion as any).path})`}
                                  {ar.assertion.type === 'header' && ` (${(ar.assertion as any).key})`}
                                  : {(ar.assertion as any).op}
                                </span>
                                {ar.message && (
                                  <span className="ml-2 opacity-75">— {ar.message}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="flex-1 overflow-auto p-4">
            {/* Add Schedule Form */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Add Scheduled Test Run
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="e.g., Daily API Health Check"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Run Mode
                    </label>
                    <select
                      value={runMode}
                      onChange={(e) => setRunMode(e.target.value as RunMode)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                    >
                      <option value="all">All Tests ({tests.length})</option>
                      <option value="failed">Failed Tests</option>
                      {suites.map(s => (
                        <option key={s.id} value="suite">Suite: {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={scheduleInterval}
                      onChange={(e) => setScheduleInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={addScheduledTest}
                  disabled={!scheduleName.trim()}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg"
                >
                  Add Schedule
                </button>
              </div>
            </div>

            {/* Scheduled Tests List */}
            {scheduledTests.length === 0 ? (
              <div className="text-center py-8">
                <Timer className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No scheduled tests</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Add a schedule to run tests automatically
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledTests.map(schedule => (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg border ${
                      schedule.enabled
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleScheduledTest(schedule.id)}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            schedule.enabled
                              ? 'bg-purple-500'
                              : 'bg-gray-300 dark:bg-slate-600'
                          }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${
                            schedule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {schedule.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.mode === 'all' ? 'All tests' :
                             schedule.mode === 'suite' ? `Suite` :
                             schedule.mode === 'tags' ? `Tags: ${schedule.tags?.join(', ')}` :
                             'Failed tests'} • Every {schedule.intervalMinutes}m
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {schedule.enabled && (
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            Next: {new Date(schedule.nextRun).toLocaleTimeString()}
                          </span>
                        )}
                        <button
                          onClick={() => removeScheduledTest(schedule.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto">
            {/* Trends Chart */}
            {trends.length > 0 && (
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    7-Day Trends
                  </h3>
                </div>
                <div className="h-24 flex items-end gap-1">
                  {trends.map((day, idx) => {
                    const total = day.passed + day.failed;
                    const maxTotal = Math.max(...trends.map(t => t.passed + t.failed));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col-reverse" style={{ height: '80px' }}>
                          {total > 0 && (
                            <>
                              <div
                                className="w-full bg-green-500 rounded-t"
                                style={{ height: `${maxTotal > 0 ? (day.passed / maxTotal) * 80 : 0}px` }}
                              />
                              {day.failed > 0 && (
                                <div
                                  className="w-full bg-red-500"
                                  style={{ height: `${maxTotal > 0 ? (day.failed / maxTotal) * 80 : 0}px` }}
                                />
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* History List */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Run History
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">No test history</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Run tests to see history here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(run => (
                    <div
                      key={run.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedHistoryId === run.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                      onClick={() => setSelectedHistoryId(selectedHistoryId === run.id ? null : run.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(run.runAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {run.mode === 'all' ? 'All tests' :
                             run.mode === 'suite' ? 'Suite' :
                             run.mode === 'tags' ? `Tags` :
                             run.mode === 'failed' ? 'Failed' : 'Single'} • {run.duration}ms
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {run.summary.passed} passed
                          </span>
                          {run.summary.failed > 0 && (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              {run.summary.failed} failed
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedHistoryId === run.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                          <div className="space-y-1">
                            {run.results.map((result, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                                  result.passed
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  {result.passed ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  {result.testName}
                                </span>
                                <span>{result.duration}ms</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CI/CD Export Panel */}
      {showCICDExport && (
        <CICDExportPanel onClose={() => setShowCICDExport(false)} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
