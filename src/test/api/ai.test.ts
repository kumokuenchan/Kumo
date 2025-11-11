import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiApi, TextToSQLRequest, ExplainSQLRequest, OptimizeSQLRequest, FixSQLRequest, GenerateTestDataRequest, AnalyzeDataRequest, AnalyzeSchemaRequest } from '../../api/ai';
import { api } from '../../api/client';

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('aiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('textToSQL', () => {
    it('should call POST /ai/text-to-sql with correct parameters', async () => {
      const mockRequest: TextToSQLRequest = {
        query: 'Show me all users',
        schema: 'CREATE TABLE users (id INT, name VARCHAR(50))'
      };
      
      const mockResponse = {
        sql: 'SELECT * FROM users',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.textToSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/text-to-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle different text-to-SQL requests', async () => {
      const mockRequest: TextToSQLRequest = {
        query: 'Count orders by customer',
        schema: 'CREATE TABLE orders (id INT, customer_id INT)'
      };
      
      const mockResponse = {
        sql: 'SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.textToSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/text-to-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('explainSQL', () => {
    it('should call POST /ai/explain-sql with SQL query', async () => {
      const mockRequest: ExplainSQLRequest = {
        sql: 'SELECT * FROM users WHERE age > 18'
      };
      
      const mockResponse = {
        explanation: 'This query retrieves all users who are over 18 years old',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.explainSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/explain-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle complex SQL explanation', async () => {
      const mockRequest: ExplainSQLRequest = {
        sql: 'SELECT u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id HAVING COUNT(o.id) > 5'
      };
      
      const mockResponse = {
        explanation: 'This query finds users with more than 5 orders by joining users and orders tables',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.explainSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/explain-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('optimizeSQL', () => {
    it('should call POST /ai/optimize-sql with SQL query', async () => {
      const mockRequest: OptimizeSQLRequest = {
        sql: 'SELECT * FROM users WHERE name LIKE "%john%"'
      };
      
      const mockResponse = {
        optimization: 'Use a full-text index on the name column or consider using = operator if possible',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.optimizeSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/optimize-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle optimization requests with schema', async () => {
      const mockRequest: OptimizeSQLRequest = {
        sql: 'SELECT * FROM orders',
        schema: 'CREATE TABLE orders (id INT, user_id INT, INDEX idx_user_id (user_id))'
      };
      
      const mockResponse = {
        optimization: 'Consider selecting only needed columns and using the user_id index for joins',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.optimizeSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/optimize-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStatus', () => {
    it('should call GET /ai/status', async () => {
      const mockResponse = {
        available: true,
        message: 'AI service is available',
        configuredModel: 'claude-3-sonnet',
        models: {
          claude: {
            available: true,
            name: 'claude-3-sonnet',
            provider: 'anthropic'
          }
        }
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await aiApi.getStatus();

      expect(api.get).toHaveBeenCalledWith('/ai/status');
      expect(result).toEqual(mockResponse);
    });

    it('should handle unavailable AI service status', async () => {
      const mockResponse = {
        available: false,
        message: 'AI service is not configured',
        models: {}
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

      const result = await aiApi.getStatus();

      expect(api.get).toHaveBeenCalledWith('/ai/status');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fixSQL', () => {
    it('should call POST /ai/fix-sql with SQL and error', async () => {
      const mockRequest: FixSQLRequest = {
        sql: 'SELEC * FORM users',
        error: 'You have an error in your SQL syntax'
      };
      
      const mockResponse = {
        fixedSql: 'SELECT * FROM users',
        explanation: 'Fixed syntax error: changed SELEC to SELECT and FORM to FROM',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z',
        rawResponse: 'The original query had several syntax errors...'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.fixSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/fix-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle complex SQL fix requests with schema', async () => {
      const mockRequest: FixSQLRequest = {
        sql: 'SELECT * FROM users WHERE id = \'1\' AND name > \'John\'',
        error: 'Operand should contain 1 column',
        schema: 'CREATE TABLE users (id INT, name VARCHAR(50))'
      };
      
      const mockResponse = {
        fixedSql: 'SELECT * FROM users WHERE id = 1 AND name = \'John\'',
        explanation: 'Fixed type mismatch and comparison operator',
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.fixSQL(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/fix-sql', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateTestData', () => {
    it('should call POST /ai/generate-test-data with table and schema', async () => {
      const mockRequest: GenerateTestDataRequest = {
        tableName: 'users',
        schema: 'CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50), email VARCHAR(100))',
        rowCount: 10
      };
      
      const mockResponse = {
        insertStatements: 'INSERT INTO users (id, name, email) VALUES (1, \'John Doe\', \'john@example.com\')...',
        tableName: 'users',
        rowCount: 10,
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.generateTestData(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/generate-test-data', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle test data generation with default row count', async () => {
      const mockRequest: GenerateTestDataRequest = {
        tableName: 'products',
        schema: 'CREATE TABLE products (id INT, name VARCHAR(100), price DECIMAL(10,2))'
      };
      
      const mockResponse = {
        insertStatements: 'INSERT INTO products (id, name, price) VALUES (1, \'Widget\', 9.99)...',
        tableName: 'products',
        rowCount: 5,
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.generateTestData(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/generate-test-data', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('analyzeData', () => {
    it('should call POST /ai/analyze-data with data array', async () => {
      const mockData = [
        { id: 1, name: 'John', age: 25 },
        { id: 2, name: 'Jane', age: 30 },
        { id: 3, name: 'Bob', age: 35 }
      ];

      const mockRequest: AnalyzeDataRequest = {
        data: mockData,
        sql: 'SELECT * FROM users',
        rowCount: 3
      };
      
      const mockResponse = {
        analysis: 'The data shows age distribution with a range from 25 to 35 years',
        model: 'claude-3-sonnet',
        rowsAnalyzed: 3,
        totalRows: 3,
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzeData(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-data', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle data analysis with large datasets', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        value: Math.random() * 100
      }));

      const mockRequest: AnalyzeDataRequest = {
        data: mockData,
        rowCount: 1000
      };
      
      const mockResponse = {
        analysis: 'Statistical analysis shows normal distribution of values',
        model: 'claude-3-sonnet',
        rowsAnalyzed: 1000,
        totalRows: 1000,
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzeData(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-data', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('analyzeSchema', () => {
    it('should call POST /ai/analyze-schema with connection and database', async () => {
      const mockRequest: AnalyzeSchemaRequest = {
        connectionId: 'conn-123',
        database: 'ecommerce'
      };
      
      const mockResponse = {
        analysis: 'Database contains 15 tables with normalized structure',
        database: 'ecommerce',
        tableCount: 15,
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzeSchema(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-schema', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle schema analysis for specific table', async () => {
      const mockRequest: AnalyzeSchemaRequest = {
        connectionId: 'conn-456',
        database: 'ecommerce',
        table: 'orders'
      };
      
      const mockResponse = {
        analysis: 'Orders table has good indexing on customer_id and order_date',
        database: 'ecommerce',
        tableCount: 1,
        model: 'claude-3-sonnet',
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await aiApi.analyzeSchema(mockRequest);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-schema', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockRequest: TextToSQLRequest = {
        query: 'Show me all users',
        schema: 'CREATE TABLE users (id INT)'
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('API Error'));

      await expect(aiApi.textToSQL(mockRequest)).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockRejectedValue(new Error('Network Error'));

      await expect(aiApi.getStatus()).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve request types', async () => {
      const mockRequest: TextToSQLRequest = {
        query: 'string',
        schema: 'string'
      };
      
      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
        sql: 'string',
        model: 'string',
        timestamp: 'string'
      });

      const result = await aiApi.textToSQL(mockRequest);
      
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('timestamp');
    });
  });
});