import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections';
import { MySQLConnection, ConnectionTestResult } from '../types/connection';

const CONNECTIONS_KEY = ['connections'];

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: async () => {
      const response = await connectionsApi.getAll();
      return response.connections;
    },
  });
}

export function useConnection(id: string | null) {
  return useQuery({
    queryKey: [...CONNECTIONS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await connectionsApi.getById(id);
      return response.connection;
    },
    enabled: !!id,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<MySQLConnection, 'id' | 'createdAt'>) =>
      connectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MySQLConnection> }) =>
      connectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => connectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}

export function useTestConnection() {
  return useMutation<
    ConnectionTestResult,
    Error,
    { id: string; password?: string } | Omit<MySQLConnection, 'id' | 'createdAt'>
  >({
    mutationFn: async (params) => {
      if ('id' in params) {
        return connectionsApi.test(params.id, params.password);
      } else {
        return connectionsApi.testNew(params);
      }
    },
  });
}

export function useConnectToDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) =>
      connectionsApi.connect(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}

export function useDisconnectFromDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => connectionsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}
