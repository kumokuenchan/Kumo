import { useState } from 'react';
import { X, Download, Copy, Github, Terminal, FileCode, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { apiTesterStorage, type TestCase, type TestSuite } from '../../services/apiTesterStorage';
import {
  generateGitHubActionsWorkflow,
  generateShellScript,
  generateNodeScript,
  type TestEnvironment
} from './utils/cicdGenerator';

interface CICDExportPanelProps {
  onClose: () => void;
}

type ExportFormat = 'shell' | 'node' | 'github';

export default function CICDExportPanel({ onClose }: CICDExportPanelProps) {
  const [tests] = useState<TestCase[]>(apiTesterStorage.getTests());
  const [suites] = useState<TestSuite[]>(apiTesterStorage.getSuites());

  // Selection
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set(tests.map(t => t.id)));
  const [selectionMode, setSelectionMode] = useState<'all' | 'suite' | 'custom'>('all');
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');

  // Export options
  const [format, setFormat] = useState<ExportFormat>('shell');
  const [environments, setEnvironments] = useState<TestEnvironment[]>([
    { name: 'production', baseUrl: '', variables: {} }
  ]);
  const [schedule, setSchedule] = useState('');
  const [copied, setCopied] = useState(false);

  // Get tests to export
  const getTestsToExport = (): TestCase[] => {
    if (selectionMode === 'all') return tests;
    if (selectionMode === 'suite' && selectedSuiteId) {
      return apiTesterStorage.getTestsBySuite(selectedSuiteId);
    }
    return tests.filter(t => selectedTests.has(t.id));
  };

  const testsToExport = getTestsToExport();

  // Generate script
  const generateScript = (): string => {
    const baseEnv = environments[0] || { name: 'default', baseUrl: '', variables: {} };

    switch (format) {
      case 'shell':
        return generateShellScript(testsToExport, {
          baseUrl: baseEnv.baseUrl,
          variables: baseEnv.variables
        });
      case 'node':
        return generateNodeScript(testsToExport, {
          baseUrl: baseEnv.baseUrl,
          variables: baseEnv.variables
        });
      case 'github':
        return generateGitHubActionsWorkflow(testsToExport, {
          name: 'API Tests',
          schedule: schedule || undefined,
          environments: environments.length > 1 ? environments : undefined
        });
      default:
        return '';
    }
  };

  const script = generateScript();

  // Download script
  const downloadScript = () => {
    const extensions: Record<ExportFormat, string> = {
      shell: 'sh',
      node: 'js',
      github: 'yml'
    };

    const filenames: Record<ExportFormat, string> = {
      shell: 'api-tests',
      node: 'test-script',
      github: 'api-tests'
    };

    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenames[format]}.${extensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle test selection
  const toggleTest = (testId: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
    setSelectionMode('custom');
  };

  // Add environment
  const addEnvironment = () => {
    setEnvironments(prev => [...prev, {
      name: `env-${prev.length + 1}`,
      baseUrl: '',
      variables: {}
    }]);
  };

  // Remove environment
  const removeEnvironment = (index: number) => {
    setEnvironments(prev => prev.filter((_, i) => i !== index));
  };

  // Update environment
  const updateEnvironment = (index: number, updates: Partial<TestEnvironment>) => {
    setEnvironments(prev => prev.map((env, i) =>
      i === index ? { ...env, ...updates } : env
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-5xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">CI/CD Export</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Export tests for automation pipelines
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

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Configuration */}
          <div className="w-80 border-r border-gray-200 dark:border-slate-700 overflow-auto p-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setFormat('shell')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    format === 'shell'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  Shell Script (.sh)
                </button>
                <button
                  onClick={() => setFormat('node')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    format === 'node'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                  Node.js Script (.js)
                </button>
                <button
                  onClick={() => setFormat('github')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    format === 'github'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Github className="w-4 h-4" />
                  GitHub Actions (.yml)
                </button>
              </div>
            </div>

            {/* Test Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tests to Export ({testsToExport.length})
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectionMode('all');
                    setSelectedTests(new Set(tests.map(t => t.id)));
                  }}
                  className={`w-full px-3 py-1.5 text-sm rounded-lg ${
                    selectionMode === 'all'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  All Tests ({tests.length})
                </button>
                {suites.length > 0 && (
                  <select
                    value={selectionMode === 'suite' ? selectedSuiteId : ''}
                    onChange={(e) => {
                      setSelectionMode('suite');
                      setSelectedSuiteId(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                  >
                    <option value="">Select Suite...</option>
                    {suites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Individual test selection */}
              <div className="mt-2 max-h-32 overflow-auto space-y-1">
                {tests.map(test => (
                  <label key={test.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="rounded"
                    />
                    <span className="truncate">{test.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Environments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Environments
                </label>
                <button
                  onClick={addEnvironment}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3">
                {environments.map((env, index) => (
                  <div key={index} className="p-2 bg-gray-50 dark:bg-slate-900 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={env.name}
                        onChange={(e) => updateEnvironment(index, { name: e.target.value })}
                        placeholder="Name"
                        className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded"
                      />
                      {environments.length > 1 && (
                        <button
                          onClick={() => removeEnvironment(index)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={env.baseUrl}
                      onChange={(e) => updateEnvironment(index, { baseUrl: e.target.value })}
                      placeholder="Base URL (e.g., https://api.example.com)"
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule (GitHub Actions only) */}
            {format === 'github' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule (Cron)
                </label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="0 0 * * * (daily at midnight)"
                  className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for manual trigger only
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-slate-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                    copied
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={downloadScript}
                  className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {script}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
