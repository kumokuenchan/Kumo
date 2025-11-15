export interface MongoDbPersistedState {
  selectedDatabase: string | null;
  selectedCollection: string | null;
  activeConnectionId: string | null;
  expandedDatabases: string[]; // Store as array since Set can't be JSON serialized
  viewMode: 'json' | 'table';
  activeTab: 'documents' | 'aggregations' | 'schema' | 'indexes';
  pageSize: number;
  filterQuery: string;
  searchField: string;
  searchTerm: string;
  isSearchActive: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  queryHistory: any[];
}

export const saveMongoDbStateToLocalStorage = (state: Partial<MongoDbPersistedState>) => {
  try {
    // Load existing state first
    const existingState = loadMongoDbStateFromLocalStorage() || {};

    // Merge new state with existing state
    const mergedState = {
      ...existingState,
      ...state
    };

    const serializedState = JSON.stringify(mergedState);
    localStorage.setItem('mongodb-state', serializedState);
  } catch (error) {
    console.error('Failed to save MongoDB state to localStorage:', error);
  }
};

export const loadMongoDbStateFromLocalStorage = (): Partial<MongoDbPersistedState> | null => {
  try {
    const serializedState = localStorage.getItem('mongodb-state');
    if (!serializedState) {
      return null;
    }
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Failed to load MongoDB state from localStorage:', error);
    return null;
  }
};

export const clearMongoDbStateFromLocalStorage = () => {
  try {
    localStorage.removeItem('mongodb-state');
  } catch (error) {
    console.error('Failed to clear MongoDB state from localStorage:', error);
  }
};