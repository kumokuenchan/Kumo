import { useState, useMemo, useRef, useEffect } from 'react';
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

type DensityMode = 'compact' | 'normal' | 'comfortable';

export default function QueryResultsCompare({
  leftResult,
  rightResult,
  leftLabel,
  rightLabel,
  onClose
}: QueryResultsCompareProps) {
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [density, setDensity] = useState<DensityMode>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [currentDiffIndex, setCurrentDiffIndex] = useState<number>(0);
  const [columnFilters, setColumnFilters] = useState<Map<string, Set<string>>>(new Map());
  const [showFilterDropdown, setShowFilterDropdown] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showSummaryReport, setShowSummaryReport] = useState(false);

  // Refs for synchronized scrolling
  const leftTableRef = useRef<HTMLDivElement>(null);
  const rightTableRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  // Extract rows and columns
  const leftRows = leftResult.rows || [];
  const rightRows = rightResult.rows || [];
  const leftColumns = leftResult.fields?.map(f => f.name) || [];
  const rightColumns = rightResult.fields?.map(f => f.name) || [];

  // Get all unique columns
  const allColumns = useMemo(() => {
    const cols = new Set([...leftColumns, ...rightColumns]);
    const colArray = Array.from(cols);

    // Initialize selected columns if empty
    if (selectedColumns.size === 0) {
      setSelectedColumns(new Set(colArray));
    }

    return colArray;
  }, [leftColumns, rightColumns]);

  // Visible columns based on selection
  const visibleColumns = useMemo(() => {
    return allColumns.filter(col => selectedColumns.has(col));
  }, [allColumns, selectedColumns]);

  // Detect numeric columns for smart formatting
  const numericColumns = useMemo(() => {
    const cols = new Set<string>();
    if (leftRows.length > 0) {
      Object.keys(leftRows[0]).forEach(key => {
        if (typeof leftRows[0][key] === 'number') {
          cols.add(key);
        }
      });
    }
    return cols;
  }, [leftRows]);

  // Compare rows
  const comparison = useMemo(() => {
    const results: RowComparison[] = [];
    const processedRightRows = new Set<number>();

    // If primary key is set, use it for matching
    const usePrimaryKey = primaryKeyColumn && allColumns.includes(primaryKeyColumn);

    // First pass: match left rows with right rows
    leftRows.forEach((leftRow) => {
      let matchFound = false;

      rightRows.forEach((rightRow, rightIndex) => {
        if (processedRightRows.has(rightIndex)) return;

        // If using primary key, check if primary keys match first
        if (usePrimaryKey) {
          const leftPK = leftRow[primaryKeyColumn];
          const rightPK = rightRow[primaryKeyColumn];

          if (JSON.stringify(leftPK) !== JSON.stringify(rightPK)) {
            return; // Skip this row, primary keys don't match
          }
        }

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
        } else if (!matchFound || usePrimaryKey) {
          // Partial match (same primary key but different values)
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
  }, [leftRows, rightRows, allColumns, primaryKeyColumn]);

  const filteredComparison = useMemo(() => {
    let filtered = comparison;

    // Apply difference filter
    if (showOnlyDifferences) {
      filtered = filtered.filter(c => c.status !== 'same');
    }

    // Apply column filters
    if (columnFilters.size > 0) {
      filtered = filtered.filter(comp => {
        return Array.from(columnFilters.entries()).every(([col, allowedValues]) => {
          // If empty set, filter out everything (show no rows for this column)
          if (allowedValues.size === 0) return false;

          const leftVal = String(comp.leftRow?.[col] ?? 'NULL');
          const rightVal = String(comp.rightRow?.[col] ?? 'NULL');

          // Row passes if either left or right value is in allowed values
          return allowedValues.has(leftVal) || allowedValues.has(rightVal);
        });
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(comp => {
        return visibleColumns.some(col => {
          const leftVal = comp.leftRow?.[col];
          const rightVal = comp.rightRow?.[col];
          return (
            String(leftVal).toLowerCase().includes(searchLower) ||
            String(rightVal).toLowerCase().includes(searchLower)
          );
        });
      });
    }

    return filtered;
  }, [comparison, showOnlyDifferences, searchQuery, visibleColumns, columnFilters]);

  // Get unique values for each column (for filters)
  const columnUniqueValues = useMemo(() => {
    const valuesMap = new Map<string, Set<string>>();

    allColumns.forEach(col => {
      const values = new Set<string>();
      comparison.forEach(comp => {
        if (comp.leftRow) values.add(String(comp.leftRow[col] ?? 'NULL'));
        if (comp.rightRow) values.add(String(comp.rightRow[col] ?? 'NULL'));
      });
      valuesMap.set(col, values);
    });

    return valuesMap;
  }, [comparison, allColumns]);

  // Get indices of rows with differences
  const differenceIndices = useMemo(() => {
    return filteredComparison
      .map((comp, idx) => ({ comp, idx }))
      .filter(({ comp }) => comp.status !== 'same')
      .map(({ idx }) => idx);
  }, [filteredComparison]);

  const stats = useMemo(() => {
    return {
      same: comparison.filter(c => c.status === 'same').length,
      different: comparison.filter(c => c.status === 'different').length,
      leftOnly: comparison.filter(c => c.status === 'left-only').length,
      rightOnly: comparison.filter(c => c.status === 'right-only').length,
      total: comparison.length
    };
  }, [comparison]);

  // Detailed column-level statistics
  const columnStats = useMemo(() => {
    const colStats: Map<string, { changed: number; leftNull: number; rightNull: number; valueChanges: number }> = new Map();

    allColumns.forEach(col => {
      let changed = 0;
      let leftNull = 0;
      let rightNull = 0;
      let valueChanges = 0;

      comparison.forEach(comp => {
        if (comp.differences.has(col)) {
          changed++;
          if (comp.leftRow && comp.rightRow) {
            valueChanges++;
          }
        }
        if (comp.leftRow && (comp.leftRow[col] === null || comp.leftRow[col] === undefined)) {
          leftNull++;
        }
        if (comp.rightRow && (comp.rightRow[col] === null || comp.rightRow[col] === undefined)) {
          rightNull++;
        }
      });

      colStats.set(col, { changed, leftNull, rightNull, valueChanges });
    });

    return colStats;
  }, [comparison, allColumns]);

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

  const formatCellValue = (value: any, col: string, otherValue?: any) => {
    if (value === null || value === undefined) return 'NULL';

    const strValue = String(value);

    // Show delta for numeric differences
    if (numericColumns.has(col) && otherValue !== undefined && typeof value === 'number' && typeof otherValue === 'number') {
      const delta = value - otherValue;
      if (delta !== 0) {
        const sign = delta > 0 ? '+' : '';
        const percent = otherValue !== 0 ? ((delta / otherValue) * 100).toFixed(1) : '∞';
        return `${strValue} (${sign}${delta}, ${sign}${percent}%)`;
      }
    }

    return strValue;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(text);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const exportToCSV = () => {
    const headers = ['Status', ...visibleColumns];
    const rows = filteredComparison.flatMap(comp => {
      const result: string[][] = [];

      if (comp.leftRow) {
        const row = [
          'LEFT',
          ...visibleColumns.map(col => String(comp.leftRow[col] ?? ''))
        ];
        result.push(row);
      }

      if (comp.rightRow) {
        const row = [
          'RIGHT',
          ...visibleColumns.map(col => String(comp.rightRow[col] ?? ''))
        ];
        result.push(row);
      }

      return result;
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${leftLabel}_vs_${rightLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = filteredComparison.map(comp => ({
      status: comp.status,
      left: comp.leftRow,
      right: comp.rightRow,
      differences: Array.from(comp.differences)
    }));

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${leftLabel}_vs_${rightLabel}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleColumnSelection = (col: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(col)) {
      newSet.delete(col);
    } else {
      newSet.add(col);
    }
    setSelectedColumns(newSet);
  };

  const toggleAllColumns = (select: boolean) => {
    if (select) {
      setSelectedColumns(new Set(allColumns));
    } else {
      setSelectedColumns(new Set());
    }
  };

  const getDensityClass = () => {
    switch (density) {
      case 'compact': return 'px-2 py-1 text-xs';
      case 'comfortable': return 'px-4 py-3 text-sm';
      default: return 'px-3 py-2 text-sm';
    }
  };

  // Navigation functions
  const navigateToNextDifference = () => {
    if (differenceIndices.length === 0) return;
    const currentPos = differenceIndices.indexOf(currentDiffIndex);
    const nextPos = (currentPos + 1) % differenceIndices.length;
    const nextIndex = differenceIndices[nextPos];
    setCurrentDiffIndex(nextIndex);
    scrollToRow(nextIndex);
  };

  const navigateToPreviousDifference = () => {
    if (differenceIndices.length === 0) return;
    const currentPos = differenceIndices.indexOf(currentDiffIndex);
    const prevPos = currentPos <= 0 ? differenceIndices.length - 1 : currentPos - 1;
    const prevIndex = differenceIndices[prevPos];
    setCurrentDiffIndex(prevIndex);
    scrollToRow(prevIndex);
  };

  const scrollToRow = (rowIndex: number) => {
    const rowElement = rowRefs.current.get(rowIndex);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Column filter functions
  const toggleColumnFilterValue = (column: string, value: string) => {
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      const currentFilter = newFilters.get(column);

      // If no filter exists, it means all values are selected
      if (!currentFilter) {
        // User is unchecking a value, so create filter with all values EXCEPT this one
        const allValues = columnUniqueValues.get(column);
        if (allValues) {
          const newValues = new Set(allValues);
          newValues.delete(value);
          newFilters.set(column, newValues);
        }
      } else {
        // Filter exists, toggle the value
        const newValues = new Set(currentFilter);
        if (newValues.has(value)) {
          newValues.delete(value);
        } else {
          newValues.add(value);
        }

        // If all values are now selected, remove the filter (same as no filter)
        const allValues = columnUniqueValues.get(column);
        if (allValues && newValues.size === allValues.size) {
          newFilters.delete(column);
        } else {
          newFilters.set(column, newValues);
        }
      }

      return newFilters;
    });
  };

  const clearColumnFilter = (column: string) => {
    // Clear all means "uncheck everything" = show no rows
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.set(column, new Set()); // Empty set = filter out everything
      return newFilters;
    });
  };

  const selectAllColumnValues = (column: string) => {
    // Select all means "show everything" so we remove the filter
    setColumnFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.delete(column); // Remove filter = show all
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters(new Map());
  };

  // Row selection functions
  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredComparison.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredComparison.map((_, idx) => idx)));
    }
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  // Synchronized scrolling effect
  useEffect(() => {
    if (mode !== 'side-by-side') return;

    const leftTable = leftTableRef.current;
    const rightTable = rightTableRef.current;

    if (!leftTable || !rightTable) return;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (isScrollingRef.current) return;

      isScrollingRef.current = true;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;

      // Reset flag after a short delay
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 50);
    };

    const handleLeftScroll = () => syncScroll(leftTable, rightTable);
    const handleRightScroll = () => syncScroll(rightTable, leftTable);

    leftTable.addEventListener('scroll', handleLeftScroll);
    rightTable.addEventListener('scroll', handleRightScroll);

    return () => {
      leftTable.removeEventListener('scroll', handleLeftScroll);
      rightTable.removeEventListener('scroll', handleRightScroll);
    };
  }, [mode]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        navigateToNextDifference();
      } else if (e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        navigateToPreviousDifference();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [differenceIndices, currentDiffIndex]);

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
                ({visibleColumns.length}/{allColumns.length} columns, {filteredComparison.length}/{stats.total} rows)
                {primaryKeyColumn && <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">Matching by: {primaryKeyColumn}</span>}
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

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search in results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Column Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Columns ({visibleColumns.length}/{allColumns.length})
            </button>

            {showColumnSelector && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => toggleAllColumns(true)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleAllColumns(false)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
                <div className="p-2">
                  {allColumns.map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns.has(col)}
                        onChange={() => toggleColumnSelection(col)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{col}</span>
                      {!leftColumns.includes(col) && <span className="text-xs text-blue-500">(R)</span>}
                      {!rightColumns.includes(col) && <span className="text-xs text-purple-500">(L)</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Key Selector */}
          <div className="relative">
            <select
              value={primaryKeyColumn}
              onChange={(e) => setPrimaryKeyColumn(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              title="Select primary key for row matching"
            >
              <option value="">Auto-match rows</option>
              {allColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Density */}
          <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 text-xs rounded ${density === 'compact' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
              title="Compact"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setDensity('normal')}
              className={`px-2 py-1 text-xs rounded ${density === 'normal' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
              title="Normal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </button>
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-1 text-xs rounded ${density === 'comfortable' ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
              title="Comfortable"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>

            {showSettings && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    exportToJSON();
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Export as JSON
                </button>
              </div>
            )}
          </div>

          {/* Navigate Differences */}
          {differenceIndices.length > 0 && (
            <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-3 ml-1">
              <button
                onClick={navigateToPreviousDifference}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Previous difference (Shift+↑)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {differenceIndices.indexOf(currentDiffIndex) + 1} / {differenceIndices.length}
              </span>
              <button
                onClick={navigateToNextDifference}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Next difference (Shift+↓)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Clear Filters */}
          {columnFilters.size > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              title="Clear all column filters"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters ({columnFilters.size})
            </button>
          )}

          {/* Selected Rows Info */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-3 ml-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          )}

          {/* Summary Report Toggle */}
          <button
            onClick={() => setShowSummaryReport(!showSummaryReport)}
            className={`px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 ${showSummaryReport ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-gray-700'}`}
            title="Toggle detailed summary report"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Summary Report
          </button>
        </div>

        {/* Copy notification */}
        {copiedCell && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied to clipboard!
          </div>
        )}

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

        {/* Detailed Summary Report */}
        {showSummaryReport && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Detailed Comparison Summary</h3>

            {/* Overview */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Total Rows</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Match Rate</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.total > 0 ? ((stats.same / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Change Rate</div>
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.total > 0 ? ((stats.different / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Total Columns</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{allColumns.length}</div>
                </div>
              </div>
            </div>

            {/* Column-Level Changes */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Column-Level Changes</h4>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700 dark:text-gray-300">Column</th>
                      <th className="text-right p-2 font-medium text-gray-700 dark:text-gray-300">Changes</th>
                      <th className="text-right p-2 font-medium text-gray-700 dark:text-gray-300">Change %</th>
                      <th className="text-right p-2 font-medium text-gray-700 dark:text-gray-300">Nulls (L/R)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(columnStats.entries())
                      .sort(([, a], [, b]) => b.changed - a.changed)
                      .map(([col, colStat]) => (
                        <tr key={col} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 text-gray-900 dark:text-gray-100 font-medium">{col}</td>
                          <td className="p-2 text-right">
                            <span className={colStat.changed > 0 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                              {colStat.changed}
                            </span>
                          </td>
                          <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                            {stats.total > 0 ? ((colStat.changed / stats.total) * 100).toFixed(1) : 0}%
                          </td>
                          <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                            {colStat.leftNull} / {colStat.rightNull}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Changed Columns */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Most Changed Columns</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(columnStats.entries())
                  .sort(([, a], [, b]) => b.changed - a.changed)
                  .slice(0, 5)
                  .map(([col, colStat]) => (
                    <div key={col} className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-xs font-medium">
                      {col}: {colStat.changed} changes
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="flex gap-2">
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
          {mode === 'side-by-side' && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Synchronized scrolling enabled</span>
            </div>
          )}
        </div>

        {/* Comparison View */}
        <div className="flex-1 overflow-auto p-4">
          {mode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side */}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">{leftLabel}</h3>
                <div ref={leftTableRef} className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto overflow-y-auto max-h-[calc(90vh-400px)]">
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 ${getDensityClass()} w-10`}>
                          <input
                            type="checkbox"
                            checked={selectedRows.size === filteredComparison.length && filteredComparison.length > 0}
                            onChange={toggleAllRows}
                            className="rounded"
                            title="Select all rows"
                          />
                        </th>
                        {visibleColumns.map(col => (
                          <th key={col} className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px] ${getDensityClass()} relative`}>
                            <div className="flex items-center gap-1">
                              <span>{col}</span>
                              {!leftColumns.includes(col) && <span className="text-red-500 ml-1">*</span>}
                              <button
                                onClick={() => setShowFilterDropdown(showFilterDropdown === col ? null : col)}
                                className={`p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded ${columnFilters.has(col) ? 'text-blue-600 dark:text-blue-400' : ''}`}
                                title="Filter column"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                              </button>
                            </div>
                            {showFilterDropdown === col && (
                              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold">Filter by {col}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        selectAllColumnValues(col);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Select All
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        clearColumnFilter(col);
                                      }}
                                      className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                      Clear All
                                    </button>
                                  </div>
                                </div>
                                <div className="p-2 max-h-64 overflow-y-auto">
                                  {Array.from(columnUniqueValues.get(col) || []).sort().map(value => {
                                    const filter = columnFilters.get(col);
                                    // If no filter exists, all are checked (default state)
                                    // If filter exists, check if value is in the set
                                    const isChecked = !filter ? true : filter.has(value);
                                    return (
                                      <label key={value} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleColumnFilterValue(col, value)}
                                          className="rounded"
                                        />
                                        <span className="text-xs text-gray-900 dark:text-gray-100 truncate">{value}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparison.map((comp, idx) => (
                        <tr
                          key={idx}
                          ref={(el) => el && rowRefs.current.set(idx, el)}
                          className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)} ${idx === currentDiffIndex && comp.status !== 'same' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${selectedRows.has(idx) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                        >
                          <td className={`${getDensityClass()} w-10`}>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(idx)}
                              onChange={() => toggleRowSelection(idx)}
                              className="rounded"
                            />
                          </td>
                          {visibleColumns.map(col => (
                            <td
                              key={col}
                              className={`whitespace-nowrap min-w-[120px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${getDensityClass()} ${getCellColor(comp.leftRow !== null, comp.differences.has(col))}`}
                              onClick={() => comp.leftRow && copyToClipboard(String(comp.leftRow[col] ?? 'NULL'))}
                              title="Click to copy"
                            >
                              {comp.leftRow ? formatCellValue(comp.leftRow[col], col, comp.rightRow?.[col]) : '—'}
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
                <div ref={rightTableRef} className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto overflow-y-auto max-h-[calc(90vh-400px)]">
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 ${getDensityClass()} w-10`}></th>
                        {visibleColumns.map(col => (
                          <th key={col} className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px] ${getDensityClass()}`}>
                            <div className="flex items-center gap-1">
                              <span>{col}</span>
                              {!rightColumns.includes(col) && <span className="text-red-500 ml-1">*</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComparison.map((comp, idx) => (
                        <tr
                          key={idx}
                          className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)} ${idx === currentDiffIndex && comp.status !== 'same' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${selectedRows.has(idx) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                        >
                          <td className={`${getDensityClass()} w-10`}></td>
                          {visibleColumns.map(col => (
                            <td
                              key={col}
                              className={`whitespace-nowrap min-w-[120px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${getDensityClass()} ${getCellColor(comp.rightRow !== null, comp.differences.has(col))}`}
                              onClick={() => comp.rightRow && copyToClipboard(String(comp.rightRow[col] ?? 'NULL'))}
                              title="Click to copy"
                            >
                              {comp.rightRow ? formatCellValue(comp.rightRow[col], col, comp.leftRow?.[col]) : '—'}
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
                      <th className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 ${getDensityClass()} w-10`}>
                        <input
                          type="checkbox"
                          checked={selectedRows.size === filteredComparison.length && filteredComparison.length > 0}
                          onChange={toggleAllRows}
                          className="rounded"
                          title="Select all rows"
                        />
                      </th>
                      <th className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 sticky left-10 bg-gray-100 dark:bg-gray-800 z-10 min-w-[80px] ${getDensityClass()}`}>Status</th>
                      {visibleColumns.map(col => (
                        <th key={col} className={`text-left text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap min-w-[120px] ${getDensityClass()} relative`}>
                          <div className="flex items-center gap-1">
                            <span>{col}</span>
                            <button
                              onClick={() => setShowFilterDropdown(showFilterDropdown === col ? null : col)}
                              className={`p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded ${columnFilters.has(col) ? 'text-blue-600 dark:text-blue-400' : ''}`}
                              title="Filter column"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                          </div>
                          {showFilterDropdown === col && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-semibold">Filter by {col}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      selectAllColumnValues(col);
                                    }}
                                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Select All
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      clearColumnFilter(col);
                                    }}
                                    className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Clear All
                                  </button>
                                </div>
                              </div>
                              <div className="p-2 max-h-64 overflow-y-auto">
                                {Array.from(columnUniqueValues.get(col) || []).sort().map(value => {
                                  const filter = columnFilters.get(col);
                                  // If no filter exists, all are checked (default state)
                                  // If filter exists, check if value is in the set
                                  const isChecked = !filter ? true : filter.has(value);
                                  return (
                                    <label key={value} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleColumnFilterValue(col, value)}
                                        className="rounded"
                                      />
                                      <span className="text-xs text-gray-900 dark:text-gray-100 truncate">{value}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComparison.map((comp, idx) => (
                      <>
                        {comp.leftRow && (
                          <tr
                            key={`${idx}-left`}
                            ref={(el) => el && rowRefs.current.set(idx, el)}
                            className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)} ${idx === currentDiffIndex && comp.status !== 'same' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${selectedRows.has(idx) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                          >
                            <td className={`sticky left-0 bg-inherit z-10 ${getDensityClass()} w-10`}>
                              <input
                                type="checkbox"
                                checked={selectedRows.has(idx)}
                                onChange={() => toggleRowSelection(idx)}
                                className="rounded"
                              />
                            </td>
                            <td className={`text-xs sticky left-10 bg-inherit z-10 ${getDensityClass()}`}>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded whitespace-nowrap">LEFT</span>
                            </td>
                            {visibleColumns.map(col => (
                              <td
                                key={col}
                                className={`whitespace-nowrap min-w-[120px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${getDensityClass()} ${getCellColor(true, comp.differences.has(col))}`}
                                onClick={() => copyToClipboard(String(comp.leftRow[col] ?? 'NULL'))}
                                title="Click to copy"
                              >
                                {formatCellValue(comp.leftRow[col], col, comp.rightRow?.[col])}
                              </td>
                            ))}
                          </tr>
                        )}
                        {comp.rightRow && (
                          <tr
                            key={`${idx}-right`}
                            className={`${getStatusColor(comp.status)} ${getStatusBorder(comp.status)} ${idx === currentDiffIndex && comp.status !== 'same' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${selectedRows.has(idx) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                          >
                            <td className={`sticky left-0 bg-inherit z-10 ${getDensityClass()} w-10`}></td>
                            <td className={`text-xs sticky left-10 bg-inherit z-10 ${getDensityClass()}`}>
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded whitespace-nowrap">RIGHT</span>
                            </td>
                            {visibleColumns.map(col => (
                              <td
                                key={col}
                                className={`whitespace-nowrap min-w-[120px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${getDensityClass()} ${getCellColor(true, comp.differences.has(col))}`}
                                onClick={() => copyToClipboard(String(comp.rightRow[col] ?? 'NULL'))}
                                title="Click to copy"
                              >
                                {formatCellValue(comp.rightRow[col], col, comp.leftRow?.[col])}
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
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
            <div>
              <span className="font-semibold">Color Legend:</span>
              <span className="ml-4">🟢 Green = Identical rows</span>
              <span className="ml-4">🟡 Yellow = Different values</span>
              <span className="ml-4">🔵 Blue = Only in left</span>
              <span className="ml-4">🟣 Purple = Only in right</span>
              <span className="ml-4">🔴 Red highlight = Different cell</span>
            </div>
            <div>
              <span className="font-semibold">Features:</span>
              <span className="ml-4">🔍 Use search to find specific data</span>
              <span className="ml-4">🔽 Click filter icon in headers to filter by column values</span>
              <span className="ml-4">👆 Click any cell to copy</span>
              <span className="ml-4">📊 Numeric columns show delta & %</span>
              <span className="ml-4">📥 Export to CSV/JSON</span>
              {differenceIndices.length > 0 && <span className="ml-4">⬆️⬇️ Navigate differences (Shift+↑/↓)</span>}
              {mode === 'side-by-side' && <span className="ml-4">🔄 Synchronized scrolling</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
