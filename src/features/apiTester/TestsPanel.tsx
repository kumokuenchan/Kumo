import { useState } from 'react';
import { X, Play, Trash2, CheckCircle2, XCircle, Upload, Download } from 'lucide-react';
import { apiTesterStorage, type TestCase, type Assertion } from '../../services/apiTesterStorage';
import { apiTesterApi, type ApiRequest, type ApiResponse } from '../../api/apiTester';

interface TestsPanelProps {
  onClose: () => void;
  onLoadRequest: (request: ApiRequest) => void;
}

function getByPath(obj: any, path: string): any {
  if (!path) return undefined;
  const parts = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evaluateAssertions(res: ApiResponse, assertions: Assertion[]): Array<{ assertion: Assertion; passed: boolean; actual?: any; message?: string }> {
  const headersLc: Record<string, string> = {};
  Object.entries(res.headers || {}).forEach(([k, v]) => (headersLc[k.toLowerCase()] = String(v)));
  const safeBody = (() => {
    if (typeof res.data === 'string') {
      try { return JSON.parse(res.data); } catch { return res.data; }
    }
    return res.data;
  })();
  return assertions.map(a => {
    if (a.type === 'status') {
      const passed = a.op === 'equals' && res.status === a.value;
      return { assertion: a, passed, actual: res.status, message: passed ? undefined : `Expected ${a.value}, got ${res.status}` };
    }
    if (a.type === 'header') {
      const key = a.key.toLowerCase();
      const val = headersLc[key];
      let passed = false;
      if (a.op === 'equals') passed = val === a.value;
      if (a.op === 'contains') passed = val != null && val.includes(a.value);
      return { assertion: a, passed, actual: val, message: passed ? undefined : `Header ${a.key} was ${val}` };
    }
    if (a.type === 'json') {
      const val = getByPath(safeBody, a.path);
      let passed = false;
      if (a.op === 'exists') passed = val !== undefined;
      if (a.op === 'equals') {
        // Coerce expected when provided as string: try JSON.parse to match numbers/booleans/null/objects
        let expected: any = (a as any).value;
        if (typeof expected === 'string') {
          const s = expected.trim();
          try { expected = JSON.parse(s); } catch { expected = s; }
        }
        passed = JSON.stringify(val) === JSON.stringify(expected);
      }
      return { assertion: a, passed, actual: val, message: passed ? undefined : `JSON at ${a.path} was ${JSON.stringify(val)}` };
    }
    return { assertion: a, passed: false, message: 'Unknown assertion' };
  });
}

export default function TestsPanel({ onClose, onLoadRequest }: TestsPanelProps) {
  const [tests, setTests] = useState<TestCase[]>(apiTesterStorage.getTests());
  const [running, setRunning] = useState<string | null>(null);

  const refresh = () => setTests(apiTesterStorage.getTests());

  const runTest = async (test: TestCase) => {
    setRunning(test.id);
    try {
      const res = await apiTesterApi.executeRequest(test.request);
      const details = evaluateAssertions(res, test.assertions);
      const passed = details.every(d => d.passed);
      apiTesterStorage.updateTest(test.id, {
        lastResult: {
          passed,
          status: res.status,
          duration: res.duration,
          at: Date.now(),
          details,
        },
      });
      refresh();
    } catch (e) {
      console.error('Run test failed:', e);
    } finally {
      setRunning(null);
    }
  };

  const deleteTest = (id: string) => {
    apiTesterStorage.deleteTest(id);
    refresh();
  };

  return (
    <div className="absolute right-0 top-12 bottom-0 w-[28rem] bg-white dark:bg-slate-800 border-l border-gray-300 dark:border-slate-700 shadow-lg flex flex-col z-10">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Tests</div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {tests.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">No tests yet. Save a request as a test to get started.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {tests.map(test => (
              <div key={test.id} className="p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{test.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`${test.request.method} ${test.request.url}`}>
                      {test.request.method} {test.request.url}
                    </div>
                    {test.lastResult && (
                      <div className="mt-1 text-xs flex items-center gap-2">
                        {test.lastResult.passed ? (
                          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-300"><CheckCircle2 className="w-3 h-3" /> Passed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300"><XCircle className="w-3 h-3" /> Failed</span>
                        )}
                        <span className="text-gray-500 dark:text-gray-400">{test.lastResult.status} · {test.lastResult.duration}ms</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100">
                    <button
                      onClick={() => onLoadRequest(test.request)}
                      className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => runTest(test)}
                      disabled={running === test.id}
                      className="px-2 py-1 text-xs rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Run
                    </button>
                    <button
                      onClick={() => deleteTest(test.id)}
                      className="px-2 py-1 text-xs rounded text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {test.lastResult && (
                  <div className="mt-2 text-xs bg-gray-50 dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700 p-2">
                    {test.lastResult.details.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 py-0.5">
                        <span className={`mt-0.5 w-2 h-2 rounded-full ${d.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1 text-gray-800 dark:text-gray-200">
                          <span className="font-medium">{d.assertion.type}</span>
                          <span className="ml-1 text-gray-600 dark:text-gray-400">{d.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400">
        Tip: Save tests from the Request Editor, then run them here or group-run from the Api Tester.
      </div>
    </div>
  );
}
