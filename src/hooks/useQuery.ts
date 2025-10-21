import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  queryApi,
  QueryResult,
  QueryExecutionResult,
  PaginatedQueryResult,
  QueryHistoryEntry,
  QueryStatistics,
  QueryStats,
} from '../api/query';

/**
 * Hook to execute a single SQL query
 */
export function useExecuteQuery() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; result: QueryResult; stats: QueryStats },
    Error,
    { connectionId: string; sql: string; params?: any[] }
  >({
    mutationFn: async ({ connectionId, sql, params }) => {
      return queryApi.execute(connectionId, sql, params);
    },
    onSuccess: (_, variables) => {
      // Invalidate history to refresh
      queryClient.invalidateQueries({ queryKey: ['queryHistory', variables.connectionId] });
      queryClient.invalidateQueries({ queryKey: ['queryStats', variables.connectionId] });
    },
  });
}

/**
 * Hook to execute multiple SQL statements
 */
export function useExecuteMultipleQueries() {
  const queryClient = useQueryClient();

  return useMutation<
    QueryExecutionResult,
    Error,
    { connectionId: string; sql: string }
  >({
    mutationFn: async ({ connectionId, sql }) => {
      return queryApi.executeMultiple(connectionId, sql);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queryHistory', variables.connectionId] });
      queryClient.invalidateQueries({ queryKey: ['queryStats', variables.connectionId] });
    },
  });
}

/**
 * Hook to execute query with pagination
 */
export function useExecutePaginatedQuery() {
  return useMutation<
    { success: boolean; result: PaginatedQueryResult },
    Error,
    { connectionId: string; sql: string; page?: number; pageSize?: number }
  >({
    mutationFn: async ({ connectionId, sql, page, pageSize }) => {
      return queryApi.executePaginated(connectionId, sql, page, pageSize);
    },
  });
}

/**
 * Hook to cancel running query
 */
export function useCancelQuery() {
  return useMutation<
    { success: boolean; message: string },
    Error,
    { connectionId: string }
  >({
    mutationFn: async ({ connectionId }) => {
      return queryApi.cancel(connectionId);
    },
  });
}

/**
 * Hook to get query history for a connection
 */
export function useQueryHistory(
  connectionId: string | null,
  limit: number = 50,
  offset: number = 0
): UseQueryResult<QueryHistoryEntry[], Error> {
  return useQuery({
    queryKey: ['queryHistory', connectionId, limit, offset],
    queryFn: () => queryApi.getConnectionHistory(connectionId!, limit, offset),
    enabled: !!connectionId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get all query history
 */
export function useAllQueryHistory(limit: number = 100): UseQueryResult<QueryHistoryEntry[], Error> {
  return useQuery({
    queryKey: ['queryHistory', 'all', limit],
    queryFn: () => queryApi.getHistory(limit),
    staleTime: 30000,
  });
}

/**
 * Hook to search query history
 */
export function useSearchQueryHistory(
  searchQuery: string,
  connectionId?: string,
  limit: number = 50
): UseQueryResult<QueryHistoryEntry[], Error> {
  return useQuery({
    queryKey: ['queryHistory', 'search', searchQuery, connectionId, limit],
    queryFn: () => queryApi.searchHistory(searchQuery, connectionId, limit),
    enabled: searchQuery.length > 0,
    staleTime: 30000,
  });
}

/**
 * Hook to get specific query by ID
 */
export function useQueryById(id: string | null): UseQueryResult<QueryHistoryEntry, Error> {
  return useQuery({
    queryKey: ['queryHistory', 'byId', id],
    queryFn: () => queryApi.getHistoryById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to delete query from history
 */
export function useDeleteQueryHistory() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { id: string }
  >({
    mutationFn: async ({ id }) => {
      return queryApi.deleteHistory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
    },
  });
}

/**
 * Hook to clear connection history
 */
export function useClearConnectionHistory() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { connectionId: string }
  >({
    mutationFn: async ({ connectionId }) => {
      return queryApi.clearConnectionHistory(connectionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queryHistory', variables.connectionId] });
    },
  });
}

/**
 * Hook to get query statistics for a connection
 */
export function useQueryStats(
  connectionId: string | null
): UseQueryResult<QueryStatistics, Error> {
  return useQuery({
    queryKey: ['queryStats', connectionId],
    queryFn: () => queryApi.getStats(connectionId!),
    enabled: !!connectionId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get overall query statistics
 */
export function useAllQueryStats(): UseQueryResult<QueryStatistics, Error> {
  return useQuery({
    queryKey: ['queryStats', 'all'],
    queryFn: () => queryApi.getAllStats(),
    staleTime: 60000,
  });
}
