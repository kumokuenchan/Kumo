/**
 * Service for storing and retrieving response time history
 */

export interface ResponseTimeEntry {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  timestamp: number;
}

const STORAGE_KEY = 'api_tester_response_times';
const MAX_ENTRIES_PER_ENDPOINT = 50; // Keep last 50 entries per endpoint
const MAX_TOTAL_ENTRIES = 500; // Keep maximum 500 entries total

class ResponseTimeStorage {
  private cache: ResponseTimeEntry[] | null = null;

  private getEntries(): ResponseTimeEntry[] {
    if (this.cache !== null) return this.cache;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.cache = [];
        return this.cache;
      }
      this.cache = JSON.parse(stored);
      return this.cache || [];
    } catch (error) {
      console.error('Failed to load response time history:', error);
      this.cache = [];
      return this.cache;
    }
  }

  private saveEntries(entries: ResponseTimeEntry[]): void {
    try {
      this.cache = entries;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save response time history:', error);
    }
  }

  /**
   * Add a new response time entry
   */
  addEntry(url: string, method: string, status: number, duration: number, size: number): void {
    const entries = this.getEntries();

    const newEntry: ResponseTimeEntry = {
      url,
      method,
      status,
      duration,
      size,
      timestamp: Date.now(),
    };

    entries.push(newEntry);

    // Clean up old entries per endpoint
    const endpointKey = `${method} ${url}`;
    const endpointEntries = entries.filter(e => `${e.method} ${e.url}` === endpointKey);

    if (endpointEntries.length > MAX_ENTRIES_PER_ENDPOINT) {
      // Remove oldest entries for this endpoint
      const toRemove = endpointEntries
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, endpointEntries.length - MAX_ENTRIES_PER_ENDPOINT);

      const removeSet = new Set(toRemove.map(e => e.timestamp));
      const filtered = entries.filter(e =>
        `${e.method} ${e.url}` !== endpointKey || !removeSet.has(e.timestamp)
      );

      this.saveEntries(filtered);
      return;
    }

    // Clean up if total entries exceed limit
    if (entries.length > MAX_TOTAL_ENTRIES) {
      // Keep most recent entries
      const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
      this.saveEntries(sorted.slice(0, MAX_TOTAL_ENTRIES));
      return;
    }

    this.saveEntries(entries);
  }

  /**
   * Get all entries for a specific endpoint
   */
  getEntriesForEndpoint(url: string, method: string): ResponseTimeEntry[] {
    const entries = this.getEntries();
    return entries
      .filter(e => e.url === url && e.method === method)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all unique endpoints
   */
  getEndpoints(): Array<{ url: string; method: string; count: number }> {
    const entries = this.getEntries();
    const grouped = new Map<string, number>();

    entries.forEach(e => {
      const key = `${e.method}|${e.url}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([key, count]) => {
        const [method, url] = key.split('|');
        return { url, method, count };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get statistics for an endpoint
   */
  getEndpointStats(url: string, method: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    avgSize: number;
    successRate: number;
  } | null {
    const entries = this.getEntriesForEndpoint(url, method);

    if (entries.length === 0) return null;

    const durations = entries.map(e => e.duration);
    const sizes = entries.map(e => e.size);
    const successCount = entries.filter(e => e.status >= 200 && e.status < 300).length;

    return {
      count: entries.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      successRate: (successCount / entries.length) * 100,
    };
  }

  /**
   * Clear all history
   */
  clearAll(): void {
    this.cache = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Clear history for a specific endpoint
   */
  clearEndpoint(url: string, method: string): void {
    const entries = this.getEntries();
    const filtered = entries.filter(e => !(e.url === url && e.method === method));
    this.saveEntries(filtered);
  }
}

export const responseTimeStorage = new ResponseTimeStorage();
