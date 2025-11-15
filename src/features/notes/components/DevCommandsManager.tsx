import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../../api/notes';
import { DevCommand } from '../../../types/notes';
import {
  Command,
  Plus,
  Search,
  Copy,
  Star,
  Edit,
  Trash2,
  Play,
  Tag,
  Terminal
} from 'lucide-react';

interface DevCommandsManagerProps {
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export interface DevCommandsManagerHandle {
  refreshCommands: () => void;
}

type ViewMode = 'grid' | 'list';

const DevCommandsManagerComponent: React.ForwardRefRenderFunction<DevCommandsManagerHandle, DevCommandsManagerProps> = ({ 
  isCreateModalOpen = false,
  onCloseCreateModal
}, ref) => {
  const [commands, setCommands] = useState<DevCommand[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<DevCommand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<DevCommand | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Define functions before using them in useEffect
  const loadCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getDevCommands();
      setCommands(data || []);
    } catch (error) {
      console.error('Failed to load commands:', error);
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterCommands = useCallback(() => {
    let filtered = commands || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cmd =>
        cmd.name?.toLowerCase().includes(query) ||
        cmd.command?.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.category?.toLowerCase().includes(query) ||
        (cmd.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }

    setFilteredCommands(filtered);
  }, [commands, searchQuery, selectedCategory]);

  // Use external control if provided, otherwise use internal state
  const isModalOpen = isCreateModalOpen || showCreateModal;
  const setIsModalOpen = onCloseCreateModal
    ? (value: boolean) => {
        if (!value) onCloseCreateModal();
      }
    : setShowCreateModal;

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  useEffect(() => {
    filterCommands();
  }, [filterCommands]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshCommands: loadCommands
  }));

  const categories = useMemo(() => ['all', ...Array.from(new Set((commands || []).map(cmd => cmd.category).filter(Boolean)))], [commands]);

  const handleCreateCommand = useCallback(async (commandData: Partial<DevCommand>) => {
    try {
      const newCommand = await notesApi.createDevCommand(commandData);
      setCommands(prev => [newCommand, ...(prev || [])]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create command:', error);
    }
  }, [setIsModalOpen]);

  const handleUpdateCommand = useCallback(async (id: string, commandData: Partial<DevCommand>) => {
    try {
      const updatedCommand = await notesApi.updateDevCommand(id, commandData);
      setCommands(prev => (prev || []).map(cmd => cmd.id === id ? updatedCommand : cmd));
      setEditingCommand(null);
    } catch (error) {
      console.error('Failed to update command:', error);
    }
  }, []);

  const handleDeleteCommand = useCallback(async (id: string) => {
    try {
      await notesApi.deleteDevCommand(id);
      setCommands(prev => (prev || []).filter(cmd => cmd.id !== id));
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    const command = (commands || []).find(cmd => cmd.id === id);
    if (!command) return;

    try {
      await handleUpdateCommand(id, { isFavorite: !command.isFavorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, [commands, handleUpdateCommand]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading commands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dev Commands</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your personal command library</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Grid view"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <rect x="2" y="2" width="5" height="5" rx="1" />
                    <rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" />
                    <rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="List view"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <rect x="2" y="3" width="12" height="2" rx="0.5" />
                    <rect x="2" y="7" width="12" height="2" rx="0.5" />
                    <rect x="2" y="11" width="12" height="2" rx="0.5" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commands Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredCommands.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Terminal className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || selectedCategory !== 'all' ? 'No commands found' : 'No commands yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Start building your command library by adding your first command.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
            <AnimatePresence>
              {filteredCommands.map((command, index) => (
                viewMode === 'grid' ? (
                  <CommandCard 
                    key={command.id} 
                    command={command} 
                    index={index} 
                    onToggleFavorite={handleToggleFavorite}
                    onCopy={copyToClipboard}
                    onEdit={setEditingCommand}
                    onDelete={handleDeleteCommand}
                  />
                ) : (
                  <CommandRow 
                    key={command.id} 
                    command={command} 
                    onToggleFavorite={handleToggleFavorite}
                    onCopy={copyToClipboard}
                    onEdit={setEditingCommand}
                    onDelete={handleDeleteCommand}
                  />
                )
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals would go here - CreateCommandModal, EditCommandModal */}
      {isModalOpen && (
        <CommandModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreateCommand}
          title="Add New Command"
        />
      )}

      {editingCommand && (
        <CommandModal
          isOpen={!!editingCommand}
          onClose={() => setEditingCommand(null)}
          onSave={(data) => handleUpdateCommand(editingCommand.id, data)}
          initialData={editingCommand}
          title="Edit Command"
        />
      )}
    </div>
  );
}

// Command Card Component for Grid View
interface CommandCardProps {
  command: DevCommand;
  index: number;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string) => void;
  onEdit: (command: DevCommand) => void;
  onDelete: (id: string) => void;
}

const CommandCard: React.FC<CommandCardProps> = ({ 
  command, 
  index, 
  onToggleFavorite, 
  onCopy, 
  onEdit, 
  onDelete 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-5 hover:shadow-md hover:border-green-300/40 dark:hover:border-green-500/40 transition-all cursor-pointer group"
      onClick={() => onCopy(command.command)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Command className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {command.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {command.category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(command.id);
            }}
            className={`p-1.5 rounded-full transition-colors ${
              command.isFavorite
                ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Star className={`w-4 h-4 ${command.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(command);
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(command.id);
            }}
            className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium mb-1">Command:</p>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 font-mono text-sm break-all border border-gray-200 dark:border-gray-700">
            {command.command}
          </div>
        </div>
        {command.description && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium mb-1">Description:</p>
            <p className="truncate" title={command.description}>{command.description}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {command.tags?.slice(0, 3).map((tag, tagIndex) => (
            <span 
              key={tagIndex} 
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {command.tags && command.tags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              +{command.tags.length - 3}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(command.command);
          }}
          className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
      </div>
    </motion.div>
  );
};

// Command Row Component for List View
interface CommandRowProps {
  command: DevCommand;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string) => void;
  onEdit: (command: DevCommand) => void;
  onDelete: (id: string) => void;
}

const CommandRow: React.FC<CommandRowProps> = ({ 
  command, 
  onToggleFavorite, 
  onCopy, 
  onEdit, 
  onDelete 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-4 hover:shadow-sm hover:border-green-300/40 dark:hover:border-green-500/40 transition-all cursor-pointer group"
      onClick={() => onCopy(command.command)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Command className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {command.name}
              </h3>
              {command.isFavorite && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                {command.category}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {command.command}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(command.command);
            }}
            className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors text-sm flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(command.id);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                command.isFavorite
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Star className={`w-4 h-4 ${command.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(command);
              }}
              className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(command.id);
              }}
              className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {command.description && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 pl-11">
          <p className="truncate" title={command.description}>{command.description}</p>
        </div>
      )}
    </motion.div>
  );
};

// Command Modal Component (simplified version)
interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DevCommand>) => void;
  initialData?: DevCommand;
  title: string;
}

const CommandModal: React.FC<CommandModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  title 
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [command, setCommand] = useState(initialData?.command || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [usage, setUsage] = useState(initialData?.usage || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      command,
      description,
      category,
      usage,
      tags,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., git, docker, npm"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Command</label>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
              rows={2}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const DevCommandsManager = forwardRef(DevCommandsManagerComponent);
export default DevCommandsManager;
