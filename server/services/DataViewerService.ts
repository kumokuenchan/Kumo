import { RowDataPacket } from 'mysql2/promise';
import { connectionPoolManager } from './ConnectionPoolManager.js';
import type {
  DataViewerQuery,
  TableDataResult,
  ColumnInfo,
  TableStats,
  FilterCondition,
  SortOption,
  DistinctValuesResult,
} from '../types/dataViewer.js';

class DataViewerService {
  /**
   * Get table data with pagination, filtering, and sorting
   */
  async getTableData(
    connectionId: string,
    query: DataViewerQuery
  ): Promise<TableDataResult> {
    const {
      database,
      table,
      page = 1,
      pageSize = 50,
      filters = [],
      sort = [],
      search,
    } = query;

    // Get total count
    const totalRows = await this.getFilteredRowCount(
      connectionId,
      database,
      table,
      filters,
      search
    );

    // Calculate pagination
    const totalPages = Math.ceil(totalRows / pageSize);
    const offset = (page - 1) * pageSize;

    // Get column information
    const columns = await this.getColumnInfo(connectionId, database, table);

    // Build SELECT query
    const sql = this.buildSelectQuery(database, table, filters, sort, search, columns);

    // Execute query with pagination
    const { rows } = await connectionPoolManager.executeQuery(
      connectionId,
      `${sql} LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return {
      rows: rows as TableDataRow[],
      columns,
      totalRows,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get column information for a table
   */
  async getColumnInfo(
    connectionId: string,
    database: string,
    table: string
  ): Promise<ColumnInfo[]> {
    const sql = `
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as \`key\`,
        COLUMN_DEFAULT as \`default\`
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql, [
      database,
      table,
    ]);

    return (rows as RowDataPacket[]).map((row) => ({
      name: row.name,
      type: row.type,
      nullable: row.nullable === 'YES',
      key: row.key || undefined,
      default: row.default,
    }));
  }

  /**
   * Get table statistics
   */
  async getTableStats(
    connectionId: string,
    database: string,
    table: string
  ): Promise<TableStats> {
    const sql = `
      SELECT
        TABLE_ROWS as totalRows,
        DATA_LENGTH as totalSize,
        AVG_ROW_LENGTH as avgRowLength,
        AUTO_INCREMENT as autoIncrement,
        CREATE_TIME as created,
        UPDATE_TIME as updated
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql, [
      database,
      table,
    ]);

    const row = (rows as RowDataPacket[])[0];

    return {
      totalRows: row.totalRows || 0,
      totalSize: row.totalSize || 0,
      avgRowLength: row.avgRowLength || 0,
      autoIncrement: row.autoIncrement || undefined,
      created: row.created ? new Date(row.created) : null,
      updated: row.updated ? new Date(row.updated) : null,
    };
  }

