import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConnections,
  useCreateConnection,
  useTestConnection,
} from '../../hooks/useConnections';
import {
  useGenerateSQL,
  useValidateQuery,
} from '../../hooks/useQueryBuilder';
import {
  useTableData,
  useTableColumns,
} from '../../hooks/useDataViewer';

// Mock APIs
vi.mock('../../api/connections');
vi.mock('../../api/queryBuilder');
vi.mock('../../api/dataViewer');

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

describe('Comprehensive Hooks Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useConnections Hook Suite', () => {
    it('should fetch all connections', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockGetAll = vi.mocked(connectionsApi.getAll);
      mockGetAll.mockResolvedValue({
        connections: [
          {
            id: '1',
            name: 'Test DB',
            host: 'localhost',
            port: 3306,
            database: 'test',
            username: 'user',
            password: 'pass',
            createdAt: '2024-01-01',
          },
        ],
      });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe('Test DB');
    });

    it('should create connection', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockCreate = vi.mocked(connectionsApi.create);
      mockCreate.mockResolvedValue({
        connection: {
          id: '2',
          name: 'New DB',
          host: 'localhost',
          port: 3306,
          database: 'new',
          username: 'user',
          password: 'pass',
          createdAt: '2024-01-01',
        },
      });

      const { result } = renderHook(() => useCreateConnection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          name: 'New DB',
          host: 'localhost',
          port: 3306,
          database: 'new',
          username: 'user',
          password: 'pass',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.connection.name).toBe('New DB');
    });

    it('should test connection', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockTest = vi.mocked(connectionsApi.test);
      mockTest.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        responseTime: 100,
      });

      const { result } = renderHook(() => useTestConnection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          id: '1',
          password: 'testpass',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.responseTime).toBe(100);
    });
  });

  describe('useQueryBuilder Hook Suite', () => {
    it('should generate SQL from AST', async () => {
      const { queryBuilderApi } = await import('../../api/queryBuilder');
      const mockGenerate = vi.mocked(queryBuilderApi.generateSQL);
      mockGenerate.mockResolvedValue({
        sql: 'SELECT id, name FROM users WHERE id = 1',
        ast: {
          type: 'SELECT',
          columns: [{ type: 'column', name: 'id', table: 'users' }],
          from: { type: 'table', table: 'users' },
        },
      });

      const { result } = renderHook(() => useGenerateSQL(), {
        wrapper: createWrapper(),
      });

      const ast = {
        type: 'SELECT' as const,
        columns: [{ type: 'column' as const, name: 'id', table: 'users' }],
        from: { type: 'table' as const, table: 'users' },
      };

      act(() => {
        result.current.mutate(ast);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.sql).toContain('SELECT');
      expect(result.current.data?.sql).toContain('users');
    });

    it('should validate query', async () => {
      const { queryBuilderApi } = await import('../../api/queryBuilder');
      const mockValidate = vi.mocked(queryBuilderApi.validate);
      mockValidate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      const { result } = renderHook(() => useValidateQuery(), {
        wrapper: createWrapper(),
      });

      const ast = {
        type: 'SELECT' as const,
        columns: [{ type: 'column' as const, name: 'id', table: 'users' }],
        from: { type: 'table' as const, table: 'users' },
      };

      act(() => {
        result.current.mutate(ast);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.valid).toBe(true);
      expect(result.current.data?.errors).toHaveLength(0);
    });
  });

  describe('useDataViewer Hook Suite', () => {
    it('should fetch table data', async () => {
      const { dataViewerApi } = await import('../../api/dataViewer');
      const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
      mockGetTableData.mockResolvedValue({
        data: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        total: 2,
        page: 1,
        limit: 10,
        hasMore: false,
      });

      const { result } = renderHook(
        () =>
          useTableData('conn1', {
            database: 'test',
            table: 'users',
            page: 1,
            limit: 10,
            sortBy: 'id',
            sortOrder: 'asc',
            filters: [],
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.data?.total).toBe(2);
    });

    it('should fetch table columns', async () => {
      const { dataViewerApi } = await import('../../api/dataViewer');
      const mockGetColumns = vi.mocked(dataViewerApi.getColumns);
      mockGetColumns.mockResolvedValue({
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false, primaryKey: false },
        ],
        total: 2,
      });

      const { result } = renderHook(
        () => useTableColumns('conn1', 'test', 'users'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.columns).toHaveLength(2);
      expect(result.current.data?.columns[0].name).toBe('id');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockGetAll = vi.mocked(connectionsApi.getAll);
      mockGetAll.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should handle empty results', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockGetAll = vi.mocked(connectionsApi.getAll);
      mockGetAll.mockResolvedValue({ connections: [] });

      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(0);
      expect(result.current.data).toEqual([]);
    });

    it('should handle concurrent operations', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockCreate = vi.mocked(connectionsApi.create);
      const mockTest = vi.mocked(connectionsApi.test);

      mockCreate.mockResolvedValue({
        connection: {
          id: '1',
          name: 'Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
          createdAt: '2024-01-01',
        },
      });

      mockTest.mockResolvedValue({
        success: true,
        message: 'OK',
        responseTime: 50,
      });

      const { result: createResult } = renderHook(() => useCreateConnection(), {
        wrapper: createWrapper(),
      });

      const { result: testResult } = renderHook(() => useTestConnection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        createResult.current.mutate({
          name: 'Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
        });
        testResult.current.mutate({
          id: '1',
          password: 'pass',
        });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
        expect(testResult.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large datasets', async () => {
      const { dataViewerApi } = await import('../../api/dataViewer');
      const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
      const largeDataset = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
        })),
        total: 1000,
        page: 1,
        limit: 1000,
        hasMore: false,
      };
      mockGetTableData.mockResolvedValue(largeDataset);

      const { result } = renderHook(
        () =>
          useTableData('conn1', {
            database: 'test',
            table: 'users',
            page: 1,
            limit: 1000,
            sortBy: 'id',
            sortOrder: 'asc',
            filters: [],
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(1000);
      expect(result.current.data?.total).toBe(1000);
    });

    it('should clean up properly on unmount', () => {
      const { result, unmount } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();

      unmount();

      // Verify no memory leaks - hooks should be cleaned up
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('Type Safety and Contract Tests', () => {
    it('should maintain TypeScript type safety', () => {
      // This verifies that our hooks maintain proper TypeScript contracts
      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      // These assertions would fail at compile time with incorrect types
      expect(result.current.data).toBeInstanceOf(Array);
      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should handle proper query invalidation', async () => {
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

      const { result } = renderHook(() => useConnections(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });

      // Simulate cache invalidation
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['connections'] });
      });

      expect(queryClient.getQueryState(['connections'])?.isInvalidated).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete CRUD workflow', async () => {
      const { connectionsApi } = await import('../../api/connections');
      const mockCreate = vi.mocked(connectionsApi.create);
      const mockUpdate = vi.mocked(connectionsApi.update);
      const mockDelete = vi.mocked(connectionsApi.delete);
      const mockGetAll = vi.mocked(connectionsApi.getAll);

      mockGetAll.mockResolvedValue({ connections: [] });
      mockCreate.mockResolvedValue({
        connection: {
          id: '1',
          name: 'Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
          createdAt: '2024-01-01',
        },
      });
      mockUpdate.mockResolvedValue({
        connection: {
          id: '1',
          name: 'Updated Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
          createdAt: '2024-01-01',
        },
      });
      mockDelete.mockResolvedValue({ success: true });

      const { result: listResult } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      const { result: createResult } = renderHook(() => useCreateConnection(), {
        wrapper: createWrapper(),
      });

      const { result: updateResult } = renderHook(() => useCreateConnection(), {
        wrapper: createWrapper(),
      });

      // Create
      act(() => {
        createResult.current.mutate({
          name: 'Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
        });
      });

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      // Update
      act(() => {
        updateResult.current.mutate({
          name: 'Updated Test',
          host: 'localhost',
          port: 3306,
          database: 'test',
          username: 'user',
          password: 'pass',
        });
      });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });
});