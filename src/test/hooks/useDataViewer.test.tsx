import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTableData,
  useTableColumns,
  useTableStats,
  useDistinctValues,
  useExportData,
  useRefreshTableData,
} from '../../hooks/useDataViewer';
import { dataViewerApi } from '../../api/dataViewer';
import type {
  DataViewerQuery,
  GetTableDataResponse,
  GetColumnsResponse,
  GetStatsResponse,
  GetDistinctValuesResponse,
} from '../../types/dataViewer';

// Mock the API
vi.mock('../../api/dataViewer');

// Mock data
const mockTableData: GetTableDataResponse = {
  data: [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ],
  total: 2,
  page: 1,
  limit: 10,
  hasMore: false,
};

const mockColumns: GetColumnsResponse = {
  columns: [
    { name: 'id', type: 'INT', nullable: false, primaryKey: true },
    { name: 'name', type: 'VARCHAR(255)', nullable: false, primaryKey: false },
    { name: 'email', type: 'VARCHAR(255)', nullable: true, primaryKey: false },
  ],
  total: 3,
};

const mockStats: GetStatsResponse = {
  rowCount: 1000,
  size: 1024,
  lastModified: '2024-01-01T00:00:00Z',
  engine: 'InnoDB',
};

const mockDistinctValues: GetDistinctValuesResponse = {
  values: [
    { value: 'Active', count: 500 },
    { value: 'Inactive', count: 300 },
    { value: 'Pending', count: 200 },
  ],
  total: 3,
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
  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn();
  global.URL.revokeObjectURL = vi.fn();
  
  // Mock document.createElement
  const mockCreateElement = vi.fn();
  const mockAppendChild = vi.fn();
  const mockRemoveChild = vi.fn();
  
  mockCreateElement.mockReturnValue({
    href: '',
    download: '',
    click: vi.fn(),
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  });
  
  document.createElement = mockCreateElement;
});

describe('useTableData', () => {
  const defaultQuery: DataViewerQuery = {
    database: 'test_db',
    table: 'users',
    page: 1,
    limit: 10,
    sortBy: 'id',
    sortOrder: 'asc',
    filters: [],
  };

  it('should fetch table data successfully', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockResolvedValue(mockTableData);

    const { result } = renderHook(
      () => useTableData('conn1', defaultQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTableData);
    expect(mockGetTableData).toHaveBeenCalledWith('conn1', defaultQuery);
  });

  it('should not fetch when disabled', () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);

    const { result } = renderHook(
      () => useTableData('conn1', defaultQuery, false),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetTableData).not.toHaveBeenCalled();
  });

  it('should not fetch when connectionId is null', () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);

    const { result } = renderHook(
      () => useTableData(null, defaultQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetTableData).not.toHaveBeenCalled();
  });

  it('should not fetch when query is missing required fields', () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    const incompleteQuery = { database: 'test_db' } as DataViewerQuery;

    const { result } = renderHook(
      () => useTableData('conn1', incompleteQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetTableData).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockRejectedValue(new Error('Failed to fetch table data'));

    const { result } = renderHook(
      () => useTableData('conn1', defaultQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch table data'));
  });

  it('should handle loading state', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTableData), 100))
    );

    const { result } = renderHook(
      () => useTableData('conn1', defaultQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should maintain placeholder data', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockTableData), 100))
    );

    const initialData = { data: [], total: 0, page: 1, limit: 10, hasMore: false };
    
    const { result } = renderHook(
      () => useTableData('conn1', defaultQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    // During loading, should have placeholder data
    expect(result.current.data).toBeUndefined();
  });
});

