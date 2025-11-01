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
type DensityMode = 'compact' | 'normal' | 'comfortable';

interface RowComparison {
  leftRow: any | null;
  rightRow: any | null;
  status: 'same' | 'different' | 'left-only' | 'right-only';
  differences: Set<string>;
  rowIndex: number;
}

interface ColumnStats {
  totalChanges: number;
  numericDelta?: number;
  percentChange?: number;
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
  const [density, setDensity] = useState<DensityMode>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Set<string>>(new Set());

  // Refs for synchronized scrolling
  const leftTableRef = useRef<HTMLDivElement>(null);
  const rightTableRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

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

  // Detect numeric columns
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

  // Advanced row matching function
  const matchRows = useMemo(() => {
    const results: RowComparison[] = [];
    const processedRightRows = new Set<number>();

    leftRows.forEach((leftRow, leftIdx) => {
      let matchFound = false;
      let bestMatch: { index: number; differences: Set<string> } | null = null;

      rightRows.forEach((rightRow, rightIndex) => {
        if (processedRightRows.has(rightIndex)) return;

        // Match by primary key if specified
        if (primaryKeyColumn && leftRow[primaryKeyColumn] !== undefined && rightRow[primaryKeyColumn] !== undefined) {
          if (leftRow[primaryKeyColumn] === rightRow[primaryKeyColumn]) {
            const differences = new Set<string>();
            allColumns.forEach(col => {
              if (JSON.stringify(leftRow[col]) !== JSON.stringify(rightRow[col])) {
                differences.add(col);
              }
            });

            results.push({
              leftRow,
              rightRow,
              status: differences.size === 0 ? 'same' : 'different',
              differences,
              rowIndex: leftIdx
            });
            processedRightRows.add(rightIndex);
            matchFound = true;
            return;
          }
        } else {
          // Fallback to value comparison
          const differences = new Set<string>();
          allColumns.forEach(col => {
            if (JSON.stringify(leftRow[col]) !== JSON.stringify(rightRow[col])) {
              differences.add(col);
            }
          });

          if (differences.size === 0) {
            results.push({
              leftRow,
              rightRow,
              status: 'same',
              differences,
              rowIndex: leftIdx
            });
            processedRightRows.add(rightIndex);
            matchFound = true;
            return;
          } else if (!bestMatch || differences.size < bestMatch.differences.size) {
            bestMatch = { index: rightIndex, differences };
          }
        }
      });

      if (!matchFound && bestMatch) {
        results.push({
          leftRow,
          rightRow: rightRows[bestMatch.index],
          status: 'different',
          differences: bestMatch.differences,
          rowIndex: leftIdx
        });
        processedRightRows.add(bestMatch.index);
        matchFound = true;
      }

      if (!matchFound) {
        results.push({
          leftRow,
          rightRow: null,
          status: 'left-only',
          differences: new Set(),
          rowIndex: leftIdx
        });
      }
    });

    // Add unmatched right rows
    rightRows.forEach((rightRow, index) => {
      if (!processedRightRows.has(index)) {
        results.push({
          leftRow: null,
          rightRow,
          status: 'right-only',
          differences: new Set(),
          rowIndex: results.length
        });
      }
    });

    return results;
  }, [leftRows, rightRows, allColumns, primaryKeyColumn]);

