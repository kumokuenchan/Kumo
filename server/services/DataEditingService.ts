import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { connectionPoolManager } from './ConnectionPoolManager.js';

type ColumnInfo = {
  name: string;
  dataType: string;
  columnType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  hasDefault: boolean;
  defaultValue: any;
  isAutoIncrement: boolean;
};

export class DataEditingService {
  private escapeIdentifier(id: string): string {
    return id.replace(/`/g, '``');
  }

  private async getPool(connectionId: string): Promise<Pool> {
    const pool = connectionPoolManager.getPool(connectionId);
    if (!pool) {
      throw new Error(
        `No active pool found for connection: ${connectionId}. Please connect first to create a pool (Connections → Connect).`
      );
    }
    return pool;
  }

  private async getTableColumns(
    connectionId: string,
    database: string,
    table: string,
    conn?: PoolConnection
  ): Promise<ColumnInfo[]> {
    const sql = `
      SELECT
        COLUMN_NAME as name,
        DATA_TYPE as dataType,
        COLUMN_TYPE as columnType,
        IS_NULLABLE as isNullable,
        COLUMN_KEY as columnKey,
        COLUMN_DEFAULT as defaultValue,
        EXTRA as extra
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const exec = async () => {
      if (conn) {
        const [rows] = await conn.query(sql, [database, table]);
        return rows as RowDataPacket[];
      }
      const { rows } = await connectionPoolManager.executeQuery(connectionId, sql, [database, table]);
      return rows as RowDataPacket[];
    };

    const rows = await exec();
    return rows.map((r) => ({
      name: r.name,
      dataType: String(r.dataType).toLowerCase(),
      columnType: String(r.columnType).toLowerCase(),
      isNullable: String(r.isNullable).toUpperCase() === 'YES',
      isPrimaryKey: String(r.columnKey).toUpperCase() === 'PRI',
      hasDefault: r.defaultValue !== null && r.defaultValue !== undefined,
      defaultValue: r.defaultValue,
      isAutoIncrement: String(r.extra || '').toLowerCase().includes('auto_increment'),
    }));
  }

  private coerceValue(value: any, col: ColumnInfo): any {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const t = col.dataType;

    // Treat tinyint(1) as boolean when obvious
    if (t.includes('int')) {
      if (typeof value === 'boolean') return value ? 1 : 0;
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(`Invalid numeric value for ${col.name}`);
      return n;
    }

    if (t === 'decimal' || t === 'numeric' || t === 'float' || t === 'double') {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error(`Invalid number for ${col.name}`);
      return n;
    }

    if (t === 'date') {
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value);
    }

    if (t === 'datetime' || t === 'timestamp') {
      if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
      return String(value);
    }

    if (t === 'time' || t === 'year') {
      return String(value);
    }

    if (t === 'json') {
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
          return value;
        }
        return JSON.stringify(value);
      } catch {
        throw new Error(`Invalid JSON for ${col.name}`);
      }
    }

    // Default to string for character/text types
    return String(value);
  }

  private validateNotNull(value: any, col: ColumnInfo) {
    if ((value === null || value === undefined) && !col.isNullable && !col.hasDefault) {
      throw new Error(`Column ${col.name} cannot be NULL`);
    }
  }

  async updateRow(
    connectionId: string,
    database: string,
    table: string,
    key: Record<string, any>,
    changes: Record<string, any>
  ): Promise<{ row: any; affectedRows: number }> {
    if (!database || !table) throw new Error('Database and table are required');
    if (!key || Object.keys(key).length === 0) throw new Error('Primary key is required');
    if (!changes || Object.keys(changes).length === 0) throw new Error('No changes provided');

    const pool = await this.getPool(connectionId);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const columns = await this.getTableColumns(connectionId, database, table, conn);
      const byName = new Map(columns.map((c) => [c.name, c] as const));
      const pkCols = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
      if (pkCols.length === 0) {
        throw new Error('Table has no primary key; updating rows requires a primary key');
      }
      // Ensure all PK parts provided
      for (const pk of pkCols) {
        if (!(pk in key)) throw new Error(`Missing primary key field: ${pk}`);
      }

      // Validate and coerce change values
      const setClauses: string[] = [];
      const params: any[] = [];
      for (const [colName, rawVal] of Object.entries(changes)) {
        const col = byName.get(colName);
        if (!col) throw new Error(`Unknown column: ${colName}`);
        const coerced = this.coerceValue(rawVal, col);
        this.validateNotNull(coerced, col);
        setClauses.push(`\`${this.escapeIdentifier(colName)}\` = ?`);
        params.push(coerced);
      }
      if (setClauses.length === 0) throw new Error('No valid columns to update');

      // WHERE by PK
      const whereClauses: string[] = [];
      for (const pk of pkCols) {
        const col = byName.get(pk)!;
        const v = this.coerceValue(key[pk], col);
        whereClauses.push(`\`${this.escapeIdentifier(pk)}\` = ?`);
        params.push(v);
      }

      const sql = `UPDATE \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\` SET ${setClauses.join(
        ', '
      )} WHERE ${whereClauses.join(' AND ')}`;

      const [result]: any = await conn.query(sql, params);
      const affectedRows: number = result?.affectedRows || 0;

      // Return updated row snapshot
      const selSql = `SELECT * FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\` WHERE ${whereClauses.join(
        ' AND '
      )}`;
      const [rows] = await conn.query(selSql, params.slice(-pkCols.length));

      await conn.commit();
      return { row: (rows as RowDataPacket[])[0] || null, affectedRows };
    } catch (err) {
      try {
        await conn.rollback();
      } catch {}
      throw err;
    } finally {
      conn.release();
    }
  }

  async insertRow(
    connectionId: string,
    database: string,
    table: string,
    values: Record<string, any>
  ): Promise<{ row: any; insertId?: number }> {
    if (!database || !table) throw new Error('Database and table are required');
    if (!values || Object.keys(values).length === 0) throw new Error('No values provided');

    const pool = await this.getPool(connectionId);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const columns = await this.getTableColumns(connectionId, database, table, conn);
      const byName = new Map(columns.map((c) => [c.name, c] as const));

      // Validate required columns (NOT NULL, no default, not auto_increment)
      for (const col of columns) {
        if (!col.isNullable && !col.hasDefault && !col.isAutoIncrement) {
          if (!(col.name in values) || values[col.name] === undefined || values[col.name] === null) {
            throw new Error(`Missing required value for column ${col.name}`);
          }
        }
      }

      const fieldNames: string[] = [];
      const placeholders: string[] = [];
      const params: any[] = [];
      for (const [name, rawVal] of Object.entries(values)) {
        const col = byName.get(name);
        if (!col) throw new Error(`Unknown column: ${name}`);
        const coerced = this.coerceValue(rawVal, col);
        this.validateNotNull(coerced, col);
        fieldNames.push(`\`${this.escapeIdentifier(name)}\``);
        placeholders.push('?');
        params.push(coerced);
      }

      if (fieldNames.length === 0) throw new Error('No valid columns to insert');

      const sql = `INSERT INTO \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\` (${fieldNames.join(
        ', '
      )}) VALUES (${placeholders.join(', ')})`;
      const [result]: any = await conn.query(sql, params);
      const insertId: number | undefined = result?.insertId && result.insertId !== 0 ? result.insertId : undefined;

      // Build WHERE to fetch inserted row
      let whereSql = '';
      let whereParams: any[] = [];
      const pkCols = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
      if (insertId && pkCols.length === 1) {
        whereSql = `\`${this.escapeIdentifier(pkCols[0])}\` = ?`;
        whereParams = [insertId];
      } else if (pkCols.length > 0 && pkCols.every((k) => k in values)) {
        whereSql = pkCols.map((k) => `\`${this.escapeIdentifier(k)}\` = ?`).join(' AND ');
        whereParams = pkCols.map((k) => this.coerceValue(values[k], byName.get(k)!));
      }

      let row: any = null;
      if (whereSql) {
        const selSql = `SELECT * FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\` WHERE ${whereSql}`;
        const [rows] = await conn.query(selSql, whereParams);
        row = (rows as RowDataPacket[])[0] || null;
      }

      await conn.commit();
      return { row, insertId };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteRow(
    connectionId: string,
    database: string,
    table: string,
    key: Record<string, any>
  ): Promise<{ affectedRows: number }> {
    if (!database || !table) throw new Error('Database and table are required');
    if (!key || Object.keys(key).length === 0) throw new Error('Primary key is required');

    const pool = await this.getPool(connectionId);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const columns = await this.getTableColumns(connectionId, database, table, conn);
      const byName = new Map(columns.map((c) => [c.name, c] as const));
      const pkCols = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
      if (pkCols.length === 0) throw new Error('Table has no primary key; deleting rows requires a primary key');
      for (const pk of pkCols) {
        if (!(pk in key)) throw new Error(`Missing primary key field: ${pk}`);
      }

      const whereClauses: string[] = [];
      const params: any[] = [];
      for (const pk of pkCols) {
        const col = byName.get(pk)!;
        whereClauses.push(`\`${this.escapeIdentifier(pk)}\` = ?`);
        params.push(this.coerceValue(key[pk], col));
      }
      const sql = `DELETE FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(table)}\` WHERE ${whereClauses.join(' AND ')}`;
      const [result]: any = await conn.query(sql, params);
      const affectedRows: number = result?.affectedRows || 0;
      await conn.commit();
      return { affectedRows };
    } catch (err: any) {
      try { await conn.rollback(); } catch {}
      // FK constraint error (MySQL: ER_ROW_IS_REFERENCED_2 errno 1451)
      if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
        err.message = 'Delete would violate foreign key constraints';
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  async batchUpdate(
    connectionId: string,
    database: string,
    table: string,
    updates: Array<{ key: Record<string, any>; changes: Record<string, any> }>,
    atomic: boolean = false
  ): Promise<{ results: Array<{ success: boolean; affectedRows?: number; error?: string }>; totalUpdated: number }>
  {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('No updates provided');
    }

    const pool = await this.getPool(connectionId);
    const conn = await pool.getConnection();
    const results: Array<{ success: boolean; affectedRows?: number; error?: string }> = [];
    let totalUpdated = 0;
    try {
      if (atomic) await conn.beginTransaction();

      for (const u of updates) {
        try {
          if (!atomic) await conn.beginTransaction();
          const single = await this.updateRow(connectionId, database, table, u.key, u.changes);
          results.push({ success: true, affectedRows: single.affectedRows });
          totalUpdated += single.affectedRows;
          if (!atomic) await conn.commit();
        } catch (e: any) {
          if (!atomic) { try { await conn.rollback(); } catch {} }
          results.push({ success: false, error: e?.message || 'Update failed' });
          if (atomic) throw e;
        }
      }

      if (atomic) await conn.commit();
      return { results, totalUpdated };
    } catch (err) {
      if (atomic) { try { await conn.rollback(); } catch {} }
      throw err;
    } finally {
      conn.release();
    }
  }

  async fkLookup(
    connectionId: string,
    database: string,
    table: string,
    column: string,
    q?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ options: Array<{ value: any; label: string }>; total: number; meta: { refTable: string; refColumn: string; labelColumn: string } }>
  {
    if (!database || !table || !column) throw new Error('database, table, and column are required');

    const pool = await this.getPool(connectionId);
    const conn = await pool.getConnection();
    try {
      // Find referenced table/column for FK
      const refSql = `
        SELECT REFERENCED_TABLE_NAME as refTable, REFERENCED_COLUMN_NAME as refColumn
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
      `;
      const [refRows] = await conn.query(refSql, [database, table, column]);
      const ref = (refRows as RowDataPacket[])[0];
      if (!ref) {
        throw new Error(`Column ${column} is not a foreign key`);
      }

      const refTable: string = ref.refTable;
      const refColumn: string = ref.refColumn;

      // Determine a label column: prefer common name columns, else first text column, else value column
      const refColumns = await this.getTableColumns(connectionId, database, refTable, conn);
      const textCols = refColumns.filter((c) => /char|text|varchar|enum/i.test(c.dataType));
      const preferredNames = ['name', 'title', 'label', 'description'];
      let labelColumn = textCols.find((c) => preferredNames.includes(c.name.toLowerCase()))?.name
        || textCols[0]?.name
        || refColumn;

      const valueSel = `\`${this.escapeIdentifier(refColumn)}\``;
      const labelSel = `\`${this.escapeIdentifier(labelColumn)}\``;

      // Build WHERE clause for search
      const whereParts: string[] = [];
      const params: any[] = [];
      if (q && q.trim()) {
        whereParts.push(`(CAST(${valueSel} AS CHAR) LIKE ? OR ${labelSel} LIKE ?)`);
        const like = `%${q}%`;
        params.push(like, like);
      }

      const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

      // Total count
      const countSql = `SELECT COUNT(*) as total FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(refTable)}\` ${whereSql}`;
      const [countRows] = await conn.query(countSql, params);
      const total = Number((countRows as RowDataPacket[])[0]?.total || 0);

      // Page of options
      const selSql = `
        SELECT ${valueSel} as value, ${labelSel} as label
        FROM \`${this.escapeIdentifier(database)}\`.\`${this.escapeIdentifier(refTable)}\`
        ${whereSql}
        ORDER BY label
        LIMIT ? OFFSET ?
      `;
      const [rows] = await conn.query(selSql, [...params, limit, offset]);
      const options = (rows as RowDataPacket[]).map((r) => ({ value: r.value, label: r.label ?? String(r.value) }));

      return { options, total, meta: { refTable, refColumn, labelColumn } };
    } finally {
      conn.release();
    }
  }
}

export const dataEditingService = new DataEditingService();
