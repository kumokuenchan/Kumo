import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Quote,
  CheckSquare,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import InputModal from './InputModal';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  keywords?: string[];
}

interface SlashCommandsProps {
  editor: Editor;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (command: SlashCommand) => void;
}

export const slashCommands: SlashCommand[] = [
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    keywords: ['h1', 'title', 'big'],
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    keywords: ['h2', 'subtitle'],
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    keywords: ['h3'],
  },
  {
    id: 'bulletList',
    title: 'Bullet List',
    description: 'Create a bullet list',
    icon: <List className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
    keywords: ['ul', 'unordered'],
  },
  {
    id: 'numberedList',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    keywords: ['ol', 'ordered', '1', '2', '3'],
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
    keywords: ['checkbox', 'task', 'checklist'],
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Insert code with syntax highlighting',
    icon: <Code2 className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    keywords: ['```', 'programming', 'snippet'],
  },
  {
    id: 'sql',
    title: 'SQL Code',
    description: 'SQL code block',
    icon: <Code2 className="w-4 h-4 text-blue-500" />,
    command: (editor) => editor.chain().focus().toggleCodeBlock().updateAttributes('codeBlock', { language: 'sql' }).run(),
    keywords: ['mysql', 'database', 'query'],
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Insert a table',
    icon: <TableIcon className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    keywords: ['grid', 'spreadsheet'],
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Insert a quote block',
    icon: <Quote className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    keywords: ['blockquote', 'citation'],
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Insert a horizontal line',
    icon: <Minus className="w-4 h-4" />,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    keywords: ['hr', 'line', 'separator'],
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Insert an image',
    icon: <ImageIcon className="w-4 h-4" />,
    command: (editor) => {
      // This will be handled specially in the component
    },
    keywords: ['photo', 'picture', 'img'],
  },
];

export default function SlashCommands({ editor, isOpen, position, onClose, onSelect }: SlashCommandsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageUrlModal, setShowImageUrlModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCommandSelect = (command: SlashCommand) => {
    if (command.id === 'image') {
      setShowImageUrlModal(true);
    } else {
      onSelect(command);
    }
  };

  const handleImageUrlConfirm = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
    onClose();
  };

  const filteredCommands = slashCommands.filter((command) => {
    const query = searchQuery.toLowerCase();
    return (
      command.title.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.keywords?.some((keyword) => keyword.includes(query))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleCommandSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose, handleCommandSelect]);

  if (!isOpen) return null;

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search commands..."
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No commands found
          </div>
        ) : (
          <div className="p-1">
            {filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => handleCommandSelect(command)}
                className={`w-full px-3 py-2 rounded-lg text-left flex items-start gap-3 transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    index === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {command.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {command.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {command.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
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
    </>
  );
}
