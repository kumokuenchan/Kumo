import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectRelationships,
  generateSmartJoinSQL,
  executeSmartJoin,
  type TableLink,
  type SmartJoinFilter,
  type SmartJoinRequest,
  type SmartJoinResult,
} from '../../api/smartJoin';
import { apiRequest } from '../../api/client';

// Mock the apiRequest function
vi.mock('../../api/client', () => ({
  apiRequest: vi.fn(),
}));

describe('smartJoinApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectRelationships', () => {
    it('should detect foreign key relationships between tables', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const tables = ['users', 'orders', 'products', 'order_items'];

      const mockLinks: TableLink[] = [
        {
          from: 'orders.user_id',
          to: 'users.id',
          type: 'INNER',
        },
        {
          from: 'order_items.order_id',
          to: 'orders.id',
          type: 'INNER',
        },
        {
          from: 'order_items.product_id',
          to: 'products.id',
          type: 'INNER',
        },
      ];

      const mockResponse = { links: mockLinks };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await detectRelationships(connectionId, database, tables);

      expect(apiRequest).toHaveBeenCalledWith(
        `/smart-join/${connectionId}/databases/${database}/detect-relationships`,
        {
          method: 'POST',
          body: JSON.stringify({ tables }),
        }
      );

      expect(result).toEqual(mockResponse);
      expect(result.links).toHaveLength(3);
      expect(result.links[0]).toHaveProperty('from');
      expect(result.links[0]).toHaveProperty('to');
    });

    it('should detect LEFT JOIN relationships', async () => {
      const connectionId = 'conn-456';
      const database = 'ecommerce';
      const tables = ['customers', 'orders', 'reviews'];

      const mockLinks: TableLink[] = [
        {
          from: 'orders.customer_id',
          to: 'customers.id',
          type: 'LEFT',
        },
        {
          from: 'reviews.order_id',
          to: 'orders.id',
          type: 'LEFT',
        },
      ];

      const mockResponse = { links: mockLinks };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await detectRelationships(connectionId, database, tables);

      expect(apiRequest).toHaveBeenCalledWith(
        `/smart-join/${connectionId}/databases/${database}/detect-relationships`,
        {
          method: 'POST',
          body: JSON.stringify({ tables }),
        }
      );

      expect(result.links[0].type).toBe('LEFT');
    });

    it('should handle tables with no relationships', async () => {
      const connectionId = 'conn-789';
      const database = 'testdb';
      const tables = ['table1', 'table2', 'table3'];

      const mockResponse = { links: [] };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await detectRelationships(connectionId, database, tables);

      expect(apiRequest).toHaveBeenCalledWith(
        `/smart-join/${connectionId}/databases/${database}/detect-relationships`,
        {
          method: 'POST',
          body: JSON.stringify({ tables }),
        }
      );

      expect(result.links).toHaveLength(0);
    });

    it('should handle complex relationship chains', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const tables = ['users', 'posts', 'comments', 'likes', 'tags', 'post_tags'];

      const mockLinks: TableLink[] = [
        {
          from: 'posts.user_id',
          to: 'users.id',
          type: 'INNER',
        },
        {
          from: 'comments.post_id',
          to: 'posts.id',
          type: 'INNER',
        },
        {
          from: 'likes.post_id',
          to: 'posts.id',
          type: 'LEFT',
        },
        {
          from: 'post_tags.post_id',
          to: 'posts.id',
          type: 'INNER',
        },
        {
          from: 'post_tags.tag_id',
          to: 'tags.id',
          type: 'INNER',
        },
      ];

      const mockResponse = { links: mockLinks };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await detectRelationships(connectionId, database, tables);

      expect(result.links).toHaveLength(5);
      expect(result.links[3].from).toBe('post_tags.post_id');
      expect(result.links[3].to).toBe('posts.id');
    });
  });

  describe('generateSmartJoinSQL', () => {
    it('should generate SQL for simple two-table join', async () => {
      const connectionId = 'conn-123';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'orders'],
        links: [
          {
            from: 'orders.user_id',
            to: 'users.id',
            type: 'INNER',
          },
        ],
        filters: [
          {
            column: 'users.active',
            operator: '=',
            value: true,
          },
        ],
        limit: 100,
      };

      const mockResponse = {
        sql: 'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id WHERE users.active = ? LIMIT 100',
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/generate-sql`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result).toEqual(mockResponse);
      expect(result.sql).toContain('INNER JOIN');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('LIMIT');
    });

    it('should generate SQL for complex multi-table join', async () => {
      const connectionId = 'conn-456';
      const request: SmartJoinRequest = {
        database: 'ecommerce',
        tables: ['customers', 'orders', 'products', 'order_items'],
        links: [
          {
            from: 'orders.customer_id',
            to: 'customers.id',
            type: 'INNER',
          },
          {
            from: 'order_items.order_id',
            to: 'orders.id',
            type: 'INNER',
          },
          {
            from: 'order_items.product_id',
            to: 'products.id',
            type: 'INNER',
          },
        ],
        filters: [
          {
            column: 'customers.region',
            operator: '=',
            value: 'North',
          },
          {
            column: 'orders.status',
            operator: '=',
            value: 'completed',
            logicalOperator: 'AND',
          },
        ],
        limit: 50,
        offset: 0,
      };

      const mockResponse = {
        sql: 'SELECT * FROM customers INNER JOIN orders ON customers.id = orders.customer_id INNER JOIN order_items ON orders.id = order_items.order_id INNER JOIN products ON order_items.product_id = products.id WHERE customers.region = ? AND orders.status = ? LIMIT 50 OFFSET 0',
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/generate-sql`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.sql).toContain('INNER JOIN');
      expect(result.sql).toContain('WHERE customers.region');
      expect(result.sql).toContain('AND orders.status');
      expect(result.sql).toContain('LIMIT 50 OFFSET 0');
    });

    it('should generate SQL with LEFT JOINs', async () => {
      const connectionId = 'conn-789';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'posts', 'comments'],
        links: [
          {
            from: 'posts.user_id',
            to: 'users.id',
            type: 'LEFT',
          },
          {
            from: 'comments.post_id',
            to: 'posts.id',
            type: 'LEFT',
          },
        ],
      };

      const mockResponse = {
        sql: 'SELECT * FROM users LEFT JOIN posts ON users.id = posts.user_id LEFT JOIN comments ON posts.id = comments.post_id',
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/generate-sql`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.sql).toContain('LEFT JOIN');
      expect(result.sql).toMatch(/LEFT JOIN.*LEFT JOIN/);
    });

    it('should generate SQL with RIGHT JOINs', async () => {
      const connectionId = 'conn-123';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'sessions'],
        links: [
          {
            from: 'sessions.user_id',
            to: 'users.id',
            type: 'RIGHT',
          },
        ],
      };

      const mockResponse = {
        sql: 'SELECT * FROM users RIGHT JOIN sessions ON users.id = sessions.user_id',
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/generate-sql`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.sql).toContain('RIGHT JOIN');
    });

    it('should generate SQL with multiple filter operators', async () => {
      const connectionId = 'conn-456';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['products', 'orders', 'customers'],
        links: [
          {
            from: 'orders.product_id',
            to: 'products.id',
            type: 'INNER',
          },
          {
            from: 'orders.customer_id',
            to: 'customers.id',
            type: 'INNER',
          },
        ],
        filters: [
          {
            column: 'products.price',
            operator: '>=',
            value: 100,
          },
          {
            column: 'products.category',
            operator: 'IN',
            values: ['electronics', 'computers'],
          },
          {
            column: 'orders.date',
            operator: 'BETWEEN',
            value: ['2024-01-01', '2024-12-31'],
          },
        ],
      };

      const mockResponse = {
        sql: 'SELECT * FROM products INNER JOIN orders ON products.id = orders.product_id INNER JOIN customers ON orders.customer_id = customers.id WHERE products.price >= ? AND products.category IN (?, ?) AND orders.date BETWEEN ? AND ?',
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/generate-sql`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.sql).toContain('WHERE products.price >=');
      expect(result.sql).toContain('AND products.category IN');
      expect(result.sql).toContain('AND orders.date BETWEEN');
    });
  });

  describe('executeSmartJoin', () => {
    it('should execute simple smart join query', async () => {
      const connectionId = 'conn-123';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'orders'],
        links: [
          {
            from: 'orders.user_id',
            to: 'users.id',
            type: 'INNER',
          },
        ],
        limit: 10,
      };

      const mockResult: SmartJoinResult = {
        sql: 'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id LIMIT 10',
        rows: [
          {
            'users.id': 1,
            'users.name': 'John Doe',
            'orders.id': 101,
            'orders.total': 150.50,
            'orders.user_id': 1,
          },
          {
            'users.id': 2,
            'users.name': 'Jane Smith',
            'orders.id': 102,
            'orders.total': 89.99,
            'orders.user_id': 2,
          },
        ],
        totalRows: 25,
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResult);

      const result = await executeSmartJoin(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result).toEqual(mockResult);
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(25);
      expect(result.sql).toContain('INNER JOIN');
    });

    it('should execute complex join with pagination', async () => {
      const connectionId = 'conn-456';
      const request: SmartJoinRequest = {
        database: 'ecommerce',
        tables: ['customers', 'orders', 'products', 'order_items'],
        links: [
          {
            from: 'orders.customer_id',
            to: 'customers.id',
            type: 'INNER',
          },
          {
            from: 'order_items.order_id',
            to: 'orders.id',
            type: 'INNER',
          },
          {
            from: 'order_items.product_id',
            to: 'products.id',
            type: 'INNER',
          },
        ],
        filters: [
          {
            column: 'orders.status',
            operator: '=',
            value: 'completed',
          },
        ],
        limit: 20,
        offset: 40,
      };

      const mockResult: SmartJoinResult = {
        sql: 'SELECT * FROM customers INNER JOIN orders ON customers.id = orders.customer_id INNER JOIN order_items ON orders.id = order_items.order_id INNER JOIN products ON order_items.product_id = products.id WHERE orders.status = ? LIMIT 20 OFFSET 40',
        rows: [
          {
            'customers.name': 'Acme Corp',
            'orders.id': 1001,
            'products.name': 'Laptop',
            'order_items.quantity': 2,
            'order_items.price': 999.99,
          },
        ],
        totalRows: 150,
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResult);

      const result = await executeSmartJoin(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.rows).toHaveLength(1);
      expect(result.totalRows).toBe(150);
      expect(result.sql).toContain('LIMIT 20 OFFSET 40');
    });

    it('should execute LEFT JOIN query with no matches', async () => {
      const connectionId = 'conn-789';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'posts', 'comments'],
        links: [
          {
            from: 'posts.user_id',
            to: 'users.id',
            type: 'LEFT',
          },
          {
            from: 'comments.post_id',
            to: 'posts.id',
            type: 'LEFT',
          },
        ],
      };

      const mockResult: SmartJoinResult = {
        sql: 'SELECT * FROM users LEFT JOIN posts ON users.id = posts.user_id LEFT JOIN comments ON posts.id = comments.post_id',
        rows: [
          {
            'users.id': 1,
            'users.name': 'User Without Posts',
            'posts.id': null,
            'posts.title': null,
            'comments.id': null,
            'comments.content': null,
          },
        ],
        totalRows: 1,
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResult);

      const result = await executeSmartJoin(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.rows[0]['posts.id']).toBeNull();
      expect(result.rows[0]['comments.id']).toBeNull();
    });

    it('should execute query with large result set', async () => {
      const connectionId = 'conn-123';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['orders', 'order_items', 'products'],
        links: [
          {
            from: 'order_items.order_id',
            to: 'orders.id',
            type: 'INNER',
          },
          {
            from: 'order_items.product_id',
            to: 'products.id',
            type: 'INNER',
          },
        ],
        limit: 1000,
      };

      const mockRows = Array.from({ length: 1000 }, (_, i) => ({
        'orders.id': i + 1,
        'order_items.id': i + 1,
        'products.name': `Product ${i + 1}`,
        'order_items.quantity': Math.floor(Math.random() * 10) + 1,
      }));

      const mockResult: SmartJoinResult = {
        sql: 'SELECT * FROM orders INNER JOIN order_items ON orders.id = order_items.order_id INNER JOIN products ON order_items.product_id = products.id LIMIT 1000',
        rows: mockRows,
        totalRows: 50000,
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResult);

      const result = await executeSmartJoin(connectionId, request);

      expect(apiRequest).toHaveBeenCalledWith(`/smart-join/${connectionId}/execute`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      expect(result.rows).toHaveLength(1000);
      expect(result.totalRows).toBe(50000);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockRejectedValue(new Error('API Error'));

      await expect(detectRelationships('conn-123', 'testdb', ['users'])).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockRejectedValue(new Error('Network Error'));

      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'orders'],
        links: [{ from: 'orders.user_id', to: 'users.id', type: 'INNER' }],
      };

      await expect(executeSmartJoin('conn-123', request)).rejects.toThrow('Network Error');
    });

    it('should handle invalid relationship detection', async () => {
      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockRejectedValue(new Error('No relationships found'));

      await expect(detectRelationships('conn-999', 'invalid_db', ['nonexistent_table'])).rejects.toThrow('No relationships found');
    });
  });

  describe('Type Safety', () => {
    it('should preserve TableLink types', async () => {
      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue({
        links: [
          {
            from: 'string',
            to: 'string',
            type: 'INNER',
          },
        ],
      });

      const result = await detectRelationships('conn-123', 'testdb', ['table1', 'table2']);

      expect(result.links[0]).toHaveProperty('from');
      expect(result.links[0]).toHaveProperty('to');
      expect(result.links[0]).toHaveProperty('type');
    });

    it('should preserve SmartJoinRequest types', async () => {
      const request: SmartJoinRequest = {
        database: 'string',
        tables: ['string'],
        links: [
          {
            from: 'string',
            to: 'string',
            type: 'LEFT',
          },
        ],
        filters: [
          {
            column: 'string',
            operator: '=',
            value: 'any',
          },
        ],
        limit: 0,
        offset: 0,
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue({
        sql: 'test',
      });

      const result = await generateSmartJoinSQL('conn-123', request);

      expect(result).toHaveProperty('sql');
    });

    it('should preserve SmartJoinResult types', async () => {
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['users', 'orders'],
        links: [{ from: 'orders.user_id', to: 'users.id', type: 'INNER' }],
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue({
        sql: 'test',
        rows: [],
        totalRows: 0,
      });

      const result = await executeSmartJoin('conn-123', request);

      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('totalRows');
      expect(Array.isArray(result.rows)).toBe(true);
      expect(typeof result.totalRows).toBe('number');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle circular dependencies', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const tables = ['table_a', 'table_b', 'table_c'];

      // This might be a case where tables have circular references
      const mockLinks: TableLink[] = [
        {
          from: 'table_a.id',
          to: 'table_b.id',
          type: 'INNER',
        },
        {
          from: 'table_b.id',
          to: 'table_c.id',
          type: 'INNER',
        },
        {
          from: 'table_c.id',
          to: 'table_a.id',
          type: 'INNER',
        },
      ];

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue({ links: mockLinks });

      const result = await detectRelationships(connectionId, database, tables);

      expect(result.links).toHaveLength(3);
    });

    it('should handle self-referencing tables', async () => {
      const connectionId = 'conn-123';
      const request: SmartJoinRequest = {
        database: 'testdb',
        tables: ['employees', 'departments'],
        links: [
          {
            from: 'employees.manager_id',
            to: 'employees.id',
            type: 'LEFT',
          },
          {
            from: 'employees.department_id',
            to: 'departments.id',
            type: 'INNER',
          },
        ],
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue({
        sql: 'SELECT * FROM employees LEFT JOIN employees ON employees.manager_id = employees.id INNER JOIN departments ON employees.department_id = departments.id',
      });

      const result = await generateSmartJoinSQL(connectionId, request);

      expect(result.sql).toContain('employees.manager_id = employees.id');
    });
  });
});