  // Apply filters and search
  const filteredComparison = useMemo(() => {
    let filtered = matchRows;

    // Apply difference filter
    if (showOnlyDifferences) {
      filtered = filtered.filter(c => c.status !== 'same');
    }

    // Apply column filters
    if (columnFilters.size > 0) {
      filtered = filtered.filter(comp => {
        return Array.from(columnFilters).some(col => comp.differences.has(col));
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(comp => {
        const searchLower = searchQuery.toLowerCase();
        return allColumns.some(col => {
          const leftVal = comp.leftRow?.[col];
          const rightVal = comp.rightRow?.[col];
          return (
            String(leftVal).toLowerCase().includes(searchLower) ||
            String(rightVal).toLowerCase().includes(searchLower)
          );
        });
      });
    }

    // Apply selected rows filter
    if (selectedRows.size > 0) {
      filtered = filtered.filter(comp => selectedRows.has(comp.rowIndex));
    }

    return filtered;
  }, [matchRows, showOnlyDifferences, searchQuery, allColumns, columnFilters, selectedRows]);

  // Statistics
  const stats = useMemo(() => {
    const same = matchRows.filter(c => c.status === 'same').length;
    const different = matchRows.filter(c => c.status === 'different').length;
    const leftOnly = matchRows.filter(c => c.status === 'left-only').length;
    const rightOnly = matchRows.filter(c => c.status === 'right-only').length;

    return { same, different, leftOnly, rightOnly, total: matchRows.length };
  }, [matchRows]);

  // Column statistics
  const columnStats = useMemo(() => {
    const stats: Record<string, ColumnStats> = {};

    allColumns.forEach(col => {
      let totalChanges = 0;
      let numericSum = 0;
      let numericCount = 0;

      matchRows.forEach(comp => {
        if (comp.differences.has(col)) {
          totalChanges++;

          if (numericColumns.has(col) && comp.leftRow && comp.rightRow) {
            const leftVal = comp.leftRow[col];
            const rightVal = comp.rightRow[col];
            if (typeof leftVal === 'number' && typeof rightVal === 'number') {
              numericSum += rightVal - leftVal;
              numericCount++;
            }
          }
        }
      });

      stats[col] = {
        totalChanges,
        ...(numericCount > 0 ? {
          numericDelta: numericSum / numericCount,
          percentChange: 0 // Calculate if needed
        } : {})
      };
    });

    return stats;
  }, [matchRows, allColumns, numericColumns]);

  // Differences for navigation
  const differences = useMemo(() => {
    return matchRows
      .map((comp, idx) => ({ comp, idx }))
      .filter(({ comp }) => comp.status !== 'same');
  }, [matchRows]);

  // Helper functions
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

  const getCellColor = (hasValue: boolean, isDifferent: boolean, isNumeric: boolean = false) => {
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

  const navigateToDifference = (direction: 'next' | 'prev' | 'first' | 'last') => {
    if (differences.length === 0) return;

    let newIndex = currentDiffIndex;
    switch (direction) {
      case 'next':
        newIndex = (currentDiffIndex + 1) % differences.length;
        break;
      case 'prev':
        newIndex = (currentDiffIndex - 1 + differences.length) % differences.length;
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = differences.length - 1;
        break;
    }

    setCurrentDiffIndex(newIndex);
    // Scroll to the difference
    // Implementation depends on table structure
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

  const toggleColumnFilter = (col: string) => {
    const newSet = new Set(columnFilters);
    if (newSet.has(col)) {
      newSet.delete(col);
    } else {
      newSet.add(col);
    }
    setColumnFilters(newSet);
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(rowIndex)) {
      newSet.delete(rowIndex);
    } else {
      newSet.add(rowIndex);
    }
    setSelectedRows(newSet);
  };

  const getDensityClass = () => {
    switch (density) {
      case 'compact': return 'px-2 py-1 text-xs';
      case 'comfortable': return 'px-4 py-3 text-sm';
      default: return 'px-3 py-2 text-sm';
    }
  };

  // Synchronized scrolling
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        navigateToDifference('next');
      } else if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        navigateToDifference('prev');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentDiffIndex, differences]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Compare Query Results</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comparing: <span className="font-medium text-blue-600">{leftLabel}</span> vs <span className="font-medium text-purple-600">{rightLabel}</span>
              <span className="ml-3 text-xs">
                ({visibleColumns.length}/{allColumns.length} columns, {filteredComparison.length}/{stats.total} rows)
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

        {/* Continue in next part... */}
      </div>
    </div>
  );
}
