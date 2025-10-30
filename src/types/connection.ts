export type ConnectionEnvironment = 'production' | 'development' | 'staging';

export interface MySQLConnection {
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

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
}
