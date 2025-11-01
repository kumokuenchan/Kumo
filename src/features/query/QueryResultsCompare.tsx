import { useState, useMemo } from 'react';
import { QueryResult } from '../../api/query';

interface QueryResultsCompareProps {
  leftResult: QueryResult;
  rightResult: QueryResult;
  leftLabel: string;
  rightLabel: string;
  onClose: () => void;
}

type ComparisonMode = 'side-by-side' | 'unified';

interface RowComparison {
  leftRow: any | null;
  rightRow: any | null;
  status: 'same' | 'different' | 'left-only' | 'right-only';
  differences: Set<string>;
}

export default function QueryResultsCompare({
  leftResult,
  rightResult,
  leftLabel,
  rightLabel,
  onClose
}: QueryResultsCompareProps) {
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  // Extract rows and columns
  const leftRows = leftResult.rows || [];
  const rightRows = rightResult.rows || [];
  const leftColumns = leftResult.fields?.map(f => f.name) || [];
  const rightColumns = rightResult.fields?.map(f => f.name) || [];

  // Get all unique columns
  const allColumns = useMemo(() => {
    const cols = new Set([...leftColumns, ...rightColumns]);
    return Array.from(cols);
  }, [leftColumns, rightColumns]);

  // Compare rows
  const comparison = useMemo(() => {
    const results: RowComparison[] = [];
    const processedRightRows = new Set<number>();

    // First pass: match left rows with right rows
    leftRows.forEach((leftRow) => {
      let matchFound = false;

      rightRows.forEach((rightRow, rightIndex) => {
        if (processedRightRows.has(rightIndex)) return;

        // Check if rows are identical based on all columns
        const differences = new Set<string>();
        let isMatch = true;

        allColumns.forEach(col => {
          const leftVal = leftRow[col];
          const rightVal = rightRow[col];

          if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) {
            differences.add(col);
            isMatch = false;
          }
        });

        if (differences.size === 0) {
          // Exact match
          results.push({
            leftRow,
            rightRow,
            status: 'same',
            differences: new Set()
          });
          processedRightRows.add(rightIndex);
          matchFound = true;
          return;
        } else if (!matchFound) {
          // Partial match (same primary key but different values)
          // For simplicity, we'll treat first matching attempt as the match
          results.push({
            leftRow,
            rightRow,
            status: 'different',
            differences
          });
          processedRightRows.add(rightIndex);
          matchFound = true;
          return;
        }
      });

      if (!matchFound) {
        // No match found - left only
        results.push({
          leftRow,
          rightRow: null,
          status: 'left-only',
          differences: new Set()
        });
      }
    });

    // Second pass: add unmatched right rows
    rightRows.forEach((rightRow, index) => {
      if (!processedRightRows.has(index)) {
        results.push({
          leftRow: null,
          rightRow,
          status: 'right-only',
          differences: new Set()
        });
      }
    });

    return results;
  }, [leftRows, rightRows, allColumns]);

  const filteredComparison = useMemo(() => {
    if (!showOnlyDifferences) return comparison;
    return comparison.filter(c => c.status !== 'same');
  }, [comparison, showOnlyDifferences]);

  const stats = useMemo(() => {
    return {
      same: comparison.filter(c => c.status === 'same').length,
      different: comparison.filter(c => c.status === 'different').length,
      leftOnly: comparison.filter(c => c.status === 'left-only').length,
      rightOnly: comparison.filter(c => c.status === 'right-only').length,
      total: comparison.length
    };
  }, [comparison]);

  const getStatusColor = (status: RowComparison['status']) => {
    switch (status) {
      case 'same': return 'bg-green-50 dark:bg-green-900/20';
      case 'different': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'left-only': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'right-only': return 'bg-purple-50 dark:bg-purple-900/20';
      default: return '';
    }
  };

  const getStatusBorder = (status: RowComparison['status']) => {
    switch (status) {
      case 'same': return 'border-l-4 border-green-500';
      case 'different': return 'border-l-4 border-yellow-500';
      case 'left-only': return 'border-l-4 border-blue-500';
      case 'right-only': return 'border-l-4 border-purple-500';
      default: return '';
    }
  };

  const getCellColor = (hasValue: boolean, isDifferent: boolean) => {
    if (!hasValue) return 'bg-gray-100 dark:bg-gray-800 text-gray-400 italic';
    if (isDifferent) return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 font-semibold';
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Compare Query Results</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comparing: <span className="font-medium text-blue-600">{leftLabel}</span> vs <span className="font-medium text-purple-600">{rightLabel}</span>
              <span className="ml-3 text-xs">
                ({allColumns.length} column{allColumns.length !== 1 ? 's' : ''}, {stats.total} row{stats.total !== 1 ? 's' : ''})
                {allColumns.length > 5 && <span className="ml-2 text-yellow-600 dark:text-yellow-400">← Scroll horizontally to see all columns</span>}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Same: <span className="font-semibold">{stats.same}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Different: <span className="font-semibold">{stats.different}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Left Only: <span className="font-semibold">{stats.leftOnly}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Right Only: <span className="font-semibold">{stats.rightOnly}</span></span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyDifferences}
                  onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">Show only differences</span>
              </label>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => setMode('side-by-side')}
            className={`px-3 py-1.5 rounded text-sm ${
              mode === 'side-by-side'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setMode('unified')}
            className={`px-3 py-1.5 rounded text-sm ${
              mode === 'unified'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Unified
          </button>
        </div>

        {/* Comparison View */}
        <div className="flex-1 overflow-auto p-4">
          {mode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">{leftLabel}</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto">
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        {allColumns.map(col => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px]">
                            {col}
                            {!leftColumns.includes(col) && <span className="text-red-500 ml-1">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparison.map((comp, idx) => (
                        <tr key={idx} className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)}`}>
                          {allColumns.map(col => (
                            <td key={col} className={`px-3 py-2 whitespace-nowrap min-w-[120px] ${getCellColor(comp.leftRow !== null, comp.differences.has(col))}`}>
                              {comp.leftRow ? String(comp.leftRow[col] ?? 'NULL') : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side */}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">{rightLabel}</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto">
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        {allColumns.map(col => (
                          <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px]">
                            {col}
                            {!rightColumns.includes(col) && <span className="text-red-500 ml-1">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparison.map((comp, idx) => (
                        <tr key={idx} className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)}`}>
                          {allColumns.map(col => (
                            <td key={col} className={`px-3 py-2 whitespace-nowrap min-w-[120px] ${getCellColor(comp.rightRow !== null, comp.differences.has(col))}`}>
                              {comp.rightRow ? String(comp.rightRow[col] ?? 'NULL') : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 min-w-[80px]">Status</th>
                      {allColumns.map(col => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComparison.map((comp, idx) => (
                      <>
                        {comp.leftRow && (
                          <tr key={`${idx}-left`} className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)}`}>
                            <td className="px-3 py-2 text-xs sticky left-0 bg-inherit z-10">
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded whitespace-nowrap">LEFT</span>
                            </td>
                            {allColumns.map(col => (
                              <td key={col} className={`px-3 py-2 whitespace-nowrap min-w-[120px] ${getCellColor(true, comp.differences.has(col))}`}>
                                {String(comp.leftRow[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        )}
                        {comp.rightRow && (
                          <tr key={`${idx}-right`} className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)}`}>
                            <td className="px-3 py-2 text-xs sticky left-0 bg-inherit z-10">
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded whitespace-nowrap">RIGHT</span>
                            </td>
                            {allColumns.map(col => (
                              <td key={col} className={`px-3 py-2 whitespace-nowrap min-w-[120px] ${getCellColor(true, comp.differences.has(col))}`}>
                                {String(comp.rightRow[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredComparison.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No differences found</p>
              <p className="text-sm mt-1">All results are identical</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Legend:</span>
            <span className="ml-4">Green = Identical rows</span>
            <span className="ml-4">Yellow = Different values</span>
            <span className="ml-4">Blue = Only in left</span>
            <span className="ml-4">Purple = Only in right</span>
            <span className="ml-4">Red highlight = Different cell value</span>
            <span className="ml-4">* = Column not in this result set</span>
          </p>
        </div>
      </div>
    </div>
  );
}
