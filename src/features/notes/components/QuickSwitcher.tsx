import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note } from '../../../types/notes';
import { Search, Clock, Star, FileText, X } from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  recentNotes?: Note[];
}

export default function QuickSwitcher({
  isOpen,
  onClose,
  notes,
  onSelectNote,
  recentNotes = []
}: QuickSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fuzzy search filter
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = note.title.toLowerCase().includes(query);
    const contentMatch = note.content.toLowerCase().includes(query);
    const tagsMatch = note.tags?.some((tag) => tag.toLowerCase().includes(query));

    return titleMatch || contentMatch || tagsMatch;
  });

  // Sort results: favorites first, then by last modified
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Show recent notes when no search query
  const displayNotes = searchQuery.trim() === ''
    ? (recentNotes.length > 0 ? recentNotes : sortedNotes.slice(0, 10))
    : sortedNotes;

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % displayNotes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + displayNotes.length) % displayNotes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayNotes[selectedIndex]) {
          onSelectNote(displayNotes[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, displayNotes, onSelectNote, onClose]);

  const getPreviewText = (content: string, maxLength: number = 100) => {
    const text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by title, content, or tags..."
                className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={onClose}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {displayNotes.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No notes found' : 'No notes yet'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {searchQuery.trim() === '' && recentNotes.length > 0 && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Recent Notes
                  </div>
                )}

                {displayNotes.map((note, index) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note);
                      onClose();
                    }}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {note.isFavorite && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                          )}
                          <h3 className={`font-medium truncate ${
                            index === selectedIndex
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {note.title || 'Untitled'}
                          </h3>
                        </div>

                        {note.content && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                            {getPreviewText(note.content)}
                          </p>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="px-2 py-0.5 text-xs text-gray-400">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {formatDate(note.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↑</kbd>
                  <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">ESC</kbd>
                  Close
                </span>
              </div>
              <span>{displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
