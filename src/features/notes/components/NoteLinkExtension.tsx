import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { InputRule } from '@tiptap/core';

interface NoteLinkOptions {
  HTMLAttributes: Record<string, any>;
  onNavigateToNote?: (noteId: string, noteTitle: string) => void; // Add navigation callback
  notes?: any[]; // Pass notes for lookup
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteLink: {
      setNoteLink: (attributes: { href: string; noteId?: string; noteTitle: string }) => ReturnType;
      unsetNoteLink: () => ReturnType;
    };
  }
}

export const NoteLink = Mark.create<NoteLinkOptions>({
  name: 'noteLink',

  priority: 1000,

  keepOnSplit: false,

  exitable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'note-link text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer',
      },
      onNavigateToNote: undefined, // Default to undefined
      notes: [], // Default to empty array
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: element => element.getAttribute('data-href') || element.getAttribute('href'),
        renderHTML: attributes => {
          if (!attributes.href) {
            return {};
          }

          return {
            'data-href': attributes.href,
            href: attributes.href,
          };
        },
      },
      noteId: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-id'),
        renderHTML: attributes => {
          if (!attributes.noteId) {
            return {};
          }

          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
      noteTitle: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-title'),
        renderHTML: attributes => {
          if (!attributes.noteTitle) {
            return {};
          }

          return {
            'data-note-title': attributes.noteTitle,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-note-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-note-link': '' }),
      0,
    ];
  },

  addCommands() {
    return {
      setNoteLink: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      unsetNoteLink: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const noteTitle = match[1];
          
          // Find note by title
          let noteId = null;
          if (this.options.notes) {
            const matchedNote = this.options.notes.find((note: any) => note.title === noteTitle);
            if (matchedNote) {
              noteId = matchedNote.id;
            }
          }
          
          const attributes = {
            noteTitle,
            noteId,
            href: `#note:${noteId || noteTitle}` // Create a pseudo-href
          };
          
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          
          // Replace the text with the note link
          tr.replaceWith(start, end, state.schema.text(noteTitle));
          tr.addMark(start, start + noteTitle.length, this.type.create(attributes));
          tr.removeStoredMark(this.type); // Ensure mark is removed after insertion
          
          return tr;
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('noteLinkHandler'),
        props: {
          handleClick: (view, pos, event) => {
            if (event.target instanceof HTMLAnchorElement && event.target.hasAttribute('data-note-link')) {
              const noteId = event.target.getAttribute('data-note-id');
              const noteTitle = event.target.getAttribute('data-note-title');
              
              if (noteId && this.options.onNavigateToNote) {
                // Call the navigation callback
                this.options.onNavigateToNote(noteId, noteTitle || '');
                return true;
              } else if (noteTitle && this.options.onNavigateToNote && this.options.notes) {
                // If we only have the title, try to find the note ID from the provided notes
                const matchedNote = this.options.notes.find((note: any) => note.title === noteTitle);
                if (matchedNote && matchedNote.id) {
                  this.options.onNavigateToNote(matchedNote.id, noteTitle);
                  return true;
                } else {
                  // If we couldn't find the note by title, use the title as the identifier
                  this.options.onNavigateToNote('', noteTitle);
                  return true;
                }
              }
            }
            return false;
          }
        },
      }),
    ];
  },
});