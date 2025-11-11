import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataViewerApi } from '../../api/dataViewer';
import { api } from '../../api/client';
import type {
  DataViewerQuery,
  FilterCondition,
  SortOption,
} from '../../types/dataViewer';

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock fetch for exportData function
global.fetch = vi.fn();

describe('dataViewerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTableData', () => {
    it('should call POST /data-viewer/{connectionId}/data with query', async () => {
      const connectionId = 'conn-123';
      const query: DataViewerQuery = {
        database: 'testdb',
        table: 'users',
        page: 1,
        pageSize: 50,
        filters: [],
        sort: [],
      };

      const mockResponse = {
        success: true,
        data: {
          rows: [{ id: 1, name: 'John' }],
          columns: [{ name: 'id', type: 'INT', nullable: false }],
          totalRows: 100,
          page: 1,
          pageSize: 50,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getTableData(connectionId, query);

      expect(api.post).toHaveBeenCalledWith(`/data-viewer/${connectionId}/data`, query);
      expect(result).toEqual(mockResponse);
    });

    it('should handle queries with filters and sorting', async () => {
      const connectionId = 'conn-456';
      const query: DataViewerQuery = {
        database: 'ecommerce',
        table: 'orders',
        page: 2,
        pageSize: 25,
        filters: [
          { column: 'status', operator: '=', value: 'completed' },
          { column: 'total', operator: '>', value: 100 },
        ],
        sort: [
          { column: 'created_at', direction: 'DESC' },
        ],
        search: 'urgent',
      };

      const mockResponse = {
        success: true,
        data: {
          rows: [
            { id: 1, status: 'completed', total: 150, created_at: '2024-01-01' },
            { id: 2, status: 'completed', total: 200, created_at: '2024-01-02' },
          ],
          columns: [
            { name: 'id', type: 'INT', nullable: false, key: 'PRI' },
            { name: 'status', type: 'VARCHAR', nullable: false },
            { name: 'total', type: 'DECIMAL', nullable: false },
            { name: 'created_at', type: 'DATETIME', nullable: false },
          ],
          totalRows: 45,
          page: 2,
          pageSize: 25,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getTableData(connectionId, query);

      expect(api.post).toHaveBeenCalledWith(`/data-viewer/${connectionId}/data`, query);
      expect(result).toEqual(mockResponse);
    });

    it('should handle complex filter conditions', async () => {
      const connectionId = 'conn-789';
      const query: DataViewerQuery = {
        database: 'testdb',
        table: 'products',
        filters: [
          { column: 'category', operator: 'IN', values: ['electronics', 'books'] },
          { column: 'price', operator: 'IS NOT NULL' },
          { column: 'name', operator: 'LIKE', value: '%laptop%' },
        ],
      };

      const mockResponse = {
        success: true,
        data: {
          rows: [
            { id: 1, name: 'Gaming Laptop', price: 999.99, category: 'electronics' },
          ],
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'price', type: 'DECIMAL', nullable: true },
            { name: 'category', type: 'VARCHAR', nullable: false },
          ],
          totalRows: 1,
          page: 1,
          pageSize: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getTableData(connectionId, query);

      expect(api.post).toHaveBeenCalledWith(`/data-viewer/${connectionId}/data`, query);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getColumns', () => {
    it('should call GET /data-viewer/{connectionId}/columns with database and table', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';

      const mockResponse = {
        success: true,
        columns: [
          { name: 'id', type: 'INT', nullable: false, key: 'PRI' },
          { name: 'name', type: 'VARCHAR', nullable: false, default: 'NULL' },
          { name: 'email', type: 'VARCHAR', nullable: true },
          { name: 'created_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getColumns(connectionId, database, table);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/columns?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle tables with special characters in names', async () => {
      const connectionId = 'conn-456';
      const database = 'test-db';
      const table = 'user-profiles';

      const mockResponse = {
        success: true,
        columns: [
          { name: 'id', type: 'BIGINT', nullable: false, key: 'PRI' },
          { name: 'user_name', type: 'VARCHAR', nullable: false },
        ],
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getColumns(connectionId, database, table);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/columns?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStats', () => {
    it('should call GET /data-viewer/{connectionId}/stats with database and table', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';

      const mockResponse = {
        success: true,
        stats: {
          totalRows: 10000,
          totalSize: 1024000,
          avgRowLength: 102,
          autoIncrement: 10001,
          created: new Date('2023-01-01'),
          updated: new Date('2024-01-01'),
        },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getStats(connectionId, database, table);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/stats?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty tables', async () => {
      const connectionId = 'conn-789';
      const database = 'testdb';
      const table = 'empty_table';

      const mockResponse = {
        success: true,
        stats: {
          totalRows: 0,
          totalSize: 0,
          avgRowLength: 0,
          autoIncrement: 1,
          created: new Date('2024-01-01'),
          updated: null,
        },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getStats(connectionId, database, table);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/stats?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}`
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDistinctValues', () => {
    it('should call GET /data-viewer/{connectionId}/distinct-values with column info', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';
      const column = 'status';
      const limit = 50;

      const mockResponse = {
        success: true,
        data: {
          column: 'status',
          values: ['active', 'inactive', 'pending', 'suspended'],
          totalCount: 4,
          truncated: false,
        },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getDistinctValues(connectionId, database, table, column, limit);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/distinct-values?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&column=${encodeURIComponent(column)}&limit=${limit}`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should use default limit when not specified', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';
      const column = 'category';

      const mockResponse = {
        success: true,
        data: {
          column: 'category',
          values: ['electronics', 'books', 'clothing', 'food'],
          totalCount: 4,
          truncated: false,
        },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getDistinctValues(connectionId, database, table, column);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/distinct-values?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&column=${encodeURIComponent(column)}&limit=100`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle truncated results', async () => {
      const connectionId = 'conn-789';
      const database = 'testdb';
      const table = 'users';
      const column = 'email_domain';
      const limit = 10;

      const mockResponse = {
        success: true,
        data: {
          column: 'email_domain',
          values: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'],
          totalCount: 150,
          truncated: true,
        },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await dataViewerApi.getDistinctValues(connectionId, database, table, column, limit);

      expect(api.get).toHaveBeenCalledWith(
        `/data-viewer/${connectionId}/distinct-values?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&column=${encodeURIComponent(column)}&limit=${limit}`
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportData', () => {
    it('should call POST /data-viewer/{connectionId}/export with CSV format', async () => {
      const connectionId = 'conn-123';
      const query: DataViewerQuery & { format: 'csv' | 'json' } = {
        database: 'testdb',
        table: 'users',
        format: 'csv',
        pageSize: 1000,
      };

      const mockBlob = new Blob(['id,name,email\n1,John,john@example.com'], { type: 'text/csv' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await dataViewerApi.exportData(connectionId, query);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/data-viewer/${connectionId}/export`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        }
      );
      expect(result).toEqual(mockBlob);
    });

    it('should handle JSON format export', async () => {
      const connectionId = 'conn-456';
      const query: DataViewerQuery & { format: 'csv' | 'json' } = {
        database: 'testdb',
        table: 'products',
        format: 'json',
        filters: [{ column: 'active', operator: '=', value: true }],
      };

      const mockBlob = new Blob([JSON.stringify([{ id: 1, name: 'Product' }])], { type: 'application/json' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await dataViewerApi.exportData(connectionId, query);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/data-viewer/${connectionId}/export`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        }
      );
      expect(result).toEqual(mockBlob);
    });

    it('should throw error for failed export', async () => {
      const connectionId = 'conn-789';
      const query: DataViewerQuery & { format: 'csv' | 'json' } = {
        database: 'testdb',
        table: 'users',
        format: 'csv',
      };

      const mockErrorResponse = new Response('Export failed', { status: 500 });
      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockErrorResponse as Response);

      await expect(dataViewerApi.exportData(connectionId, query)).rejects.toThrow('Export failed');
    });

    it('should throw error for non-ok response without text', async () => {
      const connectionId = 'conn-999';
      const query: DataViewerQuery & { format: 'csv' | 'json' } = {
        database: 'testdb',
        table: 'users',
        format: 'csv',
      };

      const mockErrorResponse = new Response(null, { status: 404 });
      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockErrorResponse as Response);

      await expect(dataViewerApi.exportData(connectionId, query)).rejects.toThrow('Export failed with status 404');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('API Error'));

      const query: DataViewerQuery = {
        database: 'testdb',
        table: 'users',
      };

      await expect(dataViewerApi.getTableData('conn-123', query)).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockRejectedValue(new Error('Network Error'));

      await expect(dataViewerApi.getColumns('conn-123', 'testdb', 'users')).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve DataViewerQuery types', async () => {
      const query: DataViewerQuery = {
        database: 'string',
        table: 'string',
        page: 1,
        pageSize: 50,
        filters: [],
        sort: [],
        search: 'string',
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
        success: true,
        data: {
          rows: [],
          columns: [],
          totalRows: 0,
          page: 1,
          pageSize: 50,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const result = await dataViewerApi.getTableData('conn-123', query);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });
});