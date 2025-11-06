import { useState, useRef } from 'react';
import { Folder, Plus, X, Search, ChevronRight, ChevronDown, Trash2, Edit2, Save, Upload, Download } from 'lucide-react';
import { apiTesterStorage, type Collection, type SavedRequest } from '../../services/apiTesterStorage';
import type { ApiRequest } from '../../api/apiTester';
import { downloadPostmanCollection } from '../../utils/postmanExporter';
import Toast from '../../components/Toast';
import * as yaml from 'js-yaml';

interface CollectionsPanelProps {
  onLoadRequest: (request: ApiRequest) => void;
  onClose: () => void;
  currentRequest?: ApiRequest;
}

export default function CollectionsPanel({ onLoadRequest, onClose }: CollectionsPanelProps) {
  const [collections, setCollections] = useState<Collection[]>(apiTesterStorage.getCollections());
  const [search, setSearch] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const importPostmanInputRef = useRef<HTMLInputElement>(null);
  const importSwaggerInputRef = useRef<HTMLInputElement>(null);

  const refreshCollections = () => {
    setCollections(apiTesterStorage.getCollections());
  };

  const handleImportPostmanClick = () => {
    importPostmanInputRef.current?.click();
  };

  const handleImportSwaggerClick = () => {
    importSwaggerInputRef.current?.click();
  };

  const handleImportPostmanFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    // Reset input so selecting the same file again triggers change
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const created = apiTesterStorage.importPostmanCollection(json);
      if (created) {
        refreshCollections();
        // Expand the newly created collection
        const next = new Set(expandedCollections);
        next.add(created.id);
        setExpandedCollections(next);
        setToast({
          message: `Imported collection: ${created.name} (${created.requests.length} request${created.requests.length !== 1 ? 's' : ''})`,
          type: 'success'
        });
      } else {
        setToast({
          message: 'Failed to import collection. Unsupported or invalid file.',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setToast({
        message: 'Failed to import collection. Ensure it is a valid Postman collection JSON.',
        type: 'error'
      });
    }
  };

  const handleImportSwaggerFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    // Reset input so selecting the same file again triggers change
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      let spec: any;

      // Try to parse as JSON first, then YAML
      try {
        spec = JSON.parse(text);
      } catch {
        // If JSON parsing fails, try YAML
        try {
          spec = yaml.load(text);
        } catch (yamlErr) {
          throw new Error('File is neither valid JSON nor YAML');
        }
      }

      const created = apiTesterStorage.importSwaggerSpec(spec);
      if (created) {
        refreshCollections();
        // Expand the newly created collection
        const next = new Set(expandedCollections);
        next.add(created.id);
        setExpandedCollections(next);
        setToast({
          message: `Imported Swagger API: ${created.name} (${created.requests.length} endpoint${created.requests.length !== 1 ? 's' : ''})`,
          type: 'success'
        });
      } else {
        setToast({
          message: 'Failed to import Swagger spec. Unsupported or invalid file.',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setToast({
        message: 'Failed to import Swagger spec. Ensure it is a valid Swagger/OpenAPI JSON or YAML file.',
        type: 'error'
      });
    }
  };

  const toggleCollection = (id: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCollections(newExpanded);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      apiTesterStorage.createCollection(newCollectionName, newCollectionDescription || undefined);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setShowNewCollection(false);
      refreshCollections();
    }
  };

  const handleDeleteCollection = (id: string) => {
    if (confirm('Are you sure you want to delete this collection and all its requests?')) {
      apiTesterStorage.deleteCollection(id);
      refreshCollections();
    }
  };

  const handleDeleteRequest = (collectionId: string, requestId: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      apiTesterStorage.deleteRequestFromCollection(collectionId, requestId);
      refreshCollections();
    }
  };

  const handleSaveCollectionEdit = (collectionId: string) => {
    apiTesterStorage.updateCollection(collectionId, {
      name: editName,
      description: editDescription || undefined,
    });
    setEditingCollection(null);
    refreshCollections();
  };

  const handleSaveRequestEdit = (collectionId: string, requestId: string) => {
    apiTesterStorage.updateRequestInCollection(collectionId, requestId, {
      name: editName,
      description: editDescription || undefined,
    });
    setEditingRequest(null);
    refreshCollections();
  };

  const startEditCollection = (collection: Collection) => {
    setEditingCollection(collection.id);
    setEditName(collection.name);
    setEditDescription(collection.description || '');
  };

  const startEditRequest = (request: SavedRequest) => {
    setEditingRequest(request.id);
    setEditName(request.name);
    setEditDescription(request.description || '');
  };

  const handleLoadRequest = (request: ApiRequest) => {
    onLoadRequest(request);
    onClose();
  };

  const filteredCollections = search
    ? collections.filter(collection =>
        collection.name.toLowerCase().includes(search.toLowerCase()) ||
        collection.requests.some(req =>
          req.name.toLowerCase().includes(search.toLowerCase()) ||
          req.request.url.toLowerCase().includes(search.toLowerCase())
        )
      )
    : collections;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="absolute right-0 top-12 bottom-0 w-96 bg-white dark:bg-slate-800 border-l border-gray-300 dark:border-slate-700 shadow-lg flex flex-col z-10">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Collections
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* New Collection / Import Buttons */}
        <button
          onClick={() => setShowNewCollection(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </button>

        <div className="mt-2 space-y-2">
          {/* Postman Import */}
          <input
            ref={importPostmanInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportPostmanFile}
          />
          <button
            onClick={handleImportPostmanClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Import a Postman collection (.json)"
          >
            <Upload className="w-4 h-4" />
            Import Postman
          </button>

          {/* Swagger/OpenAPI Import */}
          <input
            ref={importSwaggerInputRef}
            type="file"
            accept="application/json,.json,.yaml,.yml"
            className="hidden"
            onChange={handleImportSwaggerFile}
          />
          <button
            onClick={handleImportSwaggerClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"
            title="Import a Swagger/OpenAPI spec (.json or .yaml)"
          >
            <Upload className="w-4 h-4" />
            Import Swagger/OpenAPI
          </button>
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {/* New Collection Form */}
        {showNewCollection && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 mb-2"
              autoFocus
            />
            <input
              type="text"
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewCollection(false);
                  setNewCollectionName('');
                  setNewCollectionDescription('');
                }}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Collections */}
        {filteredCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <Folder className="w-12 h-12 mb-3 text-gray-400 dark:text-gray-600" />
            <p className="text-sm">
              {search ? 'No matching collections found' : 'No collections yet'}
            </p>
            <p className="text-xs mt-1">
              {search ? 'Try a different search term' : 'Create a collection to organize your requests'}
            </p>
          </div>
        ) : (
          <div>
            {filteredCollections.map((collection) => (
              <div key={collection.id} className="border-b border-gray-200 dark:border-slate-700">
                {/* Collection Header */}
                <div className="group p-3 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleCollection(collection.id)}
                      className="mt-0.5 p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                    >
                      {expandedCollections.has(collection.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingCollection === collection.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveCollectionEdit(collection.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCollection(null)}
                              className="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleCollection(collection.id)}
                            >
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {collection.name}
                              </h4>
                              {collection.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {collection.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadPostmanCollection(collection);
                                }}
                                className="p-1 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                                title="Export to Postman format"
                              >
                                <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditCollection(collection);
                                }}
                                className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCollection(collection.id);
                                }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{collection.requests.length} {collection.requests.length === 1 ? 'request' : 'requests'}</span>
                            <span>•</span>
                            <span>Created {formatDate(collection.createdAt)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collection Requests */}
                {expandedCollections.has(collection.id) && (
                  <div className="bg-gray-50 dark:bg-slate-900">
                    {collection.requests.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        No requests in this collection
                      </div>
                    ) : (
                      collection.requests.map((request) => (
                        <div
                          key={request.id}
                          className="group pl-8 pr-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 border-t border-gray-200 dark:border-slate-700"
                        >
                          {editingRequest === request.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveRequestEdit(collection.id, request.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingRequest(null)}
                                  className="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div
                                className="cursor-pointer"
                                onClick={() => handleLoadRequest(request.request)}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                        request.request.method === 'GET'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                          : request.request.method === 'POST'
                                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                          : request.request.method === 'PUT'
                                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                          : request.request.method === 'DELETE'
                                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                      }`}
                                    >
                                      {request.request.method}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {request.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditRequest(request);
                                      }}
                                      className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    >
                                      <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRequest(collection.id, request.id);
                                      }}
                                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                                    </button>
                                  </div>
                                </div>

                                {request.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                                    {request.description}
                                  </p>
                                )}

                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={request.request.url}>
                                  {request.request.url}
                                </div>

                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formatDate(request.createdAt)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
