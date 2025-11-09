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
  const [isExecuting, setIsExecuting] = useState(false);

  // Form state for adding/editing links
  const [linkForm, setLinkForm] = useState({
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
    type: 'INNER' as 'INNER' | 'LEFT' | 'RIGHT',
  });

  // Fetch available tables
  const { data: tables = [], isLoading: isLoadingTables } = useTables(connectionId, database);

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
      return;
    }

    const newLink: TableLink = {
      from: `${linkForm.fromTable}.${linkForm.fromColumn}`,
      to: `${linkForm.toTable}.${linkForm.toColumn}`,
      type: linkForm.type,
    };

    if (editingLinkIndex !== null) {
      if (editingIsManual) {
        const newLinks = [...manualLinks];
        newLinks[editingLinkIndex] = newLink;
        setManualLinks(newLinks);
      } else {
        const newLinks = [...manualLinks, newLink];
        setManualLinks(newLinks);
        setAutoDetectedLinks(autoDetectedLinks.filter((_, i) => i !== editingLinkIndex));
      }
    } else {
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

  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    try {
      await executeMutation.mutateAsync();
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-gray-200/20 dark:border-slate-700/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Smart Join</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Automatically join related tables</p>
            </div>
          </div>
          <button
            onClick={handleExecuteQuery}
            disabled={selectedTables.length === 0 || links.length === 0 || isExecuting}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExecuting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Executing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Execute Query</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-6 pb-6">

          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 xl:col-span-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
            
            {/* Mobile Quick Navigation */}
            <div className="lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-black/5 dark:shadow-black/20 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => document.getElementById('table-selection')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    <span>Tables</span>
                  </div>
                </button>
                <button
                  onClick={() => document.getElementById('relationships')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Joins</span>
                  </div>
                </button>
                <button
                  onClick={() => document.getElementById('filters')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                    </svg>
                    <span>Filters</span>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Table Selection Card */}
            <div id="table-selection" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
              <div className="p-3 sm:p-4 border-b border-gray-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Select Tables</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Choose tables to join</p>
                  </div>
                </div>

                {isLoadingTables ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="max-h-40 sm:max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {tables.map((table) => (
                      <label
                        key={table.name}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 group"
                      >
                        <div className="relative flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedTables.includes(table.name)}
                            onChange={() => toggleTable(table.name)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 transition-all duration-200 ${
                            selectedTables.includes(table.name)
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-transparent'
                              : 'border-gray-300 dark:border-slate-600 group-hover:border-gray-400'
                          }`}>
                            {selectedTables.includes(table.name) && (
                              <svg className="w-2.5 h-2.5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{table.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {table.columns?.length || 0} columns
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400 text-xs">
                    {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''} selected
                  </span>
                  {selectedTables.length >= 2 && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400 self-start sm:self-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium">Ready to join</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Relationships Card */}
            <div id="relationships" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
              <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-slate-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Relationships</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{links.length} join{links.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {selectedTables.length >= 2 && (
                    <button
                      onClick={openAddLinkForm}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Custom</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 max-h-64 sm:max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
                
                {/* Auto-detected Links */}
                {autoDetectedLinks.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-detected</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                        {autoDetectedLinks.length}
                      </span>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {autoDetectedLinks.map((link, i) => (
                        <div key={`auto-${i}`} className="group">
                          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl sm:rounded-2xl transition-all duration-200 hover:shadow-lg touch-manipulation">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-xs font-mono rounded-lg flex-shrink-0">
                                    {link.from.split('.')[0]}
                                  </div>
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                  <div className="px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-xs font-mono rounded-lg flex-shrink-0">
                                    {link.to.split('.')[0]}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                                {link.from.split('.')[1]} → {link.to.split('.')[1]}
                              </div>
                              <div className="px-2 py-0.5 bg-white/50 dark:bg-slate-800/50 inline-block rounded-lg">
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                  {link.type || 'INNER'} JOIN
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                              <button
                                onClick={() => openEditLinkForm(i, false)}
                                className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg sm:rounded-xl transition-all duration-200 touch-manipulation"
                                title="Edit relationship"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => removeLink(i, false)}
                                className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg sm:rounded-xl transition-all duration-200 touch-manipulation"
                                title="Remove relationship"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
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
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom</span>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium">
                        {manualLinks.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {manualLinks.map((link, i) => (
                        <div key={`manual-${i}`} className="group">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/50 rounded-2xl transition-all duration-200 hover:shadow-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono rounded-lg">
                                  {link.from.split('.')[0]}
                                </div>
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono rounded-lg">
                                  {link.to.split('.')[0]}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {link.from.split('.')[1]} → {link.to.split('.')[1]}
                              </div>
                              <div className="mt-1 px-2 py-0.5 bg-white/50 dark:bg-slate-800/50 inline-block rounded-lg">
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                  {link.type || 'INNER'} JOIN
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => openEditLinkForm(i, true)}
                                className="p-2 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-xl transition-all duration-200"
                                title="Edit relationship"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => removeLink(i, true)}
                                className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                                title="Remove relationship"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {links.length === 0 && selectedTables.length >= 2 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">No relationships detected</p>
                    <button
                      onClick={openAddLinkForm}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
                    >
                      Add custom relationship →
                    </button>
                  </div>
                )}

                {selectedTables.length < 2 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Select at least 2 tables to start</p>
                  </div>
                )}
              </div>
            </div>

            {/* Filters Card */}
            <div id="filters" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
              <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{filters.length} filter{filters.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {selectedTables.length > 0 && (
                    <button
                      onClick={addFilter}
                      className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                      title="Add filter"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {filters.map((filter, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={filter.column}
                        onChange={(e) => updateFilter(i, { column: e.target.value })}
                        placeholder="table.column"
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(i, { operator: e.target.value })}
                        className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="=">=</option>
                        <option value="!=">≠</option>
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
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                      <button
                        onClick={() => removeFilter(i)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {filters.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">No filters applied</p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit:</label>
                  <input
                    type="number"
                    min="1"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                    className="w-20 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-1 xl:col-span-2 order-1 lg:order-2">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-slate-700/50 shadow-xl shadow-black/5 dark:shadow-black/20">
              
              {/* SQL Preview */}
              {generatedSQL && (
                <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Generated SQL</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Preview of the join query</p>
                    </div>
                  </div>
                  <div className="bg-gray-900 dark:bg-slate-950 rounded-2xl p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap">
                      {generatedSQL}
                    </pre>
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="p-4 sm:p-6">
                {results.length > 0 ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Results</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {results.length.toLocaleString()} of {totalRows.toLocaleString()} rows
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                          {selectedTables.length} table{selectedTables.length !== 1 ? 's' : ''}
                        </div>
                        <div className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                          {links.length} join{links.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-auto border border-gray-200/50 dark:border-slate-700/50 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-900/50 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 max-h-[600px]">
                      <table className="w-full divide-y divide-gray-200/50 dark:divide-slate-700/50">
                        <thead className="bg-gray-50/50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                            {Object.keys(results[0] || {}).map((key) => (
                              <th
                                key={key}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[120px]"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{key}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50 bg-white dark:bg-slate-900">
                          {results.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150">
                              {Object.values(row).map((value: any, j) => (
                                <td key={j} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap min-w-[120px]">
                                  {value === null ? (
                                    <span className="text-gray-400 dark:text-gray-600 italic text-xs">NULL</span>
                                  ) : typeof value === 'object' ? (
                                    <code className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-mono truncate max-w-[200px] inline-block" title={JSON.stringify(value)}>
                                      {JSON.stringify(value)}
                                    </code>
                                  ) : (
                                    <span className="font-mono text-xs truncate inline-block max-w-[300px]" title={String(value)}>
                                      {String(value)}
                                    </span>
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
                  <div className="min-h-[400px] flex items-center justify-center py-12">
                    <div className="text-center max-w-md">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        {selectedTables.length === 0 ? (
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        ) : links.length === 0 ? (
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        ) : (
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedTables.length === 0 
                          ? 'Select Tables'
                          : links.length === 0 
                            ? 'No Relationships'
                            : 'Ready to Execute'
                        }
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {selectedTables.length === 0
                          ? 'Choose tables to start building your join'
                          : links.length === 0
                            ? 'Add custom relationships or execute the auto-detected ones'
                            : 'Your join query is ready to execute'
                        }
                      </p>
                      {selectedTables.length >= 2 && links.length === 0 && (
                        <button
                          onClick={openAddLinkForm}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                          Add First Relationship
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Form Modal */}
      {showManualLinkForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/20 dark:shadow-black/60 max-w-lg w-full border border-gray-200/50 dark:border-gray-800/50 transform transition-all duration-200 scale-100">
            
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingLinkIndex !== null ? 'Edit Relationship' : 'Add Custom Relationship'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure table join</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              
              {/* From Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  From
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Table
                    </label>
                    <select
                      value={linkForm.fromTable}
                      onChange={(e) => setLinkForm({ ...linkForm, fromTable: e.target.value, fromColumn: '' })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">Select table...</option>
                      {selectedTables.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Column
                    </label>
                    <select
                      value={linkForm.fromColumn}
                      onChange={(e) => setLinkForm({ ...linkForm, fromColumn: e.target.value })}
                      disabled={!linkForm.fromTable}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select column...</option>
                      {fromColumns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>

              {/* To Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  To
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Table
                    </label>
                    <select
                      value={linkForm.toTable}
                      onChange={(e) => setLinkForm({ ...linkForm, toTable: e.target.value, toColumn: '' })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="">Select table...</option>
                      {selectedTables.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Column
                    </label>
                    <select
                      value={linkForm.toColumn}
                      onChange={(e) => setLinkForm({ ...linkForm, toColumn: e.target.value })}
                      disabled={!linkForm.toTable}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select column...</option>
                      {toColumns.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Join Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Join Type
                </label>
                <select
                  value={linkForm.type}
                  onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value as 'INNER' | 'LEFT' | 'RIGHT' })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="INNER">INNER JOIN</option>
                  <option value="LEFT">LEFT JOIN</option>
                  <option value="RIGHT">RIGHT JOIN</option>
                </select>
              </div>

              {/* Preview */}
              {linkForm.fromTable && linkForm.fromColumn && linkForm.toTable && linkForm.toColumn && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Preview</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-sm font-mono rounded-lg">
                      {linkForm.fromTable}.{linkForm.fromColumn}
                    </div>
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <div className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 text-sm font-mono rounded-lg">
                      {linkForm.toTable}.{linkForm.toColumn}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {linkForm.type} JOIN
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-200/50 dark:border-gray-800/50">
              <button
                onClick={cancelLinkForm}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl sm:rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all duration-200 text-sm sm:text-base touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={saveLinkForm}
                disabled={!linkForm.fromTable || !linkForm.fromColumn || !linkForm.toTable || !linkForm.toColumn}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl sm:rounded-2xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm sm:text-base touch-manipulation"
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
