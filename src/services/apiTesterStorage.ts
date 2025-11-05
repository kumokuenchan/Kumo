import type { ApiRequest, ApiResponse } from '../api/apiTester';

export interface HistoryItem {
  id: string;
  request: ApiRequest;
  response: {
    status: number;
    statusText: string;
    duration: number;
    size: number;
  };
  timestamp: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedRequest {
  id: string;
  name: string;
  request: ApiRequest;
  description?: string;
  createdAt: number;
}

class ApiTesterStorage {
  private historyKey = 'apiTester:history';
  private collectionsKey = 'apiTester:collections';
  private maxHistoryItems = 100;

  // ===== HISTORY =====

  /**
   * Add a request to history
   */
  addToHistory(request: ApiRequest, response: ApiResponse): void {
    try {
      const history = this.getHistory();
      const item: HistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        request,
        response: {
          status: response.status,
          statusText: response.statusText,
          duration: response.duration,
          size: response.size,
        },
        timestamp: Date.now(),
      };

      // Add to beginning and limit size
      history.unshift(item);
      if (history.length > this.maxHistoryItems) {
        history.splice(this.maxHistoryItems);
      }

      localStorage.setItem(this.historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  /**
   * Get all history items
   */
  getHistory(): HistoryItem[] {
    try {
      const raw = localStorage.getItem(this.historyKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    try {
      localStorage.setItem(this.historyKey, JSON.stringify([]));
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Delete a specific history item
   */
  deleteHistoryItem(id: string): void {
    try {
      const history = this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(this.historyKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  }

  // ===== COLLECTIONS =====

  /**
   * Get all collections
   */
  getCollections(): Collection[] {
    try {
      const raw = localStorage.getItem(this.collectionsKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Failed to load collections:', error);
      return [];
    }
  }

  /**
   * Create a new collection
   */
  createCollection(name: string, description?: string): Collection {
    try {
      const collections = this.getCollections();
      const collection: Collection = {
        id: `coll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        description,
        requests: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      collections.push(collection);
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      return collection;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Update a collection
   */
  updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>): void {
    try {
      const collections = this.getCollections();
      const index = collections.findIndex(c => c.id === id);
      if (index !== -1) {
        collections[index] = {
          ...collections[index],
          ...updates,
          updatedAt: Date.now(),
        };
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  }

  /**
   * Delete a collection
   */
  deleteCollection(id: string): void {
    try {
      const collections = this.getCollections();
      const filtered = collections.filter(c => c.id !== id);
      localStorage.setItem(this.collectionsKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  }

  /**
   * Add a request to a collection
   */
  addRequestToCollection(collectionId: string, name: string, request: ApiRequest, description?: string): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        const savedRequest: SavedRequest = {
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name,
          request,
          description,
          createdAt: Date.now(),
        };

        collection.requests.push(savedRequest);
        collection.updatedAt = Date.now();
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to add request to collection:', error);
    }
  }

  /**
   * Update a request in a collection
   */
  updateRequestInCollection(
    collectionId: string,
    requestId: string,
    updates: Partial<Omit<SavedRequest, 'id' | 'createdAt'>>
  ): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        const reqIndex = collection.requests.findIndex(r => r.id === requestId);
        if (reqIndex !== -1) {
          collection.requests[reqIndex] = {
            ...collection.requests[reqIndex],
            ...updates,
          };
          collection.updatedAt = Date.now();
          localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
        }
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  }

  /**
   * Delete a request from a collection
   */
  deleteRequestFromCollection(collectionId: string, requestId: string): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        collection.requests = collection.requests.filter(r => r.id !== requestId);
        collection.updatedAt = Date.now();
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  }
}

export const apiTesterStorage = new ApiTesterStorage();
