import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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

export const performanceApi = {
  /**
   * Get database performance metrics
   */
  async getMetrics(connectionId: string): Promise<DatabaseMetrics> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/metrics`);
    return response.data.metrics;
  },

  /**
   * Get active database connections
   */
  async getActiveConnections(connectionId: string): Promise<ActiveConnection[]> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/connections`);
    return response.data.connections;
  },

  /**
   * Kill a specific query/connection
   */
  async killQuery(connectionId: string, processId: number): Promise<void> {
    await axios.post(`${API_URL}/performance/${connectionId}/kill/${processId}`);
  },

  /**
   * Get slow query log
   */
  async getSlowQueries(connectionId: string, limit: number = 100): Promise<SlowQuery[]> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/slow-queries`, {
      params: { limit },
    });
    return response.data.slowQueries;
  },

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(connectionId: string, database?: string): Promise<IndexUsageStats[]> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/index-usage`, {
      params: { database },
    });
    return response.data.indexStats;
  },

  /**
   * Get query execution statistics
   */
  async getQueryStats(connectionId: string, limit: number = 50): Promise<QueryStats[]> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/query-stats`, {
      params: { limit },
    });
    return response.data.queryStats;
  },

  /**
   * Get table statistics for a database
   */
  async getTableStats(connectionId: string, database: string): Promise<any[]> {
    const response = await axios.get(`${API_URL}/performance/${connectionId}/table-stats/${database}`);
    return response.data.tableStats;
  },
};
