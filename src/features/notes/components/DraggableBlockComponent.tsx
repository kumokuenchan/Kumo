import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { GripVertical, Plus, Trash2, MoreHorizontal } from 'lucide-react';

// This component will handle the drag handle and block operations
export default function DraggableBlockComponent({ node, updateAttributes, deleteNode, editor, getPos }: any) {
  const [isHovered, setIsHovered] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close options menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddBlock = () => {
    // Add a new block after this one
    const pos = getPos() + node.nodeSize;
    editor.chain().focus().insertContentAt(pos, { type: 'draggableBlock' }).run();
  };

  const handleDeleteBlock = () => {
    deleteNode();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.attrs.blockId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a temporary class for visual feedback
    const target = e.target as HTMLElement;
    if (target) {
      target.classList.add('opacity-50');
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove the temporary class
    const target = e.target as HTMLElement;
    if (target) {
      target.classList.remove('opacity-50');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedBlockId = e.dataTransfer.getData('text/plain');
    
    if (draggedBlockId && draggedBlockId !== node.attrs.blockId) {
      // Get the position where to insert the block
      const targetPos = getPos();
      
      // Find the dragged block in the document
      let draggedFromPos: number | null = null;
      let draggedNode: any = null;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'draggableBlock' && node.attrs.blockId === draggedBlockId) {
          draggedFromPos = pos;
          draggedNode = node;
          return false; // stop iteration
        }
        return true;
      });
      
      if (draggedFromPos !== null && draggedNode) {
        // If the dragged block is before the drop target, adjust the target position
        const targetPosAfterDeletion = draggedFromPos < targetPos ? targetPos - draggedNode.nodeSize : targetPos;
        
        // Perform the move: delete the block from its original position and insert it at the new position
        editor
          .chain()
          .deleteRange({ 
            from: draggedFromPos, 
            to: draggedFromPos + draggedNode.nodeSize 
          })
          .insertContentAt(targetPosAfterDeletion, {
            type: 'draggableBlock',
            attrs: { blockId: draggedBlockId },
            content: draggedNode.content.toJSON()
          })
          .run();
      }
    }
  };

  return (
    <NodeViewWrapper 
      ref={blockRef}
      className="draggable-block relative group my-2"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Block Controls - visible when hovered or options shown */}
      <div 
        className={`absolute left-[-50px] top-0 flex flex-col items-center gap-1 p-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-opacity ${
          isHovered || showOptions ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Drag Handle */}
        <div 
          className="drag-handle p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-grab"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Add Block */}
        <button
          onClick={handleAddBlock}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Add new block"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Options Menu */}
        <div className="relative" ref={optionsRef}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOptions && (
            <div className="absolute left-full ml-2 top-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-40 z-20">
              <button
                onClick={handleDeleteBlock}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete block
              </button>
              {/* More options can be added here */}
            </div>
          )}
        </div>
      </div>

      {/* Block Content */}
      <div className="block-content pl-8 relative">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}