  /**
   * Get distinct values for a column (useful for filter dropdowns)
   */
  async getDistinctValues(
    connectionId: string,
    database: string,
    table: string,
    column: string,
    limit: number = 100
  ): Promise<DistinctValuesResult> {
    // First, get total count of distinct values
    const countSql = `
      SELECT COUNT(DISTINCT \`${this.escapeIdentifier(column)}\`) as total
      FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\`
    `;

    const { rows: countRows } = await connectionPoolManager.executeQuery(
      connectionId,
      countSql
    );
    const totalCount = (countRows as RowDataPacket[])[0].total;

    // Get distinct values with limit
    const sql = `
      SELECT DISTINCT \`${this.escapeIdentifier(column)}\` as value
      FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\`
      WHERE \`${this.escapeIdentifier(column)}\` IS NOT NULL
      ORDER BY value
      LIMIT ?
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql, [
      limit,
    ]);

    const values = (rows as RowDataPacket[]).map((row) => row.value);

    return {
      column,
      values,
      totalCount,
      truncated: totalCount > limit,
    };
  }

  /**
   * Get filtered row count
   */
  private async getFilteredRowCount(
    connectionId: string,
    database: string,
    table: string,
    filters: FilterCondition[],
    search?: string
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\``;

    const whereConditions: string[] = [];
    const params: any[] = [];

    // Add filter conditions
    if (filters.length > 0) {
      filters.forEach((filter) => {
        const condition = this.buildFilterCondition(filter);
        if (condition.sql) {
          whereConditions.push(condition.sql);
          if (condition.params) {
            params.push(...condition.params);
          }
        }
      });
    }

    // Add search condition
    if (search) {
      const columns = await this.getColumnInfo(connectionId, database, table);
      const searchConditions = columns
        .filter((col) => this.isTextColumn(col.type))
        .map(
          (col) =>
            `\`${this.escapeIdentifier(col.name)}\` LIKE ?`
        );

      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
        // Add the search parameter for each text column
        columns
          .filter((col) => this.isTextColumn(col.type))
          .forEach(() => params.push(`%${search}%`));
      }
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const { rows } = await connectionPoolManager.executeQuery(
      connectionId,
      sql,
      params
    );

    return (rows as RowDataPacket[])[0].count;
  }

  /**
   * Build SELECT query with filters and sorting
   */
  private buildSelectQuery(
    database: string,
    table: string,
    filters: FilterCondition[],
    sort: SortOption[],
    search?: string,
    columns?: ColumnInfo[]
  ): string {
    let sql = `SELECT * FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\``;

    const whereConditions: string[] = [];

    // Add filter conditions
    if (filters.length > 0) {
      filters.forEach((filter) => {
        const condition = this.buildFilterCondition(filter);
        if (condition.sql) {
          whereConditions.push(condition.sql);
        }
      });
    }

    // Add search condition
    if (search && columns) {
      const searchConditions = columns
        .filter((col) => this.isTextColumn(col.type))
        .map(
          (col) =>
            `\`${this.escapeIdentifier(col.name)}\` LIKE '%${this.escapeValue(search)}%'`
        );

      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (sort.length > 0) {
      const orderBy = sort
        .map(
          (s) =>
            `\`${this.escapeIdentifier(s.column)}\` ${s.direction}`
        )
        .join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    return sql;
  }

  /**
   * Build a filter condition
   */
  private buildFilterCondition(filter: FilterCondition): {
    sql: string;
    params?: any[];
  } {
    const column = `\`${this.escapeIdentifier(filter.column)}\``;

    switch (filter.operator) {
      case 'IS NULL':
        return { sql: `${column} IS NULL` };

      case 'IS NOT NULL':
        return { sql: `${column} IS NOT NULL` };

      case 'IN':
        if (filter.values && filter.values.length > 0) {
          const placeholders = filter.values
            .map((v) => `'${this.escapeValue(v)}'`)
            .join(', ');
          return { sql: `${column} IN (${placeholders})` };
        }
        return { sql: '' };

      case '=':
      case '!=':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return {
          sql: `${column} ${filter.operator} '${this.escapeValue(filter.value)}'`,
        };

      case 'LIKE':
        return {
          sql: `${column} LIKE '%${this.escapeValue(filter.value)}%'`,
        };

      default:
        return { sql: '' };
    }
  }

  /**
   * Check if a column type is text-based
   */
  private isTextColumn(type: string): boolean {
    const textTypes = [
      'char',
      'varchar',
      'text',
      'tinytext',
      'mediumtext',
      'longtext',
    ];
    const lowerType = type.toLowerCase();
    return textTypes.some((t) => lowerType.includes(t));
  }

  /**
   * Escape identifier (table/column name)
   */
  private escapeIdentifier(identifier: string): string {
    return identifier.replace(/`/g, '``');
  }

  /**
   * Escape value for SQL
   */
  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/'/g, "''");
  }
}

// Export singleton instance
export const dataViewerService = new DataViewerService();

// Type alias for table data row
type TableDataRow = { [key: string]: any };
