import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Note, NoteType, NoteStatus, Priority } from '../../../types/notes';
import {
  X,
  Save,
  Trash2,
  Tag,
  User,
  Calendar,
  Flag,
  FileText,
  Type,
  AlignLeft,
  Bold,
  Italic,
  List,
  Quote,
  Code,
  Link,
  Image,
  Plus
} from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (note: Partial<Note>) => void;
  onClose: () => void;
}

export default function NoteEditor({ note, onUpdateNote, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [type, setType] = useState<NoteType>(note.type);
  const [status, setStatus] = useState<NoteStatus>(note.status);
  const [priority, setPriority] = useState<Priority>(note.priority);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [assignedTo, setAssignedTo] = useState<string[]>(note.assignedTo || []);
  const [dueDate, setDueDate] = useState(note.dueDate ? note.dueDate.split('T')[0] : '');
  const [newTag, setNewTag] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const hasUnsavedChanges = 
      title !== note.title ||
      content !== note.content ||
      type !== note.type ||
      status !== note.status ||
      priority !== note.priority ||
      tags.join(',') !== note.tags.join(',') ||
      (assignedTo.join(',') !== (note.assignedTo || []).join(',')) ||
      dueDate !== (note.dueDate ? note.dueDate.split('T')[0] : '');

    setHasChanges(hasUnsavedChanges);
  }, [title, content, type, status, priority, tags, assignedTo, dueDate, note]);

  const handleSave = () => {
    if (!hasChanges) return;
    
    onUpdateNote({
      title,
      content,
      type,
      status,
      priority,
      tags,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddAssignee = () => {
    if (newAssignee.trim() && !assignedTo.includes(newAssignee.trim())) {
      setAssignedTo([...assignedTo, newAssignee.trim()]);
      setNewAssignee('');
    }
  };

  const handleRemoveAssignee = (assigneeToRemove: string) => {
    setAssignedTo(assignedTo.filter(assignee => assignee !== assigneeToRemove));
  };

  const handleDeleteNote = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      // The delete functionality will be handled by the parent component
      onClose();
    }
  };

  const insertFormatting = (format: string) => {
    if (!contentRef.current) return;
    
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        formattedText = `\`${selectedText || 'code'}\``;
        break;
      case 'quote':
        formattedText = `> ${selectedText || 'quote'}`;
        break;
      case 'list':
        formattedText = `- ${selectedText || 'list item'}`;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const noteTypeOptions = [
    { value: 'general' as NoteType, label: 'General', icon: FileText },
    { value: 'command' as NoteType, label: 'Command', icon: Type },
    { value: 'developer' as NoteType, label: 'Developer', icon: User },
    { value: 'ticket' as NoteType, label: 'Ticket', icon: Tag },
    { value: 'release' as NoteType, label: 'Release', icon: Calendar },
    { value: 'flow' as NoteType, label: 'Flow', icon: List }
  ];

  const priorityOptions = [
    { value: 'low' as Priority, label: 'Low', color: 'text-gray-600' },
    { value: 'medium' as Priority, label: 'Medium', color: 'text-blue-600' },
    { value: 'high' as Priority, label: 'High', color: 'text-orange-600' },
    { value: 'urgent' as Priority, label: 'Urgent', color: 'text-red-600' }
  ];

  const statusOptions = [
    { value: 'draft' as NoteStatus, label: 'Draft', color: 'text-gray-600' },
    { value: 'active' as NoteStatus, label: 'Active', color: 'text-green-600' },
    { value: 'archived' as NoteStatus, label: 'Archived', color: 'text-gray-400' }
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Note</h2>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
            <motion.button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
              whileHover={hasChanges ? { scale: 1.02 } : {}}
              whileTap={hasChanges ? { scale: 0.98 } : {}}
            >
              <Save className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={handleDeleteNote}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Created {formatRelativeTime(note.createdAt)}</span>
          <span>•</span>
          <span>Updated {formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        {/* Type and Priority */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NoteType)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {noteTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-gray-500" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as NoteStatus)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date */}
        {type === 'ticket' || type === 'release' ? (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : null}

        {/* Content Editor */}
        <div>
          <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => insertFormatting('bold')}
              className="p-1.5 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormatting('italic')}
              className="p-1.5 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormatting('code')}
              className="p-1.5 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormatting('quote')}
              className="p-1.5 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormatting('list')}
              className="p-1.5 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="List"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your note..."
            className="w-full h-64 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full"
              >
                <Tag className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
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
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Assigned To */}
        {type === 'developer' || type === 'ticket' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {assignedTo.map((assignee) => (
                <span
                  key={assignee}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm rounded-full"
                >
                  <User className="w-3 h-3" />
                  {assignee}
                  <button
                    onClick={() => handleRemoveAssignee(assignee)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAssignee()}
                placeholder="Add assignee..."
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddAssignee}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
