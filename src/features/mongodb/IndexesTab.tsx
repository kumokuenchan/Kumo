import React, { useState } from 'react';
import { Plus, Trash2, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { useMongoDBIndexes, useCreateMongoDBIndex, useDropMongoDBIndex } from '../../hooks/useMongoDB';

interface IndexesTabProps {
  connectionId: string;
  database: string;
  collection: string;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function IndexesTab({ connectionId, database, collection, showToast }: IndexesTabProps) {
  const { data, isLoading, refetch } = useMongoDBIndexes(connectionId, database, collection);
  const createIndexMutation = useCreateMongoDBIndex();
  const dropIndexMutation = useDropMongoDBIndex();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIndexKeys, setNewIndexKeys] = useState('{ "fieldName": 1 }');
  const [newIndexOptions, setNewIndexOptions] = useState('{ "unique": false }');
  const [error, setError] = useState<string | null>(null);

  const handleCreateIndex = async () => {
    try {
      setError(null);
      const keys = JSON.parse(newIndexKeys);
      const options = JSON.parse(newIndexOptions);

      await createIndexMutation.mutateAsync({
        connectionId,
        database,
        collection,
        keys,
        options
      });

      setShowCreateForm(false);
      setNewIndexKeys('{ "fieldName": 1 }');
      setNewIndexOptions('{ "unique": false }');
      showToast('Index created successfully', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to create index');
    }
  };

  const handleDropIndex = async (indexName: string) => {
    if (indexName === '_id_') {
      showToast('Cannot drop the _id index', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to drop the index "${indexName}"?`)) {
      return;
    }

    try {
      await dropIndexMutation.mutateAsync({
        connectionId,
        database,
        collection,
        indexName
      });

      showToast('Index dropped successfully', 'success');
    } catch (err: any) {
      showToast('Failed to drop index: ' + err.message, 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f9fbfa] dark:bg-[#0d1117]">
      {/* Header */}
      <div className="bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Indexes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage indexes for <span className="font-mono text-green-600 dark:text-green-400">{collection}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Index
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Create Index Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Create New Index</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Index Keys (JSON)
                </label>
                <textarea
                  value={newIndexKeys}
                  onChange={(e) => setNewIndexKeys(e.target.value)}
                  className="w-full p-2 font-mono text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder='{ "email": 1, "createdAt": -1 }'
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1 for ascending, -1 for descending
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Options (JSON)
                </label>
                <textarea
                  value={newIndexOptions}
                  onChange={(e) => setNewIndexOptions(e.target.value)}
                  className="w-full p-2 font-mono text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder='{ "unique": true, "sparse": false }'
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                  }}
                  className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIndex}
                  disabled={createIndexMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition"
                >
                  {createIndexMutation.isPending ? 'Creating...' : 'Create Index'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indexes List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : !data || data.indexes.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No indexes found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.indexes.map((index: any) => (
              <div
                key={index.name}
                className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <code className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {index.name}
                      </code>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Keys:</p>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                          <code className="text-xs font-mono text-gray-800 dark:text-gray-200">
                            {JSON.stringify(index.key, null, 2)}
                          </code>
                        </div>
                      </div>

                      {index.unique && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          Unique
                        </div>
                      )}

                      {index.sparse && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs ml-2">
                          Sparse
                        </div>
                      )}
                    </div>
                  </div>

                  {index.name !== '_id_' && (
                    <button
                      onClick={() => handleDropIndex(index.name)}
                      disabled={dropIndexMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                      title="Drop index"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
