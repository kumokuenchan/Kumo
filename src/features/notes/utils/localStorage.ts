// Local storage keys
const NOTES_LOCAL_STORAGE_KEY = 'kumodb_notes_state';
const NOTES_PREVIEW_LOCAL_STORAGE_KEY = 'kumodb_notes_preview_state';

// Define the structure of the persisted state
export interface NotesPersistedState {
  activeView?: string;
  notesViewMode?: string;
  searchQuery?: string;
  credentialSearchQuery?: string;
  filterType?: string[];
  filterStatus?: string[];
  filterPriority?: string[];
  showPinnedOnly?: boolean;
  sortField?: string;
  sortDirection?: string;
  selectedNoteType?: string;
  selectedTags?: string[];
  selectedNoteId?: string; // Add selected note ID
}

// Define the structure for note preview state
export interface NotesPreviewPersistedState {
  showNoteModal?: boolean;
  noteToDisplayId?: string; // Store the ID instead of the full note object
  isFullScreen?: boolean;
}

// Save state to local storage
export const saveNotesStateToLocalStorage = (state: NotesPersistedState): void => {
  try {
    const stateToSave = {
      activeView: state.activeView,
      notesViewMode: state.notesViewMode,
      searchQuery: state.searchQuery,
      credentialSearchQuery: state.credentialSearchQuery,
      filterType: state.filterType,
      filterStatus: state.filterStatus,
      filterPriority: state.filterPriority,
      showPinnedOnly: state.showPinnedOnly,
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      selectedNoteType: state.selectedNoteType,
      selectedTags: state.selectedTags,
    };
    
    // Only save non-undefined values
    const filteredState = Object.fromEntries(
      Object.entries(stateToSave).filter(([_, value]) => value !== undefined)
    );
    
    localStorage.setItem(NOTES_LOCAL_STORAGE_KEY, JSON.stringify(filteredState));
  } catch (error) {
    console.warn('Failed to save notes state to local storage:', error);
  }
};

// Load state from local storage
export const loadNotesStateFromLocalStorage = (): NotesPersistedState | null => {
  try {
    const savedState = localStorage.getItem(NOTES_LOCAL_STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load notes state from local storage:', error);
    return null;
  }
};

// Save note preview state to local storage
export const saveNotesPreviewStateToLocalStorage = (previewState: NotesPreviewPersistedState): void => {
  try {
    const stateToSave = {
      showNoteModal: previewState.showNoteModal,
      noteToDisplayId: previewState.noteToDisplayId,
      isFullScreen: previewState.isFullScreen,
    };
    
    // Only save non-undefined values
    const filteredState = Object.fromEntries(
      Object.entries(stateToSave).filter(([_, value]) => value !== undefined)
    );
    
    localStorage.setItem(NOTES_PREVIEW_LOCAL_STORAGE_KEY, JSON.stringify(filteredState));
  } catch (error) {
    console.warn('Failed to save notes preview state to local storage:', error);
  }
};

// Load note preview state from local storage
export const loadNotesPreviewStateFromLocalStorage = (): NotesPreviewPersistedState | null => {
  try {
    const savedState = localStorage.getItem(NOTES_PREVIEW_LOCAL_STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load notes preview state from local storage:', error);
    return null;
  }
};

// Clear state from local storage
export const clearNotesStateFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(NOTES_LOCAL_STORAGE_KEY);
    localStorage.removeItem(NOTES_PREVIEW_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear notes state from local storage:', error);
  }
};