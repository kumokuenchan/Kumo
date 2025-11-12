import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
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
  Code,
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
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
    <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap items-center gap-1 bg-white dark:bg-gray-900 sticky top-0 z-10">
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
          <Code className="w-4 h-4" />
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block
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

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[200px] code-blocks-enhanced"
      />
      <style>{`
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

        .code-blocks-enhanced code {
          background: #f4f4f5 !important;
          padding: 0.125rem 0.375rem !important;
          border-radius: 0.25rem !important;
          font-size: 0.875em !important;
          color: #e11d48 !important;
        }

        .dark .code-blocks-enhanced code {
          background: #27272a !important;
          color: #fca5a5 !important;
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
      `}</style>
    </div>
  );
}
