import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, NoteType, NoteStatus, Priority } from '../../../types/notes';
import { Clock, Trash2, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ContextMenu, { createNoteContextMenuItems } from '../../../components/ContextMenu';

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  viewMode: 'grid' | 'list' | 'kanban';
  searchQuery: string;
  filterType: NoteType[];
  filterStatus: NoteStatus[];
  filterPriority: Priority[];
  isLoading: boolean;
  onTogglePin?: (note: Note) => void;
  onToggleFavorite?: (note: Note) => void;
  onDuplicate?: (note: Note) => void;
  onArchive?: (note: Note) => void;
  onShare?: (note: Note) => void;
  onCopyLink?: (note: Note) => void;
  onExport?: (note: Note) => void;
  onFilterChange?: (filterType: string, value: any) => void;
  allTags?: string[];
  allTypes?: NoteType[];
}

export default function NotesListMinimal({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  viewMode,
  searchQuery,
  isLoading,
  onTogglePin,
  onToggleFavorite,
  onDuplicate,
  onArchive,
  onShare,
  onCopyLink,
  onExport,
  onFilterChange,
  allTags,
  allTypes,
}: NotesListProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; position: { x: number; y: number }; note: Note | null }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    note: null
  });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteToDisplay, setNoteToDisplay] = useState<Note | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType | 'all'>('all');
  
  // Compute available tags - use allTags prop if provided, otherwise extract from notes
  const availableTags = allTags || [...new Set(notes.flatMap(note => note.tags || []))];

  const handleDeleteClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setShowDeleteModal(false);
      setNoteToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNoteToDelete(null);
  };

  const handleContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      note
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, note: null });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Create your first note to get started'
            }
          </p>
        </div>
      </div>
    );
  }

  // List View - Clean, spacious, Notion-like
  if (viewMode === 'list') {
    return (
      <>
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-2">
            <AnimatePresence>
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02, duration: 0.2 }}
                  onClick={() => onSelectNote(note)}
                  onContextMenu={(e) => handleContextMenu(e, note)}
                  className="group relative bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  {/* Cover Image */}
                  {note.coverImage && (
                    <div className="h-32 rounded-t-lg overflow-hidden">
                      {note.coverImage.startsWith('linear-gradient') ? (
                        <div className="w-full h-full" style={{ background: note.coverImage }} />
                      ) : (
                        <img
                          src={note.coverImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header with Icon, Title, and Actions */}
                    <div className="flex items-start gap-3 mb-2">
                      {/* Icon */}
                      {note.icon && (
                        <div className="text-3xl leading-none mt-0.5 flex-shrink-0">
                          {note.icon}
                        </div>
                      )}

                      {/* Title and Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {note.isPinned && (
                            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                            {note.title}
                          </h3>
                        </div>

                        {/* Content Preview */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {stripHtml(note.content)}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 mt-3">
                          {/* Time */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(note.updatedAt)}
                          </div>

                          {/* Tags */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              {note.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{note.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Delete Button - Only visible on hover */}
                      <button
                        onClick={(e) => handleDeleteClick(e, note)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && noteToDelete && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete note?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  "{noteToDelete.title}" will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Grid View - Apple-like cards
  if (viewMode === 'grid') {
    return (
      <>
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Filter Controls */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                <select
                  value={selectedNoteType}
                  onChange={(e) => setSelectedNoteType(e.target.value as NoteType | 'all')}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="general">General</option>
                  <option value="command">Command</option>
                  <option value="developer">Developer</option>
                  <option value="ticket">Ticket</option>
                  <option value="release">Release</option>
                  <option value="flow">Flow</option>
                </select>
              </div>
              
              {/* Tag Filter */}
              {availableTags && availableTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Clear Filters */}
              {(selectedTags.length > 0 || selectedNoteType !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedTags([]);
                    setSelectedNoteType('all');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence>
                {notes.filter(note => {
                  // Apply type filter
                  if (selectedNoteType !== 'all' && note.type !== selectedNoteType) {
                    return false;
                  }
                  
                  // Apply tag filter
                  if (selectedTags.length > 0) {
                    const noteTags = note.tags || [];
                    return selectedTags.some(tag => noteTags.includes(tag));
                  }
                  
                  return true;
                }).map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    whileHover={{ y: -2 }}
                    onClick={() => {
                      setNoteToDisplay(note);
                      setShowNoteModal(true);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, note)}
                    className="group relative bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl border border-gray-100/50 dark:border-gray-800/50"
                  >
                    {/* Cover Image */}
                    {note.coverImage && (
                      <div className="h-32 overflow-hidden">
                        {note.coverImage.startsWith('linear-gradient') ? (
                          <div className="w-full h-full" style={{ background: note.coverImage }} />
                        ) : (
                          <img
                            src={note.coverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      {/* Icon and Title */}
                      <div className="flex items-start gap-3 mb-3">
                        {note.icon && (
                          <div className="text-2xl leading-none flex-shrink-0 mt-0.5">
                            {note.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {note.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                              {note.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                            {stripHtml(note.content)}
                          </p>
                        </div>
                      </div>

                      {/* Tags and Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatRelativeTime(note.updatedAt)}</span>
                        </div>
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100/60 dark:bg-gray-800/60 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && (
                              <span className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-100/40 dark:bg-gray-800/40 rounded-full">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button - Apple-style with subtle hover effect */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(e, note);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 backdrop-blur-sm rounded-lg transition-all duration-200 transform group-hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Note Modal */}
        <AnimatePresence>
          {showNoteModal && noteToDisplay && (
            <div 
              className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center ${isFullScreen ? '' : 'p-4'}`}
              onClick={() => {
                setShowNoteModal(false);
                setIsFullScreen(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: isFullScreen ? 1 : 0.9, y: isFullScreen ? 0 : 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: isFullScreen ? 1 : 0.9, y: isFullScreen ? 0 : 20 }}
                transition={{ duration: 0.2 }}
                className={`${isFullScreen ? 'w-screen h-screen rounded-none' : 'w-full max-w-2xl rounded-2xl'} bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ${isFullScreen ? 'max-h-screen' : 'max-h-[90vh]'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${isFullScreen ? '' : ''}`}>
                    <div className="flex items-start gap-3">
                      {noteToDisplay.icon && (
                        <div className={`text-2xl ${isFullScreen ? 'text-3xl' : ''}`}>{noteToDisplay.icon}</div>
                      )}
                      <div>
                        <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${isFullScreen ? 'text-2xl' : 'text-xl'}`}>
                          {noteToDisplay.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-gray-500 dark:text-gray-400 ${isFullScreen ? 'text-base' : 'text-sm'}`}>
                            Updated {formatRelativeTime(noteToDisplay.updatedAt)}
                          </span>
                          {noteToDisplay.isPinned && (
                            <Pin className={`text-amber-500 fill-amber-500 ${isFullScreen ? 'w-5 h-5' : 'w-4 h-4'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title={isFullScreen ? "Exit full screen" : "Enter full screen"}
                    >
                      {isFullScreen ? (
                        // Minimize icon for exit full screen
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
                        </svg>
                      ) : (
                        // Expand/enter full screen icon
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8V4m0 0h4M3 4l5 5m13-1V4m0 0h-4m4 0l-5 5M3 16v4m0 0h4m-4 0l5-5m13 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowNoteModal(false);
                        setIsFullScreen(false);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className={`overflow-y-auto ${isFullScreen ? 'p-8 max-h-[calc(100vh-140px)]' : 'p-6 max-h-[60vh]'}`}>
                  <div 
                    className="text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: noteToDisplay.content }}
                  />
                </div>
                
                {!isFullScreen && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                      onClick={() => {
                        setShowNoteModal(false);
                        setIsFullScreen(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {showDeleteModal && noteToDelete && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete note?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  "{noteToDelete.title}" will be permanently deleted.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Kanban View - Minimal columns
  const columns = {
    draft: notes.filter(n => n.status === 'draft'),
    active: notes.filter(n => n.status === 'active'),
    archived: notes.filter(n => n.status === 'archived')
  };

  return (
    <>
      <div className="h-full overflow-x-auto overflow-y-hidden">
        <div className="flex gap-6 h-full p-6 min-w-max">
          {Object.entries(columns).map(([status, statusNotes]) => (
            <div key={status} className="flex flex-col w-80">
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {status}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {statusNotes.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                <AnimatePresence>
                  {statusNotes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => {
                        setNoteToDisplay(note);
                        setShowNoteModal(true);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, note)}
                      className="group bg-white dark:bg-gray-900 hover:shadow-md rounded-lg overflow-hidden transition-all cursor-pointer"
                    >
                      {note.coverImage && (
                        <div className="h-24 overflow-hidden">
                          {note.coverImage.startsWith('linear-gradient') ? (
                            <div className="w-full h-full" style={{ background: note.coverImage }} />
                          ) : (
                            <img src={note.coverImage} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      <div className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {note.icon && (
                            <div className="text-xl leading-none">{note.icon}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              {note.isPinned && (
                                <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
                              )}
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {note.title}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {stripHtml(note.content)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span>{formatRelativeTime(note.updatedAt)}</span>
                          {note.tags && note.tags.length > 0 && (
                            <span>{note.tags.length} tags</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteClick(e, note)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-white bg-black/50 hover:bg-red-600 backdrop-blur-sm rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && noteToDisplay && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {noteToDisplay.icon && (
                      <div className="text-2xl">{noteToDisplay.icon}</div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {noteToDisplay.title}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Updated {formatRelativeTime(noteToDisplay.updatedAt)}
                        </span>
                        {noteToDisplay.isPinned && (
                          <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNoteModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div 
                  className="text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: noteToDisplay.content }}
                />
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && noteToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete note?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                "{noteToDelete.title}" will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
