import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Plus, CheckCircle, PauseCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import MongoDBConnectionForm from './MongoDBConnectionForm';
import { 
  useMongoDBConnections, 
  useMongoDBDatabases, 
  useMongoDBCollections,
  useConnectToMongoDB,
  useMongoDBConnectionStats
} from '../../hooks/useMongoDB';

interface MongoDBManagerProps {
  connectionId?: string | null;
}

export default function MongoDBManager({ connectionId }: MongoDBManagerProps) {
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState<number>(0);
  
  // Fetch connections and connection stats
  const { data: connections = [], isLoading: isLoadingConnections } = useMongoDBConnections();
  const { data: connectionStats } = useMongoDBConnectionStats(activeConnectionId);
  const isConnected = !!connectionStats;
  const connectMutation = useConnectToMongoDB();
  
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
  
  // Fetch databases for active connection (only when connected)
  const { data: databases = [], isLoading: isLoadingDatabases } = useMongoDBDatabases(
    isConnected ? activeConnectionId : null
  );
  const { data: collections = [], isLoading: isLoadingCollections } = useMongoDBCollections(
    isConnected ? activeConnectionId : null,
    selectedDatabase
  );
  
  console.log('MongoDBManager: Component render', {
    connections: connections.length,
    activeConnectionId,
    selectedDatabase,
    isLoadingConnections
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
                    <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {connection.name}
                    </h3>
                    <div className={`flex items-center gap-1 ${
                      activeConnectionId === connection.id && isConnected 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-400'
                    }`}>
                      <Wifi className="w-3 h-3" />
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
                <div className="w-1/2 p-4 border-r border-gray-200 dark:border-slate-700">
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
                <div className="w-1/2 p-4">
                  {selectedCollection ? (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Documents in {selectedCollection}
                      </h3>
                      
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h4 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                          Document Viewer
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400">
                          Document browsing functionality can be added here
                        </p>
                      </div>
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
