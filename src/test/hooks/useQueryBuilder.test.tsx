import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGenerateSQL,
  useValidateQuery,
  usePreviewQuery,
} from '../../hooks/useQueryBuilder';
import { queryBuilderApi } from '../../api/queryBuilder';
import type {
  QueryBuilderAST,
  GenerateSQLResponse,
  ValidateQueryResponse,
  PreviewQueryResponse,
} from '../../types/queryBuilder';

// Mock the API
vi.mock('../../api/queryBuilder');

// Mock data
const mockAST: QueryBuilderAST = {
  type: 'SELECT',
  columns: [
    { type: 'column', name: 'id', table: 'users' },
    { type: 'column', name: 'name', table: 'users' },
  ],
  from: {
    type: 'table',
    table: 'users',
  },
  where: [
    {
      type: 'condition',
      column: 'id',
      operator: '=',
      value: 1,
    },
  ],
};

const mockGenerateSQLResponse: GenerateSQLResponse = {
  sql: 'SELECT id, name FROM users WHERE id = 1',
  ast: mockAST,
};

const mockValidateQueryResponse: ValidateQueryResponse = {
  valid: true,
  errors: [],
  warnings: [],
};

const mockPreviewQueryResponse: PreviewQueryResponse = {
  ...mockValidateQueryResponse,
  ...mockGenerateSQLResponse,
  estimatedRows: 1000,
  estimatedExecutionTime: 50,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useGenerateSQL', () => {
  it('should generate SQL successfully', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockResolvedValue(mockGenerateSQLResponse);

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockGenerateSQLResponse);
    expect(mockGenerateSQL).toHaveBeenCalledWith(mockAST);
  });

  it('should handle generate SQL error', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockRejectedValue(new Error('Failed to generate SQL'));

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to generate SQL'));
  });

  it('should handle loading state', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockGenerateSQLResponse), 100))
    );

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    act(() => {
      result.current.mutate(mockAST);
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should generate complex SELECT statements', async () => {
    const complexAST: QueryBuilderAST = {
      type: 'SELECT',
      columns: [
        { type: 'column', name: 'id', table: 'users' },
        { type: 'column', name: 'name', table: 'users' },
        { type: 'column', name: 'email', table: 'users' },
        { type: 'function', name: 'COUNT', args: [{ type: 'column', name: '*', table: 'orders' }], table: 'orders' },
      ],
      from: {
        type: 'join',
        table: 'users',
        joins: [
          {
            type: 'INNER',
            table: 'orders',
            on: {
              type: 'condition',
              column: 'users.id',
              operator: '=',
              value: 'orders.user_id',
            },
          },
        ],
      },
      where: [
        {
          type: 'condition',
          column: 'users.active',
          operator: '=',
          value: true,
        },
        {
          type: 'condition',
          column: 'orders.created_at',
          operator: '>=',
          value: '2024-01-01',
        },
      ],
      groupBy: [
        { type: 'column', name: 'users.id', table: 'users' },
        { type: 'column', name: 'users.name', table: 'users' },
      ],
      orderBy: [
        { column: 'COUNT(*)', direction: 'DESC' },
      ],
      limit: 100,
      offset: 0,
    };

    const complexSQL = 'SELECT users.id, users.name, users.email, COUNT(*) FROM users INNER JOIN orders ON users.id = orders.user_id WHERE users.active = 1 AND orders.created_at >= \'2024-01-01\' GROUP BY users.id, users.name ORDER BY COUNT(*) DESC LIMIT 100';
    
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockResolvedValue({
      sql: complexSQL,
      ast: complexAST,
    });

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(complexAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.sql).toBe(complexSQL);
    expect(mockGenerateSQL).toHaveBeenCalledWith(complexAST);
  });

  it('should handle empty AST', async () => {
    const emptyAST: QueryBuilderAST = {
      type: 'SELECT',
      columns: [],
      from: {
        type: 'table',
        table: '',
      },
    };

    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockResolvedValue({
      sql: 'SELECT',
      ast: emptyAST,
    });

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(emptyAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.sql).toBe('SELECT');
  });
});

