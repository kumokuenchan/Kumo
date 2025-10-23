import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTables } from '../../hooks/useSchema';
import * as smartJoinApi from '../../api/smartJoin';
import type { TableLink, SmartJoinFilter } from '../../api/smartJoin';

interface SmartJoinViewProps {
  connectionId: string;
  database: string;
}

export default function SmartJoinView({ connectionId, database }: SmartJoinViewProps) {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [autoDetectedLinks, setAutoDetectedLinks] = useState<TableLink[]>([]);
  const [manualLinks, setManualLinks] = useState<TableLink[]>([]);
  const [filters, setFilters] = useState<SmartJoinFilter[]>([]);
  const [limit, setLimit] = useState<number>(100);
  const [generatedSQL, setGeneratedSQL] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [showManualLinkForm, setShowManualLinkForm] = useState(false);

  // Fetch available tables
  const { data: tables = [] } = useTables(connectionId, database);

  // Combine auto-detected and manual links
  const links = [...autoDetectedLinks, ...manualLinks];

  // Auto-detect relationships when tables are selected
  const detectMutation = useMutation({
    mutationFn: async (tablesToDetect: string[]) => {
      return await smartJoinApi.detectRelationships(connectionId, database, tablesToDetect);
    },
    onSuccess: (data) => {
      setAutoDetectedLinks(data.links);
    },
  });

  // Generate SQL preview
  const generateSQLMutation = useMutation({
    mutationFn: async () => {
      return await smartJoinApi.generateSmartJoinSQL(connectionId, {
        database,
        tables: selectedTables,
        links,
        filters,
        limit,
      });
    },
    onSuccess: (data) => {
      setGeneratedSQL(data.sql);
    },
  });

  // Execute query
  const executeMutation = useMutation({
    mutationFn: async () => {
      return await smartJoinApi.executeSmartJoin(connectionId, {
        database,
        tables: selectedTables,
        links,
        filters,
        limit,
      });
    },
    onSuccess: (data) => {
      setResults(data.rows);
      setTotalRows(data.totalRows);
      setGeneratedSQL(data.sql);
    },
  });

  // Auto-detect relationships when tables change
  useEffect(() => {
    if (selectedTables.length >= 2) {
      detectMutation.mutate(selectedTables);
    } else {
      setAutoDetectedLinks([]);
    }
  }, [selectedTables]);

  // Auto-generate SQL when state changes
  useEffect(() => {
    if (selectedTables.length > 0 && links.length > 0) {
      const timer = setTimeout(() => {
        generateSQLMutation.mutate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedTables, links, filters, limit]);

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter((t) => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const addManualLink = (link: TableLink) => {
    setManualLinks([...manualLinks, link]);
    setShowManualLinkForm(false);
  };

  const removeLink = (index: number, isManual: boolean) => {
    if (isManual) {
      setManualLinks(manualLinks.filter((_, i) => i !== index));
    } else {
      // Don't allow removing auto-detected links, but allow overriding with manual
      alert('Auto-detected links cannot be removed. You can add manual links to override.');
    }
  };

  const updateLinkType = (index: number, isManual: boolean, newType: 'INNER' | 'LEFT' | 'RIGHT') => {
    if (isManual) {
      const newLinks = [...manualLinks];
      newLinks[index] = { ...newLinks[index], type: newType };
      setManualLinks(newLinks);
    } else {
      const newLinks = [...autoDetectedLinks];
      newLinks[index] = { ...newLinks[index], type: newType };
      setAutoDetectedLinks(newLinks);
    }
  };

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        column: selectedTables[0] ? `${selectedTables[0]}.id` : '',
        operator: '=',
        value: '',
      },
    ]);
  };

  const updateFilter = (index: number, updates: Partial<SmartJoinFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h2 className="text-lg font-semibold text-gray-800">Smart Join View</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => executeMutation.mutate()}
            disabled={selectedTables.length === 0 || links.length === 0 || executeMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executeMutation.isPending ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel: Configuration */}
        <div className="w-96 bg-white border-r flex flex-col">
          {/* Table Selection */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Tables</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {tables.map((table) => (
                <label key={table.name} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.name)}
                    onChange={() => toggleTable(table.name)}
                    className="mr-2"
                  />
                  <span className="text-sm">{table.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Detected Relationships */}
          {links.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Detected Relationships ({links.length})
              </h3>
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={i} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="font-mono text-blue-900">
                      {link.from} → {link.to}
                    </div>
                    <div className="text-blue-600 mt-1">
                      {link.type || 'INNER'} JOIN
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-4 border-b flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
              <button
                onClick={addFilter}
                disabled={selectedTables.length === 0}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                + Add Filter
              </button>
            </div>
            <div className="space-y-2">
              {filters.map((filter, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={filter.column}
                    onChange={(e) => updateFilter(i, { column: e.target.value })}
                    placeholder="table.column"
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  />
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(i, { operator: e.target.value })}
                    className="px-2 py-1 text-xs border rounded"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">{'>'}</option>
                    <option value="<">{'<'}</option>
                    <option value=">=">{'>='}</option>
                    <option value="<=">{'<='}</option>
                    <option value="LIKE">LIKE</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  />
                  <button
                    onClick={() => removeFilter(i)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div className="p-4 border-t">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Limit:</span>
              <input
                type="number"
                min="1"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                className="flex-1 px-2 py-1 border rounded"
              />
            </label>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* SQL Preview */}
          {generatedSQL && (
            <div className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
              <pre>{generatedSQL}</pre>
            </div>
          )}

          {/* Results Table */}
          <div className="flex-1 overflow-auto p-4">
            {results.length > 0 ? (
              <div>
                <div className="mb-2 text-sm text-gray-600">
                  Showing {results.length} of {totalRows} rows
                </div>
                <div className="overflow-auto border rounded">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(results[0] || {}).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {value === null ? (
                                <span className="text-gray-400 italic">NULL</span>
                              ) : typeof value === 'object' ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {selectedTables.length === 0 ? (
                  <p>Select at least 2 tables to start</p>
                ) : links.length === 0 ? (
                  <p>No relationships detected between selected tables</p>
                ) : (
                  <p>Click "Execute Query" to see results</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
