import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceApi } from '../api/performance';

/**
 * Hook to fetch database metrics
 */
export function useDatabaseMetrics(connectionId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['performance', 'metrics', connectionId],
    queryFn: () => performanceApi.getMetrics(connectionId!),
    enabled: !!connectionId,
    refetchInterval: refetchInterval || false,
  });
}

/**
 * Hook to fetch active connections
 */
export function useActiveConnections(connectionId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ['performance', 'connections', connectionId],
    queryFn: () => performanceApi.getActiveConnections(connectionId!),
    enabled: !!connectionId,
    refetchInterval: refetchInterval || false,
  });
}

/**
 * Hook to kill a query
 */
export function useKillQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId, processId }: { connectionId: string; processId: number }) =>
      performanceApi.killQuery(connectionId, processId),
    onSuccess: (_, variables) => {
      // Refresh the connections list after killing a query
      queryClient.invalidateQueries({
        queryKey: ['performance', 'connections', variables.connectionId],
      });
    },
  });
}

/**
 * Hook to fetch slow queries
 */
export function useSlowQueries(connectionId: string | null, limit: number = 100) {
  return useQuery({
    queryKey: ['performance', 'slow-queries', connectionId, limit],
    queryFn: () => performanceApi.getSlowQueries(connectionId!, limit),
    enabled: !!connectionId,
  });
}

/**
 * Hook to fetch index usage stats
 */
export function useIndexUsageStats(connectionId: string | null, database?: string) {
  return useQuery({
    queryKey: ['performance', 'index-usage', connectionId, database],
    queryFn: () => performanceApi.getIndexUsageStats(connectionId!, database),
    enabled: !!connectionId,
  });
}

/**
 * Hook to fetch query stats
 */
export function useQueryStats(connectionId: string | null, limit: number = 50) {
  return useQuery({
    queryKey: ['performance', 'query-stats', connectionId, limit],
    queryFn: () => performanceApi.getQueryStats(connectionId!, limit),
    enabled: !!connectionId,
  });
}

/**
 * Hook to fetch table stats
 */
export function useTableStats(connectionId: string | null, database: string | null) {
  return useQuery({
    queryKey: ['performance', 'table-stats', connectionId, database],
    queryFn: () => performanceApi.getTableStats(connectionId!, database!),
    enabled: !!connectionId && !!database,
  });
}
