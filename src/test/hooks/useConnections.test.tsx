import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConnections,
  useConnection,
  useCreateConnection,
  useUpdateConnection,
  useDeleteConnection,
  useTestConnection,
  useConnectToDatabase,
  useDisconnectFromDatabase,
} from '../../hooks/useConnections';
import { connectionsApi } from '../../api/connections';
import { MySQLConnection, ConnectionTestResult } from '../../types/connection';

// Mock the API
vi.mock('../../api/connections');

// Mock data
const mockConnection: MySQLConnection = {
  id: '1',
  name: 'Test Connection',
  host: 'localhost',
  port: 3306,
  database: 'test_db',
  username: 'testuser',
  password: 'encrypted_password',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockConnections: MySQLConnection[] = [
  mockConnection,
  {
    ...mockConnection,
    id: '2',
    name: 'Test Connection 2',
  },
];

const mockTestResult: ConnectionTestResult = {
  success: true,
  message: 'Connection successful',
  responseTime: 100,
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

describe('useConnections', () => {
  it('should fetch all connections successfully', async () => {
    const mockGetAll = vi.mocked(connectionsApi.getAll);
    mockGetAll.mockResolvedValue({ connections: mockConnections });

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConnections);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    const mockGetAll = vi.mocked(connectionsApi.getAll);
    mockGetAll.mockRejectedValue(new Error('Failed to fetch connections'));

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to fetch connections'));
  });

  it('should handle loading state', async () => {
    const mockGetAll = vi.mocked(connectionsApi.getAll);
    mockGetAll.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ connections: mockConnections }), 100))
    );

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useConnection', () => {
  it('should fetch single connection by id', async () => {
    const mockGetById = vi.mocked(connectionsApi.getById);
    mockGetById.mockResolvedValue({ connection: mockConnection });

    const { result } = renderHook(() => useConnection('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConnection);
    expect(mockGetById).toHaveBeenCalledTimes(1);
  });

  it('should return null when id is null', async () => {
    const mockGetById = vi.mocked(connectionsApi.getById);

    const { result } = renderHook(() => useConnection(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('should not fetch when id is empty string', async () => {
    const mockGetById = vi.mocked(connectionsApi.getById);

    const { result } = renderHook(() => useConnection(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('should handle fetch error for single connection', async () => {
    const mockGetById = vi.mocked(connectionsApi.getById);
    mockGetById.mockRejectedValue(new Error('Connection not found'));

    const { result } = renderHook(() => useConnection('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCreateConnection', () => {
  it('should create connection successfully', async () => {
    const mockCreate = vi.mocked(connectionsApi.create);
    mockCreate.mockResolvedValue({ connection: mockConnection });

    const { result } = renderHook(() => useCreateConnection(), {
      wrapper: createWrapper(),
    });

    const connectionData = {
      name: 'New Connection',
      host: 'localhost',
      port: 3306,
      database: 'new_db',
      username: 'newuser',
      password: 'newpassword',
    };

    act(() => {
      result.current.mutate(connectionData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ connection: mockConnection });
    expect(mockCreate).toHaveBeenCalledWith(connectionData);
  });

  it('should handle create error', async () => {
    const mockCreate = vi.mocked(connectionsApi.create);
    mockCreate.mockRejectedValue(new Error('Failed to create connection'));

    const { result } = renderHook(() => useCreateConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: 'New Connection',
        host: 'localhost',
        port: 3306,
        database: 'new_db',
        username: 'newuser',
        password: 'newpassword',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Failed to create connection'));
  });

  it('should invalidate connections cache on success', async () => {
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
    const { result } = renderHook(() => useCreateConnection(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockCreate = vi.mocked(connectionsApi.create);
    mockCreate.mockResolvedValue({ connection: mockConnection });

    act(() => {
      result.current.mutate({
        name: 'New Connection',
        host: 'localhost',
        port: 3306,
        database: 'new_db',
        username: 'newuser',
        password: 'newpassword',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['connections'] });
  });
});

describe('useUpdateConnection', () => {
  it('should update connection successfully', async () => {
    const mockUpdate = vi.mocked(connectionsApi.update);
    mockUpdate.mockResolvedValue({ connection: mockConnection });

    const { result } = renderHook(() => useUpdateConnection(), {
      wrapper: createWrapper(),
    });

    const updateData = { name: 'Updated Connection', port: 3307 };

    act(() => {
      result.current.mutate({ id: '1', data: updateData });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ connection: mockConnection });
    expect(mockUpdate).toHaveBeenCalledWith('1', updateData);
  });

  it('should handle update error', async () => {
    const mockUpdate = vi.mocked(connectionsApi.update);
    mockUpdate.mockRejectedValue(new Error('Failed to update connection'));

    const { result } = renderHook(() => useUpdateConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: '1',
        data: { name: 'Updated Connection' },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDeleteConnection', () => {
  it('should delete connection successfully', async () => {
    const mockDelete = vi.mocked(connectionsApi.delete);
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith('1');
  });

  it('should handle delete error', async () => {
    const mockDelete = vi.mocked(connectionsApi.delete);
    mockDelete.mockRejectedValue(new Error('Failed to delete connection'));

    const { result } = renderHook(() => useDeleteConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useTestConnection', () => {
  it('should test existing connection successfully', async () => {
    const mockTest = vi.mocked(connectionsApi.test);
    mockTest.mockResolvedValue(mockTestResult);

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', password: 'testpassword' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTestResult);
    expect(mockTest).toHaveBeenCalledWith('1', 'testpassword');
  });

  it('should test new connection successfully', async () => {
    const mockTestNew = vi.mocked(connectionsApi.testNew);
    mockTestNew.mockResolvedValue(mockTestResult);

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    const connectionData = {
      name: 'New Connection',
      host: 'localhost',
      port: 3306,
      database: 'new_db',
      username: 'newuser',
      password: 'newpassword',
    };

    act(() => {
      result.current.mutate(connectionData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTestResult);
    expect(mockTestNew).toHaveBeenCalledWith(connectionData);
  });

  it('should handle test connection error', async () => {
    const mockTest = vi.mocked(connectionsApi.test);
    mockTest.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useTestConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', password: 'testpassword' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Connection failed'));
  });
});

describe('useConnectToDatabase', () => {
  it('should connect to database successfully', async () => {
    const mockConnect = vi.mocked(connectionsApi.connect);
    mockConnect.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConnectToDatabase(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', password: 'testpassword' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true });
    expect(mockConnect).toHaveBeenCalledWith('1', 'testpassword');
  });

  it('should handle connect error', async () => {
    const mockConnect = vi.mocked(connectionsApi.connect);
    mockConnect.mockRejectedValue(new Error('Failed to connect'));

    const { result } = renderHook(() => useConnectToDatabase(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ id: '1', password: 'testpassword' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should invalidate connections cache on success', async () => {
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
    const { result } = renderHook(() => useConnectToDatabase(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockConnect = vi.mocked(connectionsApi.connect);
    mockConnect.mockResolvedValue({ success: true });

    act(() => {
      result.current.mutate({ id: '1', password: 'testpassword' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['connections'] });
  });
});

describe('useDisconnectFromDatabase', () => {
  it('should disconnect from database successfully', async () => {
    const mockDisconnect = vi.mocked(connectionsApi.disconnect);
    mockDisconnect.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDisconnectFromDatabase(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true });
    expect(mockDisconnect).toHaveBeenCalledWith('1');
  });

  it('should handle disconnect error', async () => {
    const mockDisconnect = vi.mocked(connectionsApi.disconnect);
    mockDisconnect.mockRejectedValue(new Error('Failed to disconnect'));

    const { result } = renderHook(() => useDisconnectFromDatabase(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should invalidate connections cache on success', async () => {
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
    const { result } = renderHook(() => useDisconnectFromDatabase(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const mockDisconnect = vi.mocked(connectionsApi.disconnect);
    mockDisconnect.mockResolvedValue({ success: true });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['connections'] });
  });
});

describe('Error Boundary and Edge Cases', () => {
  it('should handle network errors gracefully', async () => {
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

  it('should handle timeout errors', async () => {
    const mockGetAll = vi.mocked(connectionsApi.getAll);
    mockGetAll.mockRejectedValue(new Error('Request timeout'));

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle concurrent operations', async () => {
    const mockCreate = vi.mocked(connectionsApi.create);
    const mockUpdate = vi.mocked(connectionsApi.update);
    
    mockCreate.mockResolvedValue({ connection: mockConnection });
    mockUpdate.mockResolvedValue({ connection: mockConnection });

    const { result: createResult } = renderHook(() => useCreateConnection(), {
      wrapper: createWrapper(),
    });

    const { result: updateResult } = renderHook(() => useUpdateConnection(), {
      wrapper: createWrapper(),
    });

    act(() => {
      createResult.current.mutate({
        name: 'New Connection',
        host: 'localhost',
        port: 3306,
        database: 'new_db',
        username: 'newuser',
        password: 'newpassword',
      });
      updateResult.current.mutate({
        id: '1',
        data: { name: 'Updated Connection' },
      });
    });

    await waitFor(() => {
      expect(createResult.current.isSuccess).toBe(true);
      expect(updateResult.current.isSuccess).toBe(true);
    });
  });
});