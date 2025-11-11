import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useExecuteQuery,
  useExecuteMultipleQueries,
  useExecutePaginatedQuery,
  useCancelQuery,
  useQueryHistory,
  useAllQueryHistory,
  useSearchQueryHistory,
  useQueryById,
  useDeleteQueryHistory,
  useClearConnectionHistory,
  useQueryStats,
  useAllQueryStats,
} from '../../hooks/useQuery';
import { queryApi } from '../../api/query';

// Mock the API
vi.mock('../../api/query');

// Mock data
const mockQueryResult = {
  success: true,
  result: {
    columns: ['id', 'name', 'email'],
    rows: [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ],
    rowCount: 2,
    executionTime: 100,
  },
  stats: {
    executionTime: 100,
    rowCount: 2,
    bytesRead: 1024,
    bytesWritten: 512,
  },
};

const mockPaginatedQueryResult = {
  success: true,
  result: {
    columns: ['id', 'name'],
    rows: [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ],
    rowCount: 2,
    totalCount: 10,
    page: 1,
    pageSize: 2,
    hasMore: true,
    executionTime: 50,
  },
};

const mockExecutionResult = {
  success: true,
  results: [
    {
      success: true,
      result: {
        columns: ['id'],
        rows: [{ id: 1 }],
        rowCount: 1,
        executionTime: 50,
      },
    },
    {
      success: true,
      result: {
        columns: ['name'],
        rows: [{ name: 'Test' }],
        rowCount: 1,
        executionTime: 30,
      },
    },
  ],
  totalExecutionTime: 80,
  hasErrors: false,
};

const mockQueryHistoryEntry = {
  id: '1',
  connectionId: 'conn1',
  sql: 'SELECT * FROM users',
  executionTime: 100,
  rowCount: 2,
  timestamp: '2024-01-01T10:00:00Z',
  success: true,
  error: null,
};

const mockQueryHistory: any[] = [mockQueryHistoryEntry];

const mockQueryStatistics = {
  totalQueries: 100,
  successfulQueries: 95,
  failedQueries: 5,
  averageExecutionTime: 150,
  totalExecutionTime: 15000,
  totalRowsReturned: 5000,
  lastQueryTime: '2024-01-01T10:00:00Z',
  topSlowQueries: [
    {
      sql: 'SELECT * FROM large_table',
      executionTime: 2000,
      frequency: 10,
    },
  ],
  queryDistribution: {
    SELECT: 80,
    INSERT: 10,
    UPDATE: 5,
    DELETE: 5,
  },
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

describe('useExecuteQuery', () => {
  it('should execute query successfully', async () => {
    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockResolvedValue(mockQueryResult);

    const { result } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM users',
        params: [1],
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryResult);
    expect(mockExecute).toHaveBeenCalledWith('conn1', 'SELECT * FROM users', [1]);
  });

  it('should handle query execution error', async () => {
    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockRejectedValue(new Error('Query execution failed'));

    const { result } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM invalid_table',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Query execution failed'));
  });

  it('should invalidate query history and stats on success', async () => {
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

    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useExecuteQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockResolvedValue(mockQueryResult);

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM users',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['queryHistory', 'conn1'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['queryStats', 'conn1'],
    });
  });
});

