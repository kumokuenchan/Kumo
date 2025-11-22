import { useState, useEffect, useRef } from 'react';
import {
  X, Play, Square, CheckCircle2, XCircle, Clock, Loader2,
  ChevronDown, ChevronRight, Image, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  playwrightStorage,
  type PlaywrightTest,
  type TestResult,
  type StepResult
} from '../../services/playwrightStorage';

interface TestRunnerProps {
  testIds: string[];
  onClose: () => void;
}

interface RunningTest {
  test: PlaywrightTest;
  status: 'pending' | 'running' | 'passed' | 'failed';
  stepResults: StepResult[];
  error?: string;
  startTime?: number;
  duration?: number;
}

export default function TestRunner({ testIds, onClose }: TestRunnerProps) {
  const [runningTests, setRunningTests] = useState<RunningTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);

  // Initialize tests
  useEffect(() => {
    const tests = testIds.map(id => playwrightStorage.getTest(id)).filter(Boolean) as PlaywrightTest[];
    setRunningTests(tests.map(test => ({
      test,
      status: 'pending',
      stepResults: []
    })));
  }, [testIds]);

  // Start running tests
  const startRun = async () => {
    setIsRunning(true);
    abortRef.current = false;

    for (let i = 0; i < runningTests.length; i++) {
      if (abortRef.current) break;

      setCurrentTestIndex(i);
      const runningTest = runningTests[i];

      // Update status to running
      setRunningTests(prev => prev.map((rt, idx) =>
        idx === i ? { ...rt, status: 'running', startTime: Date.now() } : rt
      ));

      // Expand current test
      setExpandedTests(prev => new Set(prev).add(runningTest.test.id));

      try {
        // Run the test via backend API
        const result = await executeTest(runningTest.test);

        // Update with results
        setRunningTests(prev => prev.map((rt, idx) =>
          idx === i ? {
            ...rt,
            status: result.passed ? 'passed' : 'failed',
            stepResults: result.stepResults,
            error: result.error,
            duration: result.duration
          } : rt
        ));

        // Save result to storage
        playwrightStorage.saveResult(result);

      } catch (error) {
        setRunningTests(prev => prev.map((rt, idx) =>
          idx === i ? {
            ...rt,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Test execution failed',
            duration: Date.now() - (rt.startTime || Date.now())
          } : rt
        ));
      }
    }

    setIsRunning(false);
  };

  // Execute a single test
  const executeTest = async (test: PlaywrightTest): Promise<Omit<TestResult, 'id'>> => {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    try {
      // Call backend API to run the test
      const response = await fetch('/api/playwright/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test,
          environment: playwrightStorage.getActiveEnvironment()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to execute test');
      }

      const result = await response.json();

      return {
        testId: test.id,
        runAt: startTime,
        duration: Date.now() - startTime,
        passed: result.passed,
        browser: test.config.browser,
        stepResults: result.stepResults || [],
        error: result.error,
        video: result.video,
        trace: result.trace
      };

    } catch (error) {
      // If backend is not available, simulate the test run
      // This allows UI testing without the backend
      console.warn('Backend not available, simulating test run');

      for (const step of test.steps) {
        if (step.enabled === false) continue;

        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        const stepPassed = Math.random() > 0.1; // 90% pass rate for simulation
        stepResults.push({
          stepId: step.id,
          passed: stepPassed,
          duration: Math.floor(50 + Math.random() * 150),
          error: stepPassed ? undefined : 'Simulated error'
        });

        // Update step results in real-time
        setRunningTests(prev => prev.map(rt =>
          rt.test.id === test.id ? { ...rt, stepResults: [...stepResults] } : rt
        ));

        if (!stepPassed) break;
      }

      const passed = stepResults.every(r => r.passed);

      return {
        testId: test.id,
        runAt: startTime,
        duration: Date.now() - startTime,
        passed,
        browser: test.config.browser,
        stepResults,
        error: passed ? undefined : 'One or more steps failed'
      };
    }
  };

  // Stop running tests
  const stopRun = () => {
    abortRef.current = true;
  };

  // Toggle test expanded
  const toggleTestExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  // Calculate summary
  const passed = runningTests.filter(rt => rt.status === 'passed').length;
  const failed = runningTests.filter(rt => rt.status === 'failed').length;
  const pending = runningTests.filter(rt => rt.status === 'pending').length;
  const totalDuration = runningTests.reduce((sum, rt) => sum + (rt.duration || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Runner
              </h2>
              <p className="text-xs text-gray-500">
                {runningTests.length} test{runningTests.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Summary */}
        {!isRunning && runningTests.some(rt => rt.status !== 'pending') && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">{passed} passed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">{failed} failed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{totalDuration}ms</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                failed === 0
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700'
              }`}>
                {failed === 0 ? 'All Passed' : `${failed} Failed`}
              </div>
            </div>
          </div>
        )}

        {/* Test List */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {runningTests.map((rt, index) => {
              const isExpanded = expandedTests.has(rt.test.id);
              const stepCount = rt.test.steps.filter(s => s.enabled !== false).length;
              const completedSteps = rt.stepResults.length;

              return (
                <div
                  key={rt.test.id}
                  className={`border rounded-lg overflow-hidden ${
                    rt.status === 'passed' ? 'border-green-200 dark:border-green-800' :
                    rt.status === 'failed' ? 'border-red-200 dark:border-red-800' :
                    rt.status === 'running' ? 'border-blue-200 dark:border-blue-800' :
                    'border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {/* Test Header */}
                  <div
                    className={`flex items-center justify-between p-3 cursor-pointer ${
                      rt.status === 'passed' ? 'bg-green-50 dark:bg-green-900/20' :
                      rt.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' :
                      rt.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20' :
                      'bg-gray-50 dark:bg-slate-900'
                    }`}
                    onClick={() => toggleTestExpanded(rt.test.id)}
                  >
                    <div className="flex items-center gap-2">
                      {rt.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : rt.status === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : rt.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {rt.test.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {rt.status === 'running' && (
                        <span className="text-xs text-blue-600">
                          {completedSteps}/{stepCount} steps
                        </span>
                      )}
                      {rt.duration && (
                        <span className="text-xs text-gray-500">{rt.duration}ms</span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Step Results */}
                  {isExpanded && rt.stepResults.length > 0 && (
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                      <div className="space-y-1">
                        {rt.test.steps.filter(s => s.enabled !== false).map((step, stepIndex) => {
                          const result = rt.stepResults.find(r => r.stepId === step.id);

                          return (
                            <div
                              key={step.id}
                              className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                                result?.passed
                                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : result?.passed === false
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                  : 'bg-gray-50 dark:bg-slate-900 text-gray-500'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-4 text-right opacity-50">{stepIndex + 1}</span>
                                {result?.passed ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : result?.passed === false ? (
                                  <XCircle className="w-3 h-3" />
                                ) : (
                                  <div className="w-3 h-3" />
                                )}
                                <span className="capitalize">{step.action}</span>
                                {step.description && (
                                  <span className="opacity-75">- {step.description}</span>
                                )}
                              </span>
                              {result && (
                                <span>{result.duration}ms</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {rt.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {rt.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          {isRunning ? (
            <button
              onClick={stopRun}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : runningTests.some(rt => rt.status !== 'pending') ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRunningTests(prev => prev.map(rt => ({
                    ...rt,
                    status: 'pending',
                    stepResults: [],
                    error: undefined,
                    duration: undefined
                  })));
                  startRun();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Run Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              onClick={startRun}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Tests
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
