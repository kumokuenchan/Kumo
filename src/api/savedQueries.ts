import api from './index';

export interface SavedQueryEntry {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
  database?: string;
  folder?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  revisions?: Array<{ name?: string; sql: string; updatedAt: string }>;
}

export const savedQueriesApi = {
  list: async (connectionId: string, q?: string, limit: number = 200) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (limit) params.append('limit', String(limit));
    const res = await api.get<{ saved: SavedQueryEntry[] }>(`/query/${connectionId}/saved${params.toString() ? `?${params}` : ''}`);
    return res.saved;
  },
  create: async (connectionId: string, name: string, sql: string, database?: string, tags?: string[], folder?: string, overwrite?: boolean) => {
    return api.post<{ success: boolean; entry: SavedQueryEntry }>(`/query/${connectionId}/saved`, { name, sql, database, tags, folder, overwrite });
  },
  update: async (id: string, patch: Partial<Pick<SavedQueryEntry, 'name' | 'sql' | 'database' | 'tags' | 'folder'>>) => {
    return api.put<{ success: boolean; entry: SavedQueryEntry }>(`/query/saved/${id}`, patch);
  },
  remove: async (id: string) => {
    return api.delete<{ success: boolean }>(`/query/saved/${id}`);
  },
  exportList: async (connectionId: string) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');
    const url = `${API_BASE_URL}/query/${connectionId}/saved/export`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Export failed');
    return await res.blob();
  },
  importList: async (connectionId: string, items: Array<Partial<SavedQueryEntry> & { name: string; sql: string }>, overwrite: boolean) => {
    return api.post<{ success: boolean; imported: number; overwritten: number }>(`/query/${connectionId}/saved/import`, { items, overwrite });
  },
};
