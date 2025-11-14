import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DraggableBlockComponent from './DraggableBlockComponent';

export interface DraggableBlockOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    draggableBlock: {
      setDraggableBlock: (content?: string) => ReturnType;
    };
  }
}

export const DraggableBlock = Node.create<DraggableBlockOptions>({
  name: 'draggableBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({
          'data-block-id': attributes.blockId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-draggable-block]',
        getAttrs: element => {
          if (typeof element === 'string') return false;
          return { blockId: element.getAttribute('data-block-id') };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-draggable-block': '', 'data-block-id': HTMLAttributes['data-block-id'] }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DraggableBlockComponent);
  },

  addCommands() {
    return {
      setDraggableBlock:
        (content = '') =>
        ({ commands }) => {
          const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          return commands.insertContent({
            type: this.name,
            attrs: { blockId },
            content: content
              ? [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: content }],
                  },
                ]
              : [
                  {
                    type: 'paragraph',
                  },
                ],
          });
        },
    };
  },
});