import api from './index';

export const dataEditingApi = {
  updateRow: async (
    connectionId: string,
    database: string,
    table: string,
    key: Record<string, any>,
    changes: Record<string, any>
  ) => {
    return api.post<{ success: boolean; row: any; affectedRows: number }>(
      `/data-editing/${connectionId}/update-row`,
      { database, table, key, changes }
    );
  },

  insertRow: async (
    connectionId: string,
    database: string,
    table: string,
    values: Record<string, any>
  ) => {
    return api.post<{ success: boolean; row: any; insertId?: number }>(
      `/data-editing/${connectionId}/insert-row`,
      { database, table, values }
    );
  },

  deleteRow: async (
    connectionId: string,
    database: string,
    table: string,
    key: Record<string, any>
  ) => {
    return api.post<{ success: boolean; affectedRows: number }>(
      `/data-editing/${connectionId}/delete-row`,
      { database, table, key }
    );
  },

  batchUpdate: async (
    connectionId: string,
    database: string,
    table: string,
    updates: Array<{ key: Record<string, any>; changes: Record<string, any> }>,
    atomic: boolean = false
  ) => {
    return api.post<{ success: boolean; results: any[]; totalUpdated: number }>(
      `/data-editing/${connectionId}/batch-update`,
      { database, table, updates, atomic }
    );
  },

  fkLookup: async (
    connectionId: string,
    database: string,
    table: string,
    column: string,
    q?: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    const params = new URLSearchParams({ database, table, column, limit: String(limit), offset: String(offset) });
    if (q) params.append('q', q);
    return api.get<{ success: boolean; options: Array<{ value: any; label: string }>; total: number; meta: any }>(
      `/data-editing/${connectionId}/fk-lookup?${params.toString()}`
    );
  },
};

