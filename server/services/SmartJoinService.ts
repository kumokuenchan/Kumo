import { connectionPoolManager } from './ConnectionPoolManager.js';

export interface TableLink {
  from: string; // "table.column"
  to: string; // "table.column"
  type?: 'INNER' | 'LEFT' | 'RIGHT';
}

export interface SmartJoinRequest {
  database: string;
  tables: string[];
  links: TableLink[];
  filters?: Array<{
    column: string; // "table.column"
    operator: string;
    value: any;
  }>;
  limit?: number;
  offset?: number;
}

export interface SmartJoinResult {
  sql: string;
  rows: any[];
  totalRows: number;
}

class SmartJoinService {
  /**
   * Auto-detect foreign key relationships between selected tables
   */
  async detectRelationships(
    connectionId: string,
    database: string,
    tables: string[]
  ): Promise<TableLink[]> {
    const links: TableLink[] = [];

    // Query all FK relationships for the selected tables
    const query = `
      SELECT
        KEY_COLUMN_USAGE.TABLE_NAME as fromTable,
        KEY_COLUMN_USAGE.COLUMN_NAME as fromColumn,
        KEY_COLUMN_USAGE.REFERENCED_TABLE_NAME as toTable,
        KEY_COLUMN_USAGE.REFERENCED_COLUMN_NAME as toColumn
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE KEY_COLUMN_USAGE.TABLE_SCHEMA = ?
        AND KEY_COLUMN_USAGE.TABLE_NAME IN (?)
        AND KEY_COLUMN_USAGE.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY KEY_COLUMN_USAGE.TABLE_NAME, KEY_COLUMN_USAGE.COLUMN_NAME
    `;

    const { rows } = await connectionPoolManager.executeQuery(connectionId, query, [
      database,
      tables,
    ]);

    for (const row of rows as any[]) {
      // Only include links where both tables are in the selected tables
      if (tables.includes(row.fromTable) && tables.includes(row.toTable)) {
        links.push({
          from: `${row.fromTable}.${row.fromColumn}`,
          to: `${row.toTable}.${row.toColumn}`,
          type: 'INNER',
        });
      }
    }

    return links;
  }

  /**
   * Generate SQL JOIN query from table links
   */
  generateJoinSQL(request: SmartJoinRequest): string {
    const { database, tables, links, filters, limit, offset } = request;

    if (tables.length === 0) {
      throw new Error('No tables selected');
    }

    // Start with the first table
    const mainTable = tables[0];
    let sql = `SELECT * FROM \`${database}\`.\`${mainTable}\``;

    // Build JOIN clauses
    const processedTables = new Set<string>([mainTable]);
    const remainingLinks = [...links];

    // Keep adding JOINs until all tables are connected
    while (processedTables.size < tables.length && remainingLinks.length > 0) {
      for (let i = remainingLinks.length - 1; i >= 0; i--) {
        const link = remainingLinks[i];
        const [fromTable] = link.from.split('.');
        const [toTable] = link.to.split('.');

        // Check if we can add this join
        if (processedTables.has(fromTable) && !processedTables.has(toTable)) {
          // Add JOIN
          const joinType = link.type || 'INNER';
          sql += `\n${joinType} JOIN \`${database}\`.\`${toTable}\` ON ${link.from} = ${link.to}`;
          processedTables.add(toTable);
          remainingLinks.splice(i, 1);
        } else if (processedTables.has(toTable) && !processedTables.has(fromTable)) {
          // Add JOIN in reverse
          const joinType = link.type || 'INNER';
          sql += `\n${joinType} JOIN \`${database}\`.\`${fromTable}\` ON ${link.from} = ${link.to}`;
          processedTables.add(fromTable);
          remainingLinks.splice(i, 1);
        }
      }
    }

    // Add WHERE clause if filters exist
    if (filters && filters.length > 0) {
      const conditions = filters.map((f) => {
        if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
          return `${f.column} ${f.operator}`;
        }
        if (typeof f.value === 'string') {
          return `${f.column} ${f.operator} '${f.value.replace(/'/g, "\\'")}'`;
        }
        return `${f.column} ${f.operator} ${f.value}`;
      });
      sql += `\nWHERE ${conditions.join(' AND ')}`;
    }

    // Add LIMIT and OFFSET
    if (limit !== undefined) {
      sql += `\nLIMIT ${limit}`;
    }
    if (offset !== undefined) {
      sql += `\nOFFSET ${offset}`;
    }

    return sql;
  }

  /**
   * Execute smart join query
   */
  async executeSmartJoin(
    connectionId: string,
    request: SmartJoinRequest
  ): Promise<SmartJoinResult> {
    const sql = this.generateJoinSQL(request);

    // Execute query
    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql);

    // Get total count without LIMIT
    let totalRows = rows.length;
    if (request.limit !== undefined) {
      const countSQL = this.generateJoinSQL({
        ...request,
        limit: undefined,
        offset: undefined,
      }).replace(/^SELECT \*/, 'SELECT COUNT(*) as count');

      const { rows: countRows } = await connectionPoolManager.executeQuery(
        connectionId,
        countSQL
      );
      totalRows = (countRows[0] as any).count;
    }

    return {
      sql,
      rows,
      totalRows,
    };
  }

  /**
   * Convert flat result to nested hierarchy
   */
  convertToHierarchy(rows: any[], mainTable: string, links: TableLink[]): any {
    // Group results by main table's primary key
    // This is a simplified implementation
    // A full implementation would need to understand the relationships better

    const grouped: Record<string, any> = {};

    for (const row of rows) {
      // Use a simple grouping strategy
      // In production, you'd want to be smarter about this
      const key = JSON.stringify(row);
      if (!grouped[key]) {
        grouped[key] = row;
      }
    }

    return Object.values(grouped);
  }
}

export const smartJoinService = new SmartJoinService();
