import { RowDataPacket, FieldPacket, OkPacket, ResultSetHeader } from 'mysql2';
import { connectionPoolManager } from './ConnectionPoolManager.js';

export interface SimpleField {
  name: string;
  type: string;
  columnType: number;
}

export interface QueryResult {
  type: 'select' | 'insert' | 'update' | 'delete' | 'ddl' | 'other';
  rows?: any[];
  fields?: SimpleField[];
  affectedRows?: number;
  insertId?: number;
  changedRows?: number;
  warningCount?: number;
  message?: string;
  executionTime: number;
  rowCount: number;
}

export interface QueryExecutionResult {
  success: boolean;
  results: QueryResult[];
  totalTime: number;
  error?: string;
}

export interface PaginatedQueryResult {
  rows: any[];
  fields: SimpleField[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTime: number;
}

export interface ExplainRow {
  id: number;
  select_type: string;
  table: string | null;
  partitions: string | null;
  type: string | null;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number | null;
  filtered: number | null;
  Extra: string | null;
}

export interface ExplainAnalysis {
  executionPlan: ExplainRow[];
  suggestions: string[];
  totalCost: {
    estimatedRows: number;
    tablesUsed: number;
    indexesUsed: number;
  };
  warnings: {
    type: 'warning' | 'error' | 'info';
    message: string;
  }[];
  executionTime: number;
}

interface ActiveQuery {
  connectionId: number;
  startTime: number;
  sql: string;
}

class QueryService {
  private activeQueries: Map<string, ActiveQuery> = new Map();

  /**
   * Execute a single SQL query with timing
   */
  async executeQuery(
    connectionId: string,
    sql: string,
    params?: any[]
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const queryId = `${connectionId}_${startTime}`;

    // Track active query
    this.activeQueries.set(queryId, {
      connectionId: 0, // Will be updated with actual thread ID
      startTime,
      sql: sql.substring(0, 100), // Store first 100 chars for debugging
    });

    try {
      const result = await connectionPoolManager.executeQuery(connectionId, sql, params);
      const executionTime = Date.now() - startTime;

      // Determine query type and format result
      const queryResult = this.formatQueryResult(result, sql, executionTime);

      return queryResult;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      throw {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sql: error.sql,
        sqlState: error.sqlState,
        executionTime,
      };
    } finally {
      this.activeQueries.delete(queryId);
    }
  }

  /**
   * Execute multiple SQL statements
   */
  async executeMultipleStatements(
    connectionId: string,
    sql: string
  ): Promise<QueryExecutionResult> {
    const totalStartTime = Date.now();
    const results: QueryResult[] = [];

    // Split SQL into individual statements
    const statements = this.splitSqlStatements(sql);

    try {
      for (const statement of statements) {
        if (statement.trim()) {
          const result = await this.executeQuery(connectionId, statement);
          results.push(result);
        }
      }

      return {
        success: true,
        results,
        totalTime: Date.now() - totalStartTime,
      };
    } catch (error: any) {
      return {
        success: false,
        results,
        totalTime: Date.now() - totalStartTime,
        error: error.message || 'Query execution failed',
      };
    }
  }

