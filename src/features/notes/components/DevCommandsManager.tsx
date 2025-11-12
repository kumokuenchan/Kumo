import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../../api/notes';
import { DevCommand } from '../../../types/notes';
import {
  Command,
  Plus,
  Search,
  Copy,
  Star,
  StarOff,
  Edit,
  Trash2,
  Play,
  Tag,
  Terminal
} from 'lucide-react';

export default function DevCommandsManager() {
  const [commands, setCommands] = useState<DevCommand[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<DevCommand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<DevCommand | null>(null);

  useEffect(() => {
    loadCommands();
  }, []);

  useEffect(() => {
    filterCommands();
  }, [commands, searchQuery, selectedCategory]);

  const loadCommands = async () => {
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
  };

  const filterCommands = () => {
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
  };

  const categories = ['all', ...Array.from(new Set((commands || []).map(cmd => cmd.category).filter(Boolean)))];

  const handleCreateCommand = async (commandData: Partial<DevCommand>) => {
    try {
      const newCommand = await notesApi.createDevCommand(commandData);
      setCommands(prev => [newCommand, ...(prev || [])]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create command:', error);
    }
  };

  const handleUpdateCommand = async (id: string, commandData: Partial<DevCommand>) => {
    try {
      const updatedCommand = await notesApi.updateDevCommand(id, commandData);
      setCommands(prev => (prev || []).map(cmd => cmd.id === id ? updatedCommand : cmd));
      setEditingCommand(null);
    } catch (error) {
      console.error('Failed to update command:', error);
    }
  };

  const handleDeleteCommand = async (id: string) => {
    try {
      await notesApi.deleteDevCommand(id);
      setCommands(prev => (prev || []).filter(cmd => cmd.id !== id));
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const command = (commands || []).find(cmd => cmd.id === id);
    if (!command) return;

    try {
      await handleUpdateCommand(id, { isFavorite: !command.isFavorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Add Command
          </motion.button>
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

      {/* Commands Grid */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCommands.map((command, index) => (
                <motion.div
                  key={command.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {command.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {command.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(command.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        command.isFavorite 
                          ? 'text-yellow-500 hover:text-yellow-600' 
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      {command.isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {command.description}
                  </p>

                  {/* Command */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Command</span>
                      <button
                        onClick={() => copyToClipboard(command.command)}
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <code className="text-sm text-gray-800 dark:text-gray-200 font-mono break-all">
                      {command.command}
                    </code>
                  </div>

                  {/* Usage */}
                  {command.usage && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Usage</span>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {command.usage}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {command.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {command.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-full flex items-center gap-1">
                          <Tag className="w-2 h-2" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => copyToClipboard(command.command)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Copy Command"
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => setEditingCommand(command)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Edit Command"
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteCommand(command.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Delete Command"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(command.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals would go here - CreateCommandModal, EditCommandModal */}
      {showCreateModal && (
        <CommandModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
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
