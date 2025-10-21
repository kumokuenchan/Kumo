import api from './index';

// Type definitions matching backend
export interface Database {
  name: string;
  charset: string;
  collation: string;
}

export interface Table {
  name: string;
  type: 'TABLE' | 'VIEW';
  engine?: string;
  rows?: number;
  dataLength?: number;
  indexLength?: number;
  autoIncrement?: number;
  collation?: string;
  comment?: string;
  createTime?: Date;
  updateTime?: Date;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  extra: string;
  comment: string;
  characterSet?: string;
  collation?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
  comment?: string;
}

export interface ForeignKey {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface Trigger {
  name: string;
  event: string;
  table: string;
  timing: string;
  statement: string;
}

export interface Routine {
  name: string;
  type: 'PROCEDURE' | 'FUNCTION';
  returnType?: string;
  comment?: string;
}

export interface TableStats {
  rowCount: number;
  dataSize: number;
  indexSize: number;
  dataFree: number;
  autoIncrement: number | null;
  createTime: Date | null;
  updateTime: Date | null;
  checkTime: Date | null;
  collation: string;
  engine: string;
  comment: string;
}

export interface CompleteTableSchema {
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  stats: TableStats;
}

// API functions
export const schemaApi = {
  /**
   * Get list of all databases for a connection
   */
  getDatabases: async (connectionId: string) => {
    const response = await api.get<{ databases: Database[] }>(
      `/schema/${connectionId}/databases`
    );
    return response.databases;
  },

  /**
   * Get list of tables in a database
   */
  getTables: async (connectionId: string, database: string) => {
    const response = await api.get<{ tables: Table[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables`
    );
    return response.tables;
  },

  /**
   * Get columns for a specific table
   */
  getColumns: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ columns: Column[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns`
    );
    return response.columns;
  },

  /**
   * Get indexes for a specific table
   */
  getIndexes: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ indexes: Index[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes`
    );
    return response.indexes;
  },

  /**
   * Get foreign keys for a specific table
   */
  getForeignKeys: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ foreignKeys: ForeignKey[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys`
    );
    return response.foreignKeys;
  },

  /**
   * Get triggers for a database or table
   */
  getTriggers: async (connectionId: string, database: string, table?: string) => {
    const url = `/schema/${connectionId}/databases/${encodeURIComponent(database)}/triggers`;
    const params = table ? `?table=${encodeURIComponent(table)}` : '';
    const response = await api.get<{ triggers: Trigger[] }>(`${url}${params}`);
    return response.triggers;
  },

  /**
   * Get stored procedures and functions
   */
  getRoutines: async (connectionId: string, database: string) => {
    const response = await api.get<{ routines: Routine[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/routines`
    );
    return response.routines;
  },

  /**
   * Get views in a database
   */
  getViews: async (connectionId: string, database: string) => {
    const response = await api.get<{ views: Table[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/views`
    );
    return response.views;
  },

  /**
   * Get table statistics
   */
  getTableStats: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ stats: TableStats }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/stats`
    );
    return response.stats;
  },

  /**
   * Get CREATE TABLE statement
   */
  getCreateTable: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ createStatement: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/create-statement`
    );
    return response.createStatement;
  },

  /**
   * Get complete table schema (columns, indexes, foreign keys, stats)
   */
  getCompleteTableSchema: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<CompleteTableSchema>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/schema`
    );
    return response;
  },
};
