import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryAnalyzerApi, type ExplainAnalysis, type ExplainRow } from '../../api/queryAnalyzer';

// Mock fetch
global.fetch = vi.fn();

describe('queryAnalyzerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeQuery', () => {
    it('should analyze simple SELECT query', async () => {
      const connectionId = 'conn-123';
      const sql = 'SELECT * FROM users WHERE active = true';

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'users',
            partitions: null,
            type: 'ref',
            possible_keys: 'idx_active',
            key: 'idx_active',
            key_len: '1',
            ref: 'const',
            rows: 500,
            filtered: 100.0,
            Extra: 'Using index condition',
          },
        ],
        suggestions: [
          'Query is well optimized with index usage',
          'Consider covering index for better performance',
        ],
        totalCost: {
          estimatedRows: 500,
          tablesUsed: 1,
          indexesUsed: 1,
        },
        warnings: [],
        executionTime: 15.2,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/conn-123/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });

    it('should analyze complex JOIN query', async () => {
      const connectionId = 'conn-456';
      const sql = `
        SELECT u.name, o.total, p.title 
        FROM users u 
        JOIN orders o ON u.id = o.user_id 
        JOIN products p ON o.product_id = p.id 
        WHERE u.active = true AND o.status = 'completed'
        ORDER BY o.total DESC
        LIMIT 10
      `;

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'u',
            partitions: null,
            type: 'ref',
            possible_keys: 'idx_active,PRIMARY',
            key: 'idx_active',
            key_len: '1',
            ref: 'const',
            rows: 1000,
            filtered: 100.0,
            Extra: '',
          },
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'o',
            partitions: null,
            type: 'ref',
            possible_keys: 'idx_user_id,idx_status',
            key: 'idx_user_id',
            key_len: '4',
            ref: 'db.u.id',
            rows: 5,
            filtered: 90.0,
            Extra: 'Using where',
          },
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'p',
            partitions: null,
            type: 'eq_ref',
            possible_keys: 'PRIMARY',
            key: 'PRIMARY',
            key_len: '4',
            ref: 'db.o.product_id',
            rows: 1,
            filtered: 100.0,
            Extra: '',
          },
        ],
        suggestions: [
          'Query uses multiple tables with good index coverage',
          'Consider adding composite index on (user_id, status) for better performance',
          'LIMIT clause helps reduce result set size',
        ],
        totalCost: {
          estimatedRows: 5000,
          tablesUsed: 3,
          indexesUsed: 4,
        },
        warnings: [
          {
            type: 'info',
            message: 'Using filesort for ORDER BY clause',
          },
        ],
        executionTime: 45.8,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/conn-456/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });

    it('should analyze query with table scan', async () => {
      const connectionId = 'conn-789';
      const sql = 'SELECT * FROM users WHERE name LIKE "%john%"';

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'users',
            partitions: null,
            type: 'ALL',
            possible_keys: null,
            key: null,
            key_len: null,
            ref: null,
            rows: 10000,
            filtered: 11.11,
            Extra: 'Using where; Using temporary; Using filesort',
          },
        ],
        suggestions: [
          'Query performs full table scan - consider adding index on name column',
          'LIKE pattern with leading wildcard prevents index usage',
          'Consider using FULLTEXT index for text search',
        ],
        totalCost: {
          estimatedRows: 10000,
          tablesUsed: 1,
          indexesUsed: 0,
        },
        warnings: [
          {
            type: 'warning',
            message: 'Full table scan detected - performance may be poor',
          },
          {
            type: 'error',
            message: 'Using temporary table for results',
          },
        ],
        executionTime: 1250.3,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/conn-789/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });

    it('should analyze INSERT query', async () => {
      const connectionId = 'conn-123';
      const sql = 'INSERT INTO users (name, email, created_at) VALUES (?, ?, NOW())';

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'users',
            partitions: null,
            type: 'INSERT',
            possible_keys: null,
            key: null,
            key_len: null,
            ref: null,
            rows: null,
            filtered: null,
            Extra: '',
          },
        ],
        suggestions: [
          'INSERT operation is straightforward',
          'Consider batch inserts for better performance',
        ],
        totalCost: {
          estimatedRows: 1,
          tablesUsed: 1,
          indexesUsed: 0,
        },
        warnings: [],
        executionTime: 2.1,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/conn-123/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });

    it('should analyze UPDATE query', async () => {
      const connectionId = 'conn-456';
      const sql = "UPDATE users SET last_login = NOW() WHERE inactive = true AND last_login < DATE_SUB(NOW(), INTERVAL 30 DAY)";

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'SIMPLE',
            table: 'users',
            partitions: null,
            type: 'range',
            possible_keys: 'idx_inactive,idx_last_login',
            key: 'idx_inactive',
            key_len: '1',
            ref: null,
            rows: 150,
            filtered: 50.0,
            Extra: 'Using where',
          },
        ],
        suggestions: [
          'Query uses range scan with good index coverage',
          'Consider composite index on (inactive, last_login) for better performance',
        ],
        totalCost: {
          estimatedRows: 150,
          tablesUsed: 1,
          indexesUsed: 1,
        },
        warnings: [],
        executionTime: 8.7,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/conn-456/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });

    it('should handle different connection IDs', async () => {
      const connectionId = 'prod-connection-123';
      const sql = 'SELECT COUNT(*) FROM orders';

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [],
        suggestions: [],
        totalCost: { estimatedRows: 0, tablesUsed: 0, indexesUsed: 0 },
        warnings: [],
        executionTime: 1.2,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(fetch).toHaveBeenCalledWith('/api/query/prod-connection-123/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for failed analysis', async () => {
      const connectionId = 'conn-123';
      const sql = 'INVALID SQL';

      const errorResponse = {
        error: 'SQL syntax error',
        message: 'You have an error in your SQL syntax',
      };

      const mockResponse = new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(queryAnalyzerApi.analyzeQuery(connectionId, sql)).rejects.toThrow('SQL syntax error');
    });

    it('should throw error for connection not found', async () => {
      const connectionId = 'conn-999';
      const sql = 'SELECT * FROM users';

      const errorResponse = {
        message: 'Connection not found',
      };

      const mockResponse = new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(queryAnalyzerApi.analyzeQuery(connectionId, sql)).rejects.toThrow('Connection not found');
    });

    it('should handle server errors', async () => {
      const connectionId = 'conn-123';
      const sql = 'SELECT * FROM users';

      const errorResponse = {
        error: 'Internal server error',
      };

      const mockResponse = new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(queryAnalyzerApi.analyzeQuery(connectionId, sql)).rejects.toThrow('Internal server error');
    });

    it('should handle network failures', async () => {
      (fetch as vi.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network Error'));

      await expect(queryAnalyzerApi.analyzeQuery('conn-123', 'SELECT * FROM users')).rejects.toThrow('Network Error');
    });

    it('should handle non-JSON responses', async () => {
      const connectionId = 'conn-123';
      const sql = 'SELECT * FROM users';

      const mockResponse = new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(queryAnalyzerApi.analyzeQuery(connectionId, sql)).rejects.toThrow('is not valid JSON');
    });
  });

  describe('Type Safety', () => {
    it('should preserve ExplainAnalysis structure', async () => {
      const connectionId = 'conn-123';
      const sql = 'SELECT 1';

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [],
        suggestions: [],
        totalCost: {
          estimatedRows: 0,
          tablesUsed: 0,
          indexesUsed: 0,
        },
        warnings: [],
        executionTime: 0,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(result).toHaveProperty('executionPlan');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('executionTime');

      expect(Array.isArray(result.executionPlan)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.totalCost).toBe('object');
      expect(typeof result.executionTime).toBe('number');
    });

    it('should handle ExplainRow structure', async () => {
      const connectionId = 'conn-123';
      const sql = 'SELECT * FROM users';

      const mockRow: ExplainRow = {
        id: 1,
        select_type: 'SIMPLE',
        table: 'users',
        partitions: null,
        type: 'ALL',
        possible_keys: null,
        key: null,
        key_len: null,
        ref: null,
        rows: 1000,
        filtered: 100.0,
        Extra: 'Using where',
      };

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [mockRow],
        suggestions: [],
        totalCost: { estimatedRows: 1000, tablesUsed: 1, indexesUsed: 0 },
        warnings: [],
        executionTime: 10.5,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(result.executionPlan[0]).toHaveProperty('id');
      expect(result.executionPlan[0]).toHaveProperty('select_type');
      expect(result.executionPlan[0]).toHaveProperty('table');
      expect(result.executionPlan[0]).toHaveProperty('type');
    });
  });

  describe('Complex Query Scenarios', () => {
    it('should analyze subquery performance', async () => {
      const connectionId = 'conn-123';
      const sql = `
        SELECT u.name, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count
        FROM users u
        WHERE u.id IN (SELECT user_id FROM orders WHERE total > 100)
      `;

      const mockAnalysis: ExplainAnalysis = {
        executionPlan: [
          {
            id: 1,
            select_type: 'PRIMARY',
            table: 'u',
            partitions: null,
            type: 'ALL',
            possible_keys: null,
            key: null,
            key_len: null,
            ref: null,
            rows: 5000,
            filtered: 100.0,
            Extra: 'Using where',
          },
          {
            id: 2,
            select_type: 'DEPENDENT SUBQUERY',
            table: 'orders',
            partitions: null,
            type: 'ref',
            possible_keys: 'idx_user_id',
            key: 'idx_user_id',
            key_len: '4',
            ref: 'db.u.id',
            rows: 10,
            filtered: 100.0,
            Extra: '',
          },
        ],
        suggestions: [
          'Query contains dependent subquery - consider JOIN for better performance',
          'Subquery may execute multiple times for each row in outer query',
          'Consider using EXISTS instead of IN for better optimization',
        ],
        totalCost: {
          estimatedRows: 5000,
          tablesUsed: 2,
          indexesUsed: 1,
        },
        warnings: [
          {
            type: 'warning',
            message: 'Dependent subquery detected - may be slow for large datasets',
          },
        ],
        executionTime: 2500.0,
      };

      const mockResponse = new Response(JSON.stringify({ analysis: mockAnalysis }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await queryAnalyzerApi.analyzeQuery(connectionId, sql);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});