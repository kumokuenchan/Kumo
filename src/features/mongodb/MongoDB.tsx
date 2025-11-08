import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Plus,
  ChevronRight,
  ChevronDown,
  Filter,
  Table2,
  FileJson,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit,
  Copy,
  Settings,
  Search,
  X,
  ChevronLeft,
  MoreVertical
} from 'lucide-react';
import MongoDBConnectionForm from './MongoDBConnectionForm';
import DocumentEditModal from './DocumentEditModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import {
  useMongoDBConnections,
  useMongoDBDatabases,
  useMongoDBCollections,
  useConnectToMongoDB,
  useMongoDBConnectionStats,
  useMongoDBDocuments,
  useUpdateMongoDBDocuments,
  useDeleteMongoDBDocuments,
  useInsertManyMongoDBDocuments
} from '../../hooks/useMongoDB';
import { useQueryClient } from '@tanstack/react-query';

interface MongoDBProps {
  connectionId?: string | null;
}

type ViewMode = 'json' | 'table';
type Tab = 'documents' | 'aggregations' | 'schema' | 'indexes';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function MongoDB({ connectionId }: MongoDBProps) {
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load persisted state from localStorage
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(() => {
    return localStorage.getItem('mongodb-selected-database');
  });
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => {
    return localStorage.getItem('mongodb-selected-collection');
  });
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(() => {
    return localStorage.getItem('mongodb-active-connection');
  });
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('mongodb-expanded-databases');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Search/Filter state
  const [filterQuery, setFilterQuery] = useState<string>('{}');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchField, setSearchField] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // View state - load from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('mongodb-view-mode');
    return (saved as ViewMode) || 'json';
  });
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('mongodb-active-tab');
    return (saved as Tab) || 'documents';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('mongodb-page-size');
    return saved ? parseInt(saved, 10) : 20;
  });

  // Fetch data
  const { data: connections = [], isLoading: isLoadingConnections } = useMongoDBConnections();
  const { data: connectionStats } = useMongoDBConnectionStats(activeConnectionId);
  const isConnected = !!connectionStats;
  const connectMutation = useConnectToMongoDB();
  const queryClient = useQueryClient();

  // Mutations for update, delete, and bulk insert
  const updateMutation = useUpdateMongoDBDocuments();
  const deleteMutation = useDeleteMongoDBDocuments();
  const insertManyMutation = useInsertManyMongoDBDocuments();

  // Memoize the search query
  const searchQuery = React.useMemo(() => {
    if (!isSearchActive || !searchTerm?.trim() || !searchField?.trim()) {
      return {};
    }

    const query = {
      [searchField.trim()]: {
        $regex: searchTerm.trim(),
        $options: 'i'
      }
    };

    return query;
  }, [isSearchActive, searchTerm, searchField]);

  // Set first connection as active only if no saved connection exists
  React.useEffect(() => {
    if (connections.length > 0 && !activeConnectionId) {
      // Only set default if there's no saved connection
      const savedConnection = localStorage.getItem('mongodb-active-connection');
      if (!savedConnection) {
        setActiveConnectionId(connections[0].id);
      }
    }
  }, [connections, activeConnectionId]);

  // Auto-expand saved database on load
  React.useEffect(() => {
    if (selectedDatabase && !expandedDatabases.has(selectedDatabase)) {
      setExpandedDatabases(new Set([...expandedDatabases, selectedDatabase]));
    }
  }, [selectedDatabase]);

  // Auto-connect
  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt;

    if (activeConnectionId && !isConnected && !connectMutation.isPending && timeSinceLastAttempt > 3000) {
      setLastConnectionAttempt(now);
      connectMutation.mutate(activeConnectionId);
    }
  }, [activeConnectionId, isConnected, connectMutation.isPending, lastConnectionAttempt]);

  // Clear search when collection changes (but not on initial mount)
  const isInitialMount = React.useRef(true);
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setIsSearchActive(false);
    setSearchTerm('');
    setSearchField('');
    setFilterQuery('{}');
    setCurrentPage(1);
  }, [selectedCollection]);

  // Save preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('mongodb-view-mode', viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    localStorage.setItem('mongodb-active-tab', activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    localStorage.setItem('mongodb-page-size', pageSize.toString());
  }, [pageSize]);

  // Save selected database
  React.useEffect(() => {
    if (selectedDatabase) {
      localStorage.setItem('mongodb-selected-database', selectedDatabase);
    } else {
      localStorage.removeItem('mongodb-selected-database');
    }
  }, [selectedDatabase]);

  // Save selected collection
  React.useEffect(() => {
    if (selectedCollection) {
      localStorage.setItem('mongodb-selected-collection', selectedCollection);
    } else {
      localStorage.removeItem('mongodb-selected-collection');
    }
  }, [selectedCollection]);

  // Save active connection
  React.useEffect(() => {
    if (activeConnectionId) {
      localStorage.setItem('mongodb-active-connection', activeConnectionId);
    } else {
      localStorage.removeItem('mongodb-active-connection');
    }
  }, [activeConnectionId]);

  // Save expanded databases
  React.useEffect(() => {
    localStorage.setItem('mongodb-expanded-databases', JSON.stringify(Array.from(expandedDatabases)));
  }, [expandedDatabases]);

  // Fetch databases and collections
  const { data: databases = [] } = useMongoDBDatabases(isConnected ? activeConnectionId : null);
  const { data: collections = [] } = useMongoDBCollections(
    isConnected ? activeConnectionId : null,
    selectedDatabase
  );

  // Fetch documents
  const skip = (currentPage - 1) * pageSize;
  const { data: documentsData, isLoading: isLoadingDocuments, refetch } = useMongoDBDocuments(
    isConnected ? activeConnectionId : null,
    selectedDatabase,
    selectedCollection,
    searchQuery,
    {
      limit: pageSize,
      skip: skip
    }
  );

  const totalPages = documentsData ? Math.ceil(documentsData.totalCount / pageSize) : 0;

  // Handlers
  const toggleDatabase = (dbName: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
    }
    setExpandedDatabases(newExpanded);
    setSelectedDatabase(dbName);
  };

  const handleSearch = () => {
    if (searchTerm.trim() && searchField.trim()) {
      setIsSearchActive(true);
      setCurrentPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchField('');
    setIsSearchActive(false);
    setFilterQuery('{}');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Toast notification helper
  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Document operations
  const handleCopyDocument = async (doc: any) => {
    try {
      const jsonString = JSON.stringify(doc, null, 2);
      await navigator.clipboard.writeText(jsonString);
      showToast('Document copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy document:', error);
      showToast('Failed to copy document', 'error');
    }
  };

  const handleEditDocument = (doc: any) => {
    setEditingDocument(doc);
  };

  const handleSaveDocument = async (updatedDoc: any) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return;

    try {
      // Remove _id from the update as it's immutable
      const { _id, ...updateFields } = updatedDoc;

      await updateMutation.mutateAsync({
        connectionId: activeConnectionId,
        database: selectedDatabase,
        collection: selectedCollection,
        filter: { _id: editingDocument._id },
        update: { $set: updateFields }
      });

      setEditingDocument(null);
      refetch();
      showToast('Document updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update document:', error);
      showToast('Failed to update document: ' + (error as Error).message, 'error');
    }
  };

  const handleDeleteDocument = (doc: any) => {
    setDeletingDocument(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection || !deletingDocument) return;

    try {
      await deleteMutation.mutateAsync({
        connectionId: activeConnectionId,
        database: selectedDatabase,
        collection: selectedCollection,
        filter: { _id: deletingDocument._id }
      });

      setDeletingDocument(null);
      refetch();
      showToast('Document deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete document:', error);
      showToast('Failed to delete document: ' + (error as Error).message, 'error');
    }
  };

  const handleImportDocuments = async (documents: any[]) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return;

    try {
      const result = await insertManyMutation.mutateAsync({
        connectionId: activeConnectionId,
        database: selectedDatabase,
        collection: selectedCollection,
        documents
      });

      refetch();
      showToast(`Successfully imported ${result.insertedCount} documents`, 'success');
    } catch (error) {
      console.error('Failed to import documents:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f9fbfa] dark:bg-[#0d1117]">
      {/* Top Bar */}
      <div className="h-12 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">MongoDB</span>

          {activeConnectionId && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connections.find(c => c.id === activeConnectionId)?.name}
              </span>
              {isConnected && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => setShowConnectionForm(true)}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" />
          New Connection
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Database Tree */}
        <div className="w-64 bg-white dark:bg-[#161b22] border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
          {/* Connections Selector */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Connections
            </div>
            {connections.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No connections
              </div>
            ) : (
              <div className="space-y-1">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    onClick={() => {
                      setActiveConnectionId(connection.id);
                      setSelectedDatabase(null);
                      setSelectedCollection(null);
                      setExpandedDatabases(new Set());
                    }}
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition ${
                      activeConnectionId === connection.id
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activeConnectionId === connection.id && isConnected
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        activeConnectionId === connection.id
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {connection.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {connection.group || 'Default'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Databases
            </div>

            {databases.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {isConnected ? 'No databases found' : 'Connect to see databases'}
              </div>
            ) : (
              <div className="space-y-1">
                {databases.map((database) => (
                  <div key={database.name}>
                    <div
                      onClick={() => toggleDatabase(database.name)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                        selectedDatabase === database.name
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {expandedDatabases.has(database.name) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <Database className="w-4 h-4" />
                      <span className="text-sm font-medium flex-1">{database.name}</span>
                      <span className="text-xs text-gray-400">{database.collections?.length || 0}</span>
                    </div>

                    {expandedDatabases.has(database.name) && selectedDatabase === database.name && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {collections.map((collection) => (
                          <div
                            key={collection.name}
                            onClick={() => setSelectedCollection(collection.name)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition ${
                              selectedCollection === collection.name
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Table2 className="w-3.5 h-3.5" />
                            <span className="flex-1">{collection.name}</span>
                            <span className="text-xs text-gray-400">{collection.documentCount || 0}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedCollection ? (
            <>
              {/* Tab Bar */}
              <div className="h-10 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-1">
                {[
                  { id: 'documents', label: 'Documents' },
                  { id: 'aggregations', label: 'Aggregations' },
                  { id: 'schema', label: 'Schema' },
                  { id: 'indexes', label: 'Indexes' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-t transition ${
                      activeTab === tab.id
                        ? 'bg-gray-100 dark:bg-gray-800 text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'documents' && (
                <>
                  {/* Filter Bar */}
                  <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={searchField}
                          onChange={(e) => setSearchField(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Field name (e.g., name, email)"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Search value..."
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100"
                        />
                        <button
                          onClick={handleSearch}
                          disabled={!searchTerm.trim() || !searchField.trim()}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm rounded transition flex items-center gap-1.5"
                        >
                          <Search className="w-4 h-4" />
                          Find
                        </button>
                        {isSearchActive && (
                          <button
                            onClick={handleClearSearch}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => refetch()}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>

                      {isSearchActive && (
                        <div className="mt-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
                          <span className="text-green-700 dark:text-green-400">
                            Active filter: <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 py-0.5 rounded">{searchField}</code> = <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 py-0.5 rounded">{searchTerm}</code>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                          <button
                            onClick={() => setViewMode('json')}
                            className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 transition ${
                              viewMode === 'json'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <FileJson className="w-3.5 h-3.5" />
                            JSON
                          </button>
                          <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 transition ${
                              viewMode === 'table'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Table2 className="w-3.5 h-3.5" />
                            Table
                          </button>
                        </div>

                        {documentsData && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {isSearchActive ? (
                              <>Showing {documentsData.documents.length} of {documentsData.totalCount} results</>
                            ) : (
                              <>{documentsData.totalCount} documents</>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowExportModal(true)}
                          disabled={!documentsData || documentsData.documents.length === 0}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                        <button
                          onClick={() => setShowImportModal(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Import
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Documents View */}
                  <div className="flex-1 overflow-auto bg-[#f9fbfa] dark:bg-[#0d1117] p-4">
                    {isLoadingDocuments ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      </div>
                    ) : documentsData && documentsData.documents.length > 0 ? (
                      <div className="space-y-3">
                        {viewMode === 'json' ? (
                          documentsData.documents.map((doc, index) => (
                            <motion.div
                              key={doc._id || index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:shadow-md transition"
                            >
                              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                  _id: {doc._id?.toString()}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditDocument(doc)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => handleCopyDocument(doc)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                    title="Copy"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hover:text-red-600" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-4">
                                <JsonSyntaxHighlighter data={doc} />
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">_id</th>
                                    {documentsData.documents[0] && Object.keys(documentsData.documents[0])
                                      .filter(key => key !== '_id')
                                      .map(key => (
                                        <th key={key} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                                          {key}
                                        </th>
                                      ))}
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {documentsData.documents.map((doc, index) => (
                                    <tr key={doc._id || index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                                        {String(doc._id).substring(0, 8)}...
                                      </td>
                                      {Object.entries(doc)
                                        .filter(([key]) => key !== '_id')
                                        .map(([key, value]) => (
                                          <td key={key} className="px-4 py-2 text-gray-900 dark:text-gray-100 max-w-xs truncate">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </td>
                                        ))}
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => handleEditDocument(doc)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                            title="Edit"
                                          >
                                            <Edit className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                          </button>
                                          <button
                                            onClick={() => handleCopyDocument(doc)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                            title="Copy"
                                          >
                                            <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteDocument(doc)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hover:text-red-600" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <Database className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">No documents found</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {documentsData && documentsData.totalCount > pageSize && (
                    <div className="h-12 bg-white dark:bg-[#161b22] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Page {currentPage} of {totalPages}
                        </span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100"
                        >
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <ChevronLeft className="w-4 h-4 -ml-3" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-2 py-1 text-xs rounded ${
                                  currentPage === pageNum
                                    ? 'bg-green-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <ChevronRight className="w-4 h-4 -ml-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Other tabs */}
              {activeTab !== 'documents' && (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view coming soon</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Collection</h3>
                <p className="text-sm">Choose a database and collection from the sidebar to explore documents</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Edit Modal */}
      {editingDocument && (
        <DocumentEditModal
          document={editingDocument}
          onSave={handleSaveDocument}
          onCancel={() => setEditingDocument(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDocument && (
        <DeleteConfirmModal
          document={deletingDocument}
          onConfirm={confirmDeleteDocument}
          onCancel={() => setDeletingDocument(null)}
        />
      )}

      {/* Connection Form Modal */}
      {showConnectionForm && (
        <MongoDBConnectionForm
          connection={undefined}
          onSuccess={() => setShowConnectionForm(false)}
          onCancel={() => setShowConnectionForm(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && documentsData && selectedCollection && (
        <ExportModal
          documents={documentsData.documents}
          collectionName={selectedCollection}
          onClose={() => setShowExportModal(false)}
          onSuccess={(message) => {
            showToast(message, 'success');
            setShowExportModal(false);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && selectedCollection && (
        <ImportModal
          collectionName={selectedCollection}
          onImport={handleImportDocuments}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </div>
  );
}
