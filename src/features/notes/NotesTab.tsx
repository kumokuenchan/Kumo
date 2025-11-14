import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notesApi } from '../../api/notes';
import { Note, NoteType, NoteStatus, Priority, NoteStats, NoteSort } from '../../types/notes';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from 'use-debounce';
import DOMPurify from 'dompurify';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import NotesListMinimal from './components/NotesListMinimal';
import DevCommandsManager from './components/DevCommandsManager';
import TeamManagement from './components/TeamManagement';
import TicketTracker from './components/TicketTracker';
import NoteStatsPanel from './components/NoteStatsPanel';
import CreateNoteModal from './components/CreateNoteModal';
import QuickCaptureModal, { useQuickCapture } from './components/QuickCaptureModal';
import KeyboardShortcutsHelp, { useKeyboardShortcuts } from './components/KeyboardShortcutsHelp';
import NoteEditorModal from './components/NoteEditorModal';
import QuickSwitcher from './components/QuickSwitcher';
import ImportModal from './components/ImportModal';
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
  Clock,
  Trash2,
  Download,
  FileText,
  FileJson,
  FileDown,
  ChevronDown,
  Upload,
  ArrowUpDown,
  X,
  CheckCircle,
  Tag
} from 'lucide-react';

type ViewMode = 'notes' | 'commands' | 'team' | 'tickets';
type NotesViewMode = 'list' | 'grid' | 'kanban';

