import { connectionPoolManager } from './ConnectionPoolManager.js';

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

class SchemaService {
  /**
   * Get list of all databases
   */
  async getDatabases(connectionId: string): Promise<Database[]> {
    const query = `
      SELECT
        SCHEMA_NAME as name,
        DEFAULT_CHARACTER_SET_NAME as charset,
        DEFAULT_COLLATION_NAME as collation
      FROM information_schema.SCHEMATA
      ORDER BY SCHEMA_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query);
    return rows as Database[];
  }

  /**
   * Get list of tables in a database
   */
  async getTables(connectionId: string, database: string): Promise<Table[]> {
    const query = `
      SELECT
        TABLE_NAME as name,
        TABLE_TYPE as type,
        ENGINE as engine,
        TABLE_ROWS as rows,
        DATA_LENGTH as dataLength,
        INDEX_LENGTH as indexLength,
        AUTO_INCREMENT as autoIncrement,
        TABLE_COLLATION as collation,
        TABLE_COMMENT as comment,
        CREATE_TIME as createTime,
        UPDATE_TIME as updateTime
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [database]);
    return rows as Table[];
  }

  /**
   * Get columns for a specific table
   */
  async getColumns(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<Column[]> {
    const query = `
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE = 'YES' as nullable,
        COLUMN_KEY as \`key\`,
        COLUMN_DEFAULT as \`default\`,
        EXTRA as extra,
        COLUMN_COMMENT as comment,
        CHARACTER_SET_NAME as characterSet,
        COLLATION_NAME as collation
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      table,
    ]);
    return rows as Column[];
  }

  /**
   * Get indexes for a specific table
   */
  async getIndexes(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<Index[]> {
    const query = `
      SELECT
        INDEX_NAME as indexName,
        COLUMN_NAME as columnName,
        NON_UNIQUE = 0 as isUnique,
        INDEX_TYPE as indexType,
        INDEX_COMMENT as comment,
        SEQ_IN_INDEX as sequence
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      table,
    ]);

    // Group columns by index name
    const indexMap = new Map<string, Index>();

    for (const row of rows as any[]) {
      if (!indexMap.has(row.indexName)) {
        indexMap.set(row.indexName, {
          name: row.indexName,
          columns: [],
          unique: row.isUnique === 1,
          type: row.indexType,
          comment: row.comment,
        });
      }
      indexMap.get(row.indexName)!.columns.push(row.columnName);
    }

    return Array.from(indexMap.values());
  }

  /**
   * Get foreign keys for a specific table
   */
  async getForeignKeys(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<ForeignKey[]> {
    const query = `
      SELECT
        KEY_COLUMN_USAGE.CONSTRAINT_NAME as name,
        KEY_COLUMN_USAGE.COLUMN_NAME as \`column\`,
        KEY_COLUMN_USAGE.REFERENCED_TABLE_NAME as referencedTable,
        KEY_COLUMN_USAGE.REFERENCED_COLUMN_NAME as referencedColumn,
        REFERENTIAL_CONSTRAINTS.UPDATE_RULE as onUpdate,
        REFERENTIAL_CONSTRAINTS.DELETE_RULE as onDelete
      FROM information_schema.KEY_COLUMN_USAGE
      JOIN information_schema.REFERENTIAL_CONSTRAINTS
        ON KEY_COLUMN_USAGE.CONSTRAINT_NAME = REFERENTIAL_CONSTRAINTS.CONSTRAINT_NAME
        AND KEY_COLUMN_USAGE.TABLE_SCHEMA = REFERENTIAL_CONSTRAINTS.CONSTRAINT_SCHEMA
      WHERE KEY_COLUMN_USAGE.TABLE_SCHEMA = ?
        AND KEY_COLUMN_USAGE.TABLE_NAME = ?
        AND KEY_COLUMN_USAGE.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY KEY_COLUMN_USAGE.CONSTRAINT_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      table,
    ]);
    return rows as ForeignKey[];
  }

  /**
   * Get triggers for a specific database or table
   */
  async getTriggers(
    connectionId: string,
    database: string,
    table?: string,
  ): Promise<Trigger[]> {
    let query = `
      SELECT
        TRIGGER_NAME as name,
        EVENT_MANIPULATION as event,
        EVENT_OBJECT_TABLE as \`table\`,
        ACTION_TIMING as timing,
        ACTION_STATEMENT as statement
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ?
    `;

    const params: string[] = [database];

    if (table) {
      query += ' AND EVENT_OBJECT_TABLE = ?';
      params.push(table);
    }

    query += ' ORDER BY TRIGGER_NAME';

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, params);
    return rows as Trigger[];
  }

  /**
   * Get stored procedures and functions
   */
  async getRoutines(connectionId: string, database: string): Promise<Routine[]> {
    const query = `
      SELECT
        ROUTINE_NAME as name,
        ROUTINE_TYPE as type,
        DTD_IDENTIFIER as returnType,
        ROUTINE_COMMENT as comment
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ?
      ORDER BY ROUTINE_TYPE, ROUTINE_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [database]);
    return rows as Routine[];
  }

  /**
   * Get views in a database
   */
  async getViews(connectionId: string, database: string): Promise<Table[]> {
    const query = `
      SELECT
        TABLE_NAME as name,
        'VIEW' as type,
        TABLE_COMMENT as comment
      FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [database]);
    return rows as Table[];
  }

  /**
   * Get table statistics
   */
  async getTableStats(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<any> {
    const query = `
      SELECT
        TABLE_ROWS as rowCount,
        DATA_LENGTH as dataSize,
        INDEX_LENGTH as indexSize,
        DATA_FREE as dataFree,
        AUTO_INCREMENT as autoIncrement,
        CREATE_TIME as createTime,
        UPDATE_TIME as updateTime,
        CHECK_TIME as checkTime,
        TABLE_COLLATION as collation,
        ENGINE as engine,
        TABLE_COMMENT as comment
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      table,
    ]);
    return rows[0] || null;
  }

  /**
   * Get CREATE TABLE statement
   */
  async getCreateTable(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<string> {
    // Switch to the database first
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const query = `SHOW CREATE TABLE \`${table}\``;
    const { rows } = await connectionPoolManager.executeQuery(connectionId, query);

    if (rows && rows.length > 0) {
      const row = rows[0] as any;
      return row['Create Table'] || row['Create View'] || '';
    }

    return '';
  }

  /**
   * Get complete table schema (columns, indexes, foreign keys)
   */
  async getCompleteTableSchema(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<{
    columns: Column[];
    indexes: Index[];
    foreignKeys: ForeignKey[];
    stats: any;
  }> {
    const [columns, indexes, foreignKeys, stats] = await Promise.all([
      this.getColumns(connectionId, database, table),
      this.getIndexes(connectionId, database, table),
      this.getForeignKeys(connectionId, database, table),
      this.getTableStats(connectionId, database, table),
    ]);

    return { columns, indexes, foreignKeys, stats };
  }
}

// Export singleton instance
export const schemaService = new SchemaService();
