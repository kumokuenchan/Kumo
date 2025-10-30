import { Pool, PoolOptions } from 'mysql2/promise';

export type ConnectionEnvironment = 'production' | 'development' | 'staging';

export interface ConnectionConfig {
  id: string;
  name: string;
  group?: string;
  environment?: ConnectionEnvironment;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  sshTunnel?: SSHTunnelConfig;
  createdAt: string;
  lastUsed?: string;
}

export interface SSHTunnelConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface ConnectionPoolInfo {
  id: string;
  pool: Pool;
  config: ConnectionConfig;
  createdAt: Date;
  lastUsed: Date;
  activeConnections: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  error?: string;
}

export interface MySQLPoolOptions extends PoolOptions {
  connectionLimit?: number;
  waitForConnections?: boolean;
  queueLimit?: number;
}
