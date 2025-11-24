import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export interface LineComment {
  id: string;
  line: number;
  originalLine?: number;
  body: string;
  author: {
    login: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at?: string;
  path: string;
  position?: number;
  commitId: string;
}

interface PRCommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  line: number;
  originalLine?: number;
  filePath: string;
  commitId: string;
  onAddComment: (comment: string, line: number, originalLine?: number) => Promise<void>;
  existingComments?: LineComment[];
  currentUser?: string;
}

const PRCommentPanel: React.FC<PRCommentPanelProps> = ({
  isOpen,
  onClose,
  line,
  originalLine,
  filePath,
  commitId,
  onAddComment,
  existingComments = [],
  currentUser = '',
}) => {
  console.log('PRCommentPanel rendering with comments:', existingComments.length, existingComments);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(comment, line, originalLine);
      setComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Comments
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* File Info */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <div className="font-medium text-gray-900 dark:text-white truncate">
            {filePath === 'PR_GENERAL_COMMENT' ? 'Pull Request' : filePath.split('/').pop()}
          </div>
          <div className="text-xs">
            {filePath === 'PR_GENERAL_COMMENT' ? 'General comment' : `Line ${line}${originalLine && ` (original: ${originalLine})`}`}
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {existingComments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Be the first to comment on this line</p>
          </div>
        ) : (
          existingComments.map((comment) => {
            // Handle both line comments and issue comments
            const author = comment.user || comment.author;
            const authorAvatar = author?.avatar_url;
            const authorLogin = author?.login || author?.name || 'Unknown User';
            const createdAt = comment.created_at;
            
            return (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorLogin}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {authorLogin}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown date'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.body}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Comment Form */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`${currentUser ? `${currentUser}, ` : ''}leave a comment...`}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Commenting...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Comment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PRCommentPanel;