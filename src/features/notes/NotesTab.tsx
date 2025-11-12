import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../api/notes';
import { Note, NoteType, NoteStatus, Priority, NoteStats } from '../../types/notes';
import { formatDistanceToNow } from 'date-fns';
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
  Zap,
  Star,
  Clock
} from 'lucide-react';

type ViewMode = 'notes' | 'commands' | 'team' | 'tickets';

export default function NotesTab() {
  const [activeView, setActiveView] = useState<ViewMode>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      }
      loadStats();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleNoteSelect = async (note: Note) => {
    setSelectedNote(note);

    // Update lastViewedAt
    try {
      await notesApi.updateNote(note.id, {
        lastViewedAt: new Date().toISOString(),
      });
      // Reload notes to reflect changes
      loadNotes();
    } catch (error) {
      console.error('Failed to update last viewed:', error);
    }
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
  const favoriteNotes = notes.filter(n => n.isFavorite);
  const recentNotes = [...notes]
    .filter(n => n.lastViewedAt)
    .sort((a, b) => new Date(b.lastViewedAt!).getTime() - new Date(a.lastViewedAt!).getTime())
    .slice(0, 5);

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
      <div className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col h-full">
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
          {/* Favorites */}
          {favoriteNotes.length > 0 && (
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-1.5 px-2 mb-2">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Favorites
                </h3>
              </div>
              <div className="space-y-0.5">
                {favoriteNotes.slice(0, 5).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleNoteSelect(note)}
                    className={`w-full px-2 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {note.icon && <span className="text-base">{note.icon}</span>}
                    <span className="flex-1 truncate text-left">{note.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent */}
          {recentNotes.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 px-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Recent
                </h3>
              </div>
              <div className="space-y-0.5">
                {recentNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleNoteSelect(note)}
                    className={`w-full px-2 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {note.icon && <span className="text-base">{note.icon}</span>}
                    <span className="flex-1 truncate text-left">{note.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {(favoriteNotes.length > 0 || recentNotes.length > 0) && (
            <div className="mx-3 my-2 border-t border-gray-200 dark:border-gray-800"></div>
          )}

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

      {/* Main Content - Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'notes' ? (
          <>
            {/* Notes List - Middle Column */}
            <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col">
              {/* List Header */}
              <div className="border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  All Notes
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showPinnedOnly
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={`${showPinnedOnly ? 'Show all' : 'Show pinned'} notes`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Condensed Notes List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                  </div>
                ) : sortedNotes.length === 0 ? (
                  <div className="flex items-center justify-center h-full px-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <StickyNote className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sortedNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleNoteSelect(note)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                          selectedNote?.id === note.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {note.icon && (
                            <div className="text-xl leading-none mt-0.5">{note.icon}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              {note.isPinned && (
                                <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {note.title || 'Untitled'}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                              {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Note Detail - Right Column */}
            <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
              {selectedNote ? (
                <NoteEditorModal
                  note={selectedNote}
                  isOpen={true}
                  onClose={() => setSelectedNote(null)}
                  onSave={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  isInline={true}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-sm px-6">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <StickyNote className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Select a note
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose a note from the list to view its contents
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white dark:bg-gray-900 overflow-hidden">
            <AnimatePresence mode="wait">
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
        )}
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
    </div>
  );
}
