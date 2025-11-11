import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryApi } from '../../api/query';
import api from '../../api/index';

// Mock the API module
vi.mock('../../api/index', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('queryApi', () => {
  const mockApi = vi.mocked(api);
  const connectionId = 'test-connection';
  const sql = 'SELECT * FROM users';
  const params = [1, 'test'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a single SQL query successfully', async () => {
      const mockResponse = {
        success: true,
        result: {
          type: 'select' as const,
          rows: [{ id: 1, name: 'John' }],
          fields: [{ name: 'id', type: 'INT', columnType: 3 }],
          affectedRows: 1,
          executionTime: 100,
          rowCount: 1,
        },
        stats: {
          type: 'SELECT',
          duration: '0.100s',
          rowsAffected: 1,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await queryApi.execute(connectionId, sql, params);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/query/${connectionId}/execute`,
        { sql, params }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle query execution failure', async () => {
      const mockResponse = {
        success: false,
        result: {
          type: 'select' as const,
          rows: [],
          fields: [],
          affectedRows: 0,
          executionTime: 50,
          rowCount: 0,
        },
        error: 'Table does not exist',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await queryApi.execute(connectionId, 'SELECT * FROM nonexistent');

      expect(mockApi.post).toHaveBeenCalledWith(
        `/query/${connectionId}/execute`,
        { sql: 'SELECT * FROM nonexistent', params: undefined }
      );
      expect(result.success).toBe(false);
    });
  });

  describe('executeMultiple', () => {
    it('should execute multiple SQL statements', async () => {
      const mockResponse = {
        success: true,
        results: [
          {
            type: 'select' as const,
            rows: [{ id: 1 }],
            fields: [{ name: 'id', type: 'INT', columnType: 3 }],
            affectedRows: 1,
            executionTime: 100,
            rowCount: 1,
          },
          {
            type: 'insert' as const,
            rows: [],
            fields: [],
            affectedRows: 1,
            insertId: 2,
            executionTime: 50,
            rowCount: 1,
          },
        ],
        totalTime: 150,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await queryApi.executeMultiple(connectionId, 'SELECT * FROM users; INSERT INTO users VALUES (2);');

      expect(mockApi.post).toHaveBeenCalledWith(
        `/query/${connectionId}/execute-multiple`,
        { sql: 'SELECT * FROM users; INSERT INTO users VALUES (2);' }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('executePaginated', () => {
    it('should execute paginated query', async () => {
      const mockResponse = {
        success: true,
        result: {
          rows: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
          fields: [
            { name: 'id', type: 'INT', columnType: 3 },
            { name: 'name', type: 'VARCHAR', columnType: 253 },
          ],
          totalRows: 100,
          page: 1,
          pageSize: 2,
          totalPages: 50,
          executionTime: 150,
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await queryApi.executePaginated(connectionId, sql, 1, 2);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/query/${connectionId}/execute-paginated`,
        { sql, page: 1, pageSize: 2 }
      );
      expect(result.result.page).toBe(1);
      expect(result.result.pageSize).toBe(2);
      expect(result.result.totalPages).toBe(50);
    });
  });

  describe('cancel', () => {
    it('should cancel running query', async () => {
      const connectionId = 'test-connection';
      const mockResponse = { success: true };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await queryApi.cancel(connectionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/query/${connectionId}/cancel`);
      expect(result.success).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should get all query history', async () => {
      const mockHistory: QueryHistoryEntry[] = [
        {
          id: '1',
          connectionId,
          sql: 'SELECT * FROM users',
          executionTime: 100,
          success: true,
          rowCount: 10,
          timestamp: '2024-01-01T00:00:00Z',
          database: 'test_db',
        },
      ];

      mockApi.get.mockResolvedValue({ history: mockHistory });

      const result = await queryApi.getHistory(50);

      expect(mockApi.get).toHaveBeenCalledWith('/query/history?limit=50');
      expect(result).toEqual(mockHistory);
    });

    it('should get history with default limit', async () => {
      mockApi.get.mockResolvedValue({ history: [] });

      await queryApi.getHistory();

      expect(mockApi.get).toHaveBeenCalledWith('/query/history?limit=100');
    });
  });

  describe('getConnectionHistory', () => {
    it('should get query history for specific connection', async () => {
      const mockHistory: QueryHistoryEntry[] = [
        {
          id: '1',
          connectionId,
          sql: 'SELECT COUNT(*) FROM users',
          executionTime: 50,
          success: true,
          rowCount: 1,
          timestamp: '2024-01-01T00:00:00Z',
          database: 'test_db',
        },
      ];

      mockApi.get.mockResolvedValue({ history: mockHistory });

      const result = await queryApi.getConnectionHistory(connectionId, 25, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/query/${connectionId}/history?limit=25&offset=10`
      );
      expect(result).toEqual(mockHistory);
    });
  });

  describe('searchHistory', () => {
    it('should search query history', async () => {
      const mockHistory: QueryHistoryEntry[] = [
        {
          id: '1',
          connectionId,
          sql: 'SELECT * FROM users WHERE name LIKE %john%',
          executionTime: 100,
          success: true,
          rowCount: 5,
          timestamp: '2024-01-01T00:00:00Z',
          database: 'test_db',
        },
      ];

      mockApi.get.mockResolvedValue({ history: mockHistory });

      const result = await queryApi.searchHistory('john', connectionId, 20);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/query/history/search?q=john&limit=20&connectionId=${connectionId}`
      );
      expect(result).toEqual(mockHistory);
    });

    it('should search history without connection filter', async () => {
      mockApi.get.mockResolvedValue({ history: [] });

      await queryApi.searchHistory('SELECT', undefined, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/query/history/search?q=SELECT&limit=10'
      );
    });
  });

  describe('getHistoryById', () => {
    it('should get specific query by ID', async () => {
      const mockEntry: QueryHistoryEntry = {
        id: 'query-123',
        connectionId,
        sql: 'DESCRIBE users',
        executionTime: 25,
        success: true,
        rowCount: 0,
        timestamp: '2024-01-01T00:00:00Z',
        database: 'test_db',
      };

      mockApi.get.mockResolvedValue({ entry: mockEntry });

      const result = await queryApi.getHistoryById('query-123');

      expect(mockApi.get).toHaveBeenCalledWith('/query/history/query-123');
      expect(result).toEqual(mockEntry);
    });
  });

  describe('deleteHistory', () => {
    it('should delete query from history', async () => {
      const mockResponse = {
        success: true,
        message: 'Query deleted successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await queryApi.deleteHistory('query-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/query/history/query-123');
      expect(result.success).toBe(true);
    });
  });

  describe('clearConnectionHistory', () => {
    it('should clear history for a connection', async () => {
      const mockResponse = {
        success: true,
        message: 'Connection history cleared successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await queryApi.clearConnectionHistory(connectionId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/query/${connectionId}/history`);
      expect(result.success).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should get query statistics for connection', async () => {
      const mockStats = {
        totalQueries: 150,
        successfulQueries: 145,
        failedQueries: 5,
        averageExecutionTime: 125.5,
      };

      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await queryApi.getStats(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/query/${connectionId}/stats`);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getAllStats', () => {
    it('should get overall query statistics', async () => {
      const mockStats = {
        totalQueries: 500,
        successfulQueries: 480,
        failedQueries: 20,
        averageExecutionTime: 110.3,
      };

      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await queryApi.getAllStats();

      expect(mockApi.get).toHaveBeenCalledWith('/query/stats');
      expect(result).toEqual(mockStats);
    });
  });
});