import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../../api/notes';
import { Developer, DeveloperTask } from '../../../types/notes';
import {
  Users,
  Plus,
  Search,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Mail,
  Calendar,
  Target,
  MessageSquare,
  MoreVertical
} from 'lucide-react';

export default function TeamManagement() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [tasks, setTasks] = useState<DeveloperTask[]>([]);
  const [selectedDeveloper, setSelectedDeveloper] = useState<Developer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'team' | 'tasks'>('team');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [developersData, tasksData] = await Promise.all([
        notesApi.getDevelopers(),
        notesApi.getDeveloperTasks()
      ]);
      setDevelopers(developersData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Failed to load team data:', error);
      // Set empty arrays on error to prevent undefined issues
      setDevelopers([]);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDeveloper = async (developerData: Partial<Developer>) => {
    try {
      const newDeveloper = await notesApi.createDeveloper(developerData);
      setDevelopers(prev => [newDeveloper, ...(prev || [])]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create developer:', error);
    }
  };

  const filteredDevelopers = (developers || []).filter(dev =>
    dev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dev.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dev.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dev.skills || []).some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'busy': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'away': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'offline': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'junior': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'mid': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
      case 'senior': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'lead': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading team data...</p>
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
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Team Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track your team's progress and tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('team')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeView === 'team'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Team
            </button>
            <button
              onClick={() => setActiveView('tasks')}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                activeView === 'tasks'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Tasks
            </button>
            {activeView === 'team' && (
              <motion.button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                Add Developer
              </motion.button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeView}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeView === 'team' ? (
          filteredDevelopers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? 'No developers found' : 'No team members yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery 
                    ? 'Try adjusting your search query.'
                    : 'Start building your team by adding your first developer.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredDevelopers.map((developer, index) => (
                  <motion.div
                    key={developer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedDeveloper(developer)}
                  >
                    {/* Developer Info */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {developer.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {developer.email}
                        </p>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Role and Level */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs font-medium rounded-full">
                        {developer.role}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(developer.level)}`}>
                        {developer.level}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(developer.availability)}`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        {developer.availability}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {developer.currentTasks.length} tasks
                      </span>
                    </div>

                    {/* Skills */}
                    {developer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {developer.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                        {developer.skills.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                            +{developer.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Current Tasks Preview */}
                    {developer.currentTasks.length > 0 && (
                      <div className="border-t border-gray-200/60 dark:border-gray-700/60 pt-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Current Tasks</p>
                        <div className="space-y-1">
                          {developer.currentTasks.slice(0, 2).map((task) => (
                            <div key={task.id} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                task.status === 'done' ? 'bg-green-500' :
                                task.status === 'in-progress' ? 'bg-blue-500' :
                                task.status === 'review' ? 'bg-yellow-500' :
                                task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'
                              }`}></div>
                              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                {task.title}
                              </span>
                            </div>
                          ))}
                          {developer.currentTasks.length > 2 && (
                            <p className="text-xs text-gray-400">
                              +{developer.currentTasks.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Updated */}
                    <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                      Updated {new Date(developer.updatedAt).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No tasks yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Start tracking your team's progress by creating tasks.
                  </p>
                </div>
              </div>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {task.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {task.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {developers.find(d => d.id === task.assignedTo)?.name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </span>
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedHours}h
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        task.priority === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {task.priority}
                      </span>
                      
                      <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                        task.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        task.status === 'review' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        task.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  
                  {task.notes && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{task.notes}</p>
                    </div>
                  )}
                  
                  {task.tickets.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tickets:</span>
                      <div className="flex gap-1">
                        {task.tickets.map((ticket) => (
                          <span key={ticket} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                            {ticket}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Developer Detail Modal */}
      {selectedDeveloper && (
        <DeveloperDetailModal
          developer={selectedDeveloper}
          tasks={tasks.filter(task => task.assignedTo === selectedDeveloper.id)}
          onClose={() => setSelectedDeveloper(null)}
        />
      )}

      {/* Create Developer Modal */}
      {isCreateModalOpen && (
        <CreateDeveloperModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateDeveloper={handleCreateDeveloper}
        />
      )}
    </div>
  );
}

interface CreateDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeveloper: (developer: Partial<Developer>) => void;
}

const CreateDeveloperModal: React.FC<CreateDeveloperModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateDeveloper 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    level: 'mid',
    availability: 'available',
    skills: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const developerData = {
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
      currentTasks: []
    };
    
    onCreateDeveloper(developerData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Developer</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="QA">QA</option>
                <option value="DevOps">DevOps</option>
                <option value="Product Manager">Product Manager</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Availability</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills (comma separated)</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="React, TypeScript, Node.js"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Add Developer
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface DeveloperDetailModalProps {
  developer: Developer;
  tasks: DeveloperTask[];
  onClose: () => void;
}

const DeveloperDetailModal: React.FC<DeveloperDetailModalProps> = ({ 
  developer, 
  tasks, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {developer.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400">{developer.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded-full">
                    {developer.role}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                    {developer.level}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Skills */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {developer.skills.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          {/* Notes */}
          {developer.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-300">{developer.notes}</p>
              </div>
            </div>
          )}
          
          {/* Current Tasks */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Current Tasks ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No active tasks</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {task.title}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {task.description}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
