import fs from 'fs/promises';
import path from 'path';

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  sql: string;
  executionTime: number;
  success: boolean;
  error?: string;
  rowCount?: number;
  timestamp: string;
  database?: string;
}

class QueryHistoryStorage {
  private storageFile: string;
  private history: Map<string, QueryHistoryEntry[]> = new Map();
  private maxEntriesPerConnection: number = 100;
  private initialized: boolean = false;

  constructor() {
    this.storageFile = path.join(process.cwd(), 'data', 'query-history.json');
  }

  /**
   * Initialize storage - load existing history from file
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(path.dirname(this.storageFile), { recursive: true });

      try {
        const data = await fs.readFile(this.storageFile, 'utf-8');
        const historyArray = JSON.parse(data) as QueryHistoryEntry[];

        // Group by connection ID
        for (const entry of historyArray) {
          if (!this.history.has(entry.connectionId)) {
            this.history.set(entry.connectionId, []);
          }
          this.history.get(entry.connectionId)!.push(entry);
        }

        
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          
        } else {
          throw error;
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize query history storage:', error);
      throw error;
    }
  }

  /**
   * Add a query to history
   */
  async add(entry: Omit<QueryHistoryEntry, 'id' | 'timestamp'>): Promise<QueryHistoryEntry> {
    if (!this.initialized) {
      await this.initialize();
    }

    const historyEntry: QueryHistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    if (!this.history.has(entry.connectionId)) {
      this.history.set(entry.connectionId, []);
    }

    const connectionHistory = this.history.get(entry.connectionId)!;
    connectionHistory.unshift(historyEntry); // Add to beginning

    // Limit history size
    if (connectionHistory.length > this.maxEntriesPerConnection) {
      connectionHistory.pop(); // Remove oldest
    }

    await this.saveToFile();
    return historyEntry;
  }

  /**
   * Get query history for a connection
   */
  async getByConnection(
    connectionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<QueryHistoryEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const connectionHistory = this.history.get(connectionId) || [];
    return connectionHistory.slice(offset, offset + limit);
  }

  /**
   * Get all query history
   */
  async getAll(limit: number = 100): Promise<QueryHistoryEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const allEntries: QueryHistoryEntry[] = [];
    for (const entries of this.history.values()) {
      allEntries.push(...entries);
    }

    // Sort by timestamp (most recent first)
    allEntries.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return allEntries.slice(0, limit);
  }

  /**
   * Search query history
   */
  async search(
    query: string,
    connectionId?: string,
    limit: number = 50
  ): Promise<QueryHistoryEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const searchTerm = query.toLowerCase();
    const allEntries: QueryHistoryEntry[] = [];

    if (connectionId) {
      const entries = this.history.get(connectionId) || [];
      allEntries.push(...entries);
    } else {
      for (const entries of this.history.values()) {
        allEntries.push(...entries);
      }
    }

    const filtered = allEntries.filter((entry) =>
      entry.sql.toLowerCase().includes(searchTerm)
    );

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return filtered.slice(0, limit);
  }

  /**
   * Get a specific query by ID
   */
  async getById(id: string): Promise<QueryHistoryEntry | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const entries of this.history.values()) {
      const entry = entries.find((e) => e.id === id);
      if (entry) return entry;
    }

    return null;
  }

  /**
   * Delete query from history
   */
  async delete(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const [connectionId, entries] of this.history.entries()) {
      const index = entries.findIndex((e) => e.id === id);
      if (index !== -1) {
        entries.splice(index, 1);
        await this.saveToFile();
        return true;
      }
    }

    return false;
  }

  /**
   * Clear history for a connection
   */
  async clearConnection(connectionId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.history.delete(connectionId);
    await this.saveToFile();
  }

  /**
   * Clear all history
   */
  async clearAll(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.history.clear();
    await this.saveToFile();
  }

  /**
   * Get statistics about query history
   */
  async getStats(connectionId?: string): Promise<{
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageExecutionTime: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    let entries: QueryHistoryEntry[] = [];

    if (connectionId) {
      entries = this.history.get(connectionId) || [];
    } else {
      for (const e of this.history.values()) {
        entries.push(...e);
      }
    }

    const totalQueries = entries.length;
    const successfulQueries = entries.filter((e) => e.success).length;
    const failedQueries = entries.filter((e) => !e.success).length;
    const averageExecutionTime =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.executionTime, 0) / entries.length
        : 0;

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
    };
  }

  /**
   * Save history to file
   */
  private async saveToFile(): Promise<void> {
    try {
      const allEntries: QueryHistoryEntry[] = [];
      for (const entries of this.history.values()) {
        allEntries.push(...entries);
      }

      await fs.writeFile(this.storageFile, JSON.stringify(allEntries, null, 2));
    } catch (error) {
      console.error('Failed to save query history:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `qh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton instance
export const queryHistoryStorage = new QueryHistoryStorage();
