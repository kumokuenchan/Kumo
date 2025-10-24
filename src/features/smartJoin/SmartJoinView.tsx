import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTables, useColumns } from '../../hooks/useSchema';
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
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [editingIsManual, setEditingIsManual] = useState<boolean>(false);

  // Form state for adding/editing links
  const [linkForm, setLinkForm] = useState({
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
    type: 'INNER' as 'INNER' | 'LEFT' | 'RIGHT',
  });

  // Fetch available tables
  const { data: tables = [] } = useTables(connectionId, database);

  // Fetch columns for tables in the form
  const { data: fromColumns = [] } = useColumns(
    connectionId,
    database,
    linkForm.fromTable || null
  );
  const { data: toColumns = [] } = useColumns(
    connectionId,
    database,
    linkForm.toTable || null
  );

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
    const totalLinks = autoDetectedLinks.length + manualLinks.length;
    if (selectedTables.length > 0 && totalLinks > 0) {
      const timer = setTimeout(() => {
        generateSQLMutation.mutate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedTables, autoDetectedLinks, manualLinks, filters, limit]);

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter((t) => t !== tableName));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const openAddLinkForm = () => {
    setLinkForm({
      fromTable: selectedTables[0] || '',
      fromColumn: '',
      toTable: selectedTables[1] || '',
      toColumn: '',
      type: 'INNER',
    });
    setEditingLinkIndex(null);
    setShowManualLinkForm(true);
  };

  const openEditLinkForm = (index: number, isManual: boolean) => {
    const linkToEdit = isManual ? manualLinks[index] : autoDetectedLinks[index];
    const [fromTable, fromColumn] = linkToEdit.from.split('.');
    const [toTable, toColumn] = linkToEdit.to.split('.');

    setLinkForm({
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      type: linkToEdit.type || 'INNER',
    });
    setEditingLinkIndex(index);
    setEditingIsManual(isManual);
    setShowManualLinkForm(true);
  };

  const saveLinkForm = () => {
    if (!linkForm.fromTable || !linkForm.fromColumn || !linkForm.toTable || !linkForm.toColumn) {
      alert('Please fill in all fields');
      return;
    }

    const newLink: TableLink = {
      from: `${linkForm.fromTable}.${linkForm.fromColumn}`,
      to: `${linkForm.toTable}.${linkForm.toColumn}`,
      type: linkForm.type,
    };

    if (editingLinkIndex !== null) {
      // Editing existing link
      if (editingIsManual) {
        const newLinks = [...manualLinks];
        newLinks[editingLinkIndex] = newLink;
        setManualLinks(newLinks);
      } else {
        // Convert auto-detected to manual when editing
        const newLinks = [...manualLinks, newLink];
        setManualLinks(newLinks);
        // Remove from auto-detected
        setAutoDetectedLinks(autoDetectedLinks.filter((_, i) => i !== editingLinkIndex));
      }
    } else {
      // Adding new link
      setManualLinks([...manualLinks, newLink]);
    }

    setShowManualLinkForm(false);
    setEditingLinkIndex(null);
  };

  const cancelLinkForm = () => {
    setShowManualLinkForm(false);
    setEditingLinkIndex(null);
  };

  const removeLink = (index: number, isManual: boolean) => {
    if (isManual) {
      setManualLinks(manualLinks.filter((_, i) => i !== index));
    } else {
      setAutoDetectedLinks(autoDetectedLinks.filter((_, i) => i !== index));
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

          {/* Relationships Section */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Relationships ({links.length})
              </h3>
              <button
                onClick={openAddLinkForm}
                disabled={selectedTables.length < 2}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                title={selectedTables.length < 2 ? "Select at least 2 tables" : "Add custom relationship"}
              >
                + Add Custom
              </button>
            </div>

            {/* Auto-detected Links */}
            {autoDetectedLinks.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Auto-detected</div>
                <div className="space-y-2">
                  {autoDetectedLinks.map((link, i) => (
                    <div key={`auto-${i}`} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-mono text-blue-900 mb-1">
                            {link.from} → {link.to}
                          </div>
                          <div className="text-blue-600 text-xs">
                            {link.type || 'INNER'} JOIN
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => openEditLinkForm(i, false)}
                            className="px-1.5 py-0.5 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit relationship"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => removeLink(i, false)}
                            className="px-1.5 py-0.5 text-red-600 hover:bg-red-100 rounded"
                            title="Remove relationship"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Links */}
            {manualLinks.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Custom</div>
                <div className="space-y-2">
                  {manualLinks.map((link, i) => (
                    <div key={`manual-${i}`} className="text-xs bg-green-50 border border-green-200 rounded p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-mono text-green-900 mb-1">
                            {link.from} → {link.to}
                          </div>
                          <div className="text-green-600 text-xs">
                            {link.type || 'INNER'} JOIN
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => openEditLinkForm(i, true)}
                            className="px-1.5 py-0.5 text-green-600 hover:bg-green-100 rounded"
                            title="Edit relationship"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => removeLink(i, true)}
                            className="px-1.5 py-0.5 text-red-600 hover:bg-red-100 rounded"
                            title="Remove relationship"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {links.length === 0 && selectedTables.length >= 2 && (
              <div className="text-xs text-gray-400 text-center py-4">
                No relationships detected. Click "+ Add Custom" to create one.
              </div>
            )}
          </div>

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

      {/* Link Form Modal */}
      {showManualLinkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingLinkIndex !== null ? 'Edit Relationship' : 'Add Custom Relationship'}
            </h3>

            <div className="space-y-4">
              {/* From Table */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Table
                </label>
                <select
                  value={linkForm.fromTable}
                  onChange={(e) => setLinkForm({ ...linkForm, fromTable: e.target.value, fromColumn: '' })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select table...</option>
                  {selectedTables.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Column */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Column
                </label>
                <select
                  value={linkForm.fromColumn}
                  onChange={(e) => setLinkForm({ ...linkForm, fromColumn: e.target.value })}
                  disabled={!linkForm.fromTable}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select column...</option>
                  {fromColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Table */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Table
                </label>
                <select
                  value={linkForm.toTable}
                  onChange={(e) => setLinkForm({ ...linkForm, toTable: e.target.value, toColumn: '' })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select table...</option>
                  {selectedTables.map((table) => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Column */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Column
                </label>
                <select
                  value={linkForm.toColumn}
                  onChange={(e) => setLinkForm({ ...linkForm, toColumn: e.target.value })}
                  disabled={!linkForm.toTable}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select column...</option>
                  {toColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Join Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Join Type
                </label>
                <select
                  value={linkForm.type}
                  onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value as 'INNER' | 'LEFT' | 'RIGHT' })}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INNER">INNER JOIN</option>
                  <option value="LEFT">LEFT JOIN</option>
                  <option value="RIGHT">RIGHT JOIN</option>
                </select>
              </div>

              {/* Preview */}
              {linkForm.fromTable && linkForm.fromColumn && linkForm.toTable && linkForm.toColumn && (
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500 mb-1">Preview:</div>
                  <div className="font-mono text-sm text-gray-800">
                    {linkForm.fromTable}.{linkForm.fromColumn} → {linkForm.toTable}.{linkForm.toColumn}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {linkForm.type} JOIN
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={cancelLinkForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveLinkForm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingLinkIndex !== null ? 'Save Changes' : 'Add Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
