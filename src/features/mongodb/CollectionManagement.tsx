import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Database,
  Table2,
  Trash2,
  BarChart3,
  Activity,
  HardDrive,
  Layers,
  Clock,
  Search,
  Edit3,
  MoreVertical,
  AlertTriangle,
  Info
} from 'lucide-react';

interface CollectionStats {
  name: string;
  documentCount: number;
  size: {
    total: number;
    data: number;
    index: number;
  };
  indexCount: number;
  avgDocumentSize: number;
  storage: {
    free: number;
    used: number;
  };
  performance: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
  };
  lastActivity: string;
}

interface CollectionManagementProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string | null;
  database: string | null;
  collections: any[];
  onRefresh: () => void;
  onCreateCollection: (name: string, options: any) => Promise<void>;
  onDropCollection: (name: string) => Promise<void>;
  onRenameCollection: (oldName: string, newName: string) => Promise<void>;
}

export default function CollectionManagement({
  isOpen,
  onClose,
  connectionId,
  database,
  collections,
  onRefresh,
  onCreateCollection,
  onDropCollection,
  onRenameCollection
}: CollectionManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'stats'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    validation: false,
    maxDocuments: '',
    size: '',
    storageEngine: 'wiredTiger'
  });
  const [dropForm, setDropForm] = useState({
    confirmName: '',
    confirmText: 'DROP'
  });
  const [renameForm, setRenameForm] = useState({
    newName: ''
  });
  const [collectionStats, setCollectionStats] = useState<Map<string, CollectionStats>>(new Map());

  // Mock data for demonstration - in real app this would come from API
  const getMockStats = (collectionName: string): CollectionStats => ({
    name: collectionName,
    documentCount: Math.floor(Math.random() * 10000) + 100,
    size: {
      total: Math.floor(Math.random() * 500) + 50,
      data: Math.floor(Math.random() * 400) + 40,
      index: Math.floor(Math.random() * 100) + 10
    },
    indexCount: Math.floor(Math.random() * 10) + 1,
    avgDocumentSize: Math.floor(Math.random() * 500) + 50,
    storage: {
      free: Math.floor(Math.random() * 1000) + 500,
      used: Math.floor(Math.random() * 200) + 100
    },
    performance: {
      lastHour: Math.floor(Math.random() * 1000) + 50,
      lastDay: Math.floor(Math.random() * 5000) + 200,
      lastWeek: Math.floor(Math.random() * 20000) + 1000
    },
    lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCollection = async () => {
    if (!createForm.name.trim()) return;

    try {
      const options: any = {
        validationLevel: createForm.validation ? 'strict' : 'off'
      };

      if (createForm.maxDocuments) {
        options.max = parseInt(createForm.maxDocuments);
      }

      if (createForm.size) {
        options.size = parseInt(createForm.size) * 1024 * 1024; // Convert MB to bytes
      }

      await onCreateCollection(createForm.name, options);
      
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        validation: false,
        maxDocuments: '',
        size: '',
        storageEngine: 'wiredTiger'
      });
      
      onRefresh();
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleDropCollection = async () => {
    if (!selectedCollection || dropForm.confirmName !== selectedCollection.name) return;

    try {
      await onDropCollection(selectedCollection.name);
      setShowDropModal(false);
      setSelectedCollection(null);
      setDropForm({ confirmName: '', confirmText: 'DROP' });
      onRefresh();
    } catch (error) {
      console.error('Failed to drop collection:', error);
    }
  };

  const handleRenameCollection = async () => {
    if (!selectedCollection || !renameForm.newName.trim()) return;

    try {
      await onRenameCollection(selectedCollection.name, renameForm.newName);
      setShowRenameModal(false);
      setSelectedCollection(null);
      setRenameForm({ newName: '' });
      onRefresh();
    } catch (error) {
      console.error('Failed to rename collection:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Collection Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage collections in database: <span className="font-medium">{database}</span>
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
            { id: 'overview', label: 'Overview', icon: Table2 },
            { id: 'create', label: 'Create Collection', icon: Plus },
            { id: 'stats', label: 'Statistics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
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
        {activeTab === 'overview' && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search collections..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {filteredCollections.length} Collection{filteredCollections.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  New Collection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCollections.map((collection) => {
                  const stats = collectionStats.get(collection.name) || getMockStats(collection.name);
                  return (
                    <div
                      key={collection.name}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {collection.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatNumber(collection.documentCount || 0)} documents
                          </p>
                        </div>
                        <div className="relative">
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Size:</span>
                          <span>{formatBytes(stats.size.total * 1024 * 1024)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Indexes:</span>
                          <span>{stats.indexCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Last activity:</span>
                          <span>{formatDate(stats.lastActivity)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => {
                            setSelectedCollection(collection);
                            setShowRenameModal(true);
                            setRenameForm({ newName: collection.name });
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition"
                        >
                          <Edit3 className="w-3 h-3 inline mr-1" />
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCollection(collection);
                            setShowDropModal(true);
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          Drop
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Create New Collection
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter collection name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Storage Engine
                  </label>
                  <select
                    value={createForm.storageEngine}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, storageEngine: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                  >
                    <option value="wiredTiger">WiredTiger (Recommended)</option>
                    <option value="inMemory">In-Memory</option>
                    <option value="mmapv1">MMAPv1 (Legacy)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Documents
                    </label>
                    <input
                      type="number"
                      value={createForm.maxDocuments}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, maxDocuments: e.target.value }))}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Size (MB)
                    </label>
                    <input
                      type="number"
                      value={createForm.size}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, size: e.target.value }))}
                      placeholder="Auto"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="validation"
                    checked={createForm.validation}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, validation: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="validation" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Enable document validation
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleCreateCollection}
                    disabled={!createForm.name.trim()}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition font-medium"
                  >
                    Create Collection
                  </button>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Database Statistics
              </h3>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Table2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Collections</p>
                      <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{collections.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400">Total Documents</p>
                      <p className="text-2xl font-semibold text-green-700 dark:text-green-300">
                        {formatNumber(collections.reduce((sum, c) => sum + (c.documentCount || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 dark:text-purple-400">Storage Used</p>
                      <p className="text-2xl font-semibold text-purple-700 dark:text-purple-300">
                        {formatNumber(collections.reduce((sum, c) => sum + (Math.random() * 500 + 50), 0))} MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Total Indexes</p>
                      <p className="text-2xl font-semibold text-orange-700 dark:text-orange-300">
                        {formatNumber(collections.reduce((sum, c) => sum + (Math.floor(Math.random() * 10) + 1), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collection Performance Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Collection Performance
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Collection
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Documents
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Size
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Indexes
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Last Activity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCollections.map((collection) => {
                        const stats = collectionStats.get(collection.name) || getMockStats(collection.name);
                        return (
                          <tr key={collection.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {collection.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatNumber(collection.documentCount || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatBytes(stats.size.total * 1024 * 1024)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {stats.indexCount}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(stats.lastActivity)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${Math.min(100, (stats.performance.lastHour / 1000) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {stats.performance.lastHour} ops/hr
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drop Collection Modal */}
        <AnimatePresence>
          {showDropModal && selectedCollection && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Drop Collection</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-300">Warning</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      You are about to drop the collection <strong>"{selectedCollection.name}"</strong>. 
                      All documents and indexes in this collection will be permanently deleted.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type <strong>"{selectedCollection.name}"</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      value={dropForm.confirmName}
                      onChange={(e) => setDropForm(prev => ({ ...prev, confirmName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setShowDropModal(false);
                      setSelectedCollection(null);
                      setDropForm({ confirmName: '', confirmText: 'DROP' });
                    }}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDropCollection}
                    disabled={dropForm.confirmName !== selectedCollection.name}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Drop Collection
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rename Collection Modal */}
        <AnimatePresence>
          {showRenameModal && selectedCollection && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl w-full max-w-md"
              >
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rename Collection</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Current: <strong>{selectedCollection.name}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Collection Name
                    </label>
                    <input
                      type="text"
                      value={renameForm.newName}
                      onChange={(e) => setRenameForm(prev => ({ ...prev, newName: e.target.value }))}
                      placeholder="Enter new name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setShowRenameModal(false);
                      setSelectedCollection(null);
                      setRenameForm({ newName: '' });
                    }}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameCollection}
                    disabled={!renameForm.newName.trim() || renameForm.newName === selectedCollection.name}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition flex items-center gap-2 font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    Rename Collection
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