import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Download,
  Star,
  History,
  Bookmark,
  Play,
  Save
} from 'lucide-react';

interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: any;
  searchField?: string;
  searchValue?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  collectionName: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface SavedQueriesProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadQuery: (query: any, sortField?: string, sortDirection?: 'asc' | 'desc') => void;
  currentQuery: any;
  currentSearchField?: string;
  currentSearchValue?: string;
  currentSortField?: string;
  currentSortDirection?: 'asc' | 'desc';
  currentCollection: string;
  onSaveQuery: (name: string, description: string, tags: string[]) => void;
  queryHistory: any[];
}

const PREBUILT_TEMPLATES: Omit<SavedQuery, 'id' | 'createdAt' | 'usageCount'>[] = [
  {
    name: 'All Documents',
    description: 'Get all documents from the collection',
    query: {},
    searchField: undefined,
    searchValue: undefined,
    collectionName: '',
    tags: ['basic', 'template'],
    isFavorite: true
  },
  {
    name: 'Recent Documents',
    description: 'Get documents from the last 7 days',
    query: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    searchField: 'createdAt',
    searchValue: 'last 7 days',
    collectionName: '',
    tags: ['recent', 'date', 'template'],
    isFavorite: true
  },
  {
    name: 'Active Records',
    description: 'Get documents where status is "active"',
    query: { status: { $regex: 'active', $options: 'i' } },
    searchField: 'status',
    searchValue: 'active',
    collectionName: '',
    tags: ['status', 'filter', 'template'],
    isFavorite: false
  },
  {
    name: 'Top 10 by Date',
    description: 'Get top 10 most recent documents',
    query: {},
    searchField: undefined,
    searchValue: undefined,
    sortField: 'createdAt',
    sortDirection: 'desc',
    collectionName: '',
    tags: ['recent', 'limit', 'template'],
    isFavorite: false
  },
  {
    name: 'With Email',
    description: 'Get documents that have an email field',
    query: { email: { $exists: true } },
    searchField: 'email',
    searchValue: 'exists',
    collectionName: '',
    tags: ['email', 'field', 'template'],
    isFavorite: false
  },
  {
    name: 'Duplicate Check',
    description: 'Find potential duplicate documents',
    query: { _id: { $ne: null } },
    searchField: '_id',
    searchValue: 'not null',
    collectionName: '',
    tags: ['duplicates', 'analysis', 'template'],
    isFavorite: false
  }
];

