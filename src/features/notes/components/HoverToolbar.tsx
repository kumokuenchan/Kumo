import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code as CodeIcon,
  Link as LinkIcon,
  Highlighter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HoverToolbarProps {
  editor: Editor;
}

export default function HoverToolbar({ editor }: HoverToolbarProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;

      // Hide if no selection or if selection is empty
      if (from === to) {
        setShow(false);
        setShowLinkInput(false);
        return;
      }

      // Get the selection coordinates
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setShow(false);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position toolbar above selection
      const top = rect.top + window.scrollY - 50;
      const left = rect.left + window.scrollX + rect.width / 2;

      setPosition({ top, left });
      setShow(true);
    };

    const handleUpdate = () => {
      updatePosition();
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
      // Pre-fill with existing link if any
      const url = editor.getAttributes('link').href || '';
      setLinkUrl(url);
    }
  }, [showLinkInput, editor]);

  const handleBold = () => {
    editor.chain().focus().toggleBold().run();
  };

  const handleItalic = () => {
    editor.chain().focus().toggleItalic().run();
  };

  const handleStrike = () => {
    editor.chain().focus().toggleStrike().run();
  };

  const handleCode = () => {
    editor.chain().focus().toggleCode().run();
  };

  const handleLinkClick = () => {
    if (editor.isActive('link')) {
      // Remove link if already active
      editor.chain().focus().unsetLink().run();
    } else {
      setShowLinkInput(true);
    }
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .setLink({ href: linkUrl })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLinkSubmit();
    } else if (e.key === 'Escape') {
      setShowLinkInput(false);
      setLinkUrl('');
    }
  };

  const buttonClass = (isActive: boolean) =>
    `p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
      isActive ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
    }`;

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 px-2 py-1.5 flex items-center gap-1"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        }}
      >
        {!showLinkInput ? (
          <>
            <button
              onClick={handleBold}
              className={buttonClass(editor.isActive('bold'))}
              title="Bold (⌘B)"
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              onClick={handleItalic}
              className={buttonClass(editor.isActive('italic'))}
              title="Italic (⌘I)"
            >
              <Italic className="w-4 h-4" />
            </button>

            <button
              onClick={handleStrike}
              className={buttonClass(editor.isActive('strike'))}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <button
              onClick={handleCode}
              className={buttonClass(editor.isActive('code'))}
              title="Inline Code"
            >
              <CodeIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

            <button
              onClick={handleLinkClick}
              className={buttonClass(editor.isActive('link'))}
              title="Link (⌘K)"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={linkInputRef}
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder="Paste link..."
              className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            <button
              onClick={handleLinkSubmit}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
              }}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