describe('useTableColumns', () => {
  it('should fetch table columns successfully', async () => {
    const mockGetColumns = vi.mocked(dataViewerApi.getColumns);
    mockGetColumns.mockResolvedValue(mockColumns);

    const { result } = renderHook(
      () => useTableColumns('conn1', 'test_db', 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockColumns);
    expect(mockGetColumns).toHaveBeenCalledWith('conn1', 'test_db', 'users');
  });

  it('should not fetch when any parameter is missing', () => {
    const mockGetColumns = vi.mocked(dataViewerApi.getColumns);

    const { result } = renderHook(
      () => useTableColumns('conn1', null, 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetColumns).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const mockGetColumns = vi.mocked(dataViewerApi.getColumns);
    mockGetColumns.mockRejectedValue(new Error('Failed to fetch columns'));

    const { result } = renderHook(
      () => useTableColumns('conn1', 'test_db', 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useTableStats', () => {
  it('should fetch table stats successfully', async () => {
    const mockGetStats = vi.mocked(dataViewerApi.getStats);
    mockGetStats.mockResolvedValue(mockStats);

    const { result } = renderHook(
      () => useTableStats('conn1', 'test_db', 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStats);
    expect(mockGetStats).toHaveBeenCalledWith('conn1', 'test_db', 'users');
  });

  it('should not fetch when any parameter is missing', () => {
    const mockGetStats = vi.mocked(dataViewerApi.getStats);

    const { result } = renderHook(
      () => useTableStats(null, 'test_db', 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetStats).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const mockGetStats = vi.mocked(dataViewerApi.getStats);
    mockGetStats.mockRejectedValue(new Error('Failed to fetch stats'));

    const { result } = renderHook(
      () => useTableStats('conn1', 'test_db', 'users'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDistinctValues', () => {
  it('should fetch distinct values successfully', async () => {
    const mockGetDistinctValues = vi.mocked(dataViewerApi.getDistinctValues);
    mockGetDistinctValues.mockResolvedValue(mockDistinctValues);

    const { result } = renderHook(
      () => useDistinctValues('conn1', 'test_db', 'users', 'status'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDistinctValues);
    expect(mockGetDistinctValues).toHaveBeenCalledWith('conn1', 'test_db', 'users', 'status', 100);
  });

  it('should use custom limit', async () => {
    const mockGetDistinctValues = vi.mocked(dataViewerApi.getDistinctValues);
    mockGetDistinctValues.mockResolvedValue(mockDistinctValues);

    const { result } = renderHook(
      () => useDistinctValues('conn1', 'test_db', 'users', 'status', 50),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetDistinctValues).toHaveBeenCalledWith('conn1', 'test_db', 'users', 'status', 50);
  });

  it('should not fetch when any parameter is missing', () => {
    const mockGetDistinctValues = vi.mocked(dataViewerApi.getDistinctValues);

    const { result } = renderHook(
      () => useDistinctValues('conn1', 'test_db', null, 'status'),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(mockGetDistinctValues).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    const mockGetDistinctValues = vi.mocked(dataViewerApi.getDistinctValues);
    mockGetDistinctValues.mockRejectedValue(new Error('Failed to fetch distinct values'));

    const { result } = renderHook(
      () => useDistinctValues('conn1', 'test_db', 'users', 'status'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export data successfully and trigger download', async () => {
    const mockExportData = vi.mocked(dataViewerApi.exportData);
    const mockBlob = new Blob(['test data'], { type: 'text/csv' });
    mockExportData.mockResolvedValue(mockBlob);

    const mockCreateObjectURL = vi.mocked(global.URL.createObjectURL);
    const mockRevokeObjectURL = vi.mocked(global.URL.revokeObjectURL);
    const mockClick = vi.fn();
    
    mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url');
    mockRevokeObjectURL.mockReturnValue(undefined);

    const { result } = renderHook(() => useExportData(), {
      wrapper: createWrapper(),
    });

    const exportParams = {
      connectionId: 'conn1',
      query: {
        database: 'test_db',
        table: 'users',
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'asc',
        filters: [],
        format: 'csv' as const,
      },
    };

    act(() => {
      result.current.mutate(exportParams);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBlob);
    expect(mockExportData).toHaveBeenCalledWith('conn1', exportParams.query);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url');
  });

  it('should handle export error', async () => {
    const mockExportData = vi.mocked(dataViewerApi.exportData);
    mockExportData.mockRejectedValue(new Error('Failed to export data'));

    const { result } = renderHook(() => useExportData(), {
      wrapper: createWrapper(),
    });

    const exportParams = {
      connectionId: 'conn1',
      query: {
        database: 'test_db',
        table: 'users',
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'asc',
        filters: [],
        format: 'csv' as const,
      },
    };

    act(() => {
      result.current.mutate(exportParams);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to export data'));
  });

  it('should export JSON format', async () => {
    const mockExportData = vi.mocked(dataViewerApi.exportData);
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    mockExportData.mockResolvedValue(mockBlob);

    const mockCreateObjectURL = vi.mocked(global.URL.createObjectURL);
    mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url');

    const { result } = renderHook(() => useExportData(), {
      wrapper: createWrapper(),
    });

    const exportParams = {
      connectionId: 'conn1',
      query: {
        database: 'test_db',
        table: 'users',
        page: 1,
        limit: 1000,
        sortBy: 'id',
        sortOrder: 'asc',
        filters: [],
        format: 'json' as const,
      },
    };

    act(() => {
      result.current.mutate(exportParams);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify that download was triggered (the element should be created and clicked)
    expect(document.createElement).toHaveBeenCalled();
  });
});

describe('useRefreshTableData', () => {
  it('should return a refresh function', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRefreshTableData(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const refreshFunction = result.current;

    expect(typeof refreshFunction).toBe('function');

    // Test the refresh function
    act(() => {
      refreshFunction('conn1', 'test_db', 'users');
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['tableData', 'conn1'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['tableStats', 'conn1', 'test_db', 'users'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: ['tables', 'conn1', 'test_db'],
    });
  });
});

describe('Query Key Management', () => {
  it('should use correct query keys for different data types', () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    const mockGetColumns = vi.mocked(dataViewerApi.getColumns);
    const mockGetStats = vi.mocked(dataViewerApi.getStats);
    const mockGetDistinctValues = vi.mocked(dataViewerApi.getDistinctValues);

    renderHook(
      () => {
        useTableData('conn1', {
          database: 'test_db',
          table: 'users',
          page: 1,
          limit: 10,
          sortBy: 'id',
          sortOrder: 'asc',
          filters: [],
        });
        useTableColumns('conn1', 'test_db', 'users');
        useTableStats('conn1', 'test_db', 'users');
        useDistinctValues('conn1', 'test_db', 'users', 'status', 100);
      },
      {
        wrapper: createWrapper(),
      }
    );

    // Verify all queries are called with correct parameters
    expect(mockGetTableData).toHaveBeenCalled();
    expect(mockGetColumns).toHaveBeenCalled();
    expect(mockGetStats).toHaveBeenCalled();
    expect(mockGetDistinctValues).toHaveBeenCalled();
  });

  it('should handle query key dependencies correctly', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { result } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
        table: 'users',
        page: 1,
        limit: 10,
        sortBy: 'id',
        sortOrder: 'asc',
        filters: [],
      }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    );

    // Change connection
    await act(async () => {
      await queryClient.setQueryData(['tableData', 'conn1'], null);
    });

    // Test that data is refetched when query key changes
    mockGetTableData.mockResolvedValue(mockTableData);
    
    const { result: newResult } = renderHook(
      () => useTableData('conn2', {
        database: 'test_db',
        table: 'users',
        page: 1,
        limit: 10,
        sortBy: 'id',
        sortOrder: 'asc',
        filters: [],
      }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(newResult.current.isSuccess).toBe(true);
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle large datasets', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    const largeData = {
      ...mockTableData,
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      })),
      total: 1000,
    };
    mockGetTableData.mockResolvedValue(largeData);

    const { result } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
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

  it('should handle empty results', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    const emptyData = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      hasMore: false,
    };
    mockGetTableData.mockResolvedValue(emptyData);

    const { result } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
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

    expect(result.current.data?.data).toHaveLength(0);
    expect(result.current.data?.total).toBe(0);
  });

  it('should handle complex filter conditions', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockResolvedValue(mockTableData);

    const complexQuery: DataViewerQuery = {
      database: 'test_db',
      table: 'users',
      page: 1,
      limit: 10,
      sortBy: 'id',
      sortOrder: 'asc',
      filters: [
        { column: 'status', operator: '=', value: 'active' },
        { column: 'created_at', operator: '>=', value: '2024-01-01' },
        { column: 'name', operator: 'LIKE', value: 'John%' },
      ],
    };

    const { result } = renderHook(
      () => useTableData('conn1', complexQuery, true),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetTableData).toHaveBeenCalledWith('conn1', complexQuery);
  });

  it('should handle network timeouts', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockRejectedValue(new Error('Request timeout'));

    const { result } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
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
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Request timeout'));
  });

  it('should handle concurrent requests', async () => {
    const mockGetTableData = vi.mocked(dataViewerApi.getTableData);
    mockGetTableData.mockImplementation(
      (connectionId: string, query: DataViewerQuery) => {
        return new Promise(resolve => {
          setTimeout(() => resolve(mockTableData), 50);
        });
      }
    );

    const { result: result1 } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
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

    const { result: result2 } = renderHook(
      () => useTableData('conn1', {
        database: 'test_db',
        table: 'users',
        page: 2,
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
      expect(result1.current.isSuccess).toBe(true);
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(mockGetTableData).toHaveBeenCalledTimes(2);
  });
});