export default function SavedQueries({
  isOpen,
  onClose,
  onLoadQuery,
  currentQuery,
  currentSearchField,
  currentSearchValue,
  currentSortField,
  currentSortDirection,
  currentCollection,
  onSaveQuery,
  queryHistory
}: SavedQueriesProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'templates' | 'history'>('saved');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() => {
    const saved = localStorage.getItem('mongodb-saved-queries');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '', tags: '' });
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);

  // Save to localStorage whenever savedQueries changes
  React.useEffect(() => {
    localStorage.setItem('mongodb-saved-queries', JSON.stringify(savedQueries));
  }, [savedQueries]);

  const filteredSavedQueries = savedQueries.filter(query =>
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTemplates = PREBUILT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHistory = queryHistory.filter(item =>
    JSON.stringify(item.query).includes(searchTerm) ||
    item.collectionName.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20); // Show last 20

  const handleSaveQuery = () => {
    if (!saveForm.name.trim()) return;

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: saveForm.name,
      description: saveForm.description,
      query: currentQuery,
      searchField: currentSearchField,
      searchValue: currentSearchValue,
      sortField: currentSortField,
      sortDirection: currentSortDirection,
      collectionName: currentCollection,
      tags: saveForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    setSavedQueries(prev => [newQuery, ...prev]);
    setShowSaveModal(false);
    setSaveForm({ name: '', description: '', tags: '' });
  };

  const handleLoadQuery = (query: any, searchField?: string, sortField?: string, sortDirection?: 'asc' | 'desc') => {
    onLoadQuery(query, sortField, sortDirection);

    // Update usage count for saved queries
    if ('id' in query) {
      setSavedQueries(prev => prev.map(q => 
        q.id === query.id 
          ? { ...q, lastUsed: new Date().toISOString(), usageCount: q.usageCount + 1 }
          : q
      ));
    }

    onClose();
  };

  const handleDeleteQuery = (queryId: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== queryId));
  };

  const handleToggleFavorite = (queryId: string) => {
    setSavedQueries(prev => prev.map(q => 
      q.id === queryId ? { ...q, isFavorite: !q.isFavorite } : q
    ));
  };

  const handleEditQuery = (query: SavedQuery) => {
    setEditingQuery(query);
    setSaveForm({
      name: query.name,
      description: query.description || '',
      tags: query.tags.join(', ')
    });
    setShowSaveModal(true);
  };

  const handleUpdateQuery = () => {
    if (!editingQuery || !saveForm.name.trim()) return;

    setSavedQueries(prev => prev.map(q => 
      q.id === editingQuery.id 
        ? {
            ...q,
            name: saveForm.name,
            description: saveForm.description,
            tags: saveForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          }
        : q
    ));

    setShowSaveModal(false);
    setEditingQuery(null);
    setSaveForm({ name: '', description: '', tags: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Queries & Filters</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your saved queries, templates, and search history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { id: 'saved', label: 'Saved Queries', icon: Bookmark },
            { id: 'templates', label: 'Templates', icon: Star },
            { id: 'history', label: 'History', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'saved' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filteredSavedQueries.length} saved query{filteredSavedQueries.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Current Query
                </button>
              </div>

              {filteredSavedQueries.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No saved queries match your search' : 'No saved queries yet. Save your current query to get started!'}
                </div>
              ) : (
                filteredSavedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{query.name}</h4>
                          {query.isFavorite && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Used {query.usageCount} times
                          </span>
                        </div>
                        {query.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{query.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Collection: {query.collectionName}
                          </span>
                          {query.searchField && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Field: {query.searchField}
                              {query.searchValue && (
                                <span className="text-gray-600 dark:text-gray-300">
                                  {" = "}
                                  {query.searchValue.length > 20 
                                    ? query.searchValue.substring(0, 20) + "..." 
                                    : query.searchValue
                                  }
                                </span>
                              )}
                            </span>
                          )}
                          {query.sortField && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Sorted by: {query.sortField} ({query.sortDirection})
                            </span>
                          )}
                        </div>
                        {query.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {query.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleToggleFavorite(query.id)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                          title={query.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${query.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                        </button>
                        <button
                          onClick={() => handleEditQuery(query)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuery(query.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                        <button
                          onClick={() => handleLoadQuery(query.query, query.searchField, query.sortField, query.sortDirection)}
                          className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition"
                          title="Load query"
                        >
                          <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
              </h3>

              {filteredTemplates.map((template, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{template.name}</h4>
                        {template.isFavorite && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadQuery(template.query, template.searchField, template.sortField, template.sortDirection)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition ml-4"
                    >
                      <Play className="w-4 h-4" />
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent queries ({filteredHistory.length})
              </h3>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No query history yet. Start running queries to see them here.
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{item.collectionName}</span>
                          <span className="mx-2">•</span>
                          <span>{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          {JSON.stringify(item.query, null, 2)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoadQuery(item.query, undefined, item.sortField, item.sortDirection)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition ml-4"
                        title="Load query"
                      >
                        <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Save Query Modal */}
        <AnimatePresence>
          {showSaveModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {editingQuery ? 'Edit Query' : 'Save Query'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setEditingQuery(null);
                      setSaveForm({ name: '', description: '', tags: '' });
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Query Name *
                    </label>
                    <input
                      type="text"
                      value={saveForm.name}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter a name for this query"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={saveForm.description}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={saveForm.tags}
                      onChange={(e) => setSaveForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Comma-separated tags (e.g., user, active, recent)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setEditingQuery(null);
                      setSaveForm({ name: '', description: '', tags: '' });
                    }}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingQuery ? handleUpdateQuery : handleSaveQuery}
                    disabled={!saveForm.name.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    <Save className="w-4 h-4" />
                    {editingQuery ? 'Update Query' : 'Save Query'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}