describe('useValidateQuery', () => {
  it('should validate query successfully', async () => {
    const mockValidate = vi.mocked(queryBuilderApi.validate);
    mockValidate.mockResolvedValue(mockValidateQueryResponse);

    const { result } = renderHook(() => useValidateQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockValidateQueryResponse);
    expect(mockValidate).toHaveBeenCalledWith(mockAST);
  });

  it('should handle validation error', async () => {
    const mockValidate = vi.mocked(queryBuilderApi.validate);
    mockValidate.mockRejectedValue(new Error('Failed to validate query'));

    const { result } = renderHook(() => useValidateQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to validate query'));
  });

  it('should handle validation with errors', async () => {
    const validationWithErrors: ValidateQueryResponse = {
      valid: false,
      errors: [
        {
          type: 'syntax',
          message: 'Invalid syntax near FROM clause',
          position: { line: 1, column: 15 },
        },
        {
          type: 'semantic',
          message: 'Table "invalid_table" does not exist',
          position: { line: 3, column: 8 },
        },
      ],
      warnings: [
        {
          type: 'performance',
          message: 'Consider using an index on the WHERE clause',
          position: { line: 2, column: 1 },
        },
      ],
    };

    const mockValidate = vi.mocked(queryBuilderApi.validate);
    mockValidate.mockResolvedValue(validationWithErrors);

    const { result } = renderHook(() => useValidateQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.valid).toBe(false);
    expect(result.current.data?.errors).toHaveLength(2);
    expect(result.current.data?.warnings).toHaveLength(1);
  });

  it('should handle validation with warnings only', async () => {
    const validationWithWarnings: ValidateQueryResponse = {
      valid: true,
      errors: [],
      warnings: [
        {
          type: 'performance',
          message: 'SELECT * is not recommended',
          position: { line: 1, column: 7 },
        },
      ],
    };

    const mockValidate = vi.mocked(queryBuilderApi.validate);
    mockValidate.mockResolvedValue(validationWithWarnings);

    const { result } = renderHook(() => useValidateQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.valid).toBe(true);
    expect(result.current.data?.errors).toHaveLength(0);
    expect(result.current.data?.warnings).toHaveLength(1);
  });
});

describe('usePreviewQuery', () => {
  it('should preview query successfully', async () => {
    const mockPreview = vi.mocked(queryBuilderApi.preview);
    mockPreview.mockResolvedValue(mockPreviewQueryResponse);

    const { result } = renderHook(() => usePreviewQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPreviewQueryResponse);
    expect(mockPreview).toHaveBeenCalledWith(mockAST);
  });

  it('should handle preview error', async () => {
    const mockPreview = vi.mocked(queryBuilderApi.preview);
    mockPreview.mockRejectedValue(new Error('Failed to preview query'));

    const { result } = renderHook(() => usePreviewQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to preview query'));
  });

  it('should return estimated execution metrics', async () => {
    const mockPreview = vi.mocked(queryBuilderApi.preview);
    mockPreview.mockResolvedValue(mockPreviewQueryResponse);

    const { result } = renderHook(() => usePreviewQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.estimatedRows).toBe(1000);
    expect(result.current.data?.estimatedExecutionTime).toBe(50);
  });

  it('should handle complex queries with high resource usage', async () => {
    const expensiveQueryResponse: PreviewQueryResponse = {
      ...mockValidateQueryResponse,
      ...mockGenerateSQLResponse,
      estimatedRows: 1000000,
      estimatedExecutionTime: 5000,
    };

    const mockPreview = vi.mocked(queryBuilderApi.preview);
    mockPreview.mockResolvedValue(expensiveQueryResponse);

    const { result } = renderHook(() => usePreviewQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.estimatedRows).toBe(1000000);
    expect(result.current.data?.estimatedExecutionTime).toBe(5000);
  });
});

describe('Hook Integration and Error Handling', () => {
  it('should handle multiple concurrent mutations', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    const mockValidate = vi.mocked(queryBuilderApi.validate);
    const mockPreview = vi.mocked(queryBuilderApi.preview);

    mockGenerateSQL.mockResolvedValue(mockGenerateSQLResponse);
    mockValidate.mockResolvedValue(mockValidateQueryResponse);
    mockPreview.mockResolvedValue(mockPreviewQueryResponse);

    const { result: generateResult } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    const { result: validateResult } = renderHook(() => useValidateQuery(), {
      wrapper: createWrapper(),
    });

    const { result: previewResult } = renderHook(() => usePreviewQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      generateResult.current.mutate(mockAST);
      validateResult.current.mutate(mockAST);
      previewResult.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(generateResult.current.isSuccess).toBe(true);
      expect(validateResult.current.isSuccess).toBe(true);
      expect(previewResult.current.isSuccess).toBe(true);
    });

    expect(mockGenerateSQL).toHaveBeenCalledTimes(1);
    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockPreview).toHaveBeenCalledTimes(1);
  });

  it('should handle network timeouts', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    );

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Request timeout'));
  });

  it('should handle invalid AST gracefully', async () => {
    const invalidAST = {
      type: 'INVALID_TYPE',
      // Missing required properties
    } as any;

    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockRejectedValue(new Error('Invalid AST structure'));

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(invalidAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Invalid AST structure'));
  });

  it('should handle API rate limiting', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockRejectedValue(new Error('Too Many Requests'));

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Too Many Requests'));
  });

  it('should handle large AST structures', async () => {
    const largeAST: QueryBuilderAST = {
      type: 'SELECT',
      columns: Array.from({ length: 50 }, (_, i) => ({
        type: 'column',
        name: `col_${i}`,
        table: 'table',
      })),
      from: {
        type: 'table',
        table: 'large_table',
      },
      where: Array.from({ length: 20 }, (_, i) => ({
        type: 'condition',
        column: `col_${i}`,
        operator: '=',
        value: `value_${i}`,
      })),
      groupBy: Array.from({ length: 10 }, (_, i) => ({
        type: 'column',
        name: `col_${i}`,
        table: 'table',
      })),
      orderBy: Array.from({ length: 5 }, (_, i) => ({
        column: `col_${i}`,
        direction: i % 2 === 0 ? 'ASC' as const : 'DESC' as const,
      })),
      limit: 1000,
      offset: 0,
    };

    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockResolvedValue({
      sql: 'SELECT col_0, col_1, ... FROM large_table WHERE ... LIMIT 1000',
      ast: largeAST,
    });

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(largeAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.ast).toEqual(largeAST);
  });

  it('should maintain state between mutations', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    const firstResponse = { ...mockGenerateSQLResponse, sql: 'SELECT 1' };
    const secondResponse = { ...mockGenerateSQLResponse, sql: 'SELECT 2' };

    mockGenerateSQL.mockResolvedValueOnce(firstResponse);
    mockGenerateSQL.mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    // First mutation
    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.sql).toBe('SELECT 1');

    // Second mutation
    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.sql).toBe('SELECT 2');
  });
});

