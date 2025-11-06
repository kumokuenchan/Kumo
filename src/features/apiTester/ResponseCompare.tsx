import { useState } from 'react';
import { X, ArrowLeftRight, Copy, Check } from 'lucide-react';
import type { ApiResponse } from '../../api/apiTester';

interface ResponseCompareProps {
  response1: ApiResponse;
  response2: ApiResponse;
  onClose: () => void;
}

export default function ResponseCompare({ response1, response2, onClose }: ResponseCompareProps) {
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatJson = (data: any): string => {
    try {
      if (typeof data === 'string') {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const json1 = formatJson(response1.data);
  const json2 = formatJson(response2.data);

  // Simple line-by-line diff
  const lines1 = json1.split('\n');
  const lines2 = json2.split('\n');
  const maxLines = Math.max(lines1.length, lines2.length);

  const diffs: Array<{ line1: string; line2: string; isDifferent: boolean; lineNum: number }> = [];

  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || '';
    const line2 = lines2[i] || '';
    const isDifferent = line1 !== line2;

    if (!showOnlyDifferences || isDifferent) {
      diffs.push({ line1, line2, isDifferent, lineNum: i + 1 });
    }
  }

  const differencesCount = diffs.filter(d => d.isDifferent).length;

  const copyDiffSummary = () => {
    const summary = `Response Comparison Summary
===============================

Response 1:
  Status: ${response1.status} ${response1.statusText}
  Time: ${response1.duration}ms
  Size: ${formatBytes(response1.size)}

Response 2:
  Status: ${response2.status} ${response2.statusText}
  Time: ${response2.duration}ms
  Size: ${response2.size}

Differences: ${differencesCount} lines differ

Body Comparison:
${diffs.filter(d => d.isDifferent).map(d =>
  `Line ${d.lineNum}:
  < ${d.line1}
  > ${d.line2}`
).join('\n\n')}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Response Comparison
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {differencesCount === 0 ? 'Responses are identical' : `${differencesCount} line${differencesCount !== 1 ? 's' : ''} differ`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyDiffSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Summary
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats Comparison */}
        <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Response 1</div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-2 py-1 rounded font-medium ${
                response1.status >= 200 && response1.status < 300
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {response1.status} {response1.statusText}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{response1.duration}ms</span>
              <span className="text-gray-700 dark:text-gray-300">{formatBytes(response1.size)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Response 2</div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-2 py-1 rounded font-medium ${
                response2.status >= 200 && response2.status < 300
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {response2.status} {response2.statusText}
              </span>
              <span className="text-gray-700 dark:text-gray-300">{response2.duration}ms</span>
              <span className="text-gray-700 dark:text-gray-300">{formatBytes(response2.size)}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showDiff"
              checked={showOnlyDifferences}
              onChange={(e) => setShowOnlyDifferences(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600"
            />
            <label htmlFor="showDiff" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Show only differences
            </label>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Displaying {diffs.length} of {maxLines} lines
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-slate-700">
            {/* Response 1 */}
            <div className="overflow-auto">
              <div className="sticky top-0 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 border-b border-blue-200 dark:border-blue-800 z-10">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Response 1</div>
              </div>
              <div className="font-mono text-xs">
                {diffs.map((diff, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      diff.isDifferent
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : ''
                    }`}
                  >
                    <div className="w-12 flex-shrink-0 text-gray-500 dark:text-gray-400 text-right pr-2 py-1 border-r border-gray-200 dark:border-slate-700 select-none">
                      {diff.lineNum}
                    </div>
                    <div className={`flex-1 px-3 py-1 whitespace-pre ${
                      diff.isDifferent
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {diff.line1 || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response 2 */}
            <div className="overflow-auto">
              <div className="sticky top-0 bg-green-100 dark:bg-green-900/30 px-3 py-2 border-b border-green-200 dark:border-green-800 z-10">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">Response 2</div>
              </div>
              <div className="font-mono text-xs">
                {diffs.map((diff, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      diff.isDifferent
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : ''
                    }`}
                  >
                    <div className="w-12 flex-shrink-0 text-gray-500 dark:text-gray-400 text-right pr-2 py-1 border-r border-gray-200 dark:border-slate-700 select-none">
                      {diff.lineNum}
                    </div>
                    <div className={`flex-1 px-3 py-1 whitespace-pre ${
                      diff.isDifferent
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {diff.line2 || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
