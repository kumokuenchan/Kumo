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

// ER Diagram Types
export interface ERDiagramColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  nullable: boolean;
}

export interface ERDiagramTable {
  name: string;
  columns: ERDiagramColumn[];
}

export interface ERDiagramRelationship {
  id: string;
  name: string;
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface ERDiagramData {
  tables: ERDiagramTable[];
  relationships: ERDiagramRelationship[];
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

  /**
   * Create a new table
   */
  createTable: async (
    connectionId: string,
    database: string,
    tableDefinition: {
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        defaultValue?: string | null;
        autoIncrement?: boolean;
        unsigned?: boolean;
        comment?: string;
      }>;
      primaryKey?: string[];
      indexes?: Array<{
        name: string;
        columns: string[];
        unique: boolean;
        type?: string;
      }>;
      foreignKeys?: Array<{
        name: string;
        columns: string[];
        referencedTable: string;
        referencedColumns: string[];
        onDelete?: string;
        onUpdate?: string;
      }>;
      engine?: string;
      charset?: string;
      collation?: string;
      comment?: string;
    }
  ) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables`,
      tableDefinition
    );
    return response;
  },

  /**
   * Add a column to an existing table
   */
  addColumn: async (
    connectionId: string,
    database: string,
    table: string,
    columnDefinition: {
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: string | null;
      autoIncrement?: boolean;
      unsigned?: boolean;
      comment?: string;
      after?: string;
    }
  ) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns`,
      columnDefinition
    );
    return response;
  },

  /**
   * Modify an existing column
   */
  modifyColumn: async (
    connectionId: string,
    database: string,
    table: string,
    oldColumnName: string,
    columnDefinition: {
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: string | null;
      autoIncrement?: boolean;
      unsigned?: boolean;
      comment?: string;
    }
  ) => {
    const response = await api.put<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(oldColumnName)}`,
      columnDefinition
    );
    return response;
  },

  /**
   * Drop a column from a table
   */
  dropColumn: async (
    connectionId: string,
    database: string,
    table: string,
    columnName: string
  ) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(columnName)}`
    );
    return response;
  },

  /**
   * Create an index on a table
   */
  createIndex: async (
    connectionId: string,
    database: string,
    table: string,
    indexDefinition: {
      name: string;
      columns: string[];
      unique: boolean;
      type?: string;
    }
  ) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes`,
      indexDefinition
    );
    return response;
  },

  /**
   * Drop an index from a table
   */
  dropIndex: async (
    connectionId: string,
    database: string,
    table: string,
    indexName: string
  ) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes/${encodeURIComponent(indexName)}`
    );
    return response;
  },

  /**
   * Add a foreign key constraint
   */
  addForeignKey: async (
    connectionId: string,
    database: string,
    table: string,
    foreignKeyDefinition: {
      name: string;
      columns: string[];
      referencedTable: string;
      referencedColumns: string[];
      onDelete?: string;
      onUpdate?: string;
    }
  ) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys`,
      foreignKeyDefinition
    );
    return response;
  },

  /**
   * Drop a foreign key constraint
   */
  dropForeignKey: async (
    connectionId: string,
    database: string,
    table: string,
    foreignKeyName: string
  ) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys/${encodeURIComponent(foreignKeyName)}`
    );
    return response;
  },

  /**
   * Drop a table
   */
  dropTable: async (
    connectionId: string,
    database: string,
    table: string,
    checkDependencies: boolean = true
  ) => {
    const response = await api.delete<{
      success: boolean;
      dependencies?: string[];
      error?: string;
    }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}?checkDependencies=${checkDependencies}`
    );
    return response;
  },

  /**
   * Rename a table
   */
  renameTable: async (
    connectionId: string,
    database: string,
    table: string,
    newName: string
  ) => {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/rename`,
      { newName }
    );
    return response;
  },

  /**
   * Empty a table (DELETE FROM)
   */
  emptyTable: async (connectionId: string, database: string, table: string) => {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/data`
    );
    return response;
  },

  /**
   * Truncate a table
   */
  truncateTable: async (connectionId: string, database: string, table: string) => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/truncate`
    );
    return response;
  },

  /**
   * Get table dependencies
   */
  getTableDependencies: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ dependencies: string[] }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/dependencies`
    );
    return response.dependencies;
  },

  /**
   * Export table schema
   */
  exportTableSchema: async (connectionId: string, database: string, table: string) => {
    const response = await api.get<{ schema: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/export`
    );
    return response.schema;
  },

  /**
   * Export database schema
   */
  exportDatabaseSchema: async (
    connectionId: string,
    database: string,
    includeData: boolean = false
  ) => {
    const response = await api.get<{ schema: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/export?includeData=${includeData}`
    );
    return response.schema;
  },

  /**
   * Modify table properties
   */
  modifyTableProperties: async (
    connectionId: string,
    database: string,
    table: string,
    properties: {
      engine?: string;
      charset?: string;
      collation?: string;
      comment?: string;
    }
  ) => {
    const response = await api.put<{ success: boolean; message: string }>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/properties`,
      properties
    );
    return response;
  },

  /**
   * Generate DDL preview for table design
   */
  previewDDL: async (
    connectionId: string,
    design: TableDesign,
    isNewTable: boolean,
    originalStructure?: any
  ) => {
    const response = await api.post<{ success: boolean; sql: string }>(
      `/schema/${connectionId}/preview-ddl`,
      { design, isNewTable, originalStructure }
    );
    return response.sql;
  },

  /**
   * Get available storage engines
   */
  getStorageEngines: async (connectionId: string) => {
    const response = await api.get<{ engines: any[] }>(`/schema/${connectionId}/engines`);
    return response.engines;
  },

  /**
   * Get available character sets
   */
  getCharsets: async (connectionId: string) => {
    const response = await api.get<{ charsets: any[] }>(`/schema/${connectionId}/charsets`);
    return response.charsets;
  },

  /**
   * Get available collations
   */
  getCollations: async (connectionId: string, charset?: string) => {
    const url = `/schema/${connectionId}/collations${charset ? `?charset=${encodeURIComponent(charset)}` : ''}`;
    const response = await api.get<{ collations: any[] }>(url);
    return response.collations;
  },

  /**
   * Get ER diagram data for a database
   */
  getERDiagram: async (connectionId: string, database: string) => {
    const response = await api.get<ERDiagramData>(
      `/schema/${connectionId}/databases/${encodeURIComponent(database)}/er-diagram`
    );
    return response;
  },
};

// Table Designer Types
export interface FieldDefinition {
  name: string;
  type: string;
  lengthValues?: string;
  decimals?: string;
  notNull?: boolean;
  unsigned?: boolean;
  autoIncrement?: boolean;
  zerofill?: boolean;
  virtual?: boolean;
  virtualExpression?: string;
  defaultValue?: string | null;
  comment?: string;
  isPrimaryKey?: boolean;
}

export interface IndexDefinition {
  name: string;
  type: 'INDEX' | 'UNIQUE' | 'FULLTEXT' | 'PRIMARY';
  columns: string[];
  method?: 'BTREE' | 'HASH';
}

export interface ForeignKeyDefinition {
  name: string;
  columns: string | string[];
  referencedTable: string;
  referencedColumns: string | string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface TriggerDefinition {
  name: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

export interface TableOptions {
  engine?: string;
  charset?: string;
  collation?: string;
  autoIncrement?: number;
  comment?: string;
}

export interface TableDesign {
  tableName: string;
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
  triggers?: TriggerDefinition[];
  options?: TableOptions;
}