describe('Type Safety and Contract Testing', () => {
  it('should enforce correct AST types', () => {
    // This test verifies TypeScript types are correct at runtime
    const validAST: QueryBuilderAST = {
      type: 'SELECT',
      columns: [{ type: 'column', name: 'id', table: 'users' }],
      from: { type: 'table', table: 'users' },
    };

    expect(validAST.type).toBe('SELECT');
    expect(validAST.columns[0].type).toBe('column');
    expect(validAST.from.type).toBe('table');
  });

  it('should return correct response types', async () => {
    const mockGenerateSQL = vi.mocked(queryBuilderApi.generateSQL);
    mockGenerateSQL.mockResolvedValue(mockGenerateSQLResponse);

    const { result } = renderHook(() => useGenerateSQL(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(mockAST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data;
    expect(data).toHaveProperty('sql');
    expect(data).toHaveProperty('ast');
    expect(typeof data?.sql).toBe('string');
  });

  it('should handle different query types', () => {
    const selectQuery: QueryBuilderAST = {
      type: 'SELECT',
      columns: [{ type: 'column', name: 'id', table: 'users' }],
      from: { type: 'table', table: 'users' },
    };

    const insertQuery: QueryBuilderAST = {
      type: 'INSERT',
      table: 'users',
      values: [
        { name: 'John', email: 'john@example.com' },
      ],
    };

    const updateQuery: QueryBuilderAST = {
      type: 'UPDATE',
      table: 'users',
      set: { name: 'Jane' },
      where: [
        { type: 'condition', column: 'id', operator: '=', value: 1 },
      ],
    };

    expect(selectQuery.type).toBe('SELECT');
    expect(insertQuery.type).toBe('INSERT');
    expect(updateQuery.type).toBe('UPDATE');
  });
});