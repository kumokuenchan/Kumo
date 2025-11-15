import { Note } from '../../../types/notes';

export interface NoteLink {
  sourceNoteId: string;
  targetNoteId: string;
  linkText: string;
  createdAt: string;
}

export interface Backlink {
  sourceNoteId: string;
  sourceNoteTitle: string;
  linkText: string;
  createdAt: string;
}

class NoteLinkService {
  private links: NoteLink[] = [];
  private storageKey = 'note-links';

  constructor() {
    this.loadLinks();
  }

  private loadLinks() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.links = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load note links:', error);
    }
  }

  private saveLinks() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.links));
    } catch (error) {
      console.error('Failed to save note links:', error);
    }
  }

  /**
   * Create a link between two notes
   */
  createLink(sourceNoteId: string, targetNoteId: string, linkText: string): void {
    if (!sourceNoteId || !targetNoteId) {
      console.warn('Invalid note IDs provided for link creation');
      return;
    }

    // Check if the link already exists
    const existingLinkIndex = this.links.findIndex(
      link => 
        link.sourceNoteId === sourceNoteId && 
        link.targetNoteId === targetNoteId &&
        link.linkText === linkText
    );

    if (existingLinkIndex === -1) {
      const newLink: NoteLink = {
        sourceNoteId,
        targetNoteId,
        linkText,
        createdAt: new Date().toISOString(),
      };

      this.links.push(newLink);
      this.saveLinks();
    }
  }

  /**
   * Remove a link between two notes
   */
  removeLink(sourceNoteId: string, targetNoteId: string): void {
    this.links = this.links.filter(
      link => !(link.sourceNoteId === sourceNoteId && link.targetNoteId === targetNoteId)
    );
    this.saveLinks();
  }

  /**
   * Get all links from a specific note
   */
  getLinksFromNote(noteId: string): NoteLink[] {
    return this.links.filter(link => link.sourceNoteId === noteId);
  }

  /**
   * Get all backlinks to a specific note
   */
  getBacklinksToNote(noteId: string): Backlink[] {
    return this.links
      .filter(link => link.targetNoteId === noteId)
      .map(link => {
        // We'll need to get the source note to get its title
        // This would require access to the notes store, so for now we'll have a placeholder
        return {
          sourceNoteId: link.sourceNoteId,
          sourceNoteTitle: `Note ${link.sourceNoteId.substring(0, 8)}`, // Placeholder - would need actual note title
          linkText: link.linkText,
          createdAt: link.createdAt,
        };
      });
  }

  /**
   * Find mentions of a note by its title in all other notes
   */
  findMentions(notes: Note[], targetNoteId: string, targetTitle: string): Backlink[] {
    const mentions: Backlink[] = [];

    if (!targetTitle) return mentions;

    const normalizedTargetTitle = targetTitle.toLowerCase().trim();

    notes.forEach(note => {
      if (note.id === targetNoteId) return; // Skip the target note itself
      
      const normalizedContent = note.content.toLowerCase();
      const normalizedTitle = note.title.toLowerCase();
      
      // Check if the target note title appears in the content
      if (normalizedContent.includes(normalizedTargetTitle) || normalizedTitle.includes(normalizedTargetTitle)) {
        mentions.push({
          sourceNoteId: note.id,
          sourceNoteTitle: note.title,
          linkText: targetTitle,
          createdAt: note.updatedAt,
        });
      }
    });

    return mentions;
  }

  /**
   * Update links when a note's content changes
   */
  updateLinksForNote(noteId: string, content: string, notes: Note[]): void {
    // Remove existing links from this note
    this.links = this.links.filter(link => link.sourceNoteId !== noteId);

    // Extract potential links from the new content
    // This is a simple implementation - in a real app, you'd want more sophisticated parsing
    const linkRegex = /\[\[([^\]]+)\]\]/g; // Matches [[note title]] format
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].trim();
      
      // Find if there's a note with this title
      const targetNote = notes.find(note => 
        note.title.toLowerCase() === linkText.toLowerCase() && 
        note.id !== noteId
      );
      
      if (targetNote) {
        this.createLink(noteId, targetNote.id, linkText);
      }
    }
    
    this.saveLinks();
  }

  /**
   * Get all links in the system
   */
  getAllLinks(): NoteLink[] {
    return [...this.links];
  }

  /**
   * Clear all links (for testing purposes)
   */
  clearAll(): void {
    this.links = [];
    this.saveLinks();
  }
}

export const noteLinkService = new NoteLinkService();