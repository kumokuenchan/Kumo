import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Plus, CheckCircle, PauseCircle, AlertCircle, Clock, Wifi, WifiOff, Search, X, Trash, Settings } from 'lucide-react';
import MongoDBConnectionForm from './MongoDBConnectionForm';
import { 
  useMongoDBConnections, 
  useMongoDBDatabases, 
  useMongoDBCollections,
  useConnectToMongoDB,
  useMongoDBConnectionStats,
  useMongoDBDocuments,
  useDeleteMongoDBConnection
} from '../../hooks/useMongoDB';
import { useQueryClient } from '@tanstack/react-query';

interface MongoDBManagerProps {
  connectionId?: string | null;
}

export default function MongoDBManager({ connectionId }: MongoDBManagerProps) {
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // Fetch connections and connection stats
  const { data: connections = [], isLoading: isLoadingConnections } = useMongoDBConnections();
  const { data: connectionStats } = useMongoDBConnectionStats(activeConnectionId);
  const isConnected = !!connectionStats;
  const connectMutation = useConnectToMongoDB();
  const deleteConnectionMutation = useDeleteMongoDBConnection();
  const queryClient = useQueryClient();

  // Memoize the search query to prevent unnecessary re-renders
  const searchQuery = React.useMemo(() => {
    console.log('Building search query - state:', {
      isSearchActive,
      searchTerm: searchTerm?.trim(),
      searchField: searchField?.trim()
    });

    if (!isSearchActive || !searchTerm?.trim() || !searchField?.trim()) {
      console.log('Returning empty query - search not active or missing parameters');
      return {};
    }

    // Create MongoDB regex query for text search
    const query = {
      [searchField.trim()]: {
        $regex: searchTerm.trim(),
        $options: 'i' // Case insensitive
      }
    };

    console.log('Generated MongoDB query:', JSON.stringify(query, null, 2));

    return query;
  }, [isSearchActive, searchTerm, searchField]);
  
  // Set first connection as active when connections load
  React.useEffect(() => {
    if (connections.length > 0 && !activeConnectionId) {
      setActiveConnectionId(connections[0].id);
    }
  }, [connections, activeConnectionId]);
  
  // Auto-connect when active connection changes (with protection against loops)
  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt;
    
    if (activeConnectionId && !isConnected && !connectMutation.isPending && timeSinceLastAttempt > 3000) {
      console.log('MongoDBManager: Auto-connecting to:', activeConnectionId);
      setLastConnectionAttempt(now);
      
      connectMutation.mutate(activeConnectionId, {
        onError: (error) => {
          console.error('MongoDBManager: Auto-connect failed:', error);
        },
        onSuccess: () => {
          console.log('MongoDBManager: Auto-connect successful');
        }
      });
    }
  }, [activeConnectionId, isConnected, connectMutation.isPending, lastConnectionAttempt]);
  
  // Clear search when collection changes
  React.useEffect(() => {
    setIsSearchActive(false);
    setSearchTerm('');
    setSearchField('');
    console.log('Search cleared due to collection change');
  }, [selectedCollection]);
  
  // Fetch databases for active connection (only when connected)
  const { data: databases = [], isLoading: isLoadingDatabases } = useMongoDBDatabases(
    isConnected ? activeConnectionId : null
  );
  const { data: collections = [], isLoading: isLoadingCollections } = useMongoDBCollections(
    isConnected ? activeConnectionId : null,
    selectedDatabase
  );

  // Search handlers
  const handleSearch = () => {
    if (searchTerm.trim() && searchField.trim()) {
      console.log('Initiating search with:', { field: searchField, term: searchTerm });
      setIsSearchActive(true);
      console.log('Search activated - query will automatically update');
    } else {
      console.log('Search cancelled: missing field or term', { field: searchField, term: searchTerm });
    }
  };

  const handleClearSearch = () => {
    console.log('Clearing search');
    setSearchTerm('');
    setSearchField('');
    setIsSearchActive(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleDeleteConnection = async (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the connection
    
    if (window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      try {
        await deleteConnectionMutation.mutateAsync(connectionId);
        console.log('Connection deleted successfully');
        
        // If we deleted the active connection, clear the selection
        if (activeConnectionId === connectionId) {
          setActiveConnectionId(null);
          setSelectedDatabase(null);
          setSelectedCollection(null);
        }
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    }
  };
  
  // Fetch documents for selected collection
  const { data: documentsData, isLoading: isLoadingDocuments, refetch } = useMongoDBDocuments(
    isConnected ? activeConnectionId : null,
    selectedDatabase,
    selectedCollection,
    searchQuery,
    {
      limit: 50
    }
  );
  
  console.log('MongoDBManager: Component render', {
    connections: connections.length,
    activeConnectionId,
    selectedDatabase,
    selectedCollection,
    isLoadingConnections,
    hasDocuments: documentsData?.documents?.length || 0,
    totalDocuments: documentsData?.totalCount || 0,
    search: {
      isActive: isSearchActive,
      field: searchField,
      term: searchTerm,
      query: searchQuery
    }
  });
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                MongoDB Manager
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage MongoDB databases and collections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConnectionForm(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Connections */}
        <div className="w-80 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <div className="p-4 border-b border-gray-200 dark:border-slate-600">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              MongoDB Connections
            </h2>
          </div>
          <div className="p-2 space-y-1">
            {isLoadingConnections ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading connections...
              </div>
            ) : connections.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No MongoDB connections yet
              </div>
            ) : (
              connections.map((connection) => (
                <motion.div
                  key={connection.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setActiveConnectionId(connection.id)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    activeConnectionId === connection.id
                      ? 'bg-white dark:bg-slate-700 shadow-sm border border-green-200 dark:border-green-800'
                      : 'bg-gray-100 dark:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate flex-1 mr-2">
                      {connection.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <div className={`${
                        activeConnectionId === connection.id && isConnected 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-400'
                      }`}>
                        <Wifi className="w-3 h-3" />
                      </div>
                      <span className="text-red-500 text-sm font-bold">DEL</span>
                      <button
                        onClick={(e) => {
                          console.log('Delete button clicked for connection:', connection.id);
                          handleDeleteConnection(connection.id, e);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"
                        title="Delete connection"
                        disabled={deleteConnectionMutation.isPending}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2 truncate">
                    {connection.uri}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {connection.group && (
                        <span className="px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs">
                          {connection.group}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeConnectionId ? (
            <div className="h-full flex flex-col">
              {/* Database List */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Databases
                </h2>
                
                {isLoadingDatabases ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                    Loading databases...
                  </div>
                ) : databases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {databases.map((database) => (
                      <motion.div
                        key={database.name}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedDatabase(database.name);
                          setSelectedCollection(null);
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                          selectedDatabase === database.name
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-3 h-3 rounded-full ${selectedDatabase === database.name ? 'bg-green-500' : 'bg-green-400'}`}></div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {database.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {database.collections?.length || 0} collections
                        </p>
                        {database.size && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Size: {(database.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h4 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                      No Databases Found
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      Connected to MongoDB but no databases accessible
                    </p>
                  </div>
                )}
              </div>

              {/* Collections and Documents Area */}
              <div className="flex-1 flex">
                {/* Collections List */}
                <div className="w-2/5 p-4 border-r border-gray-200 dark:border-slate-700">
                  {selectedDatabase ? (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Collections in {selectedDatabase}
                      </h3>
                      
                      {isLoadingCollections ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          Loading collections...
                        </div>
                      ) : collections.length > 0 ? (
                        <div className="space-y-2">
                          {collections.map((collection) => (
                            <motion.div
                              key={collection.name}
                              whileHover={{ scale: 1.01 }}
                              onClick={() => setSelectedCollection(collection.name)}
                              className={`p-3 rounded-lg cursor-pointer border-2 transition ${
                                selectedCollection === collection.name
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-gray-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                    {collection.name}
                                  </h4>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {collection.documentCount || 0} documents
                                  </p>
                                </div>
                                <Database className="w-5 h-5 text-gray-400" />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          No collections found
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md">
                        <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                          Select a Database
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Choose a database from the list above to explore its collections
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents View */}
                <div className="w-3/5 p-4">
                  {selectedCollection ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          Documents in {selectedCollection}
                        </h3>
                        {documentsData && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {isSearchActive ? (
                              <>
                                {documentsData.documents.length} results
                                {documentsData.totalCount > 0 && ` of ${documentsData.totalCount} total`}
                              </>
                            ) : (
                              `${documentsData.totalCount} total`
                            )}
                          </span>
                        )}
                      </div>
                      
                      {/* Search Controls */}
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={searchField}
                              onChange={(e) => setSearchField(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Field name (e.g., name, email, address)"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Search term..."
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSearch}
                              disabled={!searchTerm.trim() || !searchField.trim()}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                            >
                              <Search className="w-4 h-4" />
                              Search
                            </button>
                            {isSearchActive && (
                              <button
                                onClick={handleClearSearch}
                                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                        {isSearchActive && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-4">
                              <span>🔍 Active search:</span>
                              <span>Field: <code className="bg-gray-200 dark:bg-slate-600 px-1 rounded">{searchField}</code></span>
                              <span>Term: <code className="bg-gray-200 dark:bg-slate-600 px-1 rounded">{searchTerm}</code></span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {isLoadingDocuments ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                          Loading documents...
                        </div>
                      ) : documentsData && documentsData.documents && documentsData.documents.length > 0 ? (
                        <div className="space-y-3 max-h-[700px] overflow-y-auto">
                          {documentsData.documents.map((doc, index) => (
                            <motion.div
                              key={doc._id || index}
                              whileHover={{ scale: 1.01 }}
                              className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                                  {doc._id?.toString() || 'No ID'}
                                </div>
                                <Database className="w-3 h-3 text-gray-400" />
                              </div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-xs leading-snug">
                                  {JSON.stringify(doc, null, 2)}
                                </pre>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h4 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                            No Documents
                          </h4>
                          <p className="text-gray-500 dark:text-gray-400">
                            This collection is empty or contains no readable documents
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md">
                        <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                          Select a Collection
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Choose a collection from the list to view its documents
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Database className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl text-gray-600 mb-2">No Active Connection</h2>
                <p className="text-gray-500 mb-4">
                  Select a connection from the sidebar to start managing your MongoDB databases
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConnectionForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Add MongoDB Connection
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Form Modal */}
      {showConnectionForm && (
        <MongoDBConnectionForm
          connection={undefined}
          onSuccess={() => {
            console.log('MongoDBManager: Form success - closing modal');
            setShowConnectionForm(false);
          }}
          onCancel={() => {
            console.log('MongoDBManager: Form cancel - closing modal');
            setShowConnectionForm(false);
          }}
        />
      )}
    </div>
  );
}
