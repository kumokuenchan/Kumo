import { connectionPoolManager } from './ConnectionPoolManager.js';

export interface Database {
  name: string;
  charset: string;
  collation: string;
}

export interface Table {
  name: string;
  type: 'BASE TABLE' | 'VIEW' | 'TABLE'; // MySQL returns 'BASE TABLE' for regular tables
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
    return (rows || []) as Database[];
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
        TABLE_ROWS as \`rows\`,
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
    // Ensure we always return an array, even if rows is undefined or null
    return (rows || []) as Table[];
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
    return (rows || []) as Column[];
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

    for (const row of (rows || []) as any[]) {
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
    return (rows || []) as ForeignKey[];
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
    return (rows || []) as Trigger[];
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
    return (rows || []) as Routine[];
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
    return (rows || []) as Table[];
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

  /**
   * Create a new table
   */
  async createTable(
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
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    let sql = `CREATE TABLE \`${tableDefinition.name}\` (\n`;

    // Add columns
    const columnDefs = tableDefinition.columns.map((col) => {
      let def = `  \`${col.name}\` ${col.type}`;
      if (col.unsigned) def += ' UNSIGNED';
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        def += ` DEFAULT ${col.defaultValue}`;
      } else if (col.nullable && col.defaultValue === null) {
        def += ' DEFAULT NULL';
      }
      if (col.comment) def += ` COMMENT '${col.comment.replace(/'/g, "\\'")}'`;
      return def;
    });

    sql += columnDefs.join(',\n');

    // Add primary key
    if (tableDefinition.primaryKey && tableDefinition.primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (${tableDefinition.primaryKey.map((c) => `\`${c}\``).join(', ')})`;
    }

    // Add indexes
    if (tableDefinition.indexes && tableDefinition.indexes.length > 0) {
      for (const idx of tableDefinition.indexes) {
        const idxType = idx.unique ? 'UNIQUE KEY' : 'KEY';
        sql += `,\n  ${idxType} \`${idx.name}\` (${idx.columns.map((c) => `\`${c}\``).join(', ')})`;
      }
    }

    // Add foreign keys
    if (tableDefinition.foreignKeys && tableDefinition.foreignKeys.length > 0) {
      for (const fk of tableDefinition.foreignKeys) {
        sql += `,\n  CONSTRAINT \`${fk.name}\` FOREIGN KEY (${fk.columns.map((c) => `\`${c}\``).join(', ')})`;
        sql += ` REFERENCES \`${fk.referencedTable}\` (${fk.referencedColumns.map((c) => `\`${c}\``).join(', ')})`;
        if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete}`;
        if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate}`;
      }
    }

    sql += '\n)';

    // Add table options
    if (tableDefinition.engine) sql += ` ENGINE=${tableDefinition.engine}`;
    if (tableDefinition.charset) sql += ` DEFAULT CHARSET=${tableDefinition.charset}`;
    if (tableDefinition.collation) sql += ` COLLATE=${tableDefinition.collation}`;
    if (tableDefinition.comment) sql += ` COMMENT='${tableDefinition.comment.replace(/'/g, "\\'")}'`;

    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Add a column to an existing table
   */
  async addColumn(
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
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    let sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${columnDefinition.name}\` ${columnDefinition.type}`;
    if (columnDefinition.unsigned) sql += ' UNSIGNED';
    if (!columnDefinition.nullable) sql += ' NOT NULL';
    if (columnDefinition.autoIncrement) sql += ' AUTO_INCREMENT';
    if (columnDefinition.defaultValue !== undefined && columnDefinition.defaultValue !== null) {
      sql += ` DEFAULT ${columnDefinition.defaultValue}`;
    } else if (columnDefinition.nullable && columnDefinition.defaultValue === null) {
      sql += ' DEFAULT NULL';
    }
    if (columnDefinition.comment) {
      sql += ` COMMENT '${columnDefinition.comment.replace(/'/g, "\\'")}'`;
    }
    if (columnDefinition.after) {
      sql += ` AFTER \`${columnDefinition.after}\``;
    }

    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Modify an existing column
   */
  async modifyColumn(
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
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    let sql =
      oldColumnName === columnDefinition.name
        ? `ALTER TABLE \`${table}\` MODIFY COLUMN \`${columnDefinition.name}\` ${columnDefinition.type}`
        : `ALTER TABLE \`${table}\` CHANGE COLUMN \`${oldColumnName}\` \`${columnDefinition.name}\` ${columnDefinition.type}`;

    if (columnDefinition.unsigned) sql += ' UNSIGNED';
    if (!columnDefinition.nullable) sql += ' NOT NULL';
    if (columnDefinition.autoIncrement) sql += ' AUTO_INCREMENT';
    if (columnDefinition.defaultValue !== undefined && columnDefinition.defaultValue !== null) {
      sql += ` DEFAULT ${columnDefinition.defaultValue}`;
    } else if (columnDefinition.nullable && columnDefinition.defaultValue === null) {
      sql += ' DEFAULT NULL';
    }
    if (columnDefinition.comment) {
      sql += ` COMMENT '${columnDefinition.comment.replace(/'/g, "\\'")}'`;
    }

    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Drop a column from a table
   */
  async dropColumn(
    connectionId: string,
    database: string,
    table: string,
    columnName: string,
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `ALTER TABLE \`${table}\` DROP COLUMN \`${columnName}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Create an index on a table
   */
  async createIndex(
    connectionId: string,
    database: string,
    table: string,
    indexDefinition: {
      name: string;
      columns: string[];
      unique: boolean;
      type?: string;
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const indexType = indexDefinition.unique ? 'UNIQUE INDEX' : 'INDEX';
    const indexMethod = indexDefinition.type ? ` USING ${indexDefinition.type}` : '';
    const sql = `CREATE ${indexType} \`${indexDefinition.name}\` ON \`${table}\` (${indexDefinition.columns.map((c) => `\`${c}\``).join(', ')})${indexMethod}`;

    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Drop an index from a table
   */
  async dropIndex(
    connectionId: string,
    database: string,
    table: string,
    indexName: string,
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Add a foreign key constraint
   */
  async addForeignKey(
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
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    let sql = `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${foreignKeyDefinition.name}\` `;
    sql += `FOREIGN KEY (${foreignKeyDefinition.columns.map((c) => `\`${c}\``).join(', ')}) `;
    sql += `REFERENCES \`${foreignKeyDefinition.referencedTable}\` (${foreignKeyDefinition.referencedColumns.map((c) => `\`${c}\``).join(', ')})`;
    if (foreignKeyDefinition.onDelete) sql += ` ON DELETE ${foreignKeyDefinition.onDelete}`;
    if (foreignKeyDefinition.onUpdate) sql += ` ON UPDATE ${foreignKeyDefinition.onUpdate}`;

    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Drop a foreign key constraint
   */
  async dropForeignKey(
    connectionId: string,
    database: string,
    table: string,
    foreignKeyName: string,
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${foreignKeyName}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Drop a table with safety checks
   */
  async dropTable(
    connectionId: string,
    database: string,
    table: string,
    checkDependencies: boolean = true,
  ): Promise<{ success: boolean; dependencies?: string[]; error?: string }> {
    try {
      await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

      // Check for dependencies if requested
      if (checkDependencies) {
        const dependencies = await this.getTableDependencies(connectionId, database, table);
        if (dependencies.length > 0) {
          return {
            success: false,
            dependencies,
            error: 'Table has foreign key references from other tables',
          };
        }
      }

      const sql = `DROP TABLE \`${table}\``;
      await connectionPoolManager.executeQuery(connectionId, sql);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rename a table
   */
  async renameTable(
    connectionId: string,
    database: string,
    table: string,
    newName: string,
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `RENAME TABLE \`${table}\` TO \`${newName}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Empty a table (DELETE FROM - keeps structure and auto_increment value)
   */
  async emptyTable(connectionId: string, database: string, table: string): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `DELETE FROM \`${table}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Truncate a table (TRUNCATE - resets auto_increment)
   */
  async truncateTable(connectionId: string, database: string, table: string): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
    const sql = `TRUNCATE TABLE \`${table}\``;
    await connectionPoolManager.executeQuery(connectionId, sql);
  }

  /**
   * Get tables that reference the given table via foreign keys
   */
  async getTableDependencies(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<string[]> {
    const query = `
      SELECT DISTINCT TABLE_NAME as tableName
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = ?
        AND REFERENCED_TABLE_NAME = ?
        AND TABLE_NAME != ?
      ORDER BY TABLE_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      table,
      table,
    ]);
    return ((rows || []) as any[]).map((row) => row.tableName);
  }

  /**
   * Export schema for a single table
   */
  async exportTableSchema(
    connectionId: string,
    database: string,
    table: string,
  ): Promise<string> {
    return await this.getCreateTable(connectionId, database, table);
  }

  /**
   * Export schema for entire database
   */
  async exportDatabaseSchema(
    connectionId: string,
    database: string,
    includeData: boolean = false,
  ): Promise<string> {
    try {
      await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

      const tables = await this.getTables(connectionId, database);
      let output = `-- Database: ${database}\n`;
      output += `-- Generated: ${new Date().toISOString()}\n\n`;
      output += `CREATE DATABASE IF NOT EXISTS \`${database}\`;\n`;
      output += `USE \`${database}\`;\n\n`;

      // Export table structures
      for (const table of tables) {
        // MySQL returns 'BASE TABLE' for regular tables
        if (table.type === 'BASE TABLE' || table.type === 'TABLE') {
          try {
            const createStatement = await this.getCreateTable(connectionId, database, table.name);
            output += `-- Table: ${table.name}\n`;
            output += `DROP TABLE IF EXISTS \`${table.name}\`;\n`;
            output += createStatement + ';\n\n';

            // Export data if requested
            if (includeData) {
              const dataQuery = `SELECT * FROM \`${table.name}\``;
              const { rows } = await connectionPoolManager.executeQuery(connectionId, dataQuery);

              if (rows && rows.length > 0) {
                output += `-- Data for table: ${table.name}\n`;
                output += `LOCK TABLES \`${table.name}\` WRITE;\n`;

                // Get column names
                const columns = Object.keys(rows[0]);
                const columnList = columns.map((c) => `\`${c}\``).join(', ');

                // Generate INSERT statements in batches
                const batchSize = 100;
                for (let i = 0; i < rows.length; i += batchSize) {
                  const batch = rows.slice(i, i + batchSize);
                  output += `INSERT INTO \`${table.name}\` (${columnList}) VALUES\n`;

                  const values = batch.map((row: any) => {
                    const vals = columns
                      .map((col) => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string')
                          return `'${val.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        return val;
                      })
                      .join(', ');
                    return `  (${vals})`;
                  });

                  output += values.join(',\n') + ';\n';
                }

                output += `UNLOCK TABLES;\n\n`;
              }
            }
          } catch (tableError: any) {
            console.error(`[exportDatabaseSchema] Error exporting table ${table.name}:`, tableError);
            output += `-- ERROR exporting table ${table.name}: ${tableError.message}\n\n`;
          }
        }
      }

      return output;
    } catch (error: any) {
      console.error(`[exportDatabaseSchema] Fatal error:`, error);
      throw new Error(`Failed to export database schema: ${error.message}`);
    }
  }

  /**
   * Restore database from SQL backup file
   */
  async restoreDatabaseSchema(
    connectionId: string,
    database: string,
    sqlContent: string,
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    const errors: string[] = [];
    let successCount = 0;
    let totalStatements = 0;

    try {
      // Use the database
      await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

      // Disable foreign key checks and set SQL mode for better compatibility
      await connectionPoolManager.executeQuery(connectionId, 'SET SESSION FOREIGN_KEY_CHECKS=0');
      await connectionPoolManager.executeQuery(connectionId, 'SET SESSION sql_mode = \'ALLOW_INVALID_DATES,NO_AUTO_VALUE_ON_ZERO\'');

      // Split SQL content into statements
      // Handle multi-line statements and comments properly
      const statements = sqlContent
        .split(/;[\s]*\n/)
        .map(s => s.trim())
        .filter(s => {
          // Filter out empty statements and comments
          if (!s) return false;
          if (s.startsWith('--')) return false;
          if (s.startsWith('/*') && s.endsWith('*/')) return false;
          // Keep CREATE DATABASE and USE statements
          return true;
        });

      totalStatements = statements.length;

      // Execute each statement
      for (const statement of statements) {
        if (!statement) continue;

        try {
          // Skip USE database statements if they're trying to switch to a different database
          if (statement.toUpperCase().startsWith('USE')) {
            // Allow it but ensure we're using the correct database
            await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);
            successCount++;
            continue;
          }

          // Skip CREATE DATABASE statements as we're restoring to an existing database
          if (statement.toUpperCase().startsWith('CREATE DATABASE')) {
            successCount++;
            continue;
          }

          // Skip LOCK/UNLOCK TABLES statements
          if (statement.toUpperCase().startsWith('LOCK TABLES') ||
              statement.toUpperCase().startsWith('UNLOCK TABLES')) {
            successCount++;
            continue;
          }

          // Skip ALTER TABLE DISABLE/ENABLE KEYS statements
          if (statement.match(/ALTER TABLE .* (DISABLE|ENABLE) KEYS/i)) {
            successCount++;
            continue;
          }

          // Execute the statement
          await connectionPoolManager.executeQuery(connectionId, statement);
          successCount++;
        } catch (err: any) {
          const errorMsg = `Failed to execute statement: ${statement.substring(0, 100)}... Error: ${err.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Re-enable foreign key checks
      await connectionPoolManager.executeQuery(connectionId, 'SET SESSION FOREIGN_KEY_CHECKS=1');

      if (errors.length > 0) {
        return {
          success: false,
          message: `Restore completed with errors. ${successCount}/${totalStatements} statements executed successfully.`,
          errors,
        };
      }

      return {
        success: true,
        message: `Database restored successfully. ${successCount} statements executed.`,
      };
    } catch (err: any) {
      // Try to re-enable foreign key checks even on error
      try {
        await connectionPoolManager.executeQuery(connectionId, 'SET SESSION FOREIGN_KEY_CHECKS=1');
      } catch (e) {
        // Ignore errors when re-enabling foreign key checks
      }

      return {
        success: false,
        message: `Failed to restore database: ${err.message}`,
        errors: errors.length > 0 ? errors : [err.message],
      };
    }
  }

  /**
   * Modify table properties (engine, charset, collation, comment)
   */
  async modifyTableProperties(
    connectionId: string,
    database: string,
    table: string,
    properties: {
      engine?: string;
      charset?: string;
      collation?: string;
      comment?: string;
    },
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const alterations: string[] = [];

    if (properties.engine) {
      alterations.push(`ENGINE=${properties.engine}`);
    }
    if (properties.charset) {
      alterations.push(`DEFAULT CHARSET=${properties.charset}`);
    }
    if (properties.collation) {
      alterations.push(`COLLATE=${properties.collation}`);
    }
    if (properties.comment !== undefined) {
      alterations.push(`COMMENT='${properties.comment.replace(/'/g, "\\'")}'`);
    }

    if (alterations.length > 0) {
      const sql = `ALTER TABLE \`${table}\` ${alterations.join(', ')}`;
      await connectionPoolManager.executeQuery(connectionId, sql);
    }
  }

  /**
   * Generate DDL preview for table design
   */
  async generateDDLPreview(
    design: any,
    isNewTable: boolean,
    originalStructure?: any,
  ): Promise<string> {
    if (isNewTable) {
      return this.generateCreateTableSQL(design);
    } else {
      return this.generateAlterTableSQL(design, originalStructure);
    }
  }

  /**
   * Generate CREATE TABLE SQL from table design
   */
  private generateCreateTableSQL(design: any): string {
    const { tableName, fields, indexes, foreignKeys, triggers, options } = design;

    let sql = `CREATE TABLE \`${tableName}\` (\n`;

    // Add field definitions
    const fieldDefs = fields.map((field: any) => {
      let def = `  \`${field.name}\` ${field.type.toUpperCase()}`;

      // Add length/values
      if (field.lengthValues) {
        def += `(${field.lengthValues})`;
      }

      // Add UNSIGNED
      if (field.unsigned) {
        def += ' UNSIGNED';
      }

      // Add ZEROFILL
      if (field.zerofill) {
        def += ' ZEROFILL';
      }

      // Add NOT NULL
      if (field.notNull) {
        def += ' NOT NULL';
      }

      // Add AUTO_INCREMENT
      if (field.autoIncrement) {
        def += ' AUTO_INCREMENT';
      }

      // Add GENERATED (for virtual columns)
      if (field.virtual && field.virtualExpression) {
        def += ` GENERATED ALWAYS AS (${field.virtualExpression}) VIRTUAL`;
      }

      // Add DEFAULT
      if (
        field.defaultValue !== undefined &&
        field.defaultValue !== null &&
        field.defaultValue !== '' &&
        !field.virtual
      ) {
        if (
          field.defaultValue === 'CURRENT_TIMESTAMP' ||
          field.defaultValue === 'NULL'
        ) {
          def += ` DEFAULT ${field.defaultValue}`;
        } else {
          def += ` DEFAULT '${field.defaultValue.toString().replace(/'/g, "''")}'`;
        }
      }

      // Add COMMENT
      if (field.comment) {
        def += ` COMMENT '${field.comment.replace(/'/g, "''")}'`;
      }

      return def;
    });

    sql += fieldDefs.join(',\n');

    // Add PRIMARY KEY
    const primaryKeyFields = fields.filter((f: any) => f.isPrimaryKey);
    if (primaryKeyFields.length > 0) {
      const pkColumns = primaryKeyFields.map((f: any) => `\`${f.name}\``).join(', ');
      sql += `,\n  PRIMARY KEY (${pkColumns})`;
    }

    // Add other indexes
    if (indexes && indexes.length > 0) {
      for (const index of indexes) {
        if (index.type !== 'PRIMARY') {
          const indexColumns = index.columns.map((c: string) => `\`${c}\``).join(', ');
          if (index.type === 'UNIQUE') {
            sql += `,\n  UNIQUE KEY \`${index.name}\` (${indexColumns})`;
          } else if (index.type === 'FULLTEXT') {
            sql += `,\n  FULLTEXT KEY \`${index.name}\` (${indexColumns})`;
          } else {
            sql += `,\n  KEY \`${index.name}\` (${indexColumns})`;
          }
        }
      }
    }

    // Add foreign keys inline
    if (foreignKeys && foreignKeys.length > 0) {
      for (const fk of foreignKeys) {
        const columns = Array.isArray(fk.columns) ? fk.columns : [fk.columns];
        const refColumns = Array.isArray(fk.referencedColumns)
          ? fk.referencedColumns
          : [fk.referencedColumns];

        const columnList = columns.map((c: string) => `\`${c}\``).join(', ');
        const refColumnList = refColumns.map((c: string) => `\`${c}\``).join(', ');

        sql += `,\n  CONSTRAINT \`${fk.name}\` FOREIGN KEY (${columnList})`;
        sql += ` REFERENCES \`${fk.referencedTable}\` (${refColumnList})`;

        if (fk.onDelete) {
          sql += ` ON DELETE ${fk.onDelete}`;
        }
        if (fk.onUpdate) {
          sql += ` ON UPDATE ${fk.onUpdate}`;
        }
      }
    }

    sql += '\n)';

    // Add table options
    if (options) {
      if (options.engine) {
        sql += ` ENGINE=${options.engine}`;
      }
      if (options.charset) {
        sql += ` DEFAULT CHARSET=${options.charset}`;
      }
      if (options.collation) {
        sql += ` COLLATE=${options.collation}`;
      }
      if (options.autoIncrement) {
        sql += ` AUTO_INCREMENT=${options.autoIncrement}`;
      }
      if (options.comment) {
        sql += ` COMMENT='${options.comment.replace(/'/g, "''")}'`;
      }
    }

    sql += ';';

    // Add triggers
    if (triggers && triggers.length > 0) {
      for (const trigger of triggers) {
        sql += '\n\n';
        sql += `CREATE TRIGGER \`${trigger.name}\` `;
        sql += `${trigger.timing} ${trigger.event} `;
        sql += `ON \`${tableName}\` FOR EACH ROW\n`;
        sql += trigger.body;
        sql += ';';
      }
    }

    return sql;
  }

  /**
   * Generate ALTER TABLE SQL from table design diff
   */
  private generateAlterTableSQL(newDesign: any, originalStructure: any): string {
    // For now, return a simple placeholder
    // Full implementation would compare old vs new and generate ALTER statements
    return `-- ALTER TABLE statements would be generated here based on changes\n-- This requires diffing the original structure with the new design`;
  }

  /**
   * Get available storage engines
   */
  async getStorageEngines(connectionId: string): Promise<any[]> {
    const [engines] = await connectionPoolManager.executeQuery(
      connectionId,
      'SHOW ENGINES',
    );
    return engines.filter((e: any) => e.Support === 'YES' || e.Support === 'DEFAULT');
  }

  /**
   * Get available character sets
   */
  async getCharsets(connectionId: string): Promise<any[]> {
    const [charsets] = await connectionPoolManager.executeQuery(
      connectionId,
      'SHOW CHARACTER SET',
    );
    return charsets;
  }

  /**
   * Get available collations (optionally filtered by charset)
   */
  async getCollations(connectionId: string, charset?: string): Promise<any[]> {
    let sql = 'SHOW COLLATION';
    if (charset) {
      sql += ` WHERE Charset = '${charset.replace(/'/g, "''")}'`;
    }
    const [collations] = await connectionPoolManager.executeQuery(connectionId, sql);
    return collations;
  }

  /**
   * Duplicate a table (structure only or structure + data)
   */
  async duplicateTable(
    connectionId: string,
    database: string,
    table: string,
    newTableName: string,
    includeData: boolean = false,
  ): Promise<void> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    // Create new table with same structure
    const createStatement = await this.getCreateTable(connectionId, database, table);

    // Replace table name in CREATE statement
    const newCreateStatement = createStatement.replace(
      new RegExp(`CREATE TABLE \`${table}\``, 'i'),
      `CREATE TABLE \`${newTableName}\``
    );

    await connectionPoolManager.executeQuery(connectionId, newCreateStatement);

    // Copy data if requested
    if (includeData) {
      const copyDataSQL = `INSERT INTO \`${newTableName}\` SELECT * FROM \`${table}\``;
      await connectionPoolManager.executeQuery(connectionId, copyDataSQL);
    }
  }

  /**
   * Generate SQL dump for a single table (structure + data)
   */
  async dumpTableSQL(
    connectionId: string,
    database: string,
    table: string,
    includeData: boolean = true,
  ): Promise<string> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    let output = `-- MySQL dump for table: ${table}\n`;
    output += `-- Database: ${database}\n`;
    output += `-- Generated: ${new Date().toISOString()}\n\n`;

    // Get table structure
    const createStatement = await this.getCreateTable(connectionId, database, table);
    output += `-- Table structure for \`${table}\`\n`;
    output += `DROP TABLE IF EXISTS \`${table}\`;\n`;
    output += createStatement + ';\n\n';

    // Get table data if requested
    if (includeData) {
      const dataQuery = `SELECT * FROM \`${table}\``;
      const { rows } = await connectionPoolManager.executeQuery(connectionId, dataQuery);

      if (rows && rows.length > 0) {
        output += `-- Dumping data for table \`${table}\`\n`;
        output += `LOCK TABLES \`${table}\` WRITE;\n`;
        output += `/*!40000 ALTER TABLE \`${table}\` DISABLE KEYS */;\n\n`;

        // Get column names
        const columns = Object.keys(rows[0]);
        const columnList = columns.map((c) => `\`${c}\``).join(', ');

        // Generate INSERT statements in batches
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          output += `INSERT INTO \`${table}\` (${columnList}) VALUES\n`;

          const values = batch.map((row: any) => {
            const vals = columns
              .map((col) => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string')
                  return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
                if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                if (typeof val === 'boolean') return val ? '1' : '0';
                if (Buffer.isBuffer(val)) return `0x${val.toString('hex')}`;
                return val;
              })
              .join(', ');
            return `  (${vals})`;
          });

          output += values.join(',\n') + ';\n\n';
        }

        output += `/*!40000 ALTER TABLE \`${table}\` ENABLE KEYS */;\n`;
        output += `UNLOCK TABLES;\n\n`;
      } else {
        output += `-- No data to dump for table \`${table}\`\n\n`;
      }
    }

    output += `-- Dump completed\n`;
    return output;
  }

  /**
   * Get ER diagram data for a database (all tables with their relationships)
   */
  async getDatabaseERDiagram(connectionId: string, database: string): Promise<{
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
        nullable: boolean;
      }>;
      position?: { x: number; y: number };
    }>;
    relationships: Array<{
      id: string;
      name: string;
      sourceTable: string;
      targetTable: string;
      sourceColumn: string;
      targetColumn: string;
      onDelete: string;
      onUpdate: string;
    }>;
  }> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    // Get all tables (including views for now, can filter later)
    const tables = await this.getTables(connectionId, database);
    const tableList = tables.filter(t => t.type === 'TABLE' || t.type === 'BASE TABLE');

    // Fetch columns and foreign keys for each table
    const tablesData = await Promise.all(
      tableList.map(async (table) => {
        const columns = await this.getColumns(connectionId, database, table.name);
        const foreignKeys = await this.getForeignKeys(connectionId, database, table.name);

        const fkColumnSet = new Set(foreignKeys.map(fk => fk.column));

        return {
          name: table.name,
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            isPrimaryKey: col.key === 'PRI',
            isForeignKey: fkColumnSet.has(col.name),
            nullable: col.nullable,
          })),
        };
      })
    );

    // Collect all relationships
    const relationships: Array<{
      id: string;
      name: string;
      sourceTable: string;
      targetTable: string;
      sourceColumn: string;
      targetColumn: string;
      onDelete: string;
      onUpdate: string;
    }> = [];

    for (const table of tableList) {
      const foreignKeys = await this.getForeignKeys(connectionId, database, table.name);
      for (const fk of foreignKeys) {
        relationships.push({
          id: `${table.name}-${fk.name}`,
          name: fk.name,
          sourceTable: table.name,
          targetTable: fk.referencedTable,
          sourceColumn: fk.column,
          targetColumn: fk.referencedColumn,
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        });
      }
    }

    return {
      tables: tablesData,
      relationships,
    };
  }
}

// Export singleton instance
export const schemaService = new SchemaService();
