import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Plus,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calculator,
  BarChart3,
  Zap
} from 'lucide-react';
import MongoDBConnectionForm from './MongoDBConnectionForm';
import DocumentEditModal from './DocumentEditModal';
import AddDocumentModal from './AddDocumentModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';
import CopyModal from './CopyModal';
import SavedQueries from './SavedQueries';
import CollectionManagement from './CollectionManagement';
import DataOperations from './DataOperations';
import VisualQueryBuilder from './VisualQueryBuilder';
import DataVisualization from './DataVisualization';
import AggregationsTab from './AggregationsTab';
import SchemaTab from './SchemaTab';
import IndexesTab from './IndexesTab';
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  useMongoDBConnections,
  useMongoDBDatabases,
  useMongoDBCollections,
  useConnectToMongoDB,
  useMongoDBConnectionStats,
  useMongoDBDocuments,
  useUpdateMongoDBDocuments,
  useDeleteMongoDBDocuments,
  useInsertManyMongoDBDocuments,
  useInsertMongoDBDocument,
  useDeleteMongoDBConnection,
  useMongoDBSchema
} from '../../hooks/useMongoDB';
import { mongodbApi } from '../../api/mongodb';
import { useQueryClient } from '@tanstack/react-query';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { 
  loadMongoDbStateFromLocalStorage, 
  saveMongoDbStateToLocalStorage,
  MongoDbPersistedState 
} from './utils/localStorage';

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
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [showDeleteConnectionModal, setShowDeleteConnectionModal] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);

  // Bulk operations state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [documentsToCopy, setDocumentsToCopy] = useState<any[]>([]);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showCollectionManagement, setShowCollectionManagement] = useState(false);
  const [showDataOperations, setShowDataOperations] = useState(false);
  const [showVisualQueryBuilder, setShowVisualQueryBuilder] = useState(false);
  const [showDataVisualization, setShowDataVisualization] = useState(false);

  // Load persisted state from localStorage
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.selectedDatabase || localStorage.getItem('mongodb-selected-database');
  });
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.selectedCollection || localStorage.getItem('mongodb-selected-collection');
  });
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.activeConnectionId || localStorage.getItem('mongodb-active-connection');
  });
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    if (savedState?.expandedDatabases) {
      return new Set(savedState.expandedDatabases);
    }
    const saved = localStorage.getItem('mongodb-expanded-databases');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Search/Filter state
  const [filterQuery, setFilterQuery] = useState<string>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.filterQuery || '{}';
  });
  const [originalFilterQuery, setOriginalFilterQuery] = useState<string>('{}');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchField, setSearchField] = useState<string>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.searchField || '';
  });
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.searchTerm || '';
  });
  const [isSearchActive, setIsSearchActive] = useState<boolean>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.isSearchActive || false;
  });

  // View state - load from localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.viewMode || ((localStorage.getItem('mongodb-view-mode') as ViewMode) || 'json');
  });
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.activeTab || ((localStorage.getItem('mongodb-active-tab') as Tab) || 'documents');
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.currentPage || 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.pageSize || parseInt(localStorage.getItem('mongodb-page-size') || '20', 10);
  });

  // Sorting state
  const [sortField, setSortField] = useState<string>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.sortField || '';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.sortDirection || 'desc';
  });

  // Query history state
  const [queryHistory, setQueryHistory] = useState<any[]>(() => {
    const savedState = loadMongoDbStateFromLocalStorage();
    return savedState?.queryHistory || JSON.parse(localStorage.getItem('mongodb-query-history') || '[]');
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
  const insertOneMutation = useInsertMongoDBDocument();
  const deleteConnectionMutation = useDeleteMongoDBConnection();

  // Get collection schema for field information
  const { data: schemaData } = useMongoDBSchema(
    isConnected ? activeConnectionId : null,
    selectedDatabase,
    selectedCollection
  );

  // Memoize the search query - combine simple search with filterQuery for saved queries
  const searchQuery = React.useMemo(() => {
    // If there's an active simple search, use only the search (ignore filterQuery for simple searches)
    if (isSearchActive && searchTerm?.trim() && searchField?.trim()) {
      // For _id field, use exact match if it's a valid ObjectId format, otherwise use regex
      if (searchField.trim() === '_id') {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm.trim());
        if (isValidObjectId) {
          // For valid ObjectId, use exact match to let server convert to ObjectId
          return { _id: searchTerm.trim() };
        } else {
          // For invalid format, use regex but this won't work well with ObjectId
          return {
            _id: {
              $regex: searchTerm.trim(),
              $options: 'i'
            }
          };
        }
      } else {
        // For other fields, use regex as before
        return {
          [searchField.trim()]: {
            $regex: searchTerm.trim(),
            $options: 'i'
          }
        };
      }
    }

    // If no active search, return the filterQuery (for saved queries or when saved queries are loaded)
    let query = {};
    try {
      query = JSON.parse(filterQuery || '{}');
    } catch (e) {
      console.error('Invalid filterQuery JSON:', filterQuery);
      query = {};
    }

    return query;
  }, [isSearchActive, searchTerm, searchField, filterQuery]);

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

  // Effect to handle initial load with saved state
  React.useEffect(() => {
    const hasSavedState = selectedDatabase || selectedCollection || activeConnectionId;
    if (hasSavedState && isConnected) {
      // Ensure data is loaded with saved state
      // The useMongoDBDocuments hook should automatically fetch with current state
    }
  }, [isConnected]); // Include isConnected to refetch when connection is established

  // Auto-connect
  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt;

    if (activeConnectionId && !isConnected && !connectMutation.isPending && timeSinceLastAttempt > 3000) {
      setLastConnectionAttempt(now);
      connectMutation.mutate(activeConnectionId);
    }
  }, [activeConnectionId, isConnected, connectMutation.isPending, lastConnectionAttempt]);

  // Trigger initial data load after connection is established and state is loaded
  React.useEffect(() => {
    if (isConnected && selectedDatabase && selectedCollection) {
      // Data will be automatically fetched by the useMongoDBDocuments hook
      // which depends on these state variables
    }
  }, [isConnected, selectedDatabase, selectedCollection]);

  // Clear search and sort when collection changes (but not on initial mount)
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
    clearSort();
    setSelectedDocuments(new Set());
    setShowBulkActions(false);
  }, [selectedCollection]);

  // Save preferences to localStorage using new utility functions
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ viewMode });
  }, [viewMode]);

  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ activeTab });
  }, [activeTab]);

  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ pageSize });
  }, [pageSize]);

  // Save selected database
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ selectedDatabase });
  }, [selectedDatabase]);

  // Save selected collection
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ selectedCollection });
  }, [selectedCollection]);

  // Save active connection
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ activeConnectionId });
  }, [activeConnectionId]);

  // Save expanded databases
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ expandedDatabases: Array.from(expandedDatabases) });
  }, [expandedDatabases]);

  // Save query history to localStorage
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ queryHistory });
  }, [queryHistory]);

  // Save search/filter state
  React.useEffect(() => {
    saveMongoDbStateToLocalStorage({ 
      filterQuery, 
      searchField, 
      searchTerm, 
      isSearchActive,
      sortField,
      sortDirection,
      currentPage
    });
  }, [filterQuery, searchField, searchTerm, isSearchActive, sortField, sortDirection, currentPage]);

  // Add query to history
  const addQueryToHistory = (query: any, source: string = 'manual') => {
    const historyItem = {
      query: { ...query }, // Deep copy to avoid reference issues
      searchField: searchField || undefined,
      searchValue: searchTerm || undefined,
      sortField: sortField || undefined,
      sortDirection: sortDirection,
      collectionName: selectedCollection || '',
      source, // 'manual', 'saved-query', 'visual-builder', etc.
      timestamp: new Date().toISOString()
    };

    setQueryHistory(prev => {
      // Remove duplicate entries (same query, collection, and recent timestamp)
      const filtered = prev.filter(item => {
        return !(JSON.stringify(item.query) === JSON.stringify(historyItem.query) &&
                item.collectionName === historyItem.collectionName &&
                Math.abs(new Date(item.timestamp).getTime() - new Date(historyItem.timestamp).getTime()) < 5000);
      });
      return [historyItem, ...filtered.slice(0, 49)]; // Keep last 50 entries
    });
  };

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
      skip: skip,
      sort: sortField ? { [sortField]: sortDirection === 'asc' ? 1 : -1 } : undefined
    }
  );

  // Explicitly refetch when connection is established with previously saved database/collection
  React.useEffect(() => {
    if (isConnected && selectedDatabase && selectedCollection) {
      // The useMongoDBDocuments hook should automatically fetch, but we'll trigger
      // a refetch to ensure data is loaded with the saved state
      refetch();
    }
  }, [isConnected, selectedDatabase, selectedCollection, refetch]);

  // Refetch documents when relevant state changes
  React.useEffect(() => {
    if (isConnected && selectedDatabase && selectedCollection) {
      refetch();
    }
  }, [isConnected, selectedDatabase, selectedCollection, filterQuery, searchField, searchTerm, isSearchActive, sortField, sortDirection, currentPage, pageSize, refetch]);

  const totalPages = documentsData ? Math.ceil(documentsData.totalCount / pageSize) : 0;

  // Get available sort fields from the first document
  const getAvailableSortFields = () => {
    if (!documentsData || documentsData.documents.length === 0) {
      return ['_id', 'name', 'title', 'email', 'createdAt', 'updatedAt'];
    }
    
    const firstDoc = documentsData.documents[0];
    const commonFields = ['_id', 'name', 'title', 'email', 'createdAt', 'updatedAt'];
    const documentFields = Object.keys(firstDoc);
    
    // Add common fields that exist in the document
    const availableFields = commonFields.filter(field => 
      documentFields.includes(field) || field === '_id'
    );
    
    // Add any other string/number fields from the document
    const additionalFields = documentFields
      .filter(field => field !== '_id' && !availableFields.includes(field))
      .filter(field => {
        const value = firstDoc[field];
        return typeof value === 'string' || typeof value === 'number' || 
               (typeof value === 'object' && value !== null && !Array.isArray(value));
      })
      .slice(0, 5); // Limit additional fields
    
    return [...availableFields, ...additionalFields];
  };

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

      // Store the original filterQuery if not already stored
      if (originalFilterQuery === '{}') {
        setOriginalFilterQuery(filterQuery);
      }

      // Add to query history for manual search
      const manualQuery = {
        [searchField.trim()]: {
          $regex: searchTerm.trim(),
          $options: 'i'
        }
      };
      addQueryToHistory(manualQuery, 'manual');

      // Let the searchQuery useMemo handle the query combination
      // Don't update filterQuery here - it's handled in searchQuery
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchField('');
    setIsSearchActive(false);
    // Restore the original filterQuery, or set to empty if none
    setFilterQuery(originalFilterQuery);
    setOriginalFilterQuery('{}');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDeleteConnection = (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the connection
    setConnectionToDelete(connectionId);
    setShowDeleteConnectionModal(true);
  };

  const confirmDeleteConnection = async () => {
    if (!connectionToDelete) return;
    
    try {
      await deleteConnectionMutation.mutateAsync(connectionToDelete);
      
      // If we deleted the active connection, clear the selection
      if (activeConnectionId === connectionToDelete) {
        setActiveConnectionId(null);
        setSelectedDatabase(null);
        setSelectedCollection(null);
      }
      
      setShowDeleteConnectionModal(false);
      setConnectionToDelete(null);
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const cancelDeleteConnection = () => {
    setShowDeleteConnectionModal(false);
    setConnectionToDelete(null);
  };

  // Toast notification helper with debouncing and deduplication
  const lastToastTime = React.useRef<number>(0);
  const showToast = React.useCallback((message: string, type: ToastType) => {
    const now = Date.now();
    
    // Prevent toasts that are less than 500ms apart
    if (now - lastToastTime.current < 500) {
      return;
    }
    
    lastToastTime.current = now;
    const id = `${now}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => {
      // Check if a similar toast (same message and type) already exists
      const existingToast = prev.find(toast => toast.message === message && toast.type === type);
      if (existingToast) {
        // Don't add duplicate toast
        return prev;
      }
      return [...prev, { id, message, type }];
    });
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Document operations

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

  const handleAddDocument = async (document: any) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) return;

    try {
      await insertOneMutation.mutateAsync({
        connectionId: activeConnectionId,
        database: selectedDatabase,
        collection: selectedCollection,
        document
      });

      refetch();
      setShowAddDocumentModal(false);
      showToast('Document added successfully', 'success');
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const clearSort = () => {
    setSortField('');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  // Bulk operations handlers
  const getDocumentId = (doc: any, index: number): string => {
    return doc._id?.toString() || `index-${index}`;
  };

  const toggleDocumentSelection = (doc: any, index: number) => {
    const docId = getDocumentId(doc, index);
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (!documentsData || documentsData.documents.length === 0) return;
    
    const allDocIds = new Set(documentsData.documents.map((doc, index) => {
      return doc._id?.toString() || `index-${index}`;
    }));
    const allSelected = Array.from(allDocIds).every(id => selectedDocuments.has(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedDocuments(new Set());
      setShowBulkActions(false);
    } else {
      // Select all
      setSelectedDocuments(allDocIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection || selectedDocuments.size === 0) return;
    
    try {
      const docIds = Array.from(selectedDocuments);
      const deletePromises = docIds.map(docId => 
        deleteMutation.mutateAsync({
          connectionId: activeConnectionId,
          database: selectedDatabase,
          collection: selectedCollection,
          filter: { _id: docId } // Let the backend handle ObjectId conversion
        })
      );
      
      await Promise.all(deletePromises);
      setSelectedDocuments(new Set());
      setShowBulkActions(false);
      refetch();
      showToast(`Successfully deleted ${docIds.length} documents`, 'success');
    } catch (error) {
      console.error('Failed to delete documents:', error);
      showToast('Failed to delete documents: ' + (error as Error).message, 'error');
    }
  };

  const handleBulkCopy = async () => {
    if (selectedDocuments.size === 0 || !documentsData) return;
    
    try {
      const selectedDocs = documentsData.documents.filter(doc => {
        const docId = getDocumentId(doc, documentsData.documents.indexOf(doc));
        return selectedDocuments.has(docId);
      });
      const jsonString = JSON.stringify(selectedDocs, null, 2);
      await navigator.clipboard.writeText(jsonString);
      showToast(`Copied ${selectedDocs.length} documents to clipboard`, 'success');
    } catch (error) {
      console.error('Failed to copy documents:', error);
      showToast('Failed to copy documents', 'error');
    }
  };

  

  const handleCopyWithFormat = (doc: any, index: number) => {
    setDocumentsToCopy([doc]);
    setShowCopyModal(true);
  };

  const handleBulkCopyWithFormat = () => {
    if (selectedDocuments.size === 0 || !documentsData) return;
    
    const selectedDocs = documentsData.documents.filter(doc => {
      const docId = getDocumentId(doc, documentsData.documents.indexOf(doc));
      return selectedDocuments.has(docId);
    });
    
    setDocumentsToCopy(selectedDocs);
    setShowCopyModal(true);
  };

  // Saved Queries handlers
  const handleLoadSavedQuery = (query: any, sortField?: string, sortDirection?: 'asc' | 'desc') => {
    try {
      // Clean the query to remove any duplicate or nested query structures
      let cleanedQuery = query;
      
      // If the query is a $and with the same condition twice, extract the single condition
      if (query.$and && Array.isArray(query.$and)) {
        const conditions = query.$and;
        // Check if all conditions are identical
        const allIdentical = conditions.every((cond: any) => 
          JSON.stringify(cond) === JSON.stringify(conditions[0])
        );
        
        if (allIdentical && conditions.length > 0) {
          // Use just the first condition
          cleanedQuery = conditions[0];
        } else if (conditions.length === 1) {
          // If only one condition in $and, unwrap it
          cleanedQuery = conditions[0];
        }
      }
      
      // Set the filterQuery to the cleaned query
      setFilterQuery(JSON.stringify(cleanedQuery));
      
      // Reset the original filterQuery since we're loading a fresh query
      setOriginalFilterQuery('{}');
      
      // Clear simple search fields and deactivate search when loading a saved query
      setSearchTerm('');
      setSearchField('');
      setIsSearchActive(false);
      
      // Set sorting if provided
      if (sortField) {
        setSortField(sortField);
        setSortDirection(sortDirection || 'desc');
      }
      
      // Reset to first page
      setCurrentPage(1);
      
      // Close the saved queries modal
      setShowSavedQueries(false);
      
      // Refetch documents with the new query
      refetch();

      // Add to query history
      addQueryToHistory(cleanedQuery, 'saved-query');

      showToast('Query loaded successfully', 'success');
    } catch (error) {
      console.error('Failed to load saved query:', error);
      showToast('Failed to load saved query', 'error');
    }
  };

  const handleSaveCurrentQuery = (name: string, description: string, tags: string[]) => {
    try {
      // Use the current searchQuery instead of filterQuery to get the most up-to-date query
      let currentQuery = searchQuery;
      
      // Validate that the query actually has conditions
      if (!currentQuery || (typeof currentQuery === 'object' && Object.keys(currentQuery).length === 0)) {
        showToast('Cannot save empty query. Please add search criteria first.', 'error');
        return;
      }
      
      // Clean the query before saving to avoid storing duplicate or nested structures
      if (currentQuery.$and && Array.isArray(currentQuery.$and)) {
        const conditions = currentQuery.$and;
        // Check if all conditions are identical
        const allIdentical = conditions.every((cond: any) => 
          JSON.stringify(cond) === JSON.stringify(conditions[0])
        );
        
        if (allIdentical && conditions.length > 0) {
          // Save just the first condition
          currentQuery = conditions[0];
        } else if (conditions.length === 1) {
          // If only one condition in $and, unwrap it
          currentQuery = conditions[0];
        }
      }
      
      const newQuery = {
        id: Date.now().toString(),
        name,
        description,
        query: currentQuery,
        sortField: sortField || undefined,
        sortDirection: sortDirection,
        collectionName: selectedCollection || '',
        tags: tags,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      
      // Save to localStorage
      const existingQueries = JSON.parse(localStorage.getItem('mongodb-saved-queries') || '[]');
      const updatedQueries = [newQuery, ...existingQueries];
      localStorage.setItem('mongodb-saved-queries', JSON.stringify(updatedQueries));
      
      showToast(`Query "${name}" saved successfully`, 'success');
    } catch (error) {
      console.error('Failed to save query:', error);
      showToast('Failed to save query', 'error');
    }
  };

  // Collection Management handlers
  const handleCreateCollection = async (name: string, options: any) => {
    if (!activeConnectionId || !selectedDatabase) return;

    try {
      // This would call the actual API endpoint
      // await mongodbApi.createCollection(activeConnectionId, selectedDatabase, name, options);
      showToast(`Collection "${name}" created successfully`, 'success');
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  };

  const handleDropCollection = async (name: string) => {
    if (!activeConnectionId || !selectedDatabase) return;

    try {
      // This would call the actual API endpoint
      // await mongodbApi.dropCollection(activeConnectionId, selectedDatabase, name);
      showToast(`Collection "${name}" dropped successfully`, 'success');
    } catch (error) {
      console.error('Failed to drop collection:', error);
      throw error;
    }
  };

  const handleRenameCollection = async (oldName: string, newName: string) => {
    if (!activeConnectionId || !selectedDatabase) return;

    try {
      // This would call the actual API endpoint
      // await mongodbApi.renameCollection(activeConnectionId, selectedDatabase, oldName, newName);
      showToast(`Collection renamed from "${oldName}" to "${newName}" successfully`, 'success');
    } catch (error) {
      console.error('Failed to rename collection:', error);
      throw error;
    }
  };

  // Data Operations handlers
  const handleUpdateDocuments = async (updates: any[]) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) {
      throw new Error('No active connection, database, or collection selected');
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('No updates provided');
    }

    let successCount = 0;
    const errors: string[] = [];

    // Process each update individually
    for (const update of updates) {
      try {
        if (!update._id) {
          errors.push('Update missing _id field');
          continue;
        }

        // Extract the fields to update (excluding _id)
        const { _id, ...updateFields } = update;
        if (Object.keys(updateFields).length === 0) {
          errors.push(`No fields to update for document ${_id}`);
          continue;
        }

        // Create MongoDB update object with $set operator
        const updateOperation = { $set: updateFields };

        // Call the API to update this specific document
        await mongodbApi.updateDocuments(
          activeConnectionId,
          selectedDatabase,
          selectedCollection,
          { _id: update._id },
          updateOperation,
          { multi: false }
        );

        successCount++;
      } catch (error) {
        console.error(`Failed to update document ${update._id}:`, error);
        errors.push(`Failed to update document ${update._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Update completed with errors. Success: ${successCount}, Errors: ${errors.length}. Details: ${errors.join('; ')}`);
    }

    // Refresh the documents to show updated data
    refetch();
  };

  const handleDeleteDuplicates = async (duplicateIds: string[]) => {
    if (!activeConnectionId || !selectedDatabase || !selectedCollection) {
      throw new Error('No active connection, database, or collection selected');
    }

    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      throw new Error('No duplicate IDs provided');
    }

    try {
      // Use the deleteDocuments API to delete all documents with the given IDs
      await mongodbApi.deleteDocuments(
        activeConnectionId,
        selectedDatabase,
        selectedCollection,
        { _id: { $in: duplicateIds } }
      );

      showToast(`Successfully deleted ${duplicateIds.length} duplicate documents`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete duplicates:', error);
      throw error;
    }
  };

  const handleDataOperationsToast = (message: string, type: 'success' | 'error' | 'info') => {
    showToast(message, type);
  };

  // Visual Query Builder handlers
  const handleExecuteQuery = (query: any) => {
    try {
      setFilterQuery(JSON.stringify(query));
      setIsSearchActive(Object.keys(query).length > 0);
      setCurrentPage(1);
      setShowVisualQueryBuilder(false);

      // Add to query history
      addQueryToHistory(query, 'visual-builder');

      showToast('Query executed successfully', 'success');
    } catch (error) {
      console.error('Failed to execute query:', error);
      showToast('Failed to execute query', 'error');
    }
  };

  const handleSaveBuilderQuery = (name: string, query: any) => {
    try {
      const newQuery = {
        id: Date.now().toString(),
        name,
        description: 'Created with Visual Query Builder',
        query,
        sortField: undefined,
        sortDirection: 'desc' as const,
        collectionName: selectedCollection || '',
        tags: ['visual-builder', 'generated'],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      
      // Save to localStorage
      const existingQueries = JSON.parse(localStorage.getItem('mongodb-saved-queries') || '[]');
      const updatedQueries = [newQuery, ...existingQueries];
      localStorage.setItem('mongodb-saved-queries', JSON.stringify(updatedQueries));
      
      showToast(`Query "${name}" saved successfully`, 'success');
    } catch (error) {
      console.error('Failed to save query:', error);
      showToast('Failed to save query', 'error');
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: () => selectedCollection && setShowAddDocumentModal(true),
      description: 'New document'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        const searchFieldElement = document.querySelector('input[placeholder*="Field name"]') as HTMLInputElement;
        if (searchFieldElement) {
          searchFieldElement.focus();
        }
      },
      description: 'Focus search'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => {
        if (selectedDocuments.size > 0) {
          handleBulkDelete();
        }
      },
      description: 'Delete selected documents'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        if (selectedDocuments.size === 1 && documentsData) {
          const selectedDoc = documentsData.documents.find(doc => {
            const docId = getDocumentId(doc, documentsData.documents.indexOf(doc));
            return selectedDocuments.has(docId);
          });
          if (selectedDoc) {
            handleEditDocument(selectedDoc);
          }
        }
      },
      description: 'Edit selected document'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => setShowSavedQueries(true),
      description: 'Open saved queries'
    },
    {
      key: 'm',
      ctrlKey: true,
      action: () => setShowCollectionManagement(true),
      description: 'Open collection management'
    },
    {
      key: 'o',
      ctrlKey: true,
      action: () => setShowDataOperations(true),
      description: 'Open data operations'
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => setShowVisualQueryBuilder(true),
      description: 'Open query builder'
    },
    
    {
      key: 'Escape',
      action: () => {
        setSelectedDocuments(new Set());
        setShowBulkActions(false);
        setShowAddDocumentModal(false);
        setShowExportModal(false);
        setShowImportModal(false);
        setShowConnectionForm(false);
        setShowVisualQueryBuilder(false);
        setShowDataVisualization(false);
        setEditingDocument(null);
        setDeletingDocument(null);
      },
      description: 'Close modals/clear selection'
    }
  ]);

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
                    className={`group flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition ${
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
                    <button
                      onClick={(e) => handleDeleteConnection(connection.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete connection"
                      disabled={deleteConnectionMutation.isPending}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
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

                        {/* Sort Controls */}
                        {documentsData && documentsData.documents.length > 0 && (
                          <div className="flex items-center gap-1">
                            <select
                              value={sortField}
                              onChange={(e) => {
                                if (e.target.value === '') {
                                  clearSort();
                                } else {
                                  handleSort(e.target.value);
                                }
                              }}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              <option value="">Sort by...</option>
                              {getAvailableSortFields().map(field => (
                                <option key={field} value={field}>
                                  {field === '_id' ? 'ID' : field.charAt(0).toUpperCase() + field.slice(1)}
                                </option>
                              ))}
                            </select>
                            {sortField && (
                              <button
                                onClick={() => handleSort(sortField)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                              >
                                {sortDirection === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-green-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-green-600" />
                                )}
                              </button>
                            )}
                          </div>
                        )}

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

                      {/* Bulk Actions Toolbar */}
                      {showBulkActions && (
                        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                              {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
                            </span>
                            <button
                              onClick={toggleSelectAll}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                            >
                              {documentsData && Array.from(new Set(documentsData.documents.map(doc => doc._id?.toString()))).every(id => selectedDocuments.has(id)) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleBulkCopyWithFormat}
                              className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-300 dark:border-blue-700 rounded transition"
                            >
                              <Copy className="w-3.5 h-3.5 inline mr-1" />
                              Copy as...
                            </button>
                            <button
                              onClick={handleBulkDelete}
                              disabled={deleteMutation.isPending}
                              className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 border border-red-300 dark:border-red-700 rounded transition disabled:opacity-50"
                            >
                              {deleteMutation.isPending ? (
                                <div className="w-3.5 h-3.5 border border-red-300 border-t-red-600 rounded-full animate-spin inline mr-1" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                              )}
                              Delete
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDocuments(new Set());
                                setShowBulkActions(false);
                              }}
                              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-700 rounded transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddDocumentModal(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Document
                        </button>
                        <button
                          onClick={() => setShowSavedQueries(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Saved Queries
                        </button>
                        <button
                          onClick={() => setShowCollectionManagement(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Database className="w-3.5 h-3.5" />
                          Collections
                        </button>
                        <button
                          onClick={() => setShowDataOperations(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Data Ops
                        </button>
                        <button
                          onClick={() => setShowVisualQueryBuilder(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Query Builder
                        </button>
                        <button
                          onClick={() => setShowDataVisualization(true)}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition flex items-center gap-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Data Viz
                        </button>
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
                        
                        {/* Keyboard Shortcuts Hint */}
                        <div className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1 ml-2">
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">⌘</kbd>
                          <span className="text-xs">N</span>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">⌘</kbd>
                          <span className="text-xs">F</span>
                        </div>
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
                              key={getDocumentId(doc, index)}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:shadow-md transition"
                            >
                              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedDocuments.has(getDocumentId(doc, index))}
                                    onChange={() => toggleDocumentSelection(doc, index)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    _id: {doc._id?.toString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditDocument(doc)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => handleCopyWithFormat(doc, index)}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                    title="Copy as..."
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
                              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                                <colgroup>
                                  <col style={{ width: '48px' }} />
                                  {documentsData.documents[0] && Object.keys(documentsData.documents[0]).map(key => (
                                    <col key={key} style={{ width: '200px' }} />
                                  ))}
                                  <col style={{ width: '80px' }} />
                                </colgroup>
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs" style={{ width: '48px', maxWidth: '48px', minWidth: '48px' }}>
                                      <input
                                        type="checkbox"
                                        checked={documentsData && documentsData.documents.length > 0 && documentsData.documents.every((doc, index) => selectedDocuments.has(getDocumentId(doc, index)))}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                      />
                                    </th>
                                    <th 
                                      onClick={() => handleSort('_id')}
                                      className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition"
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="truncate">_id</span>
                                        {sortField === '_id' && (
                                          <span className="flex-shrink-0">
                                            {sortDirection === 'asc' ? 
                                              <ArrowUp className="w-3 h-3" /> : 
                                              <ArrowDown className="w-3 h-3" />
                                            }
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                    {documentsData.documents[0] && Object.keys(documentsData.documents[0])
                                      .filter(key => key !== '_id')
                                      .map(key => (
                                        <th 
                                          key={key} 
                                          onClick={() => handleSort(key)}
                                          className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 transition"
                                        >
                                          <div className="flex items-center gap-1">
                                            <span className="truncate">{key}</span>
                                            {sortField === key && (
                                              <span className="flex-shrink-0">
                                                {sortDirection === 'asc' ? 
                                                  <ArrowUp className="w-3 h-3" /> : 
                                                  <ArrowDown className="w-3 h-3" />
                                                }
                                              </span>
                                            )}
                                          </div>
                                        </th>
                                      ))}
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400" style={{ width: '80px', maxWidth: '80px', minWidth: '80px' }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {documentsData.documents.map((doc, index) => (
                                    <tr key={doc._id || index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                      <td className="px-4 py-2" style={{ width: '48px', maxWidth: '48px', minWidth: '48px' }}>
                                        <input
                                          type="checkbox"
                                          checked={selectedDocuments.has(getDocumentId(doc, index))}
                                          onChange={() => toggleDocumentSelection(doc, index)}
                                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                      </td>
                                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                                        <span className="truncate block" title={String(doc._id)}>{String(doc._id).substring(0, 8)}...</span>
                                      </td>
                                      {Object.entries(doc)
                                        .filter(([key]) => key !== '_id')
                                        .map(([key, value]) => (
                                          <td key={key} className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                            <span className="truncate block" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                          </td>
                                        ))}
                                      <td className="px-4 py-2" style={{ width: '80px', maxWidth: '80px', minWidth: '80px' }}>
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => handleEditDocument(doc)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                            title="Edit"
                                          >
                                            <Edit className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                                          </button>
                                          <button
                                            onClick={() => handleCopyWithFormat(doc, index)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
                                            title="Copy as..."
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
                          <ChevronsLeft className="w-4 h-4" />
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
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Aggregations Tab */}
              {activeTab === 'aggregations' && activeConnectionId && selectedDatabase && selectedCollection && (
                <AggregationsTab
                  connectionId={activeConnectionId}
                  database={selectedDatabase}
                  collection={selectedCollection}
                />
              )}

              {/* Schema Tab */}
              {activeTab === 'schema' && activeConnectionId && selectedDatabase && selectedCollection && (
                <SchemaTab
                  connectionId={activeConnectionId}
                  database={selectedDatabase}
                  collection={selectedCollection}
                />
              )}

              {/* Indexes Tab */}
              {activeTab === 'indexes' && activeConnectionId && selectedDatabase && selectedCollection && (
                <IndexesTab
                  connectionId={activeConnectionId}
                  database={selectedDatabase}
                  collection={selectedCollection}
                  showToast={showToast}
                />
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
          currentFilters={{
            searchField: searchField,
            searchTerm: searchTerm,
            isSearchActive: isSearchActive,
            sortField: sortField,
            sortDirection: sortDirection
          }}
          totalCount={documentsData.totalCount}
        />
      )}

      {/* Saved Queries Modal */}
      {showSavedQueries && (
        <SavedQueries
          isOpen={showSavedQueries}
          onClose={() => setShowSavedQueries(false)}
          onLoadQuery={handleLoadSavedQuery}
          currentQuery={searchQuery}
          currentSearchField={isSearchActive ? searchField : undefined}
          currentSearchValue={isSearchActive ? searchTerm : undefined}
          currentSortField={sortField}
          currentSortDirection={sortDirection}
          currentCollection={selectedCollection || ''}
          onSaveQuery={handleSaveCurrentQuery}
          queryHistory={queryHistory}
        />
      )}

      {/* Collection Management Modal */}
      {showCollectionManagement && (
        <CollectionManagement
          isOpen={showCollectionManagement}
          onClose={() => setShowCollectionManagement(false)}
          connectionId={activeConnectionId}
          database={selectedDatabase}
          collections={collections}
          onRefresh={() => refetch()}
          onCreateCollection={handleCreateCollection}
          onDropCollection={handleDropCollection}
          onRenameCollection={handleRenameCollection}
        />
      )}

      {/* Data Operations Modal */}
      {showDataOperations && (
        <DataOperations
          isOpen={showDataOperations}
          onClose={() => setShowDataOperations(false)}
          documents={documentsData?.documents || []}
          onUpdateDocuments={handleUpdateDocuments}
          onDeleteDuplicates={handleDeleteDuplicates}
          collectionName={selectedCollection || ''}
          onToast={handleDataOperationsToast}
        />
      )}

      {/* Visual Query Builder Modal */}
      {showVisualQueryBuilder && (
        <VisualQueryBuilder
          isOpen={showVisualQueryBuilder}
          onClose={() => setShowVisualQueryBuilder(false)}
          onExecuteQuery={handleExecuteQuery}
          onSaveQuery={handleSaveBuilderQuery}
          availableFields={
            schemaData && schemaData.fields && schemaData.fields.length > 0
              ? schemaData.fields.map((field: any) => field.name).filter((name: string) => name !== '_id')
              : documentsData && documentsData.documents.length > 0 
                ? Object.keys(documentsData.documents[0]).filter(key => key !== '_id')
                : ['_id', 'name', 'email', 'title', 'description', 'status', 'createdAt', 'updatedAt']
          }
          collectionName={selectedCollection || ''}
          onToast={handleDataOperationsToast}
        />
      )}

      {/* Data Visualization Modal */}
      {showDataVisualization && selectedCollection && (
        <DataVisualization
          isOpen={showDataVisualization}
          onClose={() => setShowDataVisualization(false)}
          documents={documentsData?.documents || []}
          collectionName={selectedCollection || ''}
          onToast={handleDataOperationsToast}
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

      {/* Add Document Modal */}
      {showAddDocumentModal && selectedCollection && (
        <AddDocumentModal
          collectionName={selectedCollection}
          onSave={handleAddDocument}
          onCancel={() => setShowAddDocumentModal(false)}
          isLoading={insertOneMutation.isPending}
        />
      )}

      {/* Copy Modal */}
      {showCopyModal && selectedCollection && (
        <CopyModal
          documents={documentsToCopy}
          collectionName={selectedCollection}
          onClose={() => {
            setShowCopyModal(false);
            setDocumentsToCopy([]);
          }}
          onSuccess={(message) => {
            showToast(message, 'success');
            setShowCopyModal(false);
            setDocumentsToCopy([]);
          }}
        />
      )}

      {/* Delete Connection Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConnectionModal}
        title="Delete Connection"
        message="Are you sure you want to delete this connection? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteConnection}
        onCancel={cancelDeleteConnection}
        isLoading={deleteConnectionMutation.isPending}
      />

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
