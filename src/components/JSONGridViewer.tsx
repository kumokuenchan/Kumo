import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Upload, 
  Copy, 
  RefreshCw, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  FolderOpen,
  Folder
} from 'lucide-react';

interface GridCell {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  path: string;
  isNested?: boolean;
  nestedData?: any[];
  nestedColumns?: ColumnConfig[];
}

interface GridRow {
  [key: string]: GridCell;
}

interface NestedPath {
  path: string;
  key: string;
  type: 'object' | 'array';
  parentData: any;
}

interface ColumnConfig {
  key: string;
  title: string;
  width: number;
  type: string;
  visible: boolean;
}

const JSONGridViewer: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [maxDepth, setMaxDepth] = useState(10); // Prevent infinite recursion

  const sampleJSON = `[
  {
    "employee": {
      "profile": {
        "details": {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "age": 30,
          "active": true,
          "department": "Engineering",
          "salary": 75000,
          "skills": ["JavaScript", "React", "Node.js"],
          "address": {
            "street": "123 Main St",
            "city": "San Francisco",
            "zip": "94102"
          }
        }
      }
    }
  },
  {
    "employee": {
      "profile": {
        "details": {
          "id": 2,
          "name": "Jane Smith",
          "email": "jane@example.com",
          "age": 28,
          "active": true,
          "department": "Design",
          "salary": 65000,
          "skills": ["UI/UX", "Figma", "Sketch"],
          "address": {
            "street": "456 Oak Ave",
            "city": "San Francisco",
            "zip": "94103"
          }
        }
      }
    }
  },
  {
    "employee": {
      "profile": {
        "details": {
          "id": 3,
          "name": "Bob Johnson",
          "email": "bob@example.com",
          "age": 35,
          "active": false,
          "department": "Marketing",
          "salary": 60000,
          "skills": ["SEO", "Content", "Analytics"],
          "address": {
            "street": "789 Pine Rd",
            "city": "San Francisco",
            "zip": "94104"
          }
        }
      }
    }
  }
]`;

  useEffect(() => {
    // Load sample data on mount
    setJsonInput(sampleJSON);
    parseJSON(sampleJSON);
  }, []);

  const parseJSON = useCallback((jsonString: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const parsed = JSON.parse(jsonString);
      
      let data: any[] = [];
      if (Array.isArray(parsed)) {
        data = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // If it's a single object, wrap it in an array
        data = [parsed];
      } else {
        throw new Error('Input must be a JSON object or array');
      }

      setParsedData(data);
      generateColumns(data);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      setParsedData([]);
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateColumns = (data: any[]) => {
    if (data.length === 0) return;

    const allKeys = new Set<string>();
    const columnTypes: Record<string, string> = {};
    const columnWidths: Record<string, number> = {};

    // Collect all keys, determine types, and calculate optimal widths
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        allKeys.add(key);
        const value = item[key];
        
        if (!columnTypes[key]) {
          columnTypes[key] = getValueType(value);
        }
        
        // Calculate width based on content
        const valueStr = formatCellValue(value, columnTypes[key]);
        const keyWidth = key.length * 8 + 20; // Key width with padding
        const valueWidth = Math.min(valueStr.length * 8 + 20, 300); // Value width with max limit
        columnWidths[key] = Math.max(columnWidths[key] || 0, keyWidth + valueWidth + 40); // Total width with gap
      });
    });

    const newColumns: ColumnConfig[] = Array.from(allKeys).map(key => ({
      key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      width: Math.min(Math.max(80, columnWidths[key] || 120), 400), // Min 80px, max 400px
      type: columnTypes[key] || 'string',
      visible: true
    }));

    setColumns(newColumns);
  };

  const getValueType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
  };

  const generateNestedColumns = (data: any[], parentPath: string = ''): ColumnConfig[] => {
    if (data.length === 0) return [];

    const allKeys = new Set<string>();
    const columnTypes: Record<string, string> = {};

    data.forEach(item => {
      Object.keys(item).forEach(key => {
        allKeys.add(key);
        const value = item[key];
        if (!columnTypes[key]) {
          columnTypes[key] = getValueType(value);
        }
      });
    });

    return Array.from(allKeys).map(key => ({
      key: parentPath ? `${parentPath}.${key}` : key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      width: Math.max(120, key.length * 10),
      type: columnTypes[key] || 'string',
      visible: true
    }));
  };

  const isNestedType = (type: string): boolean => {
    return type === 'object' || type === 'array';
  };

  

  const expandNestedRow = (rowIndex: number, columnKey: string, nestedPath: string = '') => {
    const row = paginatedData[rowIndex];
    const value = row[columnKey];
    
    // Toggle expansion for this specific column with nested path
    const expandedKey = nestedPath ? `${rowIndex}-${columnKey}-${nestedPath}` : `${rowIndex}-${columnKey}`;
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(expandedKey)) {
      newExpanded.delete(expandedKey);
    } else {
      newExpanded.add(expandedKey);
    }
    
    setExpandedRows(newExpanded);
  };

  const NestedJSONViewer: React.FC<{
    data: any;
    depth: number;
    rowIndex: number;
    columnKey: string;
    parentPath: string;
  }> = ({ data, depth, rowIndex, columnKey, parentPath }) => {
    if (!data || typeof data !== 'object' || depth >= maxDepth) {
      return <span className="text-gray-600 dark:text-gray-400">{String(data)}</span>;
    }

    const entries = Array.isArray(data) 
      ? data.map((item, index) => [index, item]) 
      : Object.entries(data);

    const toggleNestedExpansion = (key: string, value: any) => {
      const nestedPath = `${parentPath}.${key}`;
      const expandedKey = `${rowIndex}-${columnKey}-${nestedPath}`;
      
      expandNestedRow(rowIndex, columnKey, nestedPath);
    };

    const isExpanded = (key: string) => {
      const nestedPath = `${parentPath}.${key}`;
      const expandedKey = `${rowIndex}-${columnKey}-${nestedPath}`;
      return expandedRows.has(expandedKey);
    };

    const getValueColor = (value: any) => {
      if (typeof value === 'string') return 'text-green-600 dark:text-green-400';
      if (typeof value === 'number') return 'text-blue-600 dark:text-blue-400';
      if (typeof value === 'boolean') return 'text-red-600 dark:text-red-400';
      return 'text-gray-600 dark:text-gray-400';
    };

    return (
      <div className={`${depth > 0 ? 'ml-4' : ''}`}>
        {entries.map(([key, value]) => {
          const isNested = value && typeof value === 'object';
          const expanded = isExpanded(String(key));
          const displayKey = Array.isArray(data) ? `[${key}]` : key;
          
          return (
            <div key={key} className="mb-1">
              {isNested ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded mb-2">
                  <div 
                    onClick={() => toggleNestedExpansion(String(key), value)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t"
                  >
                    <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                      [{expanded ? '−' : '+'}]
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                      {displayKey}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {Array.isArray(value) ? `[${value.length}]` : '{}'}
                    </span>
                  </div>
                  
                  {expanded && (
                    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-600">
                      <NestedJSONViewer
                        data={value}
                        depth={depth + 1}
                        rowIndex={rowIndex}
                        columnKey={columnKey}
                        parentPath={`${parentPath}.${key}`}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                    {displayKey}:
                  </span>
                  <span className={`text-sm ${getValueColor(value)}`}>
                    {formatCellValue(value, getValueType(value))}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const formatCellValue = (value: any, type: string): string => {
    if (value === null) return 'null';
    if (type === 'object' || type === 'array') return JSON.stringify(value);
    return String(value);
  };

  const getCellClass = (type: string): string => {
    switch (type) {
      case 'number': return 'text-right text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-center';
      case 'null': return 'text-gray-400 italic';
      default: return 'text-left';
    }
  };

  const filteredData = parsedData.filter(row => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return columns.some(col => {
      const value = row[col.key];
      if (value === null) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleCellEdit = (rowIndex: number, columnKey: string, value: string) => {
    const actualRowIndex = startIndex + rowIndex;
    const updatedData = [...parsedData];
    
    try {
      // Try to parse the value back to original type
      const originalValue = updatedData[actualRowIndex][columnKey];
      let parsedValue: any = value;
      
      if (originalValue !== null) {
        const originalType = getValueType(originalValue);
        switch (originalType) {
          case 'number':
            parsedValue = Number(value);
            break;
          case 'boolean':
            parsedValue = value.toLowerCase() === 'true';
            break;
          case 'object':
          case 'array':
            parsedValue = JSON.parse(value);
            break;
        }
      }
      
      updatedData[actualRowIndex][columnKey] = parsedValue;
      setParsedData(updatedData);
      setJsonInput(JSON.stringify(updatedData, null, 2));
    } catch (err) {
      setError('Failed to update cell value');
    }
  };

  const addNewRow = () => {
    const newRow: any = {};
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : col.type === 'boolean' ? false : '';
    });
    
    const updatedData = [...parsedData, newRow];
    setParsedData(updatedData);
    setJsonInput(JSON.stringify(updatedData, null, 2));
    setCurrentPage(Math.ceil(updatedData.length / rowsPerPage));
  };

  const deleteRow = (rowIndex: number) => {
    const actualRowIndex = startIndex + rowIndex;
    const updatedData = parsedData.filter((_, index) => index !== actualRowIndex);
    setParsedData(updatedData);
    setJsonInput(JSON.stringify(updatedData, null, 2));
    
    // Adjust current page if necessary
    if (paginatedData.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(parsedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `json-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setJsonInput(content);
        parseJSON(content);
      } catch (err) {
        setError('Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonInput);
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#161b22]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">JSON Grid Viewer</h2>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={exportToJSON}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <label className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* JSON Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            JSON Input
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              parseJSON(e.target.value);
            }}
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your JSON here..."
          />
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
        </div>
      </div>

      

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {parsedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">No data to display</div>
              <div className="text-sm">Paste valid JSON in the input area above</div>
            </div>
          </div>
        ) : (
          <table className="border-separate border-spacing-0" style={{ width: 'auto', minWidth: '100%' }}>
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-700 border-r border-gray-200 dark:border-gray-700 w-8">
                  #
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-700 border-r border-gray-200 dark:border-gray-700"
                    style={{ width: col.width }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="drag-handle cursor-move">☰</span>
                      <span className="title">{col.title}</span>
                      {isNestedType(col.type) && (
                        <Folder className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1">
                        <span className="pi pi-ellipsis-v text-gray-400 cursor-pointer">⋮</span>
                        <span>{startIndex + rowIndex + 1}</span>
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 ${getCellClass(col.type)}`}
                      >
                        {isNestedType(col.type) ? (
                          <div
                            onClick={() => expandNestedRow(rowIndex, col.key)}
                            className="plus-minus cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded"
                          >
                            [{expandedRows.has(`${rowIndex}-${col.key}`) ? '−' : '+'}] {col.key} {Array.isArray(row[col.key]) ? '[]' : '{}'}
                          </div>
                        ) : (
                          <span>{formatCellValue(row[col.key], col.type)}</span>
                        )}
                        
                        {/* Nested content */}
                        {isNestedType(col.type) && expandedRows.has(`${rowIndex}-${col.key}`) && row[col.key] && (
                          <div className="mt-2">
                            <NestedJSONViewer
                              data={row[col.key]}
                              depth={0}
                              rowIndex={rowIndex}
                              columnKey={col.key}
                              parentPath=""
                            />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JSONGridViewer;