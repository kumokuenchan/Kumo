import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText } from 'lucide-react';

interface NoteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (noteTitle: string) => void;
  notes: any[]; // Array of notes with id and title properties
  currentNoteId?: string; // Current note ID to exclude from suggestions
}

export default function NoteLinkModal({ isOpen, onClose, onConfirm, notes, currentNoteId }: NoteLinkModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter notes based on search query
  useEffect(() => {
    if (!searchQuery) {
      // Show all notes except the current one
      const allNotes = currentNoteId 
        ? notes.filter(note => note.id !== currentNoteId)
        : notes;
      setFilteredNotes(allNotes.slice(0, 10)); // Limit to 10 notes
      setSelectedIndex(0);
    } else {
      // Filter notes by title
      const filtered = notes
        .filter(note => 
          note.id !== currentNoteId && 
          note.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10); // Limit to 10 notes
      
      setFilteredNotes(filtered);
      setSelectedIndex(0);
    }
  }, [searchQuery, notes, currentNoteId]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = (noteTitle: string) => {
    if (noteTitle.trim()) {
      onConfirm(noteTitle.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredNotes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredNotes.length) % filteredNotes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        handleConfirm(searchQuery);
      } else if (filteredNotes.length > 0) {
        handleConfirm(filteredNotes[selectedIndex].title);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Link to Note
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notes or type note title..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Notes List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchQuery ? 'No matching notes found' : 'No notes available'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => handleConfirm(searchQuery)}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Create link to "{searchQuery}"
                  </button>
                )}
              </div>
            ) : (
              <div className="p-1">
                {filteredNotes.map((note, index) => (
                  <button
                    key={note.id}
                    onClick={() => handleConfirm(note.title)}
                    className={`w-full px-4 py-3 text-left rounded-lg transition-colors flex items-center gap-3 ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {note.title}
                      </div>
                      {note.type && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {note.type}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}