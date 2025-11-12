import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../api/notes';
import { Note, NoteType, NoteStatus, Priority, NoteStats } from '../../types/notes';
import NotesListMinimal from './components/NotesListMinimal';
import DevCommandsManager from './components/DevCommandsManager';
import TeamManagement from './components/TeamManagement';
import TicketTracker from './components/TicketTracker';
import NoteStatsPanel from './components/NoteStatsPanel';
import CreateNoteModal from './components/CreateNoteModal';
import QuickCaptureModal, { useQuickCapture } from './components/QuickCaptureModal';
import KeyboardShortcutsHelp, { useKeyboardShortcuts } from './components/KeyboardShortcutsHelp';
import NoteEditorModal from './components/NoteEditorModal';
import {
  StickyNote,
  Command,
  Users,
  Ticket,
  BarChart3,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Kanban,
  Pin,
  Keyboard,
  Zap
} from 'lucide-react';

type ViewMode = 'notes' | 'commands' | 'team' | 'tickets';

export default function NotesTab() {
  const [activeView, setActiveView] = useState<ViewMode>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('list');
  const [filterType, setFilterType] = useState<NoteType[]>([]);
  const [filterStatus, setFilterStatus] = useState<NoteStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Setup global keyboard shortcuts
  useQuickCapture(() => setIsQuickCaptureOpen(true));
  useKeyboardShortcuts(() => setIsKeyboardShortcutsOpen(true));

  useEffect(() => {
    loadNotes();
    loadStats();
  }, []);

  

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getNotes();
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await notesApi.getNoteStats();
      setStats(data || null);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateNote = async (noteData: Partial<Note>) => {
    try {
      const newNote = await notesApi.createNote(noteData);
      setNotes(prev => [newNote, ...(prev || [])]);
      setSelectedNote(newNote);
      setIsCreateModalOpen(false);
      loadStats();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (id: string, noteData: Partial<Note>) => {
    try {
      const updatedNote = await notesApi.updateNote(id, noteData);
      setNotes(prev => (prev || []).map(note => note.id === id ? updatedNote : note));
      setSelectedNote(updatedNote);
      loadStats();
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await notesApi.deleteNote(id);
      setNotes(prev => (prev || []).filter(note => note.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditorOpen(false);
      }
      loadStats();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  const filteredNotes = (notes || []).filter(note => {
    if (!note) return false;

    // Check pinned filter
    if (showPinnedOnly && !note.isPinned) {
      return false;
    }

    // Check search query filter
    if (searchQuery) {
      const titleMatch = note.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const contentMatch = note.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const tagMatch = (note.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!titleMatch && !contentMatch && !tagMatch) {
        return false;
      }
    }

    // Check type filter
    if (filterType.length && !filterType.includes(note.type)) {
      return false;
    }

    // Check status filter
    if (filterStatus.length && !filterStatus.includes(note.status)) {
      return false;
    }

    // Check priority filter
    if (filterPriority.length && !filterPriority.includes(note.priority)) {
      return false;
    }

    return true;
  });

  // Sort notes with pinned notes on top
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const pinnedCount = notes.filter(n => n.isPinned).length;

  const navigationItems = [
    {
      id: 'notes' as ViewMode,
      name: 'Notes',
      icon: StickyNote,
      count: stats?.total || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'commands' as ViewMode,
      name: 'Dev Commands',
      icon: Command,
      count: 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      id: 'team' as ViewMode,
      name: 'Team',
      icon: Users,
      count: 0,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 'tickets' as ViewMode,
      name: 'Tickets',
      icon: Ticket,
      count: 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Navigation & Stats */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col h-full">
        {/* Header */}
        <div className="p-5 border-b border-gray-200/50 dark:border-gray-800/50">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notes</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Navigation */}
          <div className="p-3 space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm transition-all ${
                  activeView === item.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.name}</span>
                {item.count > 0 && (
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Stats Panel */}
          {stats && (
            <div className="p-4">
              <NoteStatsPanel stats={stats} />
            </div>
          )}
        </div>

        {/* Quick Actions - Always Visible */}
        <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        {/* Content Header */}
        <div className="border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                {navigationItems.find(item => item.id === activeView)?.name}
              </h2>
              
              {activeView === 'notes' && (
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Board view"
                  >
                    <Kanban className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {activeView === 'notes' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={`p-2 rounded-lg transition-colors ${
                    showPinnedOnly
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  title={`${showPinnedOnly ? 'Show all' : 'Show pinned'} notes`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-800" />
                <button
                  onClick={() => setIsQuickCaptureOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Quick Capture (Ctrl+Shift+N)"
                >
                  <Zap className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsKeyboardShortcutsOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Keyboard Shortcuts (Ctrl+/)"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <NotesListMinimal
                  notes={sortedNotes}
                  selectedNote={selectedNote}
                  onSelectNote={handleNoteSelect}
                  onDeleteNote={handleDeleteNote}
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  filterType={filterType}
                  filterStatus={filterStatus}
                  filterPriority={filterPriority}
                  isLoading={isLoading}
                  editingNoteId={null}
                  onStartInlineEdit={() => {}}
                  onSaveInlineEdit={() => {}}
                  onCancelInlineEdit={() => {}}
                />
              </motion.div>
            )}

            {activeView === 'commands' && (
              <motion.div
                key="commands"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <DevCommandsManager />
              </motion.div>
            )}

            {activeView === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <TeamManagement />
              </motion.div>
            )}

            {activeView === 'tickets' && (
              <motion.div
                key="tickets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <TicketTracker />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateNote={handleCreateNote}
      />

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        onSave={handleCreateNote}
      />

      <KeyboardShortcutsHelp
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />

      <NoteEditorModal
        note={selectedNote}
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        onSave={handleUpdateNote}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}
