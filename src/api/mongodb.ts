import { api } from './client';
import { MongoDBConnection, MongoDBConnectionTestResult, MongoDBConnectionStats } from '../types/mongodb';

export const mongodbApi = {
  // Get all connections
  getAll: () => api.get<{ connections: MongoDBConnection[] }>('/mongodb/connections'),

  // Get single connection
  getById: (id: string) => api.get<{ connection: MongoDBConnection }>(`/mongodb/connections/${id}`),

  // Create new connection
  create: (data: Omit<MongoDBConnection, 'id' | 'createdAt'>) =>
    api.post<{ connection: MongoDBConnection }>('/mongodb/connections', data),

  // Update connection
  update: (id: string, data: Partial<MongoDBConnection>) =>
    api.put<{ connection: MongoDBConnection }>(`/mongodb/connections/${id}`, data),

  // Delete connection
  delete: (id: string) => api.delete<{ message: string }>(`/mongodb/connections/${id}`),

  // Test connection
  test: (uri: string, options?: any) =>
    api.post<MongoDBConnectionTestResult>('/mongodb/test', { uri, options }),

  // Connect to database
  connect: (id: string) =>
    api.post<{ message: string; connectionId: string }>(`/mongodb/${id}/connect`),

  // Disconnect from database
  disconnect: (id: string) =>
    api.post<{ message: string }>(`/mongodb/${id}/disconnect`),

  // Get connection statistics
  getStats: (id: string) => api.get<{ stats: MongoDBConnectionStats }>(`/mongodb/${id}/stats`),

  // Get databases
  getDatabases: (connectionId: string) =>
    api.get<{ success: boolean; databases: any[] }>(`/mongodb/${connectionId}/databases`),

  // Get collections
  getCollections: (connectionId: string, database: string) =>
    api.get<{ success: boolean; collections: any[] }>(`/mongodb/${connectionId}/databases/${database}/collections`),

  // Find documents
  findDocuments: (
    connectionId: string,
    database: string,
    collection: string,
    query: any = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: any;
      projection?: any;
    } = {}
  ) => api.get<{ success: boolean; documents: any[]; totalCount: number; hasMore: boolean }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
    {
      params: {
        query: JSON.stringify(query),
        ...Object.fromEntries(
          Object.entries(options).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : value
          ])
        )
      }
    }
  ),

  // Insert document
  insertDocument: (
    connectionId: string,
    database: string,
    collection: string,
    document: any
  ) => api.post<{ success: boolean; insertedId: any }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
    { document }
  ),

  // Insert multiple documents (bulk insert)
  insertManyDocuments: (
    connectionId: string,
    database: string,
    collection: string,
    documents: any[]
  ) => api.post<{ success: boolean; insertedCount: number; insertedIds: any[] }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents/bulk`,
    { documents }
  ),

  // Update documents
  updateDocuments: (
    connectionId: string,
    database: string,
    collection: string,
    filter: any,
    update: any,
    options: { multi?: boolean } = {}
  ) => api.put<{ success: boolean; matchedCount: number; modifiedCount: number }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
    { filter, update, options }
  ),

  // Delete documents
  deleteDocuments: (
    connectionId: string,
    database: string,
    collection: string,
    filter: any
  ) => api.delete<{ success: boolean; deletedCount: number }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
    { data: { filter } }
  ),

  // Aggregate documents
  aggregateDocuments: (
    connectionId: string,
    database: string,
    collection: string,
    pipeline: any[]
  ) => api.post<{ success: boolean; documents: any[] }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/aggregate`,
    { pipeline }
  ),

  // Get indexes
  getIndexes: (
    connectionId: string,
    database: string,
    collection: string
  ) => api.get<{ success: boolean; indexes: any[] }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes`
  ),

  // Create index
  createIndex: (
    connectionId: string,
    database: string,
    collection: string,
    keys: any,
    options?: any
  ) => api.post<{ success: boolean; indexName: string }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes`,
    { keys, options }
  ),

  // Drop index
  dropIndex: (
    connectionId: string,
    database: string,
    collection: string,
    indexName: string
  ) => api.delete<{ success: boolean; message: string }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes/${indexName}`
  ),

  // Analyze schema
  analyzeSchema: (
    connectionId: string,
    database: string,
    collection: string,
    sampleSize?: number
  ) => api.get<{ success: boolean; fields: any[]; totalDocuments: number; sampledDocuments: number }>(
    `/mongodb/${connectionId}/databases/${database}/collections/${collection}/schema`,
    {
      params: sampleSize ? { sampleSize } : undefined
    }
  ),
};