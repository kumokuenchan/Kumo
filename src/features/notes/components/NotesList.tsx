import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, NoteType, NoteStatus, Priority } from '../../../types/notes';
import {
  Clock,
  Tag,
  User,
  AlertCircle,
  CheckCircle,
  Archive,
  StickyNote,
  Command,
  Users,
  Ticket,
  FileText,
  GitBranch
} from 'lucide-react';

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
}

const NoteIcon = ({ type }: { type: NoteType }) => {
  const iconProps = { className: 'w-4 h-4' };
  
  switch (type) {
    case 'command':
      return <Command {...iconProps} />;
    case 'developer':
      return <Users {...iconProps} />;
    case 'ticket':
      return <Ticket {...iconProps} />;
    case 'release':
      return <GitBranch {...iconProps} />;
    case 'flow':
      return <FileText {...iconProps} />;
    default:
      return <StickyNote {...iconProps} />;
  }
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[priority]}`}>
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }: { status: NoteStatus }) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
};

export default function NotesList({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  viewMode,
  searchQuery,
  filterType,
  filterStatus,
  filterPriority,
  isLoading
}: NotesListProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <StickyNote className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? `No notes match "${searchQuery}". Try adjusting your search or filters.`
              : 'Create your first note to get started with your knowledge base.'
            }
          </p>
        </div>
      </div>
    );
  }

    const formatRelativeTime = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
      } catch {
        return 'unknown';
      }
    };

  if (viewMode === 'kanban') {
    const columns = {
      draft: notes.filter(n => n.status === 'draft'),
      active: notes.filter(n => n.status === 'active'),
      archived: notes.filter(n => n.status === 'archived')
    };

    return (
      <div className="p-6 h-full overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max">
          {Object.entries(columns).map(([status, statusNotes]) => (
            <div key={status} className="flex-1 min-w-80">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {status === 'draft' && <Clock className="w-4 h-4" />}
                  {status === 'active' && <CheckCircle className="w-4 h-4" />}
                  {status === 'archived' && <Archive className="w-4 h-4" />}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {statusNotes.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {statusNotes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all ${
                        selectedNote?.id === note.id ? 'ring-2 ring-blue-500 border-blue-300' : ''
                      }`}
                      onClick={() => onSelectNote(note)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <NoteIcon type={note.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {note.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {note.content}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={note.priority} />
                          <StatusBadge status={note.status} />
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                      
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{note.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all ${
                  selectedNote?.id === note.id ? 'ring-2 ring-blue-500 border-blue-300' : ''
                }`}
                onClick={() => onSelectNote(note)}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <NoteIcon type={note.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {note.title}
                    </h4>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                  {note.content}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <PriorityBadge priority={note.priority} />
                  <StatusBadge status={note.status} />
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatRelativeTime(note.updatedAt)}</span>
                  {note.tags.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {note.tags.length}
                    </span>
                  )}
                </div>
                
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{note.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-6">
      <div className="space-y-4">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 cursor-pointer hover:shadow-lg transition-all ${
                selectedNote?.id === note.id ? 'ring-2 ring-blue-500 border-blue-300' : ''
              }`}
              onClick={() => onSelectNote(note)}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <NoteIcon type={note.type} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-2 ml-4">
                      <PriorityBadge priority={note.priority} />
                      <StatusBadge status={note.status} />
                    </div>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(note.updatedAt)}
                      </span>
                      {note.assignedTo && note.assignedTo.length > 0 && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.assignedTo.length} assigned
                        </span>
                      )}
                    </div>
                    
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 4 && (
                          <span className="text-xs text-gray-400">+{note.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
