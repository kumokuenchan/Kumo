export type MongoDBConnectionEnvironment = 'production' | 'development' | 'staging';

export interface MongoDBConnection {
  id: string;
  name: string;
  group?: string;
  environment?: MongoDBConnectionEnvironment;
  uri: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
    retryWrites?: boolean;
    retryReads?: boolean;
  };
  createdAt: string;
  lastUsed?: string;
}

export interface MongoDBConnectionStatus {
  connected: boolean;
  error?: string;
}

export interface MongoDBConnectionTestResult {
  success: boolean;
  message: string;
  serverInfo?: {
    version: string;
    gitVersion: string;
  };
  error?: string;
}

export interface MongoDBDatabase {
  name: string;
  collections: string[];
  size?: number;
}

export interface MongoDBCollection {
  name: string;
  documentCount: number;
  size?: number;
  avgObjSize?: number;
  indexes: Array<{
    name: string;
    key: any;
    unique?: boolean;
  }>;
}

export interface MongoDBDocument {
  _id: any;
  [key: string]: any;
}

export interface MongoDBQueryResult {
  documents: MongoDBDocument[];
  totalCount: number;
  hasMore: boolean;
}

export interface MongoDBQueryOptions {
  limit?: number;
  skip?: number;
  sort?: any;
  projection?: any;
}

export interface MongoDBOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface MongoDBAggregationResult {
  success: boolean;
  documents: any[];
  error?: string;
}

export interface MongoDBConnectionStats {
  id: string;
  name: string;
  uri: string;
  connectedAt: string;
  lastUsed: string;
}