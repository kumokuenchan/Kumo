import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '../api/connections';

export function useConnectionStatus(connectionId: string | null) {
  return useQuery({
    queryKey: ['connectionStats', connectionId],
    enabled: !!connectionId,
    retry: false,
    queryFn: async () => {
      if (!connectionId) return { isConnected: false, stats: null as any };
      try {
        const res = await connectionsApi.getStats(connectionId);
        // Check if stats exists and is not null
        return { isConnected: !!res.stats, stats: res.stats };
      } catch (_err) {
        return { isConnected: false, stats: null as any };
      }
    },
    staleTime: 5_000,
  });
}

