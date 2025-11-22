import { useState } from 'react';
import {
  X, Plus, Trash2, Save, Upload, Download, Table, Play,
  ChevronDown, ChevronRight, Edit2, Copy
} from 'lucide-react';

interface DataSet {
  id: string;
  name: string;
  data: Record<string, string>[];
}

interface DataDrivenTestingProps {
  testId: string;
  onClose: () => void;
  onRun: (dataSet: DataSet) => void;
}

export default function DataDrivenTesting({ testId, onClose, onRun }: DataDrivenTestingProps) {
  const [dataSets, setDataSets] = useState<DataSet[]>(() => {
    try {
      const stored = localStorage.getItem(`playwright:datasets:${testId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

  // Save data sets
  const saveDataSets = (newDataSets: DataSet[]) => {
    setDataSets(newDataSets);
    localStorage.setItem(`playwright:datasets:${testId}`, JSON.stringify(newDataSets));
  };

  // Create new data set
  const createDataSet = () => {
    const newDataSet: DataSet = {
      id: crypto.randomUUID(),
      name: 'New Data Set',
      data: [
        { variable1: 'value1', variable2: 'value2' }
      ]
    };
    saveDataSets([...dataSets, newDataSet]);
    setSelectedDataSet(newDataSet);
  };

  // Delete data set
  const deleteDataSet = (id: string) => {
    if (!confirm('Delete this data set?')) return;
    saveDataSets(dataSets.filter(ds => ds.id !== id));
    if (selectedDataSet?.id === id) {
      setSelectedDataSet(null);
    }
  };

  // Update data set
  const updateDataSet = (id: string, updates: Partial<DataSet>) => {
    const updated = dataSets.map(ds =>
      ds.id === id ? { ...ds, ...updates } : ds
    );
    saveDataSets(updated);
    if (selectedDataSet?.id === id) {
      setSelectedDataSet(updated.find(ds => ds.id === id) || null);
    }
  };

  // Add row
  const addRow = () => {
    if (!selectedDataSet) return;
    const columns = Object.keys(selectedDataSet.data[0] || {});
    const newRow: Record<string, string> = {};
    columns.forEach(col => newRow[col] = '');
    updateDataSet(selectedDataSet.id, {
      data: [...selectedDataSet.data, newRow]
    });
  };

  // Delete row
  const deleteRow = (index: number) => {
    if (!selectedDataSet) return;
    updateDataSet(selectedDataSet.id, {
      data: selectedDataSet.data.filter((_, i) => i !== index)
    });
  };

  // Add column
  const addColumn = () => {
    if (!selectedDataSet) return;
    const colName = prompt('Column name:');
    if (!colName) return;
    updateDataSet(selectedDataSet.id, {
      data: selectedDataSet.data.map(row => ({ ...row, [colName]: '' }))
    });
  };

  // Delete column
  const deleteColumn = (col: string) => {
    if (!selectedDataSet) return;
    if (!confirm(`Delete column "${col}"?`)) return;
    updateDataSet(selectedDataSet.id, {
      data: selectedDataSet.data.map(row => {
        const { [col]: _, ...rest } = row;
        return rest;
      })
    });
  };

  // Update cell
  const updateCell = (rowIndex: number, col: string, value: string) => {
    if (!selectedDataSet) return;
    updateDataSet(selectedDataSet.id, {
      data: selectedDataSet.data.map((row, i) =>
        i === rowIndex ? { ...row, [col]: value } : row
      )
    });
  };

  // Import CSV
  const importCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      let data: Record<string, string>[];

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        // Parse CSV
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: Record<string, string> = {};
          headers.forEach((h, i) => row[h] = values[i]?.trim() || '');
          return row;
        });
      }

      if (selectedDataSet) {
        updateDataSet(selectedDataSet.id, { data });
      } else {
        const newDataSet: DataSet = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.(csv|json)$/, ''),
          data
        };
        saveDataSets([...dataSets, newDataSet]);
        setSelectedDataSet(newDataSet);
      }
    };
    input.click();
  };

  // Export CSV
  const exportCSV = () => {
    if (!selectedDataSet || selectedDataSet.data.length === 0) return;

    const columns = Object.keys(selectedDataSet.data[0]);
    const csv = [
      columns.join(','),
      ...selectedDataSet.data.map(row =>
        columns.map(col => row[col] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataSet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = selectedDataSet?.data[0] ? Object.keys(selectedDataSet.data[0]) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-5xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <Table className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Data-Driven Testing
              </h2>
              <p className="text-xs text-gray-500">
                Run tests with multiple data sets
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

        <div className="flex-1 flex overflow-hidden">
          {/* Data Sets List */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700 space-y-2">
              <button
                onClick={createDataSet}
                className="w-full px-3 py-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Data Set
              </button>
              <button
                onClick={importCSV}
                className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import CSV/JSON
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {dataSets.length === 0 ? (
                <div className="text-center py-8">
                  <Table className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs text-gray-500">No data sets</p>
                </div>
              ) : (
                dataSets.map(ds => (
                  <div
                    key={ds.id}
                    onClick={() => setSelectedDataSet(ds)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 group ${
                      selectedDataSet?.id === ds.id
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ds.name}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteDataSet(ds.id); }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {ds.data.length} row{ds.data.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Data Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedDataSet ? (
              <>
                {/* Toolbar */}
                <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <input
                    type="text"
                    value={selectedDataSet.name}
                    onChange={(e) => updateDataSet(selectedDataSet.id, { name: e.target.value })}
                    className="text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addColumn}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                    >
                      + Column
                    </button>
                    <button
                      onClick={addRow}
                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                    >
                      + Row
                    </button>
                    <button
                      onClick={exportCSV}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                      title="Export CSV"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-4">
                  {columns.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">No columns defined</p>
                      <button
                        onClick={addColumn}
                        className="mt-2 text-sm text-cyan-600 hover:underline"
                      >
                        Add first column
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-700">
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
                          {columns.map(col => (
                            <th key={col} className="px-2 py-2 text-left">
                              <div className="flex items-center gap-1 group">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {`{{${col}}}`}
                                </span>
                                <button
                                  onClick={() => deleteColumn(col)}
                                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded"
                                >
                                  <X className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            </th>
                          ))}
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDataSet.data.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-gray-100 dark:border-slate-700/50 group">
                            <td className="px-2 py-1 text-xs text-gray-400">{rowIndex + 1}</td>
                            {columns.map(col => (
                              <td key={col} className="px-1 py-1">
                                <input
                                  type="text"
                                  value={row[col] || ''}
                                  onChange={(e) => updateCell(rowIndex, col, e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-slate-700 border-none rounded"
                                />
                              </td>
                            ))}
                            <td className="px-1">
                              <button
                                onClick={() => deleteRow(rowIndex)}
                                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Run Button */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => onRun(selectedDataSet)}
                    disabled={selectedDataSet.data.length === 0}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run Test with {selectedDataSet.data.length} Data Rows
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Table className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">Select a data set to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