describe('useExecuteMultipleQueries', () => {
  it('should execute multiple queries successfully', async () => {
    const mockExecuteMultiple = vi.mocked(queryApi.executeMultiple);
    mockExecuteMultiple.mockResolvedValue(mockExecutionResult);

    const { result } = renderHook(() => useExecuteMultipleQueries(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT 1; SELECT 2;',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockExecutionResult);
    expect(mockExecuteMultiple).toHaveBeenCalledWith('conn1', 'SELECT 1; SELECT 2;');
  });

  it('should handle partial query failure', async () => {
    const executionResultWithErrors = {
      success: true,
      results: [
        {
          success: true,
          result: {
            columns: ['id'],
            rows: [{ id: 1 }],
            rowCount: 1,
            executionTime: 50,
          },
        },
        {
          success: false,
          error: 'Table not found',
          result: null,
        },
      ],
      totalExecutionTime: 50,
      hasErrors: true,
    };

    const mockExecuteMultiple = vi.mocked(queryApi.executeMultiple);
    mockExecuteMultiple.mockResolvedValue(executionResultWithErrors);

    const { result } = renderHook(() => useExecuteMultipleQueries(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT 1; SELECT * FROM invalid_table;',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.hasErrors).toBe(true);
    expect(result.current.data?.results[1].success).toBe(false);
  });
});

describe('useExecutePaginatedQuery', () => {
  it('should execute paginated query successfully', async () => {
    const mockExecutePaginated = vi.mocked(queryApi.executePaginated);
    mockExecutePaginated.mockResolvedValue(mockPaginatedQueryResult);

    const { result } = renderHook(() => useExecutePaginatedQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM users',
        page: 1,
        pageSize: 10,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPaginatedQueryResult);
    expect(mockExecutePaginated).toHaveBeenCalledWith('conn1', 'SELECT * FROM users', 1, 10);
  });

  it('should use default pagination values', async () => {
    const mockExecutePaginated = vi.mocked(queryApi.executePaginated);
    mockExecutePaginated.mockResolvedValue(mockPaginatedQueryResult);

    const { result } = renderHook(() => useExecutePaginatedQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM users',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockExecutePaginated).toHaveBeenCalledWith('conn1', 'SELECT * FROM users', undefined, undefined);
  });
});

describe('useCancelQuery', () => {
  it('should cancel query successfully', async () => {
    const mockCancel = vi.mocked(queryApi.cancel);
    mockCancel.mockResolvedValue({ success: true, message: 'Query cancelled' });

    const { result } = renderHook(() => useCancelQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ connectionId: 'conn1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true, message: 'Query cancelled' });
    expect(mockCancel).toHaveBeenCalledWith('conn1');
  });

  it('should handle cancel error', async () => {
    const mockCancel = vi.mocked(queryApi.cancel);
    mockCancel.mockRejectedValue(new Error('No running query to cancel'));

    const { result } = renderHook(() => useCancelQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ connectionId: 'conn1' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('No running query to cancel'));
  });
});

describe('useQueryHistory', () => {
  it('should fetch query history successfully', async () => {
    const mockGetConnectionHistory = vi.mocked(queryApi.getConnectionHistory);
    mockGetConnectionHistory.mockResolvedValue(mockQueryHistory);

    const { result } = renderHook(() => useQueryHistory('conn1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryHistory);
    expect(mockGetConnectionHistory).toHaveBeenCalledWith('conn1', 50, 0);
  });

  it('should not fetch when connectionId is null', () => {
    const mockGetConnectionHistory = vi.mocked(queryApi.getConnectionHistory);

    const { result } = renderHook(() => useQueryHistory(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGetConnectionHistory).not.toHaveBeenCalled();
  });

  it('should use custom limit and offset', async () => {
    const mockGetConnectionHistory = vi.mocked(queryApi.getConnectionHistory);
    mockGetConnectionHistory.mockResolvedValue(mockQueryHistory);

    const { result } = renderHook(() => useQueryHistory('conn1', 100, 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetConnectionHistory).toHaveBeenCalledWith('conn1', 100, 10);
  });
});

describe('useAllQueryHistory', () => {
  it('should fetch all query history successfully', async () => {
    const mockGetHistory = vi.mocked(queryApi.getHistory);
    mockGetHistory.mockResolvedValue(mockQueryHistory);

    const { result } = renderHook(() => useAllQueryHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryHistory);
    expect(mockGetHistory).toHaveBeenCalledWith(100);
  });

  it('should use custom limit', async () => {
    const mockGetHistory = vi.mocked(queryApi.getHistory);
    mockGetHistory.mockResolvedValue(mockQueryHistory);

    const { result } = renderHook(() => useAllQueryHistory(50), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetHistory).toHaveBeenCalledWith(50);
  });
});

describe('useSearchQueryHistory', () => {
  it('should search query history successfully', async () => {
    const mockSearchHistory = vi.mocked(queryApi.searchHistory);
    mockSearchHistory.mockResolvedValue(mockQueryHistory);

    const { result } = renderHook(() => useSearchQueryHistory('SELECT', 'conn1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryHistory);
    expect(mockSearchHistory).toHaveBeenCalledWith('SELECT', 'conn1', 50);
  });

  it('should not search with empty query', () => {
    const mockSearchHistory = vi.mocked(queryApi.searchHistory);

    const { result } = renderHook(() => useSearchQueryHistory(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockSearchHistory).not.toHaveBeenCalled();
  });
});

describe('useQueryById', () => {
  it('should fetch query by ID successfully', async () => {
    const mockGetHistoryById = vi.mocked(queryApi.getHistoryById);
    mockGetHistoryById.mockResolvedValue(mockQueryHistoryEntry);

    const { result } = renderHook(() => useQueryById('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryHistoryEntry);
    expect(mockGetHistoryById).toHaveBeenCalledWith('1');
  });

  it('should not fetch when id is null', () => {
    const mockGetHistoryById = vi.mocked(queryApi.getHistoryById);

    const { result } = renderHook(() => useQueryById(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGetHistoryById).not.toHaveBeenCalled();
  });
});

describe('useDeleteQueryHistory', () => {
  it('should delete query from history successfully', async () => {
    const mockDeleteHistory = vi.mocked(queryApi.deleteHistory);
    mockDeleteHistory.mockResolvedValue({ success: true, message: 'Query deleted' });

    const { result } = renderHook(() => useDeleteQueryHistory(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true, message: 'Query deleted' });
    expect(mockDeleteHistory).toHaveBeenCalledWith('1');
  });

  it('should invalidate query history cache on success', async () => {
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

    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteQueryHistory(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockDeleteHistory = vi.mocked(queryApi.deleteHistory);
    mockDeleteHistory.mockResolvedValue({ success: true, message: 'Query deleted' });

    act(() => {
      result.current.mutate({ id: '1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queryHistory'] });
  });
});

describe('useClearConnectionHistory', () => {
  it('should clear connection history successfully', async () => {
    const mockClearConnectionHistory = vi.mocked(queryApi.clearConnectionHistory);
    mockClearConnectionHistory.mockResolvedValue({ success: true, message: 'History cleared' });

    const { result } = renderHook(() => useClearConnectionHistory(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ connectionId: 'conn1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true, message: 'History cleared' });
    expect(mockClearConnectionHistory).toHaveBeenCalledWith('conn1');
  });

  it('should invalidate specific connection history cache on success', async () => {
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

    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useClearConnectionHistory(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockClearConnectionHistory = vi.mocked(queryApi.clearConnectionHistory);
    mockClearConnectionHistory.mockResolvedValue({ success: true, message: 'History cleared' });

    act(() => {
      result.current.mutate({ connectionId: 'conn1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queryHistory', 'conn1'] });
  });
});

describe('useQueryStats', () => {
  it('should fetch query statistics successfully', async () => {
    const mockGetStats = vi.mocked(queryApi.getStats);
    mockGetStats.mockResolvedValue(mockQueryStatistics);

    const { result } = renderHook(() => useQueryStats('conn1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryStatistics);
    expect(mockGetStats).toHaveBeenCalledWith('conn1');
  });

  it('should not fetch when connectionId is null', () => {
    const mockGetStats = vi.mocked(queryApi.getStats);

    const { result } = renderHook(() => useQueryStats(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGetStats).not.toHaveBeenCalled();
  });
});

describe('useAllQueryStats', () => {
  it('should fetch all query statistics successfully', async () => {
    const mockGetAllStats = vi.mocked(queryApi.getAllStats);
    mockGetAllStats.mockResolvedValue(mockQueryStatistics);

    const { result } = renderHook(() => useAllQueryStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockQueryStatistics);
    expect(mockGetAllStats).toHaveBeenCalled();
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle network errors gracefully', async () => {
    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM users',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should handle large result sets', async () => {
    const largeResult = {
      success: true,
      result: {
        columns: Array.from({ length: 100 }, (_, i) => `col_${i}`),
        rows: Array.from({ length: 1000 }, (_, i) =>
          Object.fromEntries(Array.from({ length: 100 }, (_, j) => [`col_${j}`, `value_${i}_${j}`]))
        ),
        rowCount: 1000,
        executionTime: 5000,
      },
      stats: {
        executionTime: 5000,
        rowCount: 1000,
        bytesRead: 1024000,
        bytesWritten: 512000,
      },
    };

    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockResolvedValue(largeResult);

    const { result } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        connectionId: 'conn1',
        sql: 'SELECT * FROM large_table',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.result.rowCount).toBe(1000);
    expect(result.current.data?.result.columns).toHaveLength(100);
  });

  it('should handle concurrent query executions', async () => {
    const mockExecute = vi.mocked(queryApi.execute);
    mockExecute.mockImplementation(
      ({ connectionId, sql }: { connectionId: string; sql: string }) => {
        return new Promise(resolve =>
          setTimeout(
            () => resolve({ ...mockQueryResult, result: { ...mockQueryResult.result, rows: [{ id: sql.length }] } }),
            50
          )
        );
      }
    );

    const { result: result1 } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    const { result: result2 } = renderHook(() => useExecuteQuery(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result1.current.mutate({ connectionId: 'conn1', sql: 'SELECT 1' });
      result2.current.mutate({ connectionId: 'conn1', sql: 'SELECT 2' });
    });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(mockExecute).toHaveBeenCalledTimes(2);
  });
});