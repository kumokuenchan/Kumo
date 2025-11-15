import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Credential } from '../../../types/notes';
import { notesApi } from '../../../api/notes';
import Toast, { ToastContainer, ToastType } from '../../../components/Toast';
import {
  Key,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  Tag,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Lock,
  Globe,
  Clock,
  User,
  Link,
  Folder,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CredentialManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'grid';
type CredentialCategory = 'all' | 'general' | 'work' | 'personal' | 'server' | 'database' | 'api';

export default function CredentialManager({ isOpen, onClose }: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [filteredCredentials, setFilteredCredentials] = useState<Credential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CredentialCategory>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<Credential | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [showCategories, setShowCategories] = useState(true);

  // Toast notification helper
  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  // Load credentials
  useEffect(() => {
    loadCredentials();
  }, []);

  // Filter credentials
  useEffect(() => {
    let result = [...credentials];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cred => 
        cred.title.toLowerCase().includes(query) ||
        cred.username.toLowerCase().includes(query) ||
        cred.description?.toLowerCase().includes(query) ||
        cred.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(cred => cred.category === selectedCategory);
    }
    
    // Apply favorites filter
    if (showFavoritesOnly) {
      result = result.filter(cred => cred.isFavorite);
    }
    
    setFilteredCredentials(result);
  }, [credentials, searchQuery, selectedCategory, showFavoritesOnly]);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getCredentials();
      setCredentials(data || []);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      showToast('Failed to load credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCredential = async (credentialData: Partial<Credential>) => {
    try {
      const newCredential = await notesApi.createCredential(credentialData);
      setCredentials(prev => [newCredential, ...prev]);
      setIsCreateModalOpen(false);
      showToast('Credential created successfully', 'success');
    } catch (error) {
      console.error('Failed to create credential:', error);
      showToast('Failed to create credential', 'error');
    }
  };

  const handleUpdateCredential = async (id: string, credentialData: Partial<Credential>) => {
    try {
      const updatedCredential = await notesApi.updateCredential(id, credentialData);
      if (updatedCredential) {
        setCredentials(prev => prev.map(cred => cred.id === id ? updatedCredential : cred));
        if (selectedCredential?.id === id) {
          setSelectedCredential(updatedCredential);
        }
        setIsEditModalOpen(false);
        showToast('Credential updated successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to update credential:', error);
      showToast('Failed to update credential', 'error');
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      await notesApi.deleteCredential(id);
      setCredentials(prev => prev.filter(cred => cred.id !== id));
      if (selectedCredential?.id === id) {
        setSelectedCredential(null);
      }
      setShowDeleteModal(false);
      setCredentialToDelete(null);
      showToast('Credential deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete credential:', error);
      showToast('Failed to delete credential', 'error');
    }
  };

  const handleDeleteClick = (credential: Credential) => {
    setCredentialToDelete(credential);
    setShowDeleteModal(true);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const handleToggleFavorite = async (credential: Credential) => {
    try {
      const newFavoriteStatus = !credential.isFavorite;
      const updated = await notesApi.updateCredential(credential.id, { isFavorite: newFavoriteStatus });
      if (updated) {
        setCredentials(prev => prev.map(cred => 
          cred.id === credential.id ? { ...cred, isFavorite: newFavoriteStatus } : cred
        ));
        if (selectedCredential?.id === credential.id) {
          setSelectedCredential({ ...selectedCredential, isFavorite: newFavoriteStatus });
        }
        showToast(newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showToast('Failed to update credential', 'error');
    }
  };

  const categories: { id: CredentialCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Credentials', icon: <Folder className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Key className="w-4 h-4" /> },
    { id: 'work', label: 'Work', icon: <User className="w-4 h-4" /> },
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'server', label: 'Servers', icon: <Globe className="w-4 h-4" /> },
    { id: 'database', label: 'Databases', icon: <DatabaseIcon className="w-4 h-4" /> },
    { id: 'api', label: 'API Keys', icon: <Lock className="w-4 h-4" /> },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Credential Manager
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Securely store and manage your credentials
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search credentials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  showFavoritesOnly
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                <span>Favorites</span>
              </button>

              {/* Add New */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Credential</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar - Categories */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  <span>Categories</span>
                  {showCategories ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showCategories && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex-1 overflow-y-auto p-2"
                  >
                    <div className="space-y-1">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`w-full px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 ${
                            selectedCategory === category.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {category.icon}
                          <span className="flex-1 text-left">{category.label}</span>
                          {category.id !== 'all' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {credentials.filter(c => c.category === category.id).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Credentials List */}
            <div className="flex-1 flex flex-col">
              {/* Results Header */}
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredCredentials.length} of {credentials.length} credentials
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                  <select className="text-sm bg-transparent border-none text-gray-700 dark:text-gray-300">
                    <option>Last Updated</option>
                    <option>Name</option>
                    <option>Category</option>
                    <option>Last Accessed</option>
                  </select>
                </div>
              </div>

              {/* Credentials Grid/List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading credentials...</p>
                    </div>
                  </div>
                ) : filteredCredentials.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center max-w-xs">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Key className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {searchQuery || selectedCategory !== 'all' || showFavoritesOnly
                          ? 'No credentials found'
                          : 'No credentials yet'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {searchQuery || selectedCategory !== 'all' || showFavoritesOnly
                          ? 'Try adjusting your filters or search terms'
                          : 'Add your first credential to get started'}
                      </p>
                      {!searchQuery && selectedCategory === 'all' && !showFavoritesOnly && (
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
                        >
                          Add Credential
                        </button>
                      )}
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCredentials.map((credential) => (
                      <CredentialCard
                        key={credential.id}
                        credential={credential}
                        isSelected={selectedCredential?.id === credential.id}
                        showPassword={showPassword[credential.id] || false}
                        onTogglePassword={() => setShowPassword(prev => ({
                          ...prev,
                          [credential.id]: !prev[credential.id]
                        }))}
                        onSelect={() => setSelectedCredential(credential)}
                        onEdit={() => {
                          setSelectedCredential(credential);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteClick(credential)}
                        onCopy={handleCopyToClipboard}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCredentials.map((credential) => (
                      <CredentialRow
                        key={credential.id}
                        credential={credential}
                        isSelected={selectedCredential?.id === credential.id}
                        showPassword={showPassword[credential.id] || false}
                        onTogglePassword={() => setShowPassword(prev => ({
                          ...prev,
                          [credential.id]: !prev[credential.id]
                        }))}
                        onSelect={() => setSelectedCredential(credential)}
                        onEdit={() => {
                          setSelectedCredential(credential);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => handleDeleteClick(credential)}
                        onCopy={handleCopyToClipboard}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create/Edit Modals */}
        <CredentialModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateCredential}
          mode="create"
        />

        {selectedCredential && (
          <CredentialModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={(data) => handleUpdateCredential(selectedCredential.id, data)}
            credential={selectedCredential}
            mode="edit"
          />
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && credentialToDelete && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Delete Credential
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete <strong>"{credentialToDelete.title}"</strong>?
                    This will permanently remove the credential and all its data.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteCredential(credentialToDelete.id)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Delete Credential
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notifications */}
        <ToastContainer>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            />
          ))}
        </ToastContainer>
      </div>
    </AnimatePresence>
  );
}

// Credential Card Component
interface CredentialCardProps {
  credential: Credential;
  isSelected: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: (text: string, label: string) => void;
  onToggleFavorite: (credential: Credential) => void;
}

function CredentialCard({
  credential,
  isSelected,
  showPassword,
  onTogglePassword,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onToggleFavorite,
}: CredentialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border transition-all cursor-pointer p-4 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/30 shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
              {credential.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {credential.username}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(credential);
          }}
          className={`p-1 rounded transition-colors ${
            credential.isFavorite
              ? 'text-yellow-500 hover:text-yellow-600'
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          <Star className={`w-4 h-4 ${credential.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Username</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-900 dark:text-gray-100 truncate max-w-[80px]">
              {credential.username}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(credential.username, 'Username');
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Password</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-900 dark:text-gray-100 font-mono truncate max-w-[80px]">
              {showPassword ? credential.password : '••••••••'}
            </span>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePassword();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                {showPassword ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(credential.password, 'Password');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {credential.url && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">URL</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[80px]">
                {credential.url.replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(credential.url || '', 'URL');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
            {credential.category}
          </span>
          {credential.tags.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-300 rounded">
              {credential.tags[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Credential Row Component
interface CredentialRowProps {
  credential: Credential;
  isSelected: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: (text: string, label: string) => void;
  onToggleFavorite: (credential: Credential) => void;
}

function CredentialRow({
  credential,
  isSelected,
  showPassword,
  onTogglePassword,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onToggleFavorite,
}: CredentialRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-lg border transition-all cursor-pointer p-4 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/30 shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Key className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {credential.title}
            </h3>
            {credential.isFavorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
            )}
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
              {credential.category}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {credential.username}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(credential.username, 'Username');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400 font-mono truncate">
                {showPassword ? credential.password : '••••••••'}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePassword();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(credential.password, 'Password');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {credential.url && (
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-blue-600 dark:text-blue-400 truncate">
                  {credential.url.replace(/^https?:\/\//, '')}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(credential.url || '', 'URL');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {credential.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {credential.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-300 rounded"
                >
                  {tag}
                </span>
              ))}
              {credential.tags.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                  +{credential.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
            <div>Updated</div>
            <div>{formatDistanceToNow(new Date(credential.updatedAt), { addSuffix: true })}</div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Credential Modal Component
interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credential: Partial<Credential>) => void;
  credential?: Credential;
  mode: 'create' | 'edit';
}

function CredentialModal({ isOpen, onClose, onSave, credential, mode }: CredentialModalProps) {
  const [title, setTitle] = useState(credential?.title || '');
  const [username, setUsername] = useState(credential?.username || '');
  const [password, setPassword] = useState(credential?.password || '');
  const [url, setUrl] = useState(credential?.url || '');
  const [description, setDescription] = useState(credential?.description || '');
  const [category, setCategory] = useState(credential?.category || 'general');
  const [tags, setTags] = useState<string[]>(credential?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isShared, setIsShared] = useState(credential?.isShared || false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (credential) {
      setTitle(credential.title);
      setUsername(credential.username);
      setPassword(credential.password);
      setUrl(credential.url || '');
      setDescription(credential.description || '');
      setCategory(credential.category || 'general');
      setTags(credential.tags || []);
      setIsShared(credential.isShared || false);
    } else {
      setTitle('');
      setUsername('');
      setPassword('');
      setUrl('');
      setDescription('');
      setCategory('general');
      setTags([]);
      setIsShared(false);
    }
  }, [credential, isOpen]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        title,
        username,
        password,
        url: url || undefined,
        description: description || undefined,
        category,
        tags,
        isShared,
        ...(mode === 'create' && {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          accessCount: 0,
        }),
        ...(mode === 'edit' && {
          id: credential?.id,
          updatedAt: new Date().toISOString(),
        }),
      });
      onClose();
    } catch (error) {
      console.error('Failed to save credential:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {mode === 'create' ? 'Add New Credential' : 'Edit Credential'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {mode === 'create' ? 'Create a new credential entry' : 'Update credential details'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="e.g., AWS Admin Account"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Username or email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Additional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Add any notes or additional information..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="general">General</option>
                        <option value="work">Work</option>
                        <option value="personal">Personal</option>
                        <option value="server">Server</option>
                        <option value="database">Database</option>
                        <option value="api">API Key</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sharing
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isShared}
                            onChange={(e) => setIsShared(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Share with team
                          </span>
                        </label>
                        {isShared && (
                          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Team access enabled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-blue-400 hover:text-blue-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        placeholder="Add a tag..."
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !title || !username || !password}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {mode === 'create' ? 'Create Credential' : 'Update Credential'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Database Icon Component
function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  );
}