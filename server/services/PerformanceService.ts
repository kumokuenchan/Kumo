import { connectionPoolManager } from './ConnectionPoolManager.js';
import type { RowDataPacket } from 'mysql2';

export interface DatabaseMetrics {
  connections: {
    current: number;
    max: number;
    running: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cache: {
    hitRate: number;
    size: number;
  };
  queries: {
    total: number;
    perSecond: number;
  };
  uptime: number;
}

export interface ActiveConnection {
  id: number;
  user: string;
  host: string;
  db: string | null;
  command: string;
  time: number;
  state: string | null;
  info: string | null;
}

export interface SlowQuery {
  query_time: number;
  lock_time: number;
  rows_sent: number;
  rows_examined: number;
  sql_text: string;
  start_time: string;
}

export interface IndexUsageStats {
  table_schema: string;
  table_name: string;
  index_name: string;
  rows_read: number;
  rows_read_avg: number;
}

export interface QueryStats {
  digest_text: string;
  count_star: number;
  avg_timer_wait: number;
  sum_rows_examined: number;
  sum_rows_sent: number;
  first_seen: string;
  last_seen: string;
}

class PerformanceService {
  /**
   * Get comprehensive database metrics
   */
  async getDatabaseMetrics(connectionId: string): Promise<DatabaseMetrics> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      // Get connection stats
      const [connectionStats] = await pool.query<RowDataPacket[]>(
        "SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Max_used_connections', 'Threads_running')"
      );

      // Get memory stats (if available)
      const [memoryStats] = await pool.query<RowDataPacket[]>(
        "SHOW STATUS WHERE Variable_name LIKE '%memory%' OR Variable_name = 'Innodb_buffer_pool_bytes_data'"
      );

      // Get cache hit rate
      const [cacheStats] = await pool.query<RowDataPacket[]>(
        `SHOW STATUS WHERE Variable_name IN (
          'Innodb_buffer_pool_read_requests',
          'Innodb_buffer_pool_reads',
          'Innodb_buffer_pool_size'
        )`
      );

      // Get query stats
      const [queryStats] = await pool.query<RowDataPacket[]>(
        "SHOW GLOBAL STATUS WHERE Variable_name IN ('Questions', 'Uptime')"
      );

      // Parse connection stats
      const connections = {
        current: parseInt(connectionStats.find(s => s.Variable_name === 'Threads_connected')?.Value || '0'),
        max: parseInt(connectionStats.find(s => s.Variable_name === 'Max_used_connections')?.Value || '0'),
        running: parseInt(connectionStats.find(s => s.Variable_name === 'Threads_running')?.Value || '0'),
      };

      // Parse memory stats
      const bufferPoolSize = parseInt(
        cacheStats.find(s => s.Variable_name === 'Innodb_buffer_pool_size')?.Value || '0'
      );
      const bufferPoolData = parseInt(
        memoryStats.find(s => s.Variable_name === 'Innodb_buffer_pool_bytes_data')?.Value || '0'
      );

      const memory = {
        used: bufferPoolData,
        total: bufferPoolSize,
        percentage: bufferPoolSize > 0 ? (bufferPoolData / bufferPoolSize) * 100 : 0,
      };

      // Calculate cache hit rate
      const readRequests = parseInt(
        cacheStats.find(s => s.Variable_name === 'Innodb_buffer_pool_read_requests')?.Value || '0'
      );
      const reads = parseInt(
        cacheStats.find(s => s.Variable_name === 'Innodb_buffer_pool_reads')?.Value || '0'
      );
      const hitRate = readRequests > 0 ? ((readRequests - reads) / readRequests) * 100 : 0;

      const cache = {
        hitRate: Math.round(hitRate * 100) / 100,
        size: bufferPoolSize,
      };

      // Parse query stats
      const totalQueries = parseInt(
        queryStats.find(s => s.Variable_name === 'Questions')?.Value || '0'
      );
      const uptime = parseInt(
        queryStats.find(s => s.Variable_name === 'Uptime')?.Value || '1'
      );

      const queries = {
        total: totalQueries,
        perSecond: Math.round((totalQueries / uptime) * 100) / 100,
      };

      return {
        connections,
        memory,
        cache,
        queries,
        uptime,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch database metrics: ${error.message}`);
    }
  }

  /**
   * Get active connections
   */
  async getActiveConnections(connectionId: string): Promise<ActiveConnection[]> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      const [connections] = await pool.query<RowDataPacket[]>('SHOW FULL PROCESSLIST');

      return connections.map(conn => ({
        id: conn.Id,
        user: conn.User,
        host: conn.Host,
        db: conn.db,
        command: conn.Command,
        time: conn.Time,
        state: conn.State,
        info: conn.Info,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch active connections: ${error.message}`);
    }
  }

  /**
   * Kill a specific query/connection
   */
  async killQuery(connectionId: string, processId: number): Promise<void> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      await pool.query('KILL ?', [processId]);
    } catch (error: any) {
      throw new Error(`Failed to kill query ${processId}: ${error.message}`);
    }
  }

  /**
   * Get slow query log (if enabled)
   */
  async getSlowQueries(connectionId: string, limit: number = 100): Promise<SlowQuery[]> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      // Check if slow query log is enabled
      const [logStatus] = await pool.query<RowDataPacket[]>(
        "SHOW VARIABLES LIKE 'slow_query_log'"
      );

      if (logStatus[0]?.Value !== 'ON') {
        return [];
      }

      // Try to get slow queries from performance schema
      const [slowQueries] = await pool.query<RowDataPacket[]>(
        `SELECT
          ROUND(timer_wait / 1000000000000, 2) as query_time,
          ROUND(lock_time / 1000000000000, 2) as lock_time,
          rows_sent,
          rows_examined,
          SUBSTRING(sql_text, 1, 500) as sql_text,
          timer_start as start_time
        FROM performance_schema.events_statements_history_long
        WHERE timer_wait > 1000000000000
        ORDER BY timer_wait DESC
        LIMIT ?`,
        [limit]
      );

      return slowQueries.map(q => ({
        query_time: q.query_time,
        lock_time: q.lock_time,
        rows_sent: q.rows_sent,
        rows_examined: q.rows_examined,
        sql_text: q.sql_text,
        start_time: q.start_time,
      }));
    } catch (error: any) {
      // If performance_schema is not available, return empty array
      console.warn('Performance schema not available:', error.message);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(connectionId: string, database?: string): Promise<IndexUsageStats[]> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      let query = `
        SELECT
          table_schema,
          table_name,
          index_name,
          COUNT(*) as rows_read,
          AVG(rows_read) as rows_read_avg
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE index_name IS NOT NULL
      `;

      const params: any[] = [];
      if (database) {
        query += ' AND table_schema = ?';
        params.push(database);
      }

      query += `
        GROUP BY table_schema, table_name, index_name
        ORDER BY rows_read DESC
        LIMIT 100
      `;

      const [indexStats] = await pool.query<RowDataPacket[]>(query, params);

      return indexStats.map(stat => ({
        table_schema: stat.table_schema,
        table_name: stat.table_name,
        index_name: stat.index_name,
        rows_read: parseInt(stat.rows_read || '0'),
        rows_read_avg: parseFloat(stat.rows_read_avg || '0'),
      }));
    } catch (error: any) {
      console.warn('Failed to fetch index usage stats:', error.message);
      return [];
    }
  }

  /**
   * Get query execution statistics
   */
  async getQueryStats(connectionId: string, limit: number = 50): Promise<QueryStats[]> {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      const [queryStats] = await pool.query<RowDataPacket[]>(
        `SELECT
          DIGEST_TEXT as digest_text,
          COUNT_STAR as count_star,
          AVG_TIMER_WAIT / 1000000000000 as avg_timer_wait,
          SUM_ROWS_EXAMINED as sum_rows_examined,
          SUM_ROWS_SENT as sum_rows_sent,
          FIRST_SEEN as first_seen,
          LAST_SEEN as last_seen
        FROM performance_schema.events_statements_summary_by_digest
        WHERE DIGEST_TEXT IS NOT NULL
        ORDER BY COUNT_STAR DESC
        LIMIT ?`,
        [limit]
      );

      return queryStats.map(stat => ({
        digest_text: stat.digest_text,
        count_star: parseInt(stat.count_star || '0'),
        avg_timer_wait: parseFloat(stat.avg_timer_wait || '0'),
        sum_rows_examined: parseInt(stat.sum_rows_examined || '0'),
        sum_rows_sent: parseInt(stat.sum_rows_sent || '0'),
        first_seen: stat.first_seen,
        last_seen: stat.last_seen,
      }));
    } catch (error: any) {
      console.warn('Failed to fetch query stats:', error.message);
      return [];
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(connectionId: string, database: string) {
    const pool = connectionPoolManager.getPool(connectionId);

    try {
      const [tableStats] = await pool.query<RowDataPacket[]>(
        `SELECT
          table_name,
          table_rows,
          data_length,
          index_length,
          data_free,
          auto_increment,
          create_time,
          update_time
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY data_length DESC`,
        [database]
      );

      return tableStats;
    } catch (error: any) {
      throw new Error(`Failed to fetch table stats: ${error.message}`);
    }
  }
}

export const performanceService = new PerformanceService();
