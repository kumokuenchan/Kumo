import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, Plus, X, Search, ChevronRight, ChevronDown, Trash2, Edit2, Save, Upload, Download, FolderOpen } from 'lucide-react';
import { apiTesterStorage, type Collection, type SavedRequest } from '../../services/apiTesterStorage';
import type { ApiRequest } from '../../api/apiTester';
import { downloadPostmanCollection } from '../../utils/postmanExporter';
import Toast from '../../components/Toast';
import * as yaml from 'js-yaml';

interface CollectionsPanelProps {
  onLoadRequest: (request: ApiRequest, name?: string) => void;
  onLoadCollectionAsGroup?: (collection: Collection) => void;
  onClose: () => void;
  currentRequest?: ApiRequest;
  asSidebar?: boolean; // New prop to render as sidebar instead of overlay
}

export default function CollectionsPanel({ onLoadRequest, onLoadCollectionAsGroup, onClose, asSidebar = false }: CollectionsPanelProps) {
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
  const [showImportMenu, setShowImportMenu] = useState(false);

  // Sortable helpers
  const SortableCollectionRow: React.FC<{ id: string; children: (dragProps: { attributes: any; listeners: any }) => React.ReactNode }>
    = ({ id, children }) => {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
    return (
      <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
        {children({ attributes, listeners })}
      </div>
    );
  };

  const SortableRequestRow: React.FC<{ id: string; children: (dragProps: { attributes: any; listeners: any }) => React.ReactNode }>
    = ({ id, children }) => {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
    return (
      <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
        {children({ attributes, listeners })}
      </div>
    );
  };

  const onCollectionsDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCollections(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id);
      const newIndex = prev.findIndex(c => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      apiTesterStorage.reorderCollections(next.map(c => c.id));
      return next;
    });
  };

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

  const handleLoadRequest = (request: ApiRequest, name?: string) => {
    onLoadRequest(request, name);
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
    <div className={`${asSidebar ? 'h-full' : 'absolute right-0 top-12 bottom-0 w-96 shadow-lg z-10'} bg-white dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 flex flex-col`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Collections
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {asSidebar ? (
              <>
                <button
                  onClick={() => { const all = new Set<string>(); collections.forEach(c => all.add(c.id)); setExpandedCollections(all); }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Expand all"
                >
                  <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setExpandedCollections(new Set())}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="Collapse all"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setShowNewCollection(true)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  title="New collection"
                >
                  <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowImportMenu(v => !v)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Import"
                  >
                    <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <AnimatePresence>
                    {showImportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="absolute right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-lg z-10 w-56 py-1"
                      >
                        <button onClick={() => { setShowImportMenu(false); handleImportPostmanClick(); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"><Upload className="w-4 h-4" /> Import Postman (JSON)</button>
                        <button onClick={() => { setShowImportMenu(false); handleImportSwaggerClick(); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"><Upload className="w-4 h-4" /> Import Swagger/OpenAPI</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className={`relative ${asSidebar ? '' : 'mb-3'}`}>
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* New Collection / Import Buttons - Only show when not in sidebar mode */}
        {!asSidebar && (
          <>
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
          </>
        )}
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
          <DndContext collisionDetection={closestCenter} onDragEnd={onCollectionsDragEnd}>
            <SortableContext items={filteredCollections.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {filteredCollections.map((collection) => (
              <SortableCollectionRow key={collection.id} id={collection.id}>
              {({ attributes, listeners }) => (
              <motion.div layout className="border-b border-gray-200 dark:border-slate-700">
                {/* Collection Header */}
                <div className="group p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 transition-all duration-200">
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
                                <h4
                                  className="text-sm font-semibold text-gray-900 dark:text-white whitespace-normal break-words"
                                  title={collection.name}
                                >
                                  {collection.name}
                                </h4>
                              {collection.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {collection.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Drag handle for collection */}
                              <button
                                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                title="Drag to reorder"
                                {...attributes}
                                {...listeners}
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
                              </button>
                              {onLoadCollectionAsGroup && collection.requests.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLoadCollectionAsGroup(collection);
                                    onClose();
                                  }}
                                  className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  title="Open all requests as group"
                                >
                                  <FolderOpen className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                </button>
                              )}
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
                <AnimatePresence initial={false}>
                {expandedCollections.has(collection.id) && (
                  <motion.div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10"
                    initial={{ opacity: 0, scaleY: 0.98 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.98 }}
                    transition={{ duration: 0.12 }}
                    style={{ transformOrigin: 'top' }}
                  >
                    {collection.requests.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        No requests in this collection
                      </div>
                    ) : (
                      <DndContext
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          setCollections(prev => {
                            const next = prev.map(c => ({ ...c, requests: [...c.requests] }));
                            const col = next.find(c => c.id === collection.id);
                            if (!col) return prev;
                            const oldIndex = col.requests.findIndex(r => r.id === active.id);
                            const newIndex = col.requests.findIndex(r => r.id === over.id);
                            if (oldIndex === -1 || newIndex === -1) return prev;
                            col.requests = arrayMove(col.requests, oldIndex, newIndex);
                            apiTesterStorage.reorderRequests(collection.id, col.requests.map(r => r.id));
                            return next;
                          });
                        }}
                      >
                        <SortableContext items={collection.requests.map(r => r.id)} strategy={verticalListSortingStrategy}>
                      {collection.requests.map((request) => (
                        <SortableRequestRow key={request.id} id={request.id}>
                        {({ attributes: rAttr, listeners: rListen }) => (
                        <div className="group pl-8 pr-3 py-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border-t border-gray-200 dark:border-slate-700 transition-all duration-200">
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
                                onClick={() => handleLoadRequest(request.request, request.name)}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm ${
                                        request.request.method === 'GET'
                                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                                          : request.request.method === 'POST'
                                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                                          : request.request.method === 'PUT'
                                          ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25'
                                          : request.request.method === 'DELETE'
                                          ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/25'
                                          : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                                      }`}
                                    >
                                      {request.request.method}
                                    </span>
                                    <span
                                      className="text-sm font-medium text-gray-900 dark:text-white truncate"
                                      title={request.name}
                                    >
                                      {request.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Drag handle for request */}
                                    <button
                                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-blue-900/20"
                                      title="Drag to reorder"
                                      {...rAttr}
                                      {...rListen}
                                    >
                                      <FolderOpen className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                                    </button>
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
                        )}
                        </SortableRequestRow>
                      ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
              )}
              </SortableCollectionRow>
            ))}
            </SortableContext>
          </DndContext>
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