export default function NotesTab() {
  const [activeView, setActiveView] = useState<ViewMode>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<NoteStats | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [filterType, setFilterType] = useState<NoteType[]>([]);
  const [filterStatus, setFilterStatus] = useState<NoteStatus[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // New state for improvements
  const [notesViewMode, setNotesViewMode] = useState<NotesViewMode>('list');
  const [sortField, setSortField] = useState<NoteSort['field']>('updatedAt');
  const [sortDirection, setSortDirection] = useState<NoteSort['direction']>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

  // Toast notification helper
  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  // Setup global keyboard shortcuts
  useQuickCapture(() => setIsQuickCaptureOpen(true));
  useKeyboardShortcuts(() => setIsKeyboardShortcutsOpen(true));

  // Quick Switcher keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    loadNotes();
    loadStats();
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType([]);
    setFilterStatus([]);
    setFilterPriority([]);
    setShowPinnedOnly(false);
    showToast('Filters cleared', 'success');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || filterType.length > 0 || filterStatus.length > 0 ||
    filterPriority.length > 0 || showPinnedOnly;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }

      if (showSortDropdown && !target.closest('.sort-dropdown-container')) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown, showSortDropdown]);

  // Keyboard shortcuts for notes view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        // Allow Escape to clear focus
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // Delete selected note (Delete key)
      if (e.key === 'Delete' && selectedNote) {
        e.preventDefault();
        handleDeleteClick(e as any, selectedNote);
      }

      // Create new note (Ctrl/Cmd + N)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }

      // Toggle view modes (1, 2, 3)
      if (activeView === 'notes') {
        if (e.key === '1') {
          setNotesViewMode('list');
        } else if (e.key === '2') {
          setNotesViewMode('grid');
        } else if (e.key === '3') {
          setNotesViewMode('kanban');
        }
      }

      // Clear filters (Ctrl/Cmd + Shift + X)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        if (hasActiveFilters) {
          clearFilters();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote, activeView, hasActiveFilters, clearFilters]);

  

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
      setOperationLoading(prev => ({ ...prev, create: true }));
      const newNote = await notesApi.createNote(noteData);
      setNotes(prev => [newNote, ...(prev || [])]);
      setSelectedNote(newNote);
      setIsCreateModalOpen(false);
      loadStats();
      showToast('Note created successfully', 'success');
    } catch (error) {
      console.error('Failed to create note:', error);
      showToast('Failed to create note. Please try again.', 'error');
    } finally {
      setOperationLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleUpdateNote = async (id: string, noteData: Partial<Note>) => {
    try {
      setOperationLoading(prev => ({ ...prev, [id]: true }));
      const updatedNote = await notesApi.updateNote(id, noteData);
      setNotes(prev => (prev || []).map(note => note.id === id ? updatedNote : note));
      setSelectedNote(updatedNote);
      loadStats();
      showToast('Note updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update note:', error);
      showToast('Failed to update note. Please try again.', 'error');
    } finally {
      setOperationLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      setOperationLoading(prev => ({ ...prev, [`delete-${id}`]: true }));
      await notesApi.deleteNote(id);
      setNotes(prev => (prev || []).filter(note => note.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
      loadStats();
      showToast('Note deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete note:', error);
      showToast('Failed to delete note. Please try again.', 'error');
    } finally {
      setOperationLoading(prev => ({ ...prev, [`delete-${id}`]: false }));
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await handleDeleteNote(noteToDelete.id);
      setShowDeleteModal(false);
      setNoteToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNoteToDelete(null);
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

  // Export functions
  const handleExport = async (format: 'json' | 'markdown' | 'pdf') => {
    try {
      setIsExporting(format);
      setShowExportDropdown(false); // Close dropdown when starting export
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `notes-export-${timestamp}.${format}`;
      await notesApi.downloadExportedFile(format, filename);
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
      showToast(`Failed to export notes as ${format}. Please try again.`, 'error');
    } finally {
      setIsExporting(null);
    }
  };

  // Import functions
  const handleFileImport = async (file: File) => {
    try {
      setIsImporting(true);
      const result = await notesApi.importNotes(file, 'markdown');
      
      // Refresh notes after import
      loadNotes();
      loadStats();
      
      // Show success message
      showToast(`Successfully imported ${result.importedCount} notes from markdown file!`, 'success');
      
      // Close import modal
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Failed to import markdown file:', error);
      showToast('Failed to import notes from markdown file. Please check the file format and try again.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  // Utility function to sanitize HTML content
  const sanitizeHTML = useCallback((html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  }, []);

  // Toggle sort direction
  const toggleSort = (field: NoteSort['field']) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredNotes = (notes || []).filter(note => {
    if (!note) return false;

    // Check pinned filter
    if (showPinnedOnly && !note.isPinned) {
      return false;
    }

    // Check search query filter (using debounced query)
    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase();
      const titleMatch = note.title?.toLowerCase().includes(searchLower);
      const contentMatch = note.content?.toLowerCase().includes(searchLower);
      const tagMatch = (note.tags || []).some(tag => tag.toLowerCase().includes(searchLower));

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

  // Sort notes with pinned notes on top, then by selected field
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    // Pinned notes always on top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Then sort by selected field
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'dueDate':
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        comparison = aDate - bDate;
        break;
      default:
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }

    return sortDirection === 'asc' ? comparison : -comparison;
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
        <div className="p-3 border-t border-gray-200/50 dark:border-gray-800/50 space-y-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
          
          {/* Export Dropdown */}
          <div className="relative export-dropdown-container">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
              disabled={isExporting !== null}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Notes'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Export Options Dropdown */}
            {showExportDropdown && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[100]"
                onMouseLeave={() => setShowExportDropdown(false)}
              >
                <div className="p-1">
                  <button
                    onClick={() => handleExport('json')}
                    disabled={isExporting !== null}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileJson className="w-4 h-4 text-blue-500" />
                    <span>JSON</span>
                    {isExporting === 'json' && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-auto"></div>
                    )}
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    disabled={isExporting !== null}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4 text-green-500" />
                    <span>Markdown</span>
                    {isExporting === 'markdown' && (
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin ml-auto"></div>
                    )}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting !== null}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown className="w-4 h-4 text-red-500" />
                    <span>PDF</span>
                    {isExporting === 'pdf' && (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin ml-auto"></div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Import Button */}
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="w-full px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-800/30 text-green-700 dark:text-green-300 text-sm rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import Markdown'}
          </button>
        </div>
      </div>

      {/* Main Content - Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'notes' ? (
          <>
            {notesViewMode === 'list' ? (
              <>
                {/* Notes List - Apple-inspired Design */}
                <div className="w-80 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl border-r border-gray-200/30 dark:border-gray-800/30 flex flex-col">
                  {/* Compact Header */}
                  <div className="px-4 pt-3 pb-3 border-b border-gray-200/30 dark:border-gray-800/30">
                    {/* Control Bar */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                      {/* View Mode Switcher - Segmented Control */}
                      <div className="flex items-center gap-0.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg p-0.5">
                        <button
                          onClick={() => setNotesViewMode('list')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            notesViewMode === 'list'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title="List view (Press 1)"
                          aria-label="List view"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setNotesViewMode('grid')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            notesViewMode === 'grid'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title="Grid view (Press 2)"
                          aria-label="Grid view"
                        >
                          <Grid3X3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setNotesViewMode('kanban')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            notesViewMode === 'kanban'
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                          title="Kanban view (Press 3)"
                          aria-label="Kanban view"
                        >
                          <Kanban className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Sort Dropdown */}
                      <div className="relative sort-dropdown-container">
                        <button
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className="p-1.5 rounded-lg transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-800/50"
                          title="Sort notes"
                          aria-label="Sort notes"
                          aria-expanded={showSortDropdown}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>

                        {showSortDropdown && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full -right-10 mt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-[100] min-w-[200px] overflow-hidden"
                          >
                            <div className="p-1">
                              {[
                                { field: 'updatedAt' as const, label: 'Last Updated' },
                                { field: 'createdAt' as const, label: 'Created Date' },
                                { field: 'title' as const, label: 'Title' },
                                { field: 'priority' as const, label: 'Priority' },
                                { field: 'dueDate' as const, label: 'Due Date' }
                              ].map(({ field, label }) => (
                                <button
                                  key={field}
                                  onClick={() => {
                                    toggleSort(field);
                                    setShowSortDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm rounded-lg flex items-center justify-between transition-all ${
                                    sortField === field
                                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <span>{label}</span>
                                  {sortField === field && (
                                    <span className="text-blue-600 dark:text-blue-400 ml-2">
                                      {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Pinned Filter */}
                      <button
                        onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                        className={`p-1.5 rounded-lg transition-all ${
                          showPinnedOnly
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                        }`}
                        title={`${showPinnedOnly ? 'Show all' : 'Show pinned'} notes`}
                        aria-label={`${showPinnedOnly ? 'Show all' : 'Show pinned'} notes`}
                      >
                        <Pin className="w-4 h-4" />
                      </button>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          onClick={clearFilters}
                          className="p-1.5 rounded-lg transition-all text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Clear all filters (Ctrl+Shift+X)"
                          aria-label="Clear all filters"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      )}
                      </div>

                      {/* Note Count Badge */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md">
                        <span>{sortedNotes.length}</span>
                        {filteredNotes.length !== notes.length && (
                          <span className="text-gray-400 dark:text-gray-500">/ {notes.length}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes List - Clean & Compact */}
                  <div className="flex-1 overflow-y-auto px-2 py-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="text-center">
                          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
                        </div>
                      </div>
                    ) : sortedNotes.length === 0 ? (
                      <div className="flex items-center justify-center h-48">
                        <div className="text-center max-w-xs px-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <StickyNote className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {searchQuery ? 'No notes found' : 'No notes yet'}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {searchQuery
                              ? 'Try adjusting your search or filters'
                              : 'Create your first note to get started'
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {sortedNotes.map((note, index) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.2 }}
                            onClick={() => handleNoteSelect(note)}
                            className={`group relative rounded-lg transition-all cursor-pointer ${
                              selectedNote?.id === note.id
                                ? 'bg-white dark:bg-gray-800 shadow-sm ring-2 ring-blue-500/20 dark:ring-blue-400/20'
                                : 'bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'
                            }`}
                          >
                            <div className="p-3">
                              <div className="flex items-start gap-2.5">
                                {/* Icon */}
                                {note.icon && (
                                  <div className="text-xl leading-none mt-0.5 flex-shrink-0">
                                    {note.icon}
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {/* Title Row */}
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {note.isPinned && (
                                      <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                                    )}
                                    {note.isFavorite && (
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                    )}
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {note.title || 'Untitled'}
                                    </h3>
                                  </div>

                                  {/* Preview */}
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-1.5">
                                    {sanitizeHTML(note.content).replace(/<[^>]*>/g, '').substring(0, 100)}
                                  </p>

                                  {/* Metadata */}
                                  <div className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                                    </span>
                                    {note.tags && note.tags.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Tag className="w-3 h-3" />
                                        {note.tags.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Delete Button - Subtle hover reveal */}
                            <button
                              onClick={(e) => handleDeleteClick(e, note)}
                              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Delete note"
                              aria-label="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Detail - Clean Editor */}
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
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
                      <div className="text-center max-w-xs px-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                          <StickyNote className="w-9 h-9 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                          Select a note
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          Choose a note from the list to view and edit its contents
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Grid and Kanban Views - Full Width */}
                <div className="flex-1 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
                  {/* Full Width Header */}
                  <div className="border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          All Notes
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
                          {filteredNotes.length !== notes.length && ` (${notes.length} total)`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* View Mode Switcher */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                          <button
                            onClick={() => setNotesViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${
                              notesViewMode === 'list'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            title="List view (Press 1)"
                            aria-label="List view"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNotesViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${
                              notesViewMode === 'grid'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            title="Grid view (Press 2)"
                            aria-label="Grid view"
                          >
                            <Grid3X3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNotesViewMode('kanban')}
                            className={`p-2 rounded-md transition-colors ${
                              notesViewMode === 'kanban'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            title="Kanban view (Press 3)"
                            aria-label="Kanban view"
                          >
                            <Kanban className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative sort-dropdown-container">
                          <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                            title="Sort notes"
                            aria-label="Sort notes"
                            aria-expanded={showSortDropdown}
                          >
                            <ArrowUpDown className="w-4 h-4" />
                            <span className="text-sm font-medium">Sort</span>
                          </button>

                          {showSortDropdown && (
                            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] min-w-[200px]">
                              <div className="p-1">
                                {[
                                  { field: 'updatedAt' as const, label: 'Last Updated' },
                                  { field: 'createdAt' as const, label: 'Created Date' },
                                  { field: 'title' as const, label: 'Title' },
                                  { field: 'priority' as const, label: 'Priority' },
                                  { field: 'dueDate' as const, label: 'Due Date' }
                                ].map(({ field, label }) => (
                                  <button
                                    key={field}
                                    onClick={() => {
                                      toggleSort(field);
                                      setShowSortDropdown(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm rounded flex items-center justify-between transition-colors ${
                                      sortField === field
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                  >
                                    <span>{label}</span>
                                    {sortField === field && (
                                      <span className="text-xs font-bold">
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                          <button
                            onClick={clearFilters}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg transition-colors flex items-center gap-2"
                            title="Clear all filters (Ctrl+Shift+X)"
                            aria-label="Clear all filters"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-sm font-medium">Clear Filters</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes Display - Full Width */}
                  <div className="flex-1 overflow-hidden">
                    <NotesListMinimal
                      notes={sortedNotes}
                      selectedNote={selectedNote}
                      onSelectNote={(note) => {
                        setSelectedNote(note);
                        setNotesViewMode('list'); // Switch to list view when opening a note
                      }}
                      onDeleteNote={handleDeleteNote}
                      viewMode={notesViewMode}
                      searchQuery={debouncedSearchQuery}
                      filterType={filterType}
                      filterStatus={filterStatus}
                      filterPriority={filterPriority}
                      isLoading={isLoading}
                      editingNoteId={null}
                      onStartInlineEdit={() => {}}
                      onSaveInlineEdit={() => {}}
                      onCancelInlineEdit={() => {}}
                    />
                  </div>
                </div>
              </>
            )}
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

      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        notes={notes}
        recentNotes={recentNotes}
        onSelectNote={handleNoteSelect}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleFileImport}
        isImporting={isImporting}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && noteToDelete && (
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
                      Delete Note
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to delete <strong>"{noteToDelete.title}"</strong>?
                  This will permanently remove the note and all its content.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete Note
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
  );
}
