import { useState } from 'react';
import type { ExplainAnalysis, ExplainRow } from '../../api/queryAnalyzer';

interface ExplainVisualizerProps {
  analysis: ExplainAnalysis;
  onClose: () => void;
}

export default function ExplainVisualizer({ analysis, onClose }: ExplainVisualizerProps) {
  const [selectedTab, setSelectedTab] = useState<'plan' | 'suggestions' | 'warnings'>('plan');

  const getAccessTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

    const colors: Record<string, string> = {
      'system': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'const': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'eq_ref': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'ref': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
      'range': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'index': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'ALL': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getWarningIcon = (type: 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return '⛔';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Query Performance Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Execution plan analyzed in {analysis.executionTime}ms
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cost Summary */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Estimated Rows</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {typeof analysis.totalCost.estimatedRows === 'number'
                  ? analysis.totalCost.estimatedRows.toLocaleString()
                  : String(analysis.totalCost.estimatedRows || 0)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Tables Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {String(analysis.totalCost.tablesUsed || 0)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Indexes Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {String(analysis.totalCost.indexesUsed || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setSelectedTab('plan')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedTab === 'plan'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Execution Plan
          </button>
          <button
            onClick={() => setSelectedTab('suggestions')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedTab === 'suggestions'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Suggestions ({(analysis.suggestions || []).length})
          </button>
          <button
            onClick={() => setSelectedTab('warnings')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedTab === 'warnings'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Warnings ({(analysis.warnings || []).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Execution Plan Tab */}
          {selectedTab === 'plan' && (
            <div className="space-y-4">
              {(analysis.executionPlan || []).map((row, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-400 dark:text-gray-600">
                        {row.id}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {row.table || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {row.select_type}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getAccessTypeColor(row.type)}`}>
                      {row.type || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Rows</div>
                      <div className="font-mono font-semibold text-gray-900 dark:text-white">
                        {row.rows != null && typeof row.rows === 'number'
                          ? row.rows.toLocaleString()
                          : row.rows != null
                          ? String(row.rows)
                          : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Key</div>
                      <div className="font-mono font-semibold text-gray-900 dark:text-white">
                        {row.key || 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Possible Keys</div>
                      <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {row.possible_keys || 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Filtered</div>
                      <div className="font-mono font-semibold text-gray-900 dark:text-white">
                        {row.filtered ? `${row.filtered}%` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {row.Extra && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Extra</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {row.Extra}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions Tab */}
          {selectedTab === 'suggestions' && (
            <div className="space-y-3">
              {(analysis.suggestions || []).length > 0 ? (
                (analysis.suggestions || []).map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                  >
                    <span className="text-blue-600 dark:text-blue-400 text-xl">💡</span>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">{suggestion}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No suggestions available
                </div>
              )}
            </div>
          )}

          {/* Warnings Tab */}
          {selectedTab === 'warnings' && (
            <div className="space-y-3">
              {(analysis.warnings || []).length > 0 ? (
                (analysis.warnings || []).map((warning, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 p-4 rounded-lg border ${
                      warning.type === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : warning.type === 'warning'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <span className="text-xl">{getWarningIcon(warning.type)}</span>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">{warning.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No warnings or notices
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
