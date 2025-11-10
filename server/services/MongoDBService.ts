import { MongoClient, Db, Collection, Document } from 'mongodb';
import { EncryptionService } from './EncryptionService.js';

export interface MongoDBConfig {
  id: string;
  name: string;
  uri: string;
  options?: {
    maxPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
    retryWrites?: boolean;
    retryReads?: boolean;
  };
  createdAt: string;
}

export interface MongoDBConnection {
  client: MongoClient;
  config: MongoDBConfig;
  connectedAt: Date;
  lastUsed: Date;
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

class MongoDBService {
  private connections: Map<string, MongoDBConnection> = new Map();
  private readonly defaultOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
  };

  /**
   * Test MongoDB connection without creating persistent connection
   */
  async testConnection(uri: string, options?: any): Promise<{
    success: boolean;
    message: string;
    serverInfo?: any;
    error?: string;
  }> {
    let client: MongoClient | null = null;

    try {
      // Decrypt URI if it's encrypted
      const decryptedUri = EncryptionService.decrypt(uri);
      
      const clientOptions = {
        ...this.defaultOptions,
        ...options,
      };

      client = new MongoClient(decryptedUri, clientOptions);
      await client.connect();

      // Test with a simple command
      const result = await client.db('admin').command({ ping: 1 });
      
      // Get server info
      const serverInfo = await client.db('admin').command({ buildInfo: 1 });

      await client.close();

      return {
        success: true,
        message: 'Connection successful',
        serverInfo: {
          version: serverInfo.version,
          gitVersion: serverInfo.gitVersion,
        },
      };
    } catch (error: any) {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      let message = 'Connection failed';
      if (error.message?.includes('ECONNREFUSED')) {
        message = 'Connection refused. Check host and port.';
      } else if (error.message?.includes('authentication')) {
        message = 'Authentication failed. Check username and password.';
      } else if (error.message?.includes('timeout')) {
        message = 'Connection timeout. Check host and network settings.';
      }

      return {
        success: false,
        message,
        error: error.message,
      };
    }
  }

  /**
   * Create or get existing MongoDB connection
   */
  async createConnection(config: MongoDBConfig): Promise<MongoClient> {
    // Check if connection already exists
    if (this.connections.has(config.id)) {
      const connection = this.connections.get(config.id)!;
      connection.lastUsed = new Date();
      return connection.client;
    }

    try {
      // Decrypt URI if it's encrypted
      const decryptedUri = EncryptionService.decrypt(config.uri);
      
      const clientOptions = {
        ...this.defaultOptions,
        ...config.options,
      };

      const client = new MongoClient(decryptedUri, clientOptions);
      await client.connect();

      const connection: MongoDBConnection = {
        client,
        config,
        connectedAt: new Date(),
        lastUsed: new Date(),
      };

      this.connections.set(config.id, connection);
      
      

      return client;
    } catch (error: any) {
      console.error('Failed to create MongoDB connection:', error);
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  /**
   * Get existing MongoDB connection
   */
  getConnection(connectionId: string): MongoClient | null {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastUsed = new Date();
      return connection.client;
    }
    return null;
  }

  /**
   * Close MongoDB connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        await connection.client.close();
        this.connections.delete(connectionId);
        
      } catch (error) {
        console.error(`Error closing MongoDB connection ${connectionId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Close all MongoDB connections
   */
  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(id => 
      this.closeConnection(id)
    );
    await Promise.all(closePromises);
    
  }

