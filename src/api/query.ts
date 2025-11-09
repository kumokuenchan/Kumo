import api from './index';

// Simplified field type
export interface SimpleField {
  name: string;
  type: string;
  columnType: number;
}

// Query result types
export interface QueryResult {
  type: 'select' | 'insert' | 'update' | 'delete' | 'ddl' | 'other';
  rows?: any[];
  fields?: SimpleField[];
  affectedRows?: number;
  insertId?: number;
  changedRows?: number;
  warningCount?: number;
  message?: string;
  executionTime: number;
  rowCount: number;
}

export interface QueryExecutionResult {
  success: boolean;
  results: QueryResult[];
  totalTime: number;
  error?: string;
}

export interface QueryStats {
  type: string;
  duration: string;
  rowsAffected: number;
}

export interface PaginatedQueryResult {
  rows: any[];
  fields: SimpleField[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTime: number;
}

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

export interface QueryStatistics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageExecutionTime: number;
}

// API functions
export const queryApi = {
  /**
   * Execute a single SQL query
   */
  execute: async (connectionId: string, sql: string, params?: any[]) => {
    const response = await api.post<{
      success: boolean;
      result: QueryResult;
      stats: QueryStats;
    }>(`/query/${connectionId}/execute`, { sql, params });
    return response;
  },

  /**
   * Execute multiple SQL statements
   */
  executeMultiple: async (connectionId: string, sql: string) => {
    const response = await api.post<QueryExecutionResult>(
      `/query/${connectionId}/execute-multiple`,
      { sql }
    );
    return response;
  },

  /**
   * Execute query with pagination
   */
  executePaginated: async (
    connectionId: string,
    sql: string,
    page: number = 1,
    pageSize: number = 100
  ) => {
    const response = await api.post<{
      success: boolean;
      result: PaginatedQueryResult;
    }>(`/query/${connectionId}/execute-paginated`, { sql, page, pageSize });
    return response;
  },

  /**
   * Cancel running query
   */
  cancel: async (connectionId: string) => {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>(`/query/${connectionId}/cancel`);
    return response;
  },

  /**
   * Get all query history
   */
  getHistory: async (limit: number = 100) => {
    const response = await api.get<{ history: QueryHistoryEntry[] }>(
      `/query/history?limit=${limit}`
    );
    return response.history;
  },

  /**
   * Get query history for a specific connection
   */
  getConnectionHistory: async (
    connectionId: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    const response = await api.get<{ history: QueryHistoryEntry[] }>(
      `/query/${connectionId}/history?limit=${limit}&offset=${offset}`
    );
    return response.history;
  },

  /**
   * Search query history
   */
  searchHistory: async (query: string, connectionId?: string, limit: number = 50) => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    if (connectionId) params.append('connectionId', connectionId);

    const response = await api.get<{ history: QueryHistoryEntry[] }>(
      `/query/history/search?${params}`
    );
    return response.history;
  },

  /**
   * Get specific query by ID
   */
  getHistoryById: async (id: string) => {
    const response = await api.get<{ entry: QueryHistoryEntry }>(`/query/history/${id}`);
    return response.entry;
  },

  /**
   * Delete query from history
   */
  deleteHistory: async (id: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/query/history/${id}`
    );
    return response;
  },

  /**
   * Clear history for a connection
   */
  clearConnectionHistory: async (connectionId: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/query/${connectionId}/history`
    );
    return response;
  },

  /**
   * Get query statistics for a connection
   */
  getStats: async (connectionId: string) => {
    const response = await api.get<{ stats: QueryStatistics }>(
      `/query/${connectionId}/stats`
    );
    return response.stats;
  },

  /**
   * Get overall query statistics
   */
  getAllStats: async () => {
    const response = await api.get<{ stats: QueryStatistics }>(`/query/stats`);
    return response.stats;
  },
};