  /**
   * Execute query with pagination
   */
  async executeQueryWithPagination(
    connectionId: string,
    sql: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<PaginatedQueryResult> {
    const startTime = Date.now();

    // First, get total count if it's a SELECT query
    let totalRows = 0;
    const trimmedSql = this.stripLeadingComments(sql).toLowerCase();

    if (trimmedSql.startsWith('select')) {
      // Extract the count (simplified approach)
      const countSql = this.convertToCountQuery(sql);
      try {
        const countResult = await connectionPoolManager.executeQuery(
          connectionId,
          countSql
        );
        totalRows = (countResult.rows[0] as any)?.total || 0;
      } catch (error) {
        console.error('Error getting count:', error);
        totalRows = 0;
      }
    }

    // Add LIMIT and OFFSET to the query
    const offset = (page - 1) * pageSize;
    const paginatedSql = `${sql.trim().replace(/;$/, '')} LIMIT ${pageSize} OFFSET ${offset}`;

    const result = await connectionPoolManager.executeQuery(connectionId, paginatedSql);
    const executionTime = Date.now() - startTime;

    const totalPages = Math.ceil(totalRows / pageSize);

    // Transform fields to simple format
    const simpleFields: SimpleField[] = result.fields?.map(field => ({
      name: field.name,
      type: field.type.toString(),
      columnType: field.columnType,
    })) || [];

    return {
      rows: result.rows,
      fields: simpleFields,
      totalRows,
      page,
      pageSize,
      totalPages,
      executionTime,
    };
  }

  /**
   * Remove leading SQL comments and whitespace to detect statement type reliably
   */
  private stripLeadingComments(sql: string): string {
    let s = sql || '';
    let prev = '';
    while (s !== prev) {
      prev = s;
      s = s.trimStart();
      // Remove leading line comments -- ... (until newline)
      if (s.startsWith('--')) {
        const newline = s.indexOf('\n');
        s = newline === -1 ? '' : s.slice(newline + 1);
        continue;
      }
      // Remove leading block comments /* ... */
      if (s.startsWith('/*')) {
        const end = s.indexOf('*/');
        s = end === -1 ? '' : s.slice(end + 2);
        continue;
      }
      // Remove stray leading semicolons
      if (s.startsWith(';')) {
        s = s.slice(1);
        continue;
      }
    }
    return s.trimStart();
  }

  /**
   * Cancel a running query by connection ID
   */
  async cancelQuery(connectionId: string): Promise<boolean> {
    try {
      // Find active queries for this connection
      const activeQuery = Array.from(this.activeQueries.entries()).find(
        ([key]) => key.startsWith(connectionId)
      );

      if (!activeQuery) {
        return false; // No active query found
      }

      const [queryId, query] = activeQuery;

      // Get the MySQL connection/thread ID
      const threadIdResult = await connectionPoolManager.executeQuery(
        connectionId,
        'SELECT CONNECTION_ID() as threadId'
      );
      const threadId = (threadIdResult.rows[0] as any)?.threadId;

      if (threadId) {
        // Kill the query using MySQL KILL QUERY command
        await connectionPoolManager.executeQuery(
          connectionId,
          `KILL QUERY ${threadId}`
        );
        this.activeQueries.delete(queryId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error canceling query:', error);
      return false;
    }
  }

  /**
   * Format query result based on type
   */
  private formatQueryResult(
    result: { rows: any[]; fields?: FieldPacket[] },
    sql: string,
    executionTime: number
  ): QueryResult {
    const trimmedSql = sql.trim().toLowerCase();

    // Determine query type
    let type: QueryResult['type'] = 'other';
    if (trimmedSql.startsWith('select')) {
      type = 'select';
    } else if (trimmedSql.startsWith('insert')) {
      type = 'insert';
    } else if (trimmedSql.startsWith('update')) {
      type = 'update';
    } else if (trimmedSql.startsWith('delete')) {
      type = 'delete';
    } else if (
      trimmedSql.startsWith('create') ||
      trimmedSql.startsWith('alter') ||
      trimmedSql.startsWith('drop') ||
      trimmedSql.startsWith('truncate')
    ) {
      type = 'ddl';
    }

    // Fallback: if fields present, treat as SELECT
    if (type !== 'select' && Array.isArray(result.fields) && Array.isArray(result.rows)) {
      type = 'select';
    }

    // Format result based on type
    if (type === 'select') {
      // Transform fields to simple format
      const simpleFields: SimpleField[] | undefined = result.fields?.map(field => ({
        name: field.name,
        type: field.type.toString(),
        columnType: field.columnType,
      }));

      // Process rows to handle DATE fields (columnType 10)
      const processedRows = result.rows.map(row => {
        const processedRow: any = {};
        for (const [key, value] of Object.entries(row)) {
          // Find the field definition
          const field = result.fields?.find(f => f.name === key);
          
          if (field && field.columnType === 10 && value instanceof Date) {
            // This is a DATE field, format as YYYY-MM-DD using local date methods
            // to avoid timezone conversion issues
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            processedRow[key] = `${year}-${month}-${day}`;
          } else {
            processedRow[key] = value;
          }
        }
        return processedRow;
      });

      return {
        type,
        rows: processedRows,
        fields: simpleFields,
        rowCount: processedRows.length,
        executionTime,
      };
    } else {
      // For INSERT, UPDATE, DELETE, DDL
      const okPacket = result.rows as any;
      return {
        type,
        affectedRows: okPacket.affectedRows,
        insertId: okPacket.insertId,
        changedRows: okPacket.changedRows,
        warningCount: okPacket.warningCount,
        message: okPacket.message,
        rowCount: okPacket.affectedRows || 0,
        executionTime,
      };
    }
  }

  /**
   * Split SQL string into individual statements
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let commentType = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      // Handle string literals
      if ((char === '"' || char === "'") && !inComment) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Handle comments
      if (!inString) {
        if (char === '-' && nextChar === '-') {
          inComment = true;
          commentType = 'line';
        } else if (char === '/' && nextChar === '*') {
          inComment = true;
          commentType = 'block';
        } else if (commentType === 'line' && char === '\n') {
          inComment = false;
        } else if (commentType === 'block' && char === '*' && nextChar === '/') {
          inComment = false;
          i++; // Skip the '/'
          continue;
        }
      }

      // Handle statement separator
      if (char === ';' && !inString && !inComment) {
        currentStatement += char;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }

      currentStatement += char;
    }

    // Add the last statement if it's not empty
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements.filter(s => s.length > 0);
  }

  /**
   * Convert SELECT query to COUNT query
   */
  private convertToCountQuery(sql: string): string {
    // Simple approach: wrap the query
    // More sophisticated: parse and replace SELECT clause
    const trimmedSql = sql.trim().replace(/;$/, '');
    return `SELECT COUNT(*) as total FROM (${trimmedSql}) as count_query`;
  }

  /**
   * Analyze query performance using EXPLAIN
   */
  async analyzeQuery(connectionId: string, sql: string): Promise<ExplainAnalysis> {
    const startTime = Date.now();

    // Clean up the SQL
    const trimmedSql = sql.trim().replace(/;$/, '');

    // Execute EXPLAIN
    const explainSql = `EXPLAIN ${trimmedSql}`;

    const result = await connectionPoolManager.executeQuery(connectionId, explainSql);

    const executionTime = Date.now() - startTime;

    // Extract rows from result - executeQuery returns { rows, fields }
    const rows = result.rows || [];

    // Ensure rows is an array and filter out any invalid entries
    let explainRows: ExplainRow[] = [];
    if (Array.isArray(rows)) {
      explainRows = rows.filter(r => r && typeof r === 'object');
    } else if (rows && typeof rows === 'object') {
      explainRows = [rows];
    }

    // Analyze the execution plan
    const suggestions: string[] = [];
    const warnings: Array<{type: 'warning' | 'error' | 'info'; message: string}> = [];

    let totalEstimatedRows = 0;
    const tablesUsed = new Set<string>();
    const indexesUsed = new Set<string>();

    // Safely iterate over explain rows
    for (let index = 0; index < explainRows.length; index++) {
      const row = explainRows[index];
      if (!row) continue;

      // Ensure numeric fields are actually numbers
      if (row.rows) {
        const rowCount = typeof row.rows === 'number' ? row.rows : parseInt(String(row.rows), 10) || 0;
        totalEstimatedRows += rowCount;
      }

      if (row.table) tablesUsed.add(String(row.table));
      if (row.key) indexesUsed.add(String(row.key));

      // Check for table scans
      if (row.type === 'ALL') {
        warnings.push({
          type: 'warning',
          message: `Full table scan on ${row.table || 'table'}. Consider adding an index.`
        });
        suggestions.push(`Add an index to ${row.table} table${row.possible_keys ? ` (possible keys: ${row.possible_keys})` : ''}`);
      }

      // Check for filesort
      if (row.Extra?.includes('Using filesort')) {
        warnings.push({
          type: 'warning',
          message: `Filesort operation detected on ${row.table}. This can be slow for large datasets.`
        });
        suggestions.push(`Consider adding a covering index to avoid filesort on ${row.table}`);
      }

      // Check for temporary table
      if (row.Extra?.includes('Using temporary')) {
        warnings.push({
          type: 'warning',
          message: `Temporary table created for ${row.table}. This increases memory usage.`
        });
        suggestions.push(`Optimize query to avoid temporary table creation`);
      }

      // Check for index usage
      if (!row.key && row.table && row.type !== 'system' && row.type !== 'const') {
        suggestions.push(`No index used for ${row.table}. Consider creating an index on frequently queried columns.`);
      }

      // Check for large row estimates
      if (row.rows && row.rows > 10000) {
        warnings.push({
          type: 'info',
          message: `Large number of rows to scan (${row.rows.toLocaleString()}) from ${row.table}.`
        });
      }

      // Check for good index usage
      if (row.type === 'ref' || row.type === 'eq_ref' || row.type === 'const') {
        if (index === 0) {
          warnings.push({
            type: 'info',
            message: `Efficient ${row.type} access on ${row.table} using index ${row.key}.`
          });
        }
      }
    }

    // Overall suggestions
    if (totalEstimatedRows > 100000) {
      suggestions.push('Consider adding LIMIT clause to reduce result set size.');
    }

    if (indexesUsed.size === 0 && tablesUsed.size > 0) {
      suggestions.push('No indexes are being used. This query may be slow on large datasets.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Query execution plan looks good! No major optimizations needed.');
    }

    // Remove duplicates from suggestions
    const uniqueSuggestions = Array.from(new Set(suggestions));

    // Normalize the execution plan data to ensure proper types
    const normalizedPlan = explainRows.map(row => ({
      id: typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10) || 0,
      select_type: String(row.select_type || ''),
      table: row.table ? String(row.table) : null,
      partitions: row.partitions ? String(row.partitions) : null,
      type: row.type ? String(row.type) : null,
      possible_keys: row.possible_keys ? String(row.possible_keys) : null,
      key: row.key ? String(row.key) : null,
      key_len: row.key_len ? String(row.key_len) : null,
      ref: row.ref ? String(row.ref) : null,
      rows: row.rows ? (typeof row.rows === 'number' ? row.rows : parseInt(String(row.rows), 10) || null) : null,
      filtered: row.filtered ? (typeof row.filtered === 'number' ? row.filtered : parseFloat(String(row.filtered)) || null) : null,
      Extra: row.Extra ? String(row.Extra) : null,
    }));

    return {
      executionPlan: normalizedPlan,
      suggestions: uniqueSuggestions,
      totalCost: {
        estimatedRows: totalEstimatedRows,
        tablesUsed: tablesUsed.size,
        indexesUsed: indexesUsed.size,
      },
      warnings,
      executionTime,
    };
  }

  /**
   * Get statistics about query execution
   */
  getQueryStats(result: QueryResult): {
    type: string;
    duration: string;
    rowsAffected: number;
  } {
    return {
      type: result.type.toUpperCase(),
      duration: `${result.executionTime}ms`,
      rowsAffected: result.rowCount,
    };
  }
}

// Export singleton instance
export const queryService = new QueryService();