  /**
   * Get all databases
   */
  async getDatabases(connectionId: string): Promise<MongoDBDatabase[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const dbList = await client.db().admin().listDatabases();
      
      const databases: MongoDBDatabase[] = dbList.databases.map(db => ({
        name: db.name,
        collections: [], // Will be populated on-demand
        size: db.sizeOnDisk,
      }));

      return databases;
    } catch (error: any) {
      console.error('Error getting databases:', error);
      throw new Error(`Failed to get databases: ${error.message}`);
    }
  }

  /**
   * Get collections for a database
   */
  async getCollections(connectionId: string, databaseName: string): Promise<MongoDBCollection[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const db = client.db(databaseName);
      const collections = await db.listCollections().toArray();
      
      const collectionInfo: MongoDBCollection[] = [];
      
      for (const coll of collections) {
        const stats = await db.command({ collStats: coll.name });
        const indexes = await db.collection(coll.name).indexes();
        
        collectionInfo.push({
          name: coll.name,
          documentCount: stats.count || 0,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          indexes: indexes.map(index => ({
            name: index.name,
            key: index.key,
            unique: index.unique || false,
          })),
        });
      }

      return collectionInfo;
    } catch (error: any) {
      console.error('Error getting collections:', error);
      throw new Error(`Failed to get collections: ${error.message}`);
    }
  }

  /**
   * Find documents in a collection
   */
  async findDocuments(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    query: any = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: any;
      projection?: any;
    } = {}
  ): Promise<{
    documents: MongoDBDocument[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      
      // Get total count
      const totalCount = await collection.countDocuments(query);
      
      // Build query
      let cursor = collection.find(query);
      
      if (options.projection) {
        cursor = cursor.project(options.projection);
      }
      
      if (options.sort) {
        cursor = cursor.sort(options.sort);
      }
      
      if (options.skip) {
        cursor = cursor.skip(options.skip);
      }
      
      if (options.limit) {
        cursor = cursor.limit(options.limit);
      }
      
      const documents = await cursor.toArray();
      
      const hasMore = totalCount > (options.skip || 0) + documents.length;
      
      return {
        documents: documents as MongoDBDocument[],
        totalCount,
        hasMore,
      };
    } catch (error: any) {
      console.error('Error finding documents:', error);
      throw new Error(`Failed to find documents: ${error.message}`);
    }
  }

  /**
   * Insert a document
   */
  async insertDocument(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    document: any
  ): Promise<{ insertedId: any }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const result = await collection.insertOne(document);

      return { insertedId: result.insertedId };
    } catch (error: any) {
      console.error('Error inserting document:', error);
      throw new Error(`Failed to insert document: ${error.message}`);
    }
  }

  /**
   * Insert multiple documents
   */
  async insertManyDocuments(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    documents: any[]
  ): Promise<{ insertedCount: number; insertedIds: any[] }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const result = await collection.insertMany(documents);

      return {
        insertedCount: result.insertedCount,
        insertedIds: Object.values(result.insertedIds)
      };
    } catch (error: any) {
      console.error('Error inserting documents:', error);
      throw new Error(`Failed to insert documents: ${error.message}`);
    }
  }

  /**
   * Update documents
   */
  async updateDocuments(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    filter: any,
    update: any,
    options: { multi?: boolean } = {}
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const result = await collection.updateMany(filter, update);
      
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      };
    } catch (error: any) {
      console.error('Error updating documents:', error);
      throw new Error(`Failed to update documents: ${error.message}`);
    }
  }

  /**
   * Delete documents
   */
  async deleteDocuments(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    filter: any
  ): Promise<{ deletedCount: number }> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const result = await collection.deleteMany(filter);
      
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error('Error deleting documents:', error);
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Aggregate documents
   */
  async aggregateDocuments(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    pipeline: any[]
  ): Promise<any[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const result = await collection.aggregate(pipeline).toArray();
      
      return result;
    } catch (error: any) {
      console.error('Error aggregating documents:', error);
      throw new Error(`Failed to aggregate documents: ${error.message}`);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(connectionId: string): any {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }

    return {
      id: connection.config.id,
      name: connection.config.name,
      uri: connection.config.uri,
      connectedAt: connection.connectedAt,
      lastUsed: connection.lastUsed,
    };
  }

  /**
   * Get all active connections
   */
  getAllConnectionStats(): any[] {
    return Array.from(this.connections.values()).map(connection => ({
      id: connection.config.id,
      name: connection.config.name,
      uri: connection.config.uri,
      connectedAt: connection.connectedAt,
      lastUsed: connection.lastUsed,
    }));
  }

  /**
   * Get indexes for a collection
   */
  async getIndexes(
    connectionId: string,
    databaseName: string,
    collectionName: string
  ): Promise<any[]> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const indexes = await collection.indexes();
      return indexes;
    } catch (error: any) {
      console.error('Error getting indexes:', error);
      throw new Error(`Failed to get indexes: ${error.message}`);
    }
  }

  /**
   * Create an index
   */
  async createIndex(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    keys: any,
    options?: any
  ): Promise<string> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      const indexName = await collection.createIndex(keys, options);
      return indexName;
    } catch (error: any) {
      console.error('Error creating index:', error);
      throw new Error(`Failed to create index: ${error.message}`);
    }
  }

  /**
   * Drop an index
   */
  async dropIndex(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    indexName: string
  ): Promise<void> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);
      await collection.dropIndex(indexName);
    } catch (error: any) {
      console.error('Error dropping index:', error);
      throw new Error(`Failed to drop index: ${error.message}`);
    }
  }

  /**
   * Analyze collection schema by sampling documents
   */
  async analyzeSchema(
    connectionId: string,
    databaseName: string,
    collectionName: string,
    sampleSize: number = 100
  ): Promise<any> {
    const client = this.getConnection(connectionId);
    if (!client) {
      throw new Error(`No active connection found: ${connectionId}`);
    }

    try {
      const collection = client.db(databaseName).collection(collectionName);

      // Sample documents
      const documents = await collection.aggregate([
        { $sample: { size: sampleSize } }
      ]).toArray();

      if (documents.length === 0) {
        return { fields: [], totalDocuments: 0, sampledDocuments: 0 };
      }

      // Analyze field types and occurrence
      const fieldStats: Map<string, any> = new Map();

      const analyzeObject = (obj: any, prefix: string = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;

          if (!fieldStats.has(fieldPath)) {
            fieldStats.set(fieldPath, {
              name: fieldPath,
              types: new Map(),
              count: 0,
              samples: []
            });
          }

          const stats = fieldStats.get(fieldPath)!;
          stats.count++;

          const type = this.getMongoType(value);
          const currentCount = stats.types.get(type) || 0;
          stats.types.set(type, currentCount + 1);

          // Store sample values (max 5)
          if (stats.samples.length < 5 && value !== null && value !== undefined) {
            stats.samples.push(value);
          }

          // Recursively analyze nested objects
          if (type === 'object' && value !== null) {
            analyzeObject(value, fieldPath);
          }
        }
      };

      documents.forEach(doc => analyzeObject(doc));

      // Convert to array and calculate percentages
      const fields = Array.from(fieldStats.values()).map(stat => ({
        name: stat.name,
        types: Array.from(stat.types.entries()).map(([type, count]) => ({
          type,
          count,
          percentage: ((count / documents.length) * 100).toFixed(1)
        })),
        occurrence: ((stat.count / documents.length) * 100).toFixed(1),
        samples: stat.samples.slice(0, 3) // Return max 3 samples
      }));

      const totalDocuments = await collection.countDocuments();

      return {
        fields: fields.sort((a, b) => a.name.localeCompare(b.name)),
        totalDocuments,
        sampledDocuments: documents.length
      };
    } catch (error: any) {
      console.error('Error analyzing schema:', error);
      throw new Error(`Failed to analyze schema: ${error.message}`);
    }
  }

  /**
   * Helper to determine MongoDB type of a value
   */
  private getMongoType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value && typeof value === 'object' && value._bsontype === 'ObjectID') return 'objectId';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'int' : 'double';
    }
    if (typeof value === 'boolean') return 'boolean';
    return 'unknown';
  }

  /**
   * Clean up idle connections (older than 30 minutes)
   */
  async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const idleTimeout = 30 * 60 * 1000; // 30 minutes

    const connectionsToClose: string[] = [];

    for (const [id, connection] of this.connections.entries()) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      if (idleTime > idleTimeout) {
        connectionsToClose.push(id);
      }
    }

    for (const id of connectionsToClose) {
      await this.closeConnection(id);
      
    }
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService();