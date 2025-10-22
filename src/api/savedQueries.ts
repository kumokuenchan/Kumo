import api from './index';

export interface SavedQueryEntry {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
  database?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const savedQueriesApi = {
  list: async (connectionId: string, q?: string, limit: number = 200) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (limit) params.append('limit', String(limit));
    const res = await api.get<{ saved: SavedQueryEntry[] }>(`/query/${connectionId}/saved${params.toString() ? `?${params}` : ''}`);
    return res.saved;
  },
  create: async (connectionId: string, name: string, sql: string, database?: string) => {
    return api.post<{ success: boolean; entry: SavedQueryEntry }>(`/query/${connectionId}/saved`, { name, sql, database });
  },
  update: async (id: string, patch: Partial<Pick<SavedQueryEntry, 'name' | 'sql' | 'database' | 'tags'>>) => {
    return api.put<{ success: boolean; entry: SavedQueryEntry }>(`/query/saved/${id}`, patch);
  },
  remove: async (id: string) => {
    return api.delete<{ success: boolean }>(`/query/saved/${id}`);
  },
};

