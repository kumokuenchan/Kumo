import { useState, useEffect, useMemo } from 'react';
import {
  X, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle,
  Calendar, BarChart3, AlertTriangle, RefreshCw
} from 'lucide-react';
import { playwrightStorage, type TestResult } from '../../services/playwrightStorage';

interface TestHistoryProps {
  testId?: string; // Optional - show all if not provided
  onClose: () => void;
}

export default function TestHistory({ testId, onClose }: TestHistoryProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  // Load results
  useEffect(() => {
    const allResults = playwrightStorage.getResults();
    const filtered = testId
      ? allResults.filter(r => r.testId === testId)
      : allResults;
    setResults(filtered);
  }, [testId]);

  // Filter by time range
  const filteredResults = useMemo(() => {
    const now = Date.now();
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    return results.filter(r => now - r.runAt < ranges[timeRange]);
  }, [results, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    if (filteredResults.length === 0) {
      return { total: 0, passed: 0, failed: 0, passRate: 0, avgDuration: 0, trend: 0 };
    }

    const passed = filteredResults.filter(r => r.passed).length;
    const failed = filteredResults.length - passed;
    const avgDuration = Math.round(
      filteredResults.reduce((sum, r) => sum + r.duration, 0) / filteredResults.length
    );

    // Calculate trend (compare first half vs second half)
    const mid = Math.floor(filteredResults.length / 2);
    const firstHalf = filteredResults.slice(0, mid);
    const secondHalf = filteredResults.slice(mid);

    const firstPassRate = firstHalf.length > 0
      ? firstHalf.filter(r => r.passed).length / firstHalf.length
      : 0;
    const secondPassRate = secondHalf.length > 0
      ? secondHalf.filter(r => r.passed).length / secondHalf.length
      : 0;
    const trend = (secondPassRate - firstPassRate) * 100;

    return {
      total: filteredResults.length,
      passed,
      failed,
      passRate: Math.round((passed / filteredResults.length) * 100),
      avgDuration,
      trend
    };
  }, [filteredResults]);

  // Group by day for chart
  const dailyData = useMemo(() => {
    const days = new Map<string, { passed: number; failed: number; duration: number; count: number }>();

    filteredResults.forEach(r => {
      const date = new Date(r.runAt).toLocaleDateString();
      const existing = days.get(date) || { passed: 0, failed: 0, duration: 0, count: 0 };
      days.set(date, {
        passed: existing.passed + (r.passed ? 1 : 0),
        failed: existing.failed + (r.passed ? 0 : 1),
        duration: existing.duration + r.duration,
        count: existing.count + 1
      });
    });

    return Array.from(days.entries())
      .map(([date, data]) => ({
        date,
        ...data,
        avgDuration: Math.round(data.duration / data.count)
      }))
      .reverse()
      .slice(-14); // Last 14 days
  }, [filteredResults]);

  // Find flaky tests
  const flakyTests = useMemo(() => {
    const testStats = new Map<string, { passed: number; failed: number; name: string }>();

    filteredResults.forEach(r => {
      const test = playwrightStorage.getTest(r.testId);
      const existing = testStats.get(r.testId) || { passed: 0, failed: 0, name: test?.name || 'Unknown' };
      testStats.set(r.testId, {
        ...existing,
        passed: existing.passed + (r.passed ? 1 : 0),
        failed: existing.failed + (r.passed ? 0 : 1)
      });
    });

    return Array.from(testStats.entries())
      .filter(([_, data]) => data.passed > 0 && data.failed > 0)
      .map(([id, data]) => ({
        id,
        name: data.name,
        flakyRate: Math.round((Math.min(data.passed, data.failed) / (data.passed + data.failed)) * 100)
      }))
      .sort((a, b) => b.flakyRate - a.flakyRate)
      .slice(0, 5);
  }, [filteredResults]);

  const maxCount = Math.max(...dailyData.map(d => d.passed + d.failed), 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test History & Trends
              </h2>
              <p className="text-xs text-gray-500">
                {filteredResults.length} test runs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Time Range */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              {(['7d', '30d', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded ${
                    timeRange === range
                      ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {range === 'all' ? 'All' : range}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.passRate}%
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                Pass Rate
                {stats.trend !== 0 && (
                  <span className={stats.trend > 0 ? 'text-green-500' : 'text-red-500'}>
                    {stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
              <div className="text-xs text-gray-500">Passed</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgDuration}ms
              </div>
              <div className="text-xs text-gray-500">Avg Duration</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Daily Results
            </h3>
            {dailyData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No data for selected time range
              </div>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {dailyData.map((day, i) => {
                  const total = day.passed + day.failed;
                  const height = (total / maxCount) * 100;
                  const passedHeight = (day.passed / total) * height;
                  const failedHeight = (day.failed / total) * height;

                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end group relative"
                    >
                      <div
                        className="bg-red-400 rounded-t"
                        style={{ height: `${failedHeight}%` }}
                      />
                      <div
                        className="bg-green-400 rounded-b"
                        style={{ height: `${passedHeight}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                        {day.date}: {day.passed}✓ {day.failed}✗
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flaky Tests */}
          {flakyTests.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Flaky Tests Detected
              </h3>
              <div className="space-y-2">
                {flakyTests.map(test => (
                  <div key={test.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{test.name}</span>
                    <span className="text-xs text-yellow-600">{test.flakyRate}% flaky</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Runs */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Recent Runs
            </h3>
            <div className="space-y-2">
              {filteredResults.slice(0, 20).map(result => {
                const test = playwrightStorage.getTest(result.testId);
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {test?.name || 'Unknown Test'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(result.runAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {result.duration}ms
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {result.browser}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
