import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../../api/notes';
import { Ticket } from '../../../types/notes';
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  GitBranch,
  Bug,
  Zap,
  Settings,
  TrendingUp,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

export default function TicketTracker() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  console.log('TicketTracker render, modal open:', isCreateModalOpen);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getTickets();
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData: Partial<Ticket>) => {
    try {
      const newTicket = await notesApi.createTicket(ticketData);
      setTickets(prev => [newTicket, ...(prev || [])]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  

  const filterTickets = () => {
    let filtered = tickets || [];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === typeFilter);
    }

    setFilteredTickets(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return Bug;
      case 'feature': return Zap;
      case 'improvement': return TrendingUp;
      case 'task': return Settings;
      default: return TicketIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'review': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'testing': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'done': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'low': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'high': return TrendingUp;
      case 'medium': return Clock;
      case 'low': return CheckCircle;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  // Kanban view
  if (viewMode === 'kanban') {
    const columns = {
      open: (filteredTickets || []).filter(t => t.status === 'open'),
      'in-progress': (filteredTickets || []).filter(t => t.status === 'in-progress'),
      review: (filteredTickets || []).filter(t => t.status === 'review'),
      testing: (filteredTickets || []).filter(t => t.status === 'testing'),
      done: (filteredTickets || []).filter(t => t.status === 'done'),
      closed: (filteredTickets || []).filter(t => t.status === 'closed'),
    };

    return (
      <div className="h-full flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <TicketIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ticket Tracker</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your project tickets and releases</p>
              </div>
            </div>
            <motion.button
              onClick={() => {
                console.log('Button clicked!');
                setIsCreateModalOpen(true);
                console.log('Modal state:', true);
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center gap-2 font-medium transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="testing">Testing</option>
              <option value="done">Done</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-6 h-full min-w-max">
            {Object.entries(columns).map(([status, statusTickets]) => {
              const StatusIcon = status === 'open' ? AlertCircle :
                               status === 'in-progress' ? Clock :
                               status === 'review' ? Eye :
                               status === 'testing' ? GitBranch :
                               status === 'done' ? CheckCircle : CheckCircle;

              return (
                <div key={status} className="flex-1 min-w-80">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                        {statusTickets.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <AnimatePresence>
                      {statusTickets.map((ticket, index) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          index={index}
                          onClick={() => setSelectedTicket(ticket)}
                          getTypeIcon={getTypeIcon}
                          getPriorityColor={getPriorityColor}
                          getPriorityIcon={getPriorityIcon}
                          getStatusColor={getStatusColor}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
          />
        )}
      </div>
    );
  }

  // List/Grid view
  return (
    <div className="h-full flex flex-col bg-gray-50/30 dark:bg-gray-900/30">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
              <TicketIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ticket Tracker</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your project tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'kanban' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="review">Review</option>
            <option value="testing">Testing</option>
            <option value="done">Done</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-100/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List/Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTickets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <TicketIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No tickets found' : 'No tickets yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Start tracking your project by creating your first ticket.'
                }
              </p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredTickets.map((ticket, index) => (
                <TicketGridCard
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  onClick={() => setSelectedTicket(ticket)}
                  getTypeIcon={getTypeIcon}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredTickets.map((ticket, index) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  onClick={() => setSelectedTicket(ticket)}
                  getTypeIcon={getTypeIcon}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      {/* Test Modal - Simple */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>Simple Test Modal</h3>
            <p>Modal is working! Click Close to test.</p>
            <button 
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                backgroundColor: '#f97316',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close Modal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTicket: (ticket: Partial<Ticket>) => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateTicket 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    status: 'open',
    assignee: '',
    reporter: 'Current User',
    dueDate: '',
    estimatedHours: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const ticketData = {
      ...formData,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      dueDate: formData.dueDate || undefined,
      releaseVersion: undefined,
      tickets: [],
      attachments: []
    };
    
    onCreateTicket(ticketData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Ticket</h2>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                placeholder="Unassigned"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Hours</label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-gray-100"
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
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Ticket Card Components
const TicketCard = ({ 
  ticket, 
  index, 
  onClick, 
  getTypeIcon, 
  getPriorityColor, 
  getPriorityIcon,
  getStatusColor 
}: any) => {
  const TypeIcon = getTypeIcon(ticket.type);
  const PriorityIcon = getPriorityIcon(ticket.priority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <TypeIcon className="w-4 h-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
            {ticket.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">#{ticket.id}</p>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
        {ticket.description}
      </p>
      
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{ticket.type}</span>
        {ticket.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(ticket.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const TicketGridCard = ({ ticket, index, onClick, getTypeIcon, getPriorityColor, getStatusColor }: any) => {
  const TypeIcon = getTypeIcon(ticket.type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <TypeIcon className="w-4 h-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {ticket.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">#{ticket.id}</p>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
        {ticket.description}
      </p>
      
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
          {ticket.priority}
        </span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{ticket.type}</span>
        {ticket.dueDate && (
          <span>{new Date(ticket.dueDate).toLocaleDateString()}</span>
        )}
      </div>
    </motion.div>
  );
};

const TicketListItem = ({ ticket, index, onClick, getTypeIcon, getPriorityColor, getStatusColor }: any) => {
  const TypeIcon = getTypeIcon(ticket.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
          <TypeIcon className="w-5 h-5 text-orange-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {ticket.title}
            </h4>
            <div className="flex items-center gap-2 ml-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-1">
            {ticket.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>#{ticket.id}</span>
            <span>{ticket.type}</span>
            <span>{ticket.assignee || 'Unassigned'}</span>
            {ticket.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(ticket.dueDate).toLocaleDateString()}
              </span>
            )}
            {ticket.estimatedHours && (
              <span>{ticket.estimatedHours}h</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-mono text-gray-500">#{ticket.id}</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  ticket.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {ticket.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Type: {ticket.type}</span>
                <span>Priority: {ticket.priority}</span>
                {ticket.releaseVersion && <span>Version: {ticket.releaseVersion}</span>}
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
          {/* Description */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Description</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-300">{ticket.description}</p>
            </div>
          </div>
          
          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Assignee</h4>
              <p className="text-gray-600 dark:text-gray-300">
                {ticket.assignee || 'Unassigned'}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Reporter</h4>
              <p className="text-gray-600 dark:text-gray-300">{ticket.reporter}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Created</h4>
              <p className="text-gray-600 dark:text-gray-300">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </p>
            </div>
            {ticket.dueDate && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Due Date</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {new Date(ticket.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {(ticket.estimatedHours || ticket.actualHours) && (
              <>
                {ticket.estimatedHours && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Estimated Hours</h4>
                    <p className="text-gray-600 dark:text-gray-300">{ticket.estimatedHours}h</p>
                  </div>
                )}
                {ticket.actualHours && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Actual Hours</h4>
                    <p className="text-gray-600 dark:text-gray-300">{ticket.actualHours}h</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Notes */}
          {ticket.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-300">{ticket.notes}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
