import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryBuilderApi } from '../../api/queryBuilder';
import { api } from '../../api/client';
import type {
  QueryBuilderAST,
  QueryTable,
  QueryColumn,
  QueryJoin,
  QueryCondition,
  QueryOrderBy,
  QueryGroupBy,
} from '../../types/queryBuilder';

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('queryBuilderApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSQL', () => {
    it('should generate SQL from simple SELECT query', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'u', column: 'email' },
        ],
        from: { name: 'users', alias: 'u' },
        where: [
          {
            column: 'u.active',
            operator: '=',
            value: true,
          },
        ],
        orderBy: [
          { column: 'u.name', direction: 'ASC' },
        ],
        limit: 10,
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT u.name, u.email FROM users u WHERE u.active = ? ORDER BY u.name ASC LIMIT 10',
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
    });

    it('should generate SQL with JOIN', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'o', column: 'total' },
        ],
        from: { name: 'users', alias: 'u' },
        joins: [
          {
            type: 'LEFT',
            table: { name: 'orders', alias: 'o' },
            onConditions: [
              {
                column: 'u.id',
                operator: '=',
                value: '$o.user_id',
              },
            ],
          },
        ],
        where: [
          {
            column: 'u.active',
            operator: '=',
            value: true,
          },
        ],
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT u.name, o.total FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.active = ?',
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
    });

    it('should generate SQL with GROUP BY and HAVING', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'o', column: 'total', aggregateFunction: 'SUM' as const },
        ],
        from: { name: 'users', alias: 'u' },
        joins: [
          {
            type: 'INNER',
            table: { name: 'orders', alias: 'o' },
            onConditions: [
              {
                column: 'u.id',
                operator: '=',
                value: '$o.user_id',
              },
            ],
          },
        ],
        groupBy: {
          columns: ['u.name'],
          having: [
            {
              column: 'SUM(o.total)',
              operator: '>',
              value: 1000,
            },
          ],
        },
        orderBy: [
          { column: 'SUM(o.total)', direction: 'DESC' },
        ],
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT u.name, SUM(o.total) FROM users u INNER JOIN orders o ON u.id = o.user_id GROUP BY u.name HAVING SUM(o.total) > ? ORDER BY SUM(o.total) DESC',
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
    });

    it('should handle complex WHERE conditions with logical operators', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: '*', column: '*' }],
        from: { name: 'users' },
        where: [
          {
            column: 'active',
            operator: '=',
            value: true,
            logicalOperator: 'AND',
          },
          {
            column: 'age',
            operator: '>=',
            value: 18,
            logicalOperator: 'OR',
          },
          {
            column: 'role',
            operator: 'IN',
            values: ['admin', 'moderator'],
          },
        ],
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT * FROM users WHERE active = ? AND age >= ? OR role IN (?, ?)',
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
    });

    it('should handle DISTINCT queries', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'u', column: 'email' },
        ],
        from: { name: 'users', alias: 'u' },
        distinct: true,
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT DISTINCT u.name, u.email FROM users u',
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors from API', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'nonexistent_table' },
      };

      const mockResponse = {
        success: false,
        errors: ['Table "nonexistent_table" does not exist'],
        warnings: [],
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.generateSQL(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/generate', ast);
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate simple query successfully', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'users', alias: 'u' },
        where: [
          {
            column: 'u.id',
            operator: '=',
            value: 1,
          },
        ],
      };

      const mockResponse = {
        success: true,
        validation: {
          valid: true,
          errors: [],
          warnings: [],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.validate(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/validate', ast);
      expect(result).toEqual(mockResponse);
      expect(result.validation.valid).toBe(true);
    });

    it('should detect validation errors', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'nonexistent_column' }],
        from: { name: 'users', alias: 'u' },
        where: [
          {
            column: 'u.id',
            operator: '=',
            value: 1,
          },
        ],
      };

      const mockResponse = {
        success: true,
        validation: {
          valid: false,
          errors: ['Column "nonexistent_column" does not exist in table "users"'],
          warnings: ['Consider adding an index on u.id for better performance'],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.validate(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/validate', ast);
      expect(result).toEqual(mockResponse);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate JOIN syntax', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'users', alias: 'u' },
        joins: [
          {
            type: 'INNER',
            table: { name: 'orders', alias: 'o' },
            onConditions: [
              {
                column: 'u.id',
                operator: '=',
                value: '$o.user_id',
              },
            ],
          },
        ],
      };

      const mockResponse = {
        success: true,
        validation: {
          valid: true,
          errors: [],
          warnings: [],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.validate(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/validate', ast);
      expect(result.validation.valid).toBe(true);
    });

    it('should validate GROUP BY and HAVING clauses', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'o', column: 'total', aggregateFunction: 'SUM' as const },
        ],
        from: { name: 'users', alias: 'u' },
        joins: [
          {
            type: 'INNER',
            table: { name: 'orders', alias: 'o' },
            onConditions: [
              {
                column: 'u.id',
                operator: '=',
                value: '$o.user_id',
              },
            ],
          },
        ],
        groupBy: {
          columns: ['u.name'],
          having: [
            {
              column: 'SUM(o.total)',
              operator: '>',
              value: 100,
            },
          ],
        },
      };

      const mockResponse = {
        success: true,
        validation: {
          valid: true,
          errors: [],
          warnings: [],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.validate(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/validate', ast);
      expect(result.validation.valid).toBe(true);
    });
  });

  describe('preview', () => {
    it('should generate SQL and validate in one call', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'users', alias: 'u' },
        where: [
          {
            column: 'u.active',
            operator: '=',
            value: true,
          },
        ],
        orderBy: [{ column: 'u.name', direction: 'ASC' }],
        limit: 20,
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT u.name FROM users u WHERE u.active = ? ORDER BY u.name ASC LIMIT 20',
        validation: {
          valid: true,
          errors: [],
          warnings: ['Consider adding LIMIT clause for better performance'],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.preview(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/preview', ast);
      expect(result).toEqual(mockResponse);
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('validation');
    });

    it('should handle preview with errors', async () => {
      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'invalid_column' }],
        from: { name: 'users', alias: 'u' },
      };

      const mockResponse = {
        success: false,
        sql: '',
        validation: {
          valid: false,
          errors: ['Column "invalid_column" does not exist'],
          warnings: [],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.preview(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/preview', ast);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
    });

    it('should preview complex multi-table query', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'u', column: 'name' },
          { table: 'o', column: 'total', aggregateFunction: 'SUM' as const },
          { table: 'p', column: 'title' },
        ],
        from: { name: 'users', alias: 'u' },
        joins: [
          {
            type: 'LEFT',
            table: { name: 'orders', alias: 'o' },
            onConditions: [
              {
                column: 'u.id',
                operator: '=',
                value: '$o.user_id',
              },
            ],
          },
          {
            type: 'LEFT',
            table: { name: 'products', alias: 'p' },
            onConditions: [
              {
                column: 'o.product_id',
                operator: '=',
                value: '$p.id',
              },
            ],
          },
        ],
        where: [
          {
            column: 'u.active',
            operator: '=',
            value: true,
          },
        ],
        groupBy: {
          columns: ['u.name', 'p.title'],
        },
        orderBy: [{ column: 'SUM(o.total)', direction: 'DESC' }],
        distinct: true,
      };

      const mockResponse = {
        success: true,
        sql: 'SELECT DISTINCT u.name, SUM(o.total), p.title FROM users u LEFT JOIN orders o ON u.id = o.user_id LEFT JOIN products p ON o.product_id = p.id WHERE u.active = ? GROUP BY u.name, p.title ORDER BY SUM(o.total) DESC',
        validation: {
          valid: true,
          errors: [],
          warnings: ['Multiple JOINs may impact performance'],
        },
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

      const result = await queryBuilderApi.preview(ast);

      expect(api.post).toHaveBeenCalledWith('/query-builder/preview', ast);
      expect(result).toEqual(mockResponse);
      expect(result.sql).toContain('LEFT JOIN');
      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('DISTINCT');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('API Error'));

      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'users' },
      };

      await expect(queryBuilderApi.generateSQL(ast)).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('Network Error'));

      const ast: QueryBuilderAST = {
        select: [{ table: 'u', column: 'name' }],
        from: { name: 'users' },
      };

      await expect(queryBuilderApi.validate(ast)).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve QueryBuilderAST types', async () => {
      const ast: QueryBuilderAST = {
        select: [
          { table: 'string', column: 'string', alias: 'string' },
        ],
        from: { name: 'string', alias: 'string', database: 'string' },
        joins: [
          {
            type: 'INNER' as const,
            table: { name: 'string' },
            onConditions: [],
          },
        ],
        where: [
          {
            column: 'string',
            operator: '=' as const,
            value: 'any',
            values: ['any'],
            logicalOperator: 'AND' as const,
          },
        ],
        groupBy: {
          columns: ['string'],
          having: [],
        },
        orderBy: [
          { column: 'string', direction: 'ASC' as const },
        ],
        limit: 0,
        offset: 0,
        distinct: true,
      };

      (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
        success: true,
        sql: 'test',
      });

      const result = await queryBuilderApi.generateSQL(ast);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle all comparison operators', async () => {
      const operators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN'];
      
      for (const operator of operators) {
        const ast: QueryBuilderAST = {
          select: [{ table: 'u', column: 'name' }],
          from: { name: 'users' },
          where: [
            {
              column: 'u.id',
              operator: operator as any,
              value: operator === 'BETWEEN' ? [1, 10] : 1,
              values: ['IN', 'NOT IN'].includes(operator) ? [1, 2, 3] : undefined,
            },
          ],
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
          success: true,
          sql: `test ${operator}`,
        });

        const result = await queryBuilderApi.generateSQL(ast);
        expect(result.success).toBe(true);
      }
    });

    it('should handle all join types', async () => {
      const joinTypes: Array<'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS'> = ['INNER', 'LEFT', 'RIGHT', 'FULL OUTER', 'CROSS'];
      
      for (const joinType of joinTypes) {
        const ast: QueryBuilderAST = {
          select: [{ table: 'u', column: 'name' }],
          from: { name: 'users', alias: 'u' },
          joins: [
            {
              type: joinType,
              table: { name: 'orders', alias: 'o' },
              onConditions: [
                {
                  column: 'u.id',
                  operator: '=',
                  value: '$o.user_id',
                },
              ],
            },
          ],
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue({
          success: true,
          sql: `test ${joinType}`,
        });

        const result = await queryBuilderApi.generateSQL(ast);
        expect(result.success).toBe(true);
      }
    });
  });
});