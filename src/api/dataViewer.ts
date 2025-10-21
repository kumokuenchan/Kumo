import api from './index';
import type {
  DataViewerQuery,
  GetTableDataResponse,
  GetColumnsResponse,
  GetStatsResponse,
  GetDistinctValuesResponse,
} from '../types/dataViewer';

/**
 * Data Viewer API Client
 */
export const dataViewerApi = {
  /**
   * Get table data with pagination, filtering, and sorting
   */
  getTableData: async (
    connectionId: string,
    query: DataViewerQuery
  ): Promise<GetTableDataResponse> => {
    const response = await api.post<GetTableDataResponse>(
      `/data-viewer/${connectionId}/data`,
      query
    );
    return response;
  },

  /**
   * Get column information for a table
   */
  getColumns: async (
    connectionId: string,
    database: string,
    table: string
  ): Promise<GetColumnsResponse> => {
    const qs = `?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`;
    const response = await api.get<GetColumnsResponse>(
      `/data-viewer/${connectionId}/columns${qs}`
    );
    return response;
  },

  /**
   * Get table statistics
   */
  getStats: async (
    connectionId: string,
    database: string,
    table: string
  ): Promise<GetStatsResponse> => {
    const qs = `?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`;
    const response = await api.get<GetStatsResponse>(
      `/data-viewer/${connectionId}/stats${qs}`
    );
    return response;
  },

  /**
   * Get distinct values for a column
   */
  getDistinctValues: async (
    connectionId: string,
    database: string,
    table: string,
    column: string,
    limit: number = 100
  ): Promise<GetDistinctValuesResponse> => {
    const qs = `?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&column=${encodeURIComponent(column)}&limit=${encodeURIComponent(String(limit))}`;
    const response = await api.get<GetDistinctValuesResponse>(
      `/data-viewer/${connectionId}/distinct-values${qs}`
    );
    return response;
  },

  /**
   * Export table data
   */
  exportData: async (
    connectionId: string,
    query: DataViewerQuery & { format: 'csv' | 'json' }
  ): Promise<Blob> => {
    // Use raw fetch to get Blob, since the generic API client parses JSON
    const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');
    const url = `${API_BASE_URL}/data-viewer/${connectionId}/export`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Export failed with status ${res.status}`);
    }
    return await res.blob();
  },
};
