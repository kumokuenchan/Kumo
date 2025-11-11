import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savedQueriesApi, type SavedQueryEntry } from '../../api/savedQueries';
import { api } from '../../api/client';

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock fetch for exportList function
global.fetch = vi.fn();

describe('savedQueriesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should list saved queries for connection', async () => {
      const connectionId = 'conn-123';
      const mockSavedQueries: SavedQueryEntry[] = [
        {
          id: 'query-1',
          connectionId: 'conn-123',
          name: 'Active Users',
          sql: 'SELECT * FROM users WHERE active = true',
          database: 'testdb',
          tags: ['user', 'active'],
          folder: 'User Queries',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          revisions: [
            { sql: 'SELECT * FROM users WHERE active = false', updatedAt: '2023-12-31T00:00:00.000Z' },
          ],
        },
        {
          id: 'query-2',
          connectionId: 'conn-123',
          name: 'Order Summary',
          sql: 'SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id',
          database: 'testdb',
          tags: ['orders', 'summary'],
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ];

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({ saved: mockSavedQueries });

      const result = await savedQueriesApi.list(connectionId);

      expect(api.get).toHaveBeenCalledWith('/query/conn-123/saved?limit=200');
      expect(result).toEqual(mockSavedQueries);
    });

    it('should list saved queries with search query', async () => {
      const connectionId = 'conn-123';
      const searchQuery = 'users';
      const mockSavedQueries: SavedQueryEntry[] = [
        {
          id: 'query-1',
          connectionId: 'conn-123',
          name: 'User Statistics',
          sql: 'SELECT COUNT(*) FROM users',
          database: 'testdb',
          tags: ['users', 'count'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({ saved: mockSavedQueries });

      const result = await savedQueriesApi.list(connectionId, searchQuery);

      expect(api.get).toHaveBeenCalledWith('/query/conn-123/saved?q=users&limit=200');
      expect(result).toEqual(mockSavedQueries);
    });

    it('should list saved queries with custom limit', async () => {
      const connectionId = 'conn-456';
      const limit = 50;
      const mockSavedQueries: SavedQueryEntry[] = [];

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({ saved: mockSavedQueries });

      const result = await savedQueriesApi.list(connectionId, undefined, limit);

      expect(api.get).toHaveBeenCalledWith('/query/conn-456/saved?limit=50');
      expect(result).toEqual([]);
    });

    it('should handle empty saved queries list', async () => {
      const connectionId = 'conn-789';

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({ saved: [] });

      const result = await savedQueriesApi.list(connectionId);

      expect(api.get).toHaveBeenCalledWith('/query/conn-789/saved?limit=200');
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create new saved query with minimal data', async () => {
      const connectionId = 'conn-123';
      const name = 'Test Query';
      const sql = 'SELECT * FROM test_table';

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-new-1',
          connectionId: 'conn-123',
          name: 'Test Query',
          sql: 'SELECT * FROM test_table',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.create(connectionId, name, sql);

      expect(api.post).toHaveBeenCalledWith('/query/conn-123/saved', {
        name,
        sql,
        database: undefined,
        tags: undefined,
        folder: undefined,
        overwrite: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create saved query with all options', async () => {
      const connectionId = 'conn-456';
      const name = 'Complex Query';
      const sql = 'SELECT u.name, COUNT(o.id) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.name';
      const database = 'production';
      const tags = ['users', 'orders', 'complex'];
      const folder = 'Analytics';
      const overwrite = true;

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-new-2',
          connectionId: 'conn-456',
          name: 'Complex Query',
          sql,
          database,
          tags,
          folder,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.create(connectionId, name, sql, database, tags, folder, overwrite);

      expect(api.post).toHaveBeenCalledWith('/query/conn-456/saved', {
        name,
        sql,
        database,
        tags,
        folder,
        overwrite,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create query with array of tags', async () => {
      const connectionId = 'conn-789';
      const name = 'Tagged Query';
      const sql = 'SELECT * FROM products WHERE category IN (?, ?)';
      const tags = ['products', 'category', 'filter', 'important'];

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-new-3',
          connectionId: 'conn-789',
          name: 'Tagged Query',
          sql,
          tags,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.create(connectionId, name, sql, undefined, tags);

      expect(api.post).toHaveBeenCalledWith('/query/conn-789/saved', {
        name,
        sql,
        database: undefined,
        tags,
        folder: undefined,
        overwrite: undefined,
      });
      expect(result.entry.tags).toEqual(tags);
    });
  });

  describe('update', () => {
    it('should update query name only', async () => {
      const id = 'query-1';
      const patch = { name: 'Updated Query Name' };

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-1',
          connectionId: 'conn-123',
          name: 'Updated Query Name',
          sql: 'SELECT * FROM test_table',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      };

      (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.update(id, patch);

      expect(api.put).toHaveBeenCalledWith('/query/saved/query-1', patch);
      expect(result).toEqual(mockResponse);
    });

    it('should update query SQL only', async () => {
      const id = 'query-2';
      const patch = { sql: 'SELECT id, name FROM users WHERE active = true' };

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-2',
          connectionId: 'conn-123',
          name: 'Original Name',
          sql: 'SELECT id, name FROM users WHERE active = true',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      };

      (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.update(id, patch);

      expect(api.put).toHaveBeenCalledWith('/query/saved/query-2', patch);
      expect(result).toEqual(mockResponse);
    });

    it('should update multiple fields at once', async () => {
      const id = 'query-3';
      const patch = {
        name: 'New Name',
        sql: 'SELECT * FROM new_table',
        database: 'newdb',
        tags: ['updated', 'new'],
        folder: 'New Folder',
      };

      const mockResponse = {
        success: true,
        entry: {
          id: 'query-3',
          connectionId: 'conn-456',
          name: 'New Name',
          sql: 'SELECT * FROM new_table',
          database: 'newdb',
          tags: ['updated', 'new'],
          folder: 'New Folder',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      };

      (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.update(id, patch);

      expect(api.put).toHaveBeenCalledWith('/query/saved/query-3', patch);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should delete saved query', async () => {
      const id = 'query-1';
      const mockResponse = { success: true };

      (api.delete as vi.MockedFunction<typeof api.delete>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.remove(id);

      expect(api.delete).toHaveBeenCalledWith('/query/saved/query-1');
      expect(result).toEqual(mockResponse);
    });

    it('should handle deletion of different query IDs', async () => {
      const id = 'query-123';
      const mockResponse = { success: true };

      (api.delete as vi.MockedFunction<typeof api.delete>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.remove(id);

      expect(api.delete).toHaveBeenCalledWith('/query/saved/query-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportList', () => {
    it('should export saved queries as blob', async () => {
      const connectionId = 'conn-123';
      const mockBlob = new Blob([JSON.stringify({ queries: ['query1', 'query2'] })], {
        type: 'application/json',
      });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.exportList(connectionId);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/query/${connectionId}/saved/export`),
        { method: 'GET' }
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe(mockBlob.type);
      expect(result.size).toBe(mockBlob.size);
    });

    it('should export queries with different connection IDs', async () => {
      const connectionId = 'prod-connection-123';
      const mockBlob = new Blob(['exported data'], { type: 'text/plain' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.exportList(connectionId);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/query/prod-connection-123/saved/export'),
        { method: 'GET' }
      );
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe(mockBlob.type);
      expect(result.size).toBe(mockBlob.size);
    });

    it('should throw error for failed export', async () => {
      const connectionId = 'conn-123';
      const mockResponse = new Response('Export failed', { status: 500 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(savedQueriesApi.exportList(connectionId)).rejects.toThrow('Export failed');
    });
  });

  describe('importList', () => {
    it('should import saved queries without overwriting', async () => {
      const connectionId = 'conn-123';
      const items = [
        {
          name: 'Imported Query 1',
          sql: 'SELECT * FROM imported_table',
          database: 'imported_db',
          tags: ['imported'],
        },
        {
          name: 'Imported Query 2',
          sql: 'SELECT COUNT(*) FROM users',
          tags: ['count', 'users'],
        },
      ];
      const overwrite = false;

      const mockResponse = {
        success: true,
        imported: 2,
        overwritten: 0,
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.importList(connectionId, items, overwrite);

      expect(api.post).toHaveBeenCalledWith('/query/conn-123/saved/import', {
        items,
        overwrite,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should import saved queries with overwriting', async () => {
      const connectionId = 'conn-456';
      const items = [
        {
          name: 'Overwrite Query',
          sql: 'SELECT * FROM overwrite_table',
          folder: 'Overwrite Folder',
        },
      ];
      const overwrite = true;

      const mockResponse = {
        success: true,
        imported: 0,
        overwritten: 1,
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.importList(connectionId, items, overwrite);

      expect(api.post).toHaveBeenCalledWith('/query/conn-456/saved/import', {
        items,
        overwrite,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should import mix of new and existing queries', async () => {
      const connectionId = 'conn-789';
      const items = [
        {
          name: 'New Query',
          sql: 'SELECT * FROM new_table',
        },
        {
          name: 'Existing Query',
          sql: 'SELECT * FROM existing_table',
        },
      ];
      const overwrite = true;

      const mockResponse = {
        success: true,
        imported: 1,
        overwritten: 1,
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.importList(connectionId, items, overwrite);

      expect(api.post).toHaveBeenCalledWith('/query/conn-789/saved/import', {
        items,
        overwrite,
      });
      expect(result.imported).toBe(1);
      expect(result.overwritten).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockRejectedValue(new Error('API Error'));

      await expect(savedQueriesApi.list('conn-123')).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('Network Error'));

      await expect(savedQueriesApi.create('conn-123', 'test', 'SELECT 1')).rejects.toThrow('Network Error');
    });

    it('should handle export network failures', async () => {
      (fetch as vi.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network Error'));

      await expect(savedQueriesApi.exportList('conn-123')).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve SavedQueryEntry types', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({
        saved: [
          {
            id: 'string',
            connectionId: 'string',
            name: 'string',
            sql: 'string',
            database: 'string',
            folder: 'string',
            tags: ['string'],
            createdAt: 'string',
            updatedAt: 'string',
            revisions: [
              {
                name: 'string',
                sql: 'string',
                updatedAt: 'string',
              },
            ],
          },
        ],
      });

      const result = await savedQueriesApi.list('conn-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('connectionId');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('sql');
    });

    it('should handle optional fields properly', async () => {
      const queryWithoutOptional: Partial<SavedQueryEntry> = {
        name: 'Minimal Query',
        sql: 'SELECT 1',
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
        success: true,
        entry: {
          id: 'query-minimal',
          connectionId: 'conn-123',
          ...queryWithoutOptional,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      });

      const result = await savedQueriesApi.create('conn-123', queryWithoutOptional.name!, queryWithoutOptional.sql!);

      expect(result.success).toBe(true);
      expect(result.entry.name).toBe('Minimal Query');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle complex search with filters', async () => {
      const connectionId = 'conn-123';
      const searchQuery = 'users orders analytics';
      const limit = 100;

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({
        saved: [
          {
            id: 'query-1',
            connectionId: 'conn-123',
            name: 'User Analytics',
            sql: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL 30 DAY',
            tags: ['users', 'analytics'],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const result = await savedQueriesApi.list(connectionId, searchQuery, limit);

      expect(api.get).toHaveBeenCalledWith('/query/conn-123/saved?q=users+orders+analytics&limit=100');
      expect(result.length).toBe(1);
    });

    it('should handle bulk import scenario', async () => {
      const connectionId = 'conn-456';
      const bulkItems = Array.from({ length: 50 }, (_, i) => ({
        name: `Bulk Query ${i + 1}`,
        sql: `SELECT * FROM table_${i + 1}`,
        tags: [`bulk`, `query-${i + 1}`],
      }));

      const mockResponse = {
        success: true,
        imported: 50,
        overwritten: 0,
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await savedQueriesApi.importList(connectionId, bulkItems, false);

      expect(api.post).toHaveBeenCalledWith('/query/conn-456/saved/import', {
        items: bulkItems,
        overwrite: false,
      });
      expect(result.imported).toBe(50);
    });
  });
});