import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { savedQueriesApi, SavedQueryEntry } from '../api/savedQueries';

export function useSavedQueries(connectionId: string | null, search?: string): UseQueryResult<SavedQueryEntry[], Error> {
  return useQuery({
    queryKey: ['savedQueries', connectionId, search || ''],
    queryFn: () => savedQueriesApi.list(connectionId!, search),
    enabled: !!connectionId,
    staleTime: 60000,
  });
}

export function useCreateSavedQuery() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean; entry: SavedQueryEntry },
    Error,
    { connectionId: string; name: string; sql: string; database?: string }
  >({
    mutationFn: ({ connectionId, name, sql, database }) => savedQueriesApi.create(connectionId, name, sql, database),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['savedQueries', vars.connectionId] });
    },
  });
}

export function useUpdateSavedQuery() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean; entry: SavedQueryEntry },
    Error,
    { id: string; patch: Partial<Pick<SavedQueryEntry, 'name' | 'sql' | 'database' | 'tags'>>; connectionId: string }
  >({
    mutationFn: ({ id, patch }) => savedQueriesApi.update(id, patch),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['savedQueries', vars.connectionId] });
    },
  });
}

export function useDeleteSavedQuery() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { id: string; connectionId: string }
  >({
    mutationFn: ({ id }) => savedQueriesApi.remove(id),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['savedQueries', vars.connectionId] });
    },
  });
}

