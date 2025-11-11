import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceApi, type DatabaseMetrics, type ActiveConnection, type SlowQuery, type IndexUsageStats, type QueryStats } from '../../api/performance';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('performanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should get database performance metrics', async () => {
      const connectionId = 'conn-123';
      const mockMetrics: DatabaseMetrics = {
        connections: {
          current: 15,
          max: 100,
          running: 8,
        },
        memory: {
          used: 512 * 1024 * 1024, // 512MB
          total: 1024 * 1024 * 1024, // 1GB
          percentage: 50,
        },
        cache: {
          hitRate: 95.5,
          size: 256 * 1024 * 1024, // 256MB
        },
        queries: {
          total: 15420,
          perSecond: 12.3,
        },
        uptime: 86400, // 1 day in seconds
      };

      const mockResponse = { data: { metrics: mockMetrics } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getMetrics(connectionId);

      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/performance/conn-123/metrics');
      expect(result).toEqual(mockMetrics);
    });

    it('should handle different connection IDs', async () => {
      const connectionId = 'conn-456';
      const mockMetrics: DatabaseMetrics = {
        connections: { current: 5, max: 50, running: 3 },
        memory: { used: 128 * 1024 * 1024, total: 256 * 1024 * 1024, percentage: 50 },
        cache: { hitRate: 88.2, size: 64 * 1024 * 1024 },
        queries: { total: 5230, perSecond: 8.1 },
        uptime: 43200, // 12 hours
      };

      const mockResponse = { data: { metrics: mockMetrics } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getMetrics(connectionId);

      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/performance/conn-456/metrics');
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getActiveConnections', () => {
    it('should get active database connections', async () => {
      const connectionId = 'conn-123';
      const mockConnections: ActiveConnection[] = [
        {
          id: 1001,
          user: 'root',
          host: 'localhost',
          db: 'testdb',
          command: 'Query',
          time: 0,
          state: 'init',
          info: 'SELECT * FROM users',
        },
        {
          id: 1002,
          user: 'app_user',
          host: '192.168.1.100',
          db: 'production',
          command: 'Sleep',
          time: 125,
          state: null,
          info: null,
        },
      ];

      const mockResponse = { data: { connections: mockConnections } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getActiveConnections(connectionId);

      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/performance/conn-123/connections');
      expect(result).toEqual(mockConnections);
    });

    it('should handle connections with null values', async () => {
      const connectionId = 'conn-456';
      const mockConnections: ActiveConnection[] = [
        {
          id: 2001,
          user: 'system',
          host: 'localhost',
          db: null,
          command: 'Daemon',
          time: 0,
          state: 'waiting',
          info: null,
        },
      ];

      const mockResponse = { data: { connections: mockConnections } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getActiveConnections(connectionId);

      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/performance/conn-456/connections');
      expect(result).toEqual(mockConnections);
    });
  });

  describe('killQuery', () => {
    it('should kill a specific query/connection', async () => {
      const connectionId = 'conn-123';
      const processId = 1001;

      (axios.post as vi.MockedFunction<typeof axios.post>).mockResolvedValue({});

      await performanceApi.killQuery(connectionId, processId);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/kill/1001'
      );
    });

    it('should handle killing different process IDs', async () => {
      const connectionId = 'conn-456';
      const processId = 2005;

      (axios.post as vi.MockedFunction<typeof axios.post>).mockResolvedValue({});

      await performanceApi.killQuery(connectionId, processId);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-456/kill/2005'
      );
    });
  });

  describe('getSlowQueries', () => {
    it('should get slow query log with default limit', async () => {
      const connectionId = 'conn-123';
      const mockSlowQueries: SlowQuery[] = [
        {
          query_time: 5.23,
          lock_time: 0.12,
          rows_sent: 1500,
          rows_examined: 100000,
          sql_text: 'SELECT * FROM large_table WHERE created_at < NOW() - INTERVAL 1 DAY',
          start_time: '2024-01-01 10:30:15',
        },
        {
          query_time: 3.45,
          lock_time: 0.05,
          rows_sent: 500,
          rows_examined: 50000,
          sql_text: 'UPDATE products SET status = \'archived\' WHERE created_at < \'2023-01-01\'',
          start_time: '2024-01-01 09:15:42',
        },
      ];

      const mockResponse = { data: { slowQueries: mockSlowQueries } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getSlowQueries(connectionId);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/slow-queries',
        { params: { limit: 100 } }
      );
      expect(result).toEqual(mockSlowQueries);
    });

    it('should get slow queries with custom limit', async () => {
      const connectionId = 'conn-456';
      const limit = 50;

      const mockResponse = { data: { slowQueries: [] } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getSlowQueries(connectionId, limit);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-456/slow-queries',
        { params: { limit } }
      );
      expect(result).toEqual([]);
    });
  });

  describe('getIndexUsageStats', () => {
    it('should get index usage stats without database filter', async () => {
      const connectionId = 'conn-123';
      const mockIndexStats: IndexUsageStats[] = [
        {
          table_schema: 'testdb',
          table_name: 'users',
          index_name: 'PRIMARY',
          rows_read: 1000,
          rows_read_avg: 1.5,
        },
        {
          table_schema: 'testdb',
          table_name: 'users',
          index_name: 'idx_email',
          rows_read: 5000,
          rows_read_avg: 2.3,
        },
      ];

      const mockResponse = { data: { indexStats: mockIndexStats } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getIndexUsageStats(connectionId);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/index-usage',
        { params: {} }
      );
      expect(result).toEqual(mockIndexStats);
    });

    it('should get index usage stats with database filter', async () => {
      const connectionId = 'conn-456';
      const database = 'production';

      const mockIndexStats: IndexUsageStats[] = [
        {
          table_schema: 'production',
          table_name: 'orders',
          index_name: 'idx_customer_id',
          rows_read: 15000,
          rows_read_avg: 5.2,
        },
      ];

      const mockResponse = { data: { indexStats: mockIndexStats } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getIndexUsageStats(connectionId, database);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-456/index-usage',
        { params: { database } }
      );
      expect(result).toEqual(mockIndexStats);
    });
  });

  describe('getQueryStats', () => {
    it('should get query execution statistics with default limit', async () => {
      const connectionId = 'conn-123';
      const mockQueryStats: QueryStats[] = [
        {
          digest_text: 'SELECT * FROM users WHERE email = ?',
          count_star: 1250,
          avg_timer_wait: 125000,
          sum_rows_examined: 12500,
          sum_rows_sent: 1250,
          first_seen: '2024-01-01 08:00:00',
          last_seen: '2024-01-01 18:30:00',
        },
        {
          digest_text: 'INSERT INTO orders (customer_id, amount) VALUES (?, ?)',
          count_star: 890,
          avg_timer_wait: 45000,
          sum_rows_examined: 890,
          sum_rows_sent: 0,
          first_seen: '2024-01-01 09:15:00',
          last_seen: '2024-01-01 17:45:00',
        },
      ];

      const mockResponse = { data: { queryStats: mockQueryStats } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getQueryStats(connectionId);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/query-stats',
        { params: { limit: 50 } }
      );
      expect(result).toEqual(mockQueryStats);
    });

    it('should get query stats with custom limit', async () => {
      const connectionId = 'conn-456';
      const limit = 100;

      const mockResponse = { data: { queryStats: [] } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getQueryStats(connectionId, limit);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-456/query-stats',
        { params: { limit } }
      );
      expect(result).toEqual([]);
    });
  });

  describe('getTableStats', () => {
    it('should get table statistics for a database', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const mockTableStats = [
        {
          table_name: 'users',
          engine: 'InnoDB',
          table_rows: 50000,
          avg_row_length: 150,
          data_length: 7500000,
          index_length: 2000000,
          table_collation: 'utf8mb4_unicode_ci',
          create_time: '2023-01-01 12:00:00',
        },
        {
          table_name: 'orders',
          engine: 'InnoDB',
          table_rows: 25000,
          avg_row_length: 200,
          data_length: 5000000,
          index_length: 1500000,
          table_collation: 'utf8mb4_unicode_ci',
          create_time: '2023-01-01 12:00:00',
        },
      ];

      const mockResponse = { data: { tableStats: mockTableStats } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getTableStats(connectionId, database);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/table-stats/testdb'
      );
      expect(result).toEqual(mockTableStats);
    });

    it('should handle different database names', async () => {
      const connectionId = 'conn-456';
      const database = 'production-db';

      const mockResponse = { data: { tableStats: [] } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getTableStats(connectionId, database);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-456/table-stats/production-db'
      );
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (axios.get as vi.MockedFunction<typeof axios.get>).mockRejectedValue(new Error('API Error'));

      await expect(performanceApi.getMetrics('conn-123')).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (axios.post as vi.MockedFunction<typeof axios.post>).mockRejectedValue(new Error('Network Error'));

      await expect(performanceApi.killQuery('conn-123', 1001)).rejects.toThrow('Network Error');
    });

    it('should handle axios errors with response', async () => {
      const error = new Error('Request failed');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 404,
        data: { message: 'Connection not found' },
      };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockRejectedValue(error);

      await expect(performanceApi.getActiveConnections('conn-999')).rejects.toThrow('Request failed');
    });
  });

  describe('Type Safety', () => {
    it('should preserve DatabaseMetrics types', async () => {
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue({
        data: {
          metrics: {
            connections: { current: 0, max: 0, running: 0 },
            memory: { used: 0, total: 0, percentage: 0 },
            cache: { hitRate: 0, size: 0 },
            queries: { total: 0, perSecond: 0 },
            uptime: 0,
          },
        },
      });

      const result = await performanceApi.getMetrics('conn-123');
      
      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('queries');
      expect(result).toHaveProperty('uptime');
    });

    it('should preserve ActiveConnection types', async () => {
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue({
        data: {
          connections: [
            {
              id: 0,
              user: 'string',
              host: 'string',
              db: null,
              command: 'string',
              time: 0,
              state: null,
              info: null,
            },
          ],
        },
      });

      const result = await performanceApi.getActiveConnections('conn-123');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('user');
      expect(result[0]).toHaveProperty('host');
    });

    it('should handle large limits for slow queries', async () => {
      const limit = 1000;
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue({
        data: { slowQueries: [] },
      });

      await performanceApi.getSlowQueries('conn-123', limit);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/performance/conn-123/slow-queries',
        { params: { limit } }
      );
    });
  });

  describe('Performance Data Validation', () => {
    it('should handle extreme performance metrics', async () => {
      const connectionId = 'conn-123';
      const extremeMetrics: DatabaseMetrics = {
        connections: {
          current: 99,
          max: 100,
          running: 85,
        },
        memory: {
          used: 990 * 1024 * 1024, // 99% of 1GB
          total: 1024 * 1024 * 1024,
          percentage: 96.6,
        },
        cache: {
          hitRate: 99.9,
          size: 500 * 1024 * 1024,
        },
        queries: {
          total: 999999,
          perSecond: 999.9,
        },
        uptime: 31536000, // 1 year
      };

      const mockResponse = { data: { metrics: extremeMetrics } };
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue(mockResponse);

      const result = await performanceApi.getMetrics(connectionId);

      expect(result.connections.current).toBe(99);
      expect(result.memory.percentage).toBeCloseTo(96.6, 1);
      expect(result.cache.hitRate).toBeCloseTo(99.9, 1);
    });

    it('should handle empty results', async () => {
      (axios.get as vi.MockedFunction<typeof axios.get>).mockResolvedValue({
        data: { slowQueries: [] },
      });

      const result = await performanceApi.getSlowQueries('conn-123');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});