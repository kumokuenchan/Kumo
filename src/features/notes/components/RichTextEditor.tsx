import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Code from '@tiptap/extension-code';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import go from 'highlight.js/lib/languages/go';
import php from 'highlight.js/lib/languages/php';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import {
  Bold,
  Italic,
  Strikethrough,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code2,
  Minus,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlashCommands, { SlashCommand } from './SlashCommands';
import InputModal from './InputModal';
import { Callout } from './CalloutExtension';
import HoverToolbar from './HoverToolbar';
import { TableOfContents } from './TableOfContentsExtension';
import { Toggle } from './ToggleExtension';

// Create lowlight instance and register languages
const lowlight = createLowlight(common);
lowlight.register('javascript', javascript);
lowlight.register('js', javascript);
lowlight.register('typescript', typescript);
lowlight.register('ts', typescript);
lowlight.register('python', python);
lowlight.register('py', python);
lowlight.register('go', go);
lowlight.register('golang', go);
lowlight.register('php', php);
lowlight.register('bash', bash);
lowlight.register('sh', bash);
lowlight.register('shell', bash);
lowlight.register('sql', sql);
lowlight.register('mysql', sql);
lowlight.register('json', json);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('css', css);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

interface MenuBarProps {
  editor: Editor | null;
}

const MenuBar: React.FC<MenuBarProps> = ({ editor }) => {
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [showHeadingMenu, setShowHeadingMenu] = React.useState(false);
  const [showCodeLanguageMenu, setShowCodeLanguageMenu] = React.useState(false);
  const [showImageUrlModal, setShowImageUrlModal] = React.useState(false);

  if (!editor) {
    return null;
  }

  const supportedLanguages = [
    { label: 'Plain Text', value: null },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'Go', value: 'go' },
    { label: 'PHP', value: 'php' },
    { label: 'Bash', value: 'bash' },
    { label: 'SQL', value: 'sql' },
    { label: 'JSON', value: 'json' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
  ];

  const setCodeBlockLanguage = (language: string | null) => {
    if (language) {
      editor.chain().focus().toggleCodeBlock().updateAttributes('codeBlock', { language }).run();
    } else {
      editor.chain().focus().toggleCodeBlock().run();
    }
    setShowCodeLanguageMenu(false);
  };

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const addImage = () => {
    setShowImageUrlModal(true);
  };

  const handleImageUrlConfirm = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-lg transition-all ${
      isActive
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="border-b border-gray-100/50 dark:border-gray-800/50 p-2 flex flex-wrap items-center gap-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-10">
      {/* Text Formatting */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={buttonClass(editor.isActive('code'))}
          title="Inline Code"
        >
          <CodeIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700 relative">
        <button
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className={buttonClass(editor.isActive('heading'))}
          title="Headings"
        >
          <div className="flex items-center gap-1">
            <Heading1 className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </div>
        </button>

        <AnimatePresence>
          {showHeadingMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px] z-20"
            >
              <button
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadingMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                Normal text
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setShowHeadingMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Heading1 className="w-4 h-4" />
                <span className="text-xl font-bold">Heading 1</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setShowHeadingMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Heading2 className="w-4 h-4" />
                <span className="text-lg font-bold">Heading 2</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setShowHeadingMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Heading3 className="w-4 h-4" />
                <span className="text-base font-bold">Heading 3</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass(editor.isActive('blockquote'))}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
      </div>

      {/* Code & Divider */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700 relative">
        <button
          onClick={() => setShowCodeLanguageMenu(!showCodeLanguageMenu)}
          className={buttonClass(editor.isActive('codeBlock'))}
          title="Code Block"
        >
          <div className="flex items-center gap-1">
            <Code2 className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </div>
        </button>

        <AnimatePresence>
          {showCodeLanguageMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px] z-20 max-h-64 overflow-y-auto"
            >
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.value || 'plain'}
                  onClick={() => setCodeBlockLanguage(lang.value)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4 text-gray-400" />
                  <span>{lang.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={buttonClass(false)}
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Insert */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
        <div className="relative">
          <button
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={buttonClass(editor.isActive('link'))}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          {editor.isActive('link') && (
            <button
              onClick={removeLink}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              title="Remove Link"
            >
              ×
            </button>
          )}
          {showLinkInput && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20 min-w-[250px]"
            >
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                onKeyPress={(e) => e.key === 'Enter' && addLink()}
                autoFocus
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={addLink}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>
        <button
          onClick={addImage}
          className={buttonClass(false)}
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          onClick={addTable}
          className={buttonClass(editor.isActive('table'))}
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`p-2 rounded-lg transition-all ${
            !editor.can().undo()
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 rounded-lg transition-all ${
            !editor.can().redo()
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Image URL Modal */}
      <InputModal
        isOpen={showImageUrlModal}
        onClose={() => setShowImageUrlModal(false)}
        onConfirm={handleImageUrlConfirm}
        title="Insert Image"
        placeholder="https://example.com/image.jpg"
        confirmText="Insert"
      />
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  autoFocus = false,
  editable = true,
}: RichTextEditorProps) {
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandPosition, setSlashCommandPosition] = useState({ x: 0, y: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        code: false, // Disable default code to add custom one
        codeBlock: false, // Disable default code block
      }),
      Code.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              // Keep code mark active after Enter
              if (this.editor.isActive('code')) {
                return this.editor.commands.setHardBreak();
              }
              return false;
            },
          };
        },
      }).configure({
        HTMLAttributes: {
          class: 'inline-code-mark',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'hljs',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-left font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 px-3 py-2',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'task-item',
        },
        nested: true,
      }),
      Callout,
      TableOfContents,
      Toggle,
    ],
    content,
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  // Handle slash command detection
  useEffect(() => {
    if (!editor || !editable) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect "/" key
      if (event.key === '/') {
        // Get cursor position
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);

        setSlashCommandPosition({
          x: coords.left,
          y: coords.bottom + 10,
        });

        // Show slash commands menu after the "/" is inserted
        setTimeout(() => {
          setShowSlashCommands(true);
        }, 0);
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown);

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, editable]);

  const handleSlashCommandSelect = (command: SlashCommand) => {
    if (!editor) return;

    // Close the menu
    setShowSlashCommands(false);

    // Delete the slash character
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();

    // Execute the command after a small delay to ensure deletion completes
    requestAnimationFrame(() => {
      command.command(editor);
    });
  };

  return (
    <>
      <div className={`rounded-xl ${className?.includes('border-none') ? 'bg-transparent overflow-visible' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden'} ${className}`}>
        {editable && <MenuBar editor={editor} />}
        <EditorContent
          editor={editor}
          className={`prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] code-blocks-enhanced focus-within:outline-none [&_*]:focus:outline-none [&_*]:focus-visible:outline-none ${className?.includes('border-none') ? '' : 'p-4'}`}
        />
        <style>{`
        /* Remove ALL focus outlines and borders from TipTap/ProseMirror */
        .ProseMirror,
        .ProseMirror:focus,
        .ProseMirror:focus-visible,
        .ProseMirror-focused,
        div[contenteditable="true"],
        div[contenteditable="true"]:focus,
        div[contenteditable="true"]:focus-visible {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
        }

        /* Remove focus from all child elements */
        .code-blocks-enhanced *:focus,
        .code-blocks-enhanced *:focus-visible {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Apple-style blue caret */
        .code-blocks-enhanced *,
        .ProseMirror * {
          caret-color: #3b82f6 !important;
        }

        .dark .code-blocks-enhanced *,
        .dark .ProseMirror * {
          caret-color: #60a5fa !important;
        }

        /* Apple-inspired typography and spacing */
        .code-blocks-enhanced.ProseMirror {
          line-height: 1.75 !important;
          letter-spacing: -0.011em !important;
          font-size: 1.0625rem !important;
        }

        .code-blocks-enhanced.ProseMirror p {
          margin: 1.25em 0 !important;
          line-height: 1.75 !important;
        }

        .code-blocks-enhanced.ProseMirror h1 {
          margin: 1.5em 0 0.75em !important;
          line-height: 1.2 !important;
          font-weight: 700 !important;
          letter-spacing: -0.022em !important;
        }

        .code-blocks-enhanced.ProseMirror h2 {
          margin: 1.5em 0 0.5em !important;
          line-height: 1.3 !important;
          font-weight: 600 !important;
          letter-spacing: -0.019em !important;
        }

        .code-blocks-enhanced.ProseMirror h3 {
          margin: 1.25em 0 0.5em !important;
          line-height: 1.4 !important;
          font-weight: 600 !important;
          letter-spacing: -0.017em !important;
        }

        .code-blocks-enhanced.ProseMirror ul,
        .code-blocks-enhanced.ProseMirror ol {
          margin: 1.25em 0 !important;
          padding-left: 1.75em !important;
        }

        .code-blocks-enhanced.ProseMirror li {
          margin: 0.5em 0 !important;
          line-height: 1.75 !important;
        }

        .code-blocks-enhanced.ProseMirror blockquote {
          margin: 1.5em 0 !important;
          padding: 1em 1.5em !important;
          border-left: 4px solid #e5e7eb !important;
        }

        .dark .code-blocks-enhanced.ProseMirror blockquote {
          border-left-color: #374151 !important;
        }

        /* Generous bottom padding for cursor visibility */
        .code-blocks-enhanced.ProseMirror::after {
          content: '';
          display: block;
          height: 200px;
        }

        .code-blocks-enhanced pre {
          background: #1e1e1e !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          margin: 1rem 0 !important;
          overflow-x: auto !important;
        }

        .code-blocks-enhanced pre code {
          background: transparent !important;
          padding: 0 !important;
          color: #d4d4d4 !important;
          font-size: 0.875rem !important;
          line-height: 1.7 !important;
        }

        /* Inline code - specific class from TipTap */
        .code-blocks-enhanced .inline-code-mark {
          background: #f4f4f5 !important;
          padding: 0.2em 0.4em !important;
          border-radius: 0.3rem !important;
          font-size: 0.9em !important;
          color: #dc2626 !important;
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace !important;
          font-weight: 500 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          border: 1px solid #e5e7eb !important;
          display: inline !important;
        }

        /* Hard break inside inline code */
        .code-blocks-enhanced .inline-code-mark br {
          display: block !important;
          content: '' !important;
        }

        /* Fallback for inline code without specific class */
        .code-blocks-enhanced p code:not(pre code),
        .code-blocks-enhanced li code:not(pre code),
        .code-blocks-enhanced h1 code:not(pre code),
        .code-blocks-enhanced h2 code:not(pre code),
        .code-blocks-enhanced h3 code:not(pre code),
        .code-blocks-enhanced h4 code:not(pre code),
        .code-blocks-enhanced h5 code:not(pre code),
        .code-blocks-enhanced h6 code:not(pre code),
        .code-blocks-enhanced blockquote code:not(pre code),
        .code-blocks-enhanced td code:not(pre code),
        .code-blocks-enhanced th code:not(pre code) {
          background: #f4f4f5 !important;
          padding: 0.2em 0.4em !important;
          border-radius: 0.3rem !important;
          font-size: 0.9em !important;
          color: #dc2626 !important;
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace !important;
          font-weight: 500 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          border: 1px solid #e5e7eb !important;
        }

        /* Dark mode inline code */
        .dark .code-blocks-enhanced .inline-code-mark {
          background: #27272a !important;
          color: #fb7185 !important;
          border: 1px solid #3f3f46 !important;
          display: inline !important;
        }

        .dark .code-blocks-enhanced .inline-code-mark br {
          display: block !important;
          content: '' !important;
        }

        .dark .code-blocks-enhanced p code:not(pre code),
        .dark .code-blocks-enhanced li code:not(pre code),
        .dark .code-blocks-enhanced h1 code:not(pre code),
        .dark .code-blocks-enhanced h2 code:not(pre code),
        .dark .code-blocks-enhanced h3 code:not(pre code),
        .dark .code-blocks-enhanced h4 code:not(pre code),
        .dark .code-blocks-enhanced h5 code:not(pre code),
        .dark .code-blocks-enhanced h6 code:not(pre code),
        .dark .code-blocks-enhanced blockquote code:not(pre code),
        .dark .code-blocks-enhanced td code:not(pre code),
        .dark .code-blocks-enhanced th code:not(pre code) {
          background: #27272a !important;
          color: #fb7185 !important;
          border: 1px solid #3f3f46 !important;
        }

        /* Syntax highlighting colors */
        .hljs-comment,
        .hljs-quote {
          color: #6a9955 !important;
        }

        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-built_in,
        .hljs-name,
        .hljs-tag {
          color: #569cd6 !important;
        }

        .hljs-string,
        .hljs-title,
        .hljs-section,
        .hljs-attribute,
        .hljs-literal,
        .hljs-template-tag,
        .hljs-template-variable,
        .hljs-type {
          color: #ce9178 !important;
        }

        .hljs-number,
        .hljs-meta,
        .hljs-link {
          color: #b5cea8 !important;
        }

        .hljs-function .hljs-title {
          color: #dcdcaa !important;
        }

        .hljs-variable,
        .hljs-attr {
          color: #9cdcfe !important;
        }

        .hljs-params {
          color: #d4d4d4 !important;
        }

        /* Task list styles */
        .task-list {
          list-style: none !important;
          padding-left: 0 !important;
        }

        .task-item {
          display: flex !important;
          align-items: flex-start !important;
          gap: 0.5rem !important;
          margin: 0.25rem 0 !important;
        }

        .task-item > label {
          display: flex !important;
          align-items: center !important;
        }

        .task-item > label input[type="checkbox"] {
          margin: 0 !important;
          width: 1rem !important;
          height: 1rem !important;
          cursor: pointer !important;
        }

        .task-item > div {
          flex: 1 !important;
        }

        /* Callout content styles */
        .callout-content {
          font-size: 0.95rem !important;
        }

        .callout-content p:first-child {
          margin-top: 0 !important;
        }

        .callout-content p:last-child {
          margin-bottom: 0 !important;
        }

        /* Toggle content styles */
        .toggle-content {
          font-size: 0.95rem !important;
        }

        .toggle-content p:first-child {
          margin-top: 0 !important;
        }

        .toggle-content p:last-child {
          margin-bottom: 0 !important;
        }
      `}</style>
      </div>

      {/* Slash Commands Menu */}
      {editable && editor && (
        <SlashCommands
          editor={editor}
          isOpen={showSlashCommands}
          position={slashCommandPosition}
          onClose={() => setShowSlashCommands(false)}
          onSelect={handleSlashCommandSelect}
        />
      )}

      {/* Hover Toolbar */}
      {editable && editor && <HoverToolbar editor={editor} />}
    </>
  );
}
