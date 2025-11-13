import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function ToggleComponent({ node, updateAttributes }: any) {
  const [isOpen, setIsOpen] = useState(node.attrs.isOpen !== false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.attrs.title || 'Toggle');

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    updateAttributes({ isOpen: newState });
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (title.trim()) {
      updateAttributes({ title: title.trim() });
    } else {
      setTitle('Toggle');
      updateAttributes({ title: 'Toggle' });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTitle(node.attrs.title || 'Toggle');
      setIsEditing(false);
    }
  };

  return (
    <NodeViewWrapper>
      <div className="my-2">
        {/* Toggle Header */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleToggle}
            className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            contentEditable={false}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-blue-500 rounded outline-none"
              contentEditable={false}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="flex-1 px-2 py-1 font-semibold text-gray-900 dark:text-gray-100 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors"
              contentEditable={false}
            >
              {title}
            </div>
          )}
        </div>

        {/* Toggle Content */}
        <div
          className="pl-7 transition-all duration-200 ease-in-out overflow-hidden"
          style={{
            maxHeight: isOpen ? '5000px' : '0',
            paddingTop: isOpen ? '0.5rem' : '0',
            opacity: isOpen ? 1 : 0,
          }}
        >
          <NodeViewContent className="toggle-content" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
