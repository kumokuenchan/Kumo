import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, NoteType, Priority, NoteStatus } from '../../../types/notes';
import RichTextEditor from './RichTextEditor';
import NoteIconPicker from './NoteIconPicker';
import ConfirmationModal from './ConfirmationModal';
import {
  X,
  Pin,
  Trash2,
  Clock,
  Tag,
  MoreHorizontal,
  History,
  MessageSquare,
  Share2,
  Save,
  Check,
  Edit3,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NoteEditorModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Note>) => void;
  onDelete: (id: string) => void;
  isInline?: boolean; // New prop for inline mode (no modal backdrop)
}

export default function NoteEditorModal({ note, isOpen, onClose, onSave, onDelete, isInline = false }: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [type, setType] = useState<NoteType>('general');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<NoteStatus>('active');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIcon(note.icon || '');
      setCoverImage(note.coverImage || '');
      setIsPinned(note.isPinned || false);
      setIsFavorite(note.isFavorite || false);
      setType(note.type);
      setPriority(note.priority);
      setStatus(note.status);
      setTags(note.tags || []);
      setHasChanges(false);
      setIsEditMode(false);
    }
  }, [note]);

  useEffect(() => {
    if (note) {
      const changed =
        title !== note.title ||
        content !== note.content ||
        icon !== (note.icon || '') ||
        coverImage !== (note.coverImage || '') ||
        isPinned !== (note.isPinned || false) ||
        isFavorite !== (note.isFavorite || false) ||
        type !== note.type ||
        priority !== note.priority ||
        status !== note.status ||
        JSON.stringify(tags) !== JSON.stringify(note.tags || []);
      setHasChanges(changed);
    }
  }, [title, content, icon, coverImage, isPinned, isFavorite, type, priority, status, tags, note]);

  const handleSave = async () => {
    if (!note) return;

    setIsSaving(true);
    try {
      await onSave(note.id, {
        title,
        content,
        icon: icon || undefined,
        coverImage: coverImage || undefined,
        isPinned,
        isFavorite,
        type,
        priority,
        status,
        tags,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (note) {
      onDelete(note.id);
      onClose();
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesModal(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    onClose();
  };

  if (!note || !isOpen) return null;

  // Inline mode - render directly without modal backdrop
  if (isInline) {
    return (
      <>
        <div className="h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isEditMode ? (
                <>
                  {/* Edit Mode Actions - More compact */}
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-1.5 rounded transition-colors ${
                      isFavorite
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`p-1.5 rounded transition-colors ${
                      isPinned
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Toggle metadata"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                      hasChanges
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Save</span>
                      </>
                    ) : hasChanges ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* View Mode Actions */}
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex">
            {/* Main Editor */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-4">
                {isEditMode ? (
                  <>
                    {/* Edit Mode */}
                    <NoteIconPicker
                      currentIcon={icon}
                      currentCover={coverImage}
                      onIconChange={setIcon}
                      onCoverChange={setCoverImage}
                      onRemoveIcon={() => setIcon('')}
                      onRemoveCover={() => setCoverImage('')}
                    />

                    <div className="mb-4">
                      {icon && (
                        <div className="text-5xl mb-2">{icon}</div>
                      )}
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Untitled"
                        className="w-full text-4xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-700 leading-tight tracking-tight"
                        style={{ letterSpacing: '-0.025em' }}
                      />
                    </div>

                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing..."
                      className="border-none"
                      editable={true}
                    />
                  </>
                ) : (
                  <>
                    {/* View Mode - Clean, Read-Only */}
                    {coverImage && (
                      <div className="mb-4 -mx-6 -mt-4">
                        {coverImage.startsWith('linear-gradient') ? (
                          <div className="w-full h-40" style={{ background: coverImage }} />
                        ) : (
                          <img
                            src={coverImage}
                            alt=""
                            className="w-full h-40 object-cover"
                          />
                        )}
                      </div>
                    )}

                    <div className="mb-4">
                      {icon && (
                        <div className="text-5xl mb-2">{icon}</div>
                      )}
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 break-words leading-tight" style={{ letterSpacing: '-0.025em' }}>
                        {title || 'Untitled'}
                      </h1>
                    </div>

                    {/* Tags in View Mode */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder=""
                      className="border-none"
                      editable={false}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Metadata Sidebar - Only in Edit Mode */}
            <AnimatePresence>
              {isEditMode && showMetadata && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <div className="w-[300px] h-full overflow-y-auto p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Properties
                    </h3>

                    <div className="space-y-4">
                      {/* Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Type
                        </label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value as NoteType)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="general">General</option>
                          <option value="command">Command</option>
                          <option value="developer">Developer</option>
                          <option value="ticket">Ticket</option>
                          <option value="release">Release</option>
                          <option value="flow">Flow</option>
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as NoteStatus)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="Add tag..."
                            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-2">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Note"
          message={`Are you sure you want to delete "${note?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </>
    );
  }

  // Modal mode - original implementation with backdrop
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Editor Panel */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative ml-auto w-full max-w-4xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isEditMode ? (
                <>
                  {/* Edit Mode Actions - More compact */}
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-1.5 rounded transition-colors ${
                      isFavorite
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`p-1.5 rounded transition-colors ${
                      isPinned
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Toggle metadata"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />

                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                      hasChanges
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Save</span>
                      </>
                    ) : hasChanges ? (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* View Mode Actions */}
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex items-center gap-1.5 font-medium transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex">
            {/* Main Editor */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-4">
                {isEditMode ? (
                  <>
                    {/* Edit Mode */}
                    <NoteIconPicker
                      currentIcon={icon}
                      currentCover={coverImage}
                      onIconChange={setIcon}
                      onCoverChange={setCoverImage}
                      onRemoveIcon={() => setIcon('')}
                      onRemoveCover={() => setCoverImage('')}
                    />

                    <div className="mb-4">
                      {icon && (
                        <div className="text-5xl mb-2">{icon}</div>
                      )}
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Untitled"
                        className="w-full text-4xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-700 leading-tight tracking-tight"
                        style={{ letterSpacing: '-0.025em' }}
                      />
                    </div>

                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing..."
                      className="border-none"
                      editable={true}
                    />
                  </>
                ) : (
                  <>
                    {/* View Mode - Clean, Read-Only */}
                    {coverImage && (
                      <div className="mb-4 -mx-6 -mt-4">
                        {coverImage.startsWith('linear-gradient') ? (
                          <div className="w-full h-40" style={{ background: coverImage }} />
                        ) : (
                          <img
                            src={coverImage}
                            alt=""
                            className="w-full h-40 object-cover"
                          />
                        )}
                      </div>
                    )}

                    <div className="mb-4">
                      {icon && (
                        <div className="text-5xl mb-2">{icon}</div>
                      )}
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 break-words leading-tight" style={{ letterSpacing: '-0.025em' }}>
                        {title || 'Untitled'}
                      </h1>
                    </div>

                    {/* Tags in View Mode */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder=""
                      className="border-none"
                      editable={false}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Metadata Sidebar - Only in Edit Mode */}
            <AnimatePresence>
              {isEditMode && showMetadata && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <div className="w-[300px] h-full overflow-y-auto p-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Properties
                    </h3>

                    <div className="space-y-4">
                      {/* Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Type
                        </label>
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value as NoteType)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="general">General</option>
                          <option value="command">Command</option>
                          <option value="developer">Developer</option>
                          <option value="ticket">Ticket</option>
                          <option value="release">Release</option>
                          <option value="flow">Flow</option>
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as NoteStatus)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="Add tag..."
                            className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-2">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Confirmation Modals */}
        <ConfirmationModal
          isOpen={showUnsavedChangesModal}
          onClose={() => setShowUnsavedChangesModal(false)}
          onConfirm={confirmClose}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to close without saving?"
          confirmText="Close Anyway"
          cancelText="Keep Editing"
          variant="warning"
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Note"
          message={`Are you sure you want to delete "${note?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </AnimatePresence>
  );
}
