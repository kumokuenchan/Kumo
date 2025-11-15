import type { ApiRequest, ApiResponse } from '../../api/apiTester';

// Define the structure for the API tester state to be persisted
export interface ApiTesterState {
  tabs?: {
    id: string;
    name: string;
    request: ApiRequest;
    response?: ApiResponse | null;
    isSaved: boolean;
    groupId?: string;
  }[];
  groups?: {
    id: string;
    name: string;
    color: string;
    collapsed: boolean;
  }[];
  activeTabIndex?: number;
  layoutMode?: 'vertical' | 'horizontal';
  requestMode?: 'rest' | 'graphql';
  activeTab?: 'params' | 'headers' | 'body' | 'auth' | 'graphql';
  showHistory?: boolean;
  showCollections?: boolean;
  showEnvironments?: boolean;
  showTests?: boolean;
}

// Local storage key for API tester state
const API_TESTER_LOCAL_STORAGE_KEY = 'apiTesterState';

// Save API tester state to local storage
export const saveApiTesterState = (state: ApiTesterState): void => {
  try {
    // Only save non-undefined values
    const filteredState = Object.fromEntries(
      Object.entries(state).filter(([_, value]) => value !== undefined)
    );
    
    localStorage.setItem(API_TESTER_LOCAL_STORAGE_KEY, JSON.stringify(filteredState));
  } catch (error) {
    console.warn('Failed to save API tester state to local storage:', error);
  }
};

// Load API tester state from local storage
export const loadApiTesterState = (): ApiTesterState | null => {
  try {
    const savedState = localStorage.getItem(API_TESTER_LOCAL_STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load API tester state from local storage:', error);
    return null;
  }
};

// Clear API tester state from local storage
export const clearApiTesterState = (): void => {
  try {
    localStorage.removeItem(API_TESTER_LOCAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear API tester state from local storage:', error);
  }
};