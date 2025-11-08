import { MongoClient, Db, Collection, Document } from 'mongodb';

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
      const clientOptions = {
        ...this.defaultOptions,
        ...options,
      };

      client = new MongoClient(uri, clientOptions);
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
      const clientOptions = {
        ...this.defaultOptions,
        ...config.options,
      };

      const client = new MongoClient(config.uri, clientOptions);
      await client.connect();

      const connection: MongoDBConnection = {
        client,
        config,
        connectedAt: new Date(),
        lastUsed: new Date(),
      };

      this.connections.set(config.id, connection);
      
      console.log(`Created MongoDB connection: ${config.name} (${config.id})`);

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
        console.log(`Closed MongoDB connection: ${connectionId}`);
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
    console.log('All MongoDB connections closed');
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
      console.log(`Cleaned up idle MongoDB connection: ${id}`);
    }
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService();