import mysql from 'mysql2/promise';
import { Pool, PoolConnection } from 'mysql2/promise';
import {
  ConnectionConfig,
  ConnectionPoolInfo,
  ConnectionTestResult,
  MySQLPoolOptions,
} from '../types/connection.js';

class ConnectionPoolManager {
  private pools: Map<string, ConnectionPoolInfo> = new Map();
  private readonly defaultPoolOptions: MySQLPoolOptions = {
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  /**
   * Create or get existing connection pool
   */
  async createPool(config: ConnectionConfig): Promise<Pool> {
    // Check if pool already exists
    if (this.pools.has(config.id)) {
      const poolInfo = this.pools.get(config.id)!;
      poolInfo.lastUsed = new Date();
      return poolInfo.pool;
    }

    // Create new pool
    const poolOptions: MySQLPoolOptions = {
      ...this.defaultPoolOptions,
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    };

    const pool = mysql.createPool(poolOptions);

    // Store pool info
    const poolInfo: ConnectionPoolInfo = {
      id: config.id,
      pool,
      config,
      createdAt: new Date(),
      lastUsed: new Date(),
      activeConnections: 0,
    };

    this.pools.set(config.id, poolInfo);

    console.log(`Created connection pool for: ${config.name} (${config.id})`);

    return pool;
  }

  /**
   * Get existing pool by connection ID
   */
  getPool(connectionId: string): Pool | null {
    const poolInfo = this.pools.get(connectionId);
    if (poolInfo) {
      poolInfo.lastUsed = new Date();
      return poolInfo.pool;
    }
    return null;
  }

  /**
   * Test connection without creating a persistent pool
   */
  async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    let connection: any = null;

    try {
      // Create temporary connection
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        connectTimeout: 10000, // 10 seconds
      });

      // Test query to get server version
      const [rows] = await connection.query('SELECT VERSION() as version');
      const serverVersion = (rows as any)[0]?.version || 'Unknown';

      return {
        success: true,
        message: 'Connection successful',
        serverVersion,
      };
    } catch (error: any) {
      console.error('Connection test failed:', error);

      let message = 'Connection failed';
      if (error.code === 'ECONNREFUSED') {
        message = 'Connection refused. Check host and port.';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        message = 'Access denied. Check username and password.';
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        message = 'Unknown database. Check database name.';
      } else if (error.code === 'ETIMEDOUT') {
        message = 'Connection timeout. Check host and firewall settings.';
      }

      return {
        success: false,
        message,
        error: error.message,
      };
    } finally {
      // Clean up temporary connection
      if (connection) {
        try {
          await connection.end();
        } catch (err) {
          console.error('Error closing test connection:', err);
        }
      }
    }
  }

  /**
   * Close and remove a specific pool
   */
  async closePool(connectionId: string): Promise<void> {
    const poolInfo = this.pools.get(connectionId);
    if (!poolInfo) {
      return;
    }

    try {
      await poolInfo.pool.end();
      this.pools.delete(connectionId);
      console.log(`Closed connection pool: ${connectionId}`);
    } catch (error) {
      console.error(`Error closing pool ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Close all pools
   */
  async closeAllPools(): Promise<void> {
    const closePromises = Array.from(this.pools.keys()).map((id) => this.closePool(id));
    await Promise.all(closePromises);
    console.log('All connection pools closed');
  }

  /**
   * Get pool statistics
   */
  getPoolStats(connectionId: string): any {
    const poolInfo = this.pools.get(connectionId);
    if (!poolInfo) {
      return null;
    }

    return {
      id: poolInfo.id,
      name: poolInfo.config.name,
      createdAt: poolInfo.createdAt,
      lastUsed: poolInfo.lastUsed,
      // Note: mysql2 doesn't expose all pool stats, but we can track what we maintain
    };
  }

  /**
   * Get all active pools
   */
  getAllPoolStats(): any[] {
    return Array.from(this.pools.values()).map((poolInfo) => ({
      id: poolInfo.id,
      name: poolInfo.config.name,
      host: poolInfo.config.host,
      database: poolInfo.config.database,
      createdAt: poolInfo.createdAt,
      lastUsed: poolInfo.lastUsed,
    }));
  }

  /**
   * Clean up idle pools (older than 30 minutes)
   */
  async cleanupIdlePools(): Promise<void> {
    const now = new Date();
    const idleTimeout = 30 * 60 * 1000; // 30 minutes

    const poolsToClose: string[] = [];

    for (const [id, poolInfo] of this.pools.entries()) {
      const idleTime = now.getTime() - poolInfo.lastUsed.getTime();
      if (idleTime > idleTimeout) {
        poolsToClose.push(id);
      }
    }

    for (const id of poolsToClose) {
      await this.closePool(id);
      console.log(`Cleaned up idle pool: ${id}`);
    }
  }

  /**
   * Execute query on a specific connection
   */
  async executeQuery(
    connectionId: string,
    query: string,
    params?: any[],
  ): Promise<any> {
    const pool = this.getPool(connectionId);
    if (!pool) {
      throw new Error(
        `No active pool found for connection: ${connectionId}. Please connect first to create a pool (Connections → Connect).`
      );
    }

    try {
      const [rows, fields] = await pool.query(query, params);
      return { rows, fields };
    } catch (error: any) {
      console.error('Query execution error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const connectionPoolManager = new ConnectionPoolManager();
