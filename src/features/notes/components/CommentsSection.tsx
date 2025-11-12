import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NoteComment } from '../../../types/notes';
import { MessageSquare, Send, Check, X, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentsSectionProps {
  noteId: string;
  comments: NoteComment[];
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, content: string) => void;
  currentUserId: string;
  currentUserName: string;
}

export default function CommentsSection({
  noteId,
  comments,
  onAddComment,
  onDeleteComment,
  onResolveComment,
  onUpdateComment,
  currentUserId,
  currentUserName
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleEdit = (comment: NoteComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setShowMenu(null);
  };

  const handleSaveEdit = (commentId: string) => {
    if (editingContent.trim()) {
      onUpdateComment(commentId, editingContent.trim());
      setEditingCommentId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // Group comments by thread
  const topLevelComments = comments.filter(c => !c.parentCommentId && !c.isResolved);
  const resolvedComments = comments.filter(c => c.isResolved);

  const CommentItem = ({ comment }: { comment: NoteComment }) => {
    const isEditing = editingCommentId === comment.id;
    const isAuthor = comment.author === currentUserId;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`group relative ${comment.isResolved ? 'opacity-60' : ''}`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(comment.authorName || 'U')[0].toUpperCase()}
            </div>
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {comment.authorName || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {comment.isResolved && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Menu */}
                {isAuthor && !comment.isResolved && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(showMenu === comment.id ? null : comment.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMenu === comment.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          onClick={() => handleEdit(comment)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onDeleteComment(comment.id);
                            setShowMenu(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
            </div>

            {/* Actions */}
            {!comment.isResolved && !isEditing && (
              <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onResolveComment(comment.id)}
                  className="text-xs text-gray-500 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Mark as resolved
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {currentUserName[0].toUpperCase()}
            </div>
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Comment
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        <AnimatePresence>
          {topLevelComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </AnimatePresence>

        {/* Resolved Comments */}
        {resolvedComments.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              {resolvedComments.length} resolved comment{resolvedComments.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-4 space-y-4">
              <AnimatePresence>
                {resolvedComments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </AnimatePresence>
            </div>
          </details>
        )}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
}
