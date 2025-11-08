import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mongodbApi } from '../api/mongodb';
import { MongoDBConnection } from '../types/mongodb';

export function useMongoDBConnections() {
  return useQuery({
    queryKey: ['mongodb-connections'],
    queryFn: async () => {
      const response = await mongodbApi.getAll();
      return response.connections;
    },
  });
}

export function useCreateMongoDBConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionData: Omit<MongoDBConnection, 'id' | 'createdAt'>) => {
      const response = await mongodbApi.create(connectionData);
      return response.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mongodb-connections'] });
    },
  });
}

export function useUpdateMongoDBConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MongoDBConnection> }) => {
      const response = await mongodbApi.update(id, data);
      return response.connection;
    },
    onSuccess: (updatedConnection) => {
      queryClient.invalidateQueries({ queryKey: ['mongodb-connections'] });
      queryClient.setQueryData(['mongodb-connections'], (old: MongoDBConnection[] | undefined) => {
        if (!old) return old;
        return old.map(conn => conn.id === updatedConnection.id ? updatedConnection : conn);
      });
    },
  });
}

export function useDeleteMongoDBConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await mongodbApi.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['mongodb-connections'] });
      queryClient.setQueryData(['mongodb-connections'], (old: MongoDBConnection[] | undefined) => {
        if (!old) return old;
        return old.filter(conn => conn.id !== deletedId);
      });
    },
  });
}

export function useTestMongoDBConnection() {
  return useMutation({
    mutationFn: async ({ uri, options }: { uri: string; options?: any }) => {
      const response = await mongodbApi.test(uri, options);
      return response;
    },
  });
}

export function useConnectToMongoDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await mongodbApi.connect(connectionId);
      return response;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['mongodb-connection-stats', connectionId] });
    },
  });
}

export function useDisconnectFromMongoDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await mongodbApi.disconnect(connectionId);
      return response;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['mongodb-connection-stats', connectionId] });
    },
  });
}

export function useMongoDBConnectionStats(connectionId: string | null) {
  return useQuery({
    queryKey: ['mongodb-connection-stats', connectionId],
    queryFn: async () => {
      if (!connectionId) return null;
      try {
        const response = await mongodbApi.getStats(connectionId);
        return response.stats;
      } catch (error: any) {
        console.error('Error fetching connection stats:', error);
        // Return null instead of throwing to prevent UI breaking
        return null;
      }
    },
    enabled: !!connectionId,
    retry: false, // Don't retry if connection fails
  });
}

export function useMongoDBDatabases(connectionId: string | null) {
  return useQuery({
    queryKey: ['mongodb-databases', connectionId],
    queryFn: async () => {
      if (!connectionId) return [];
      try {
        const response = await mongodbApi.getDatabases(connectionId);
        return response.databases;
      } catch (error: any) {
        console.error('Error fetching databases:', error);
        // Return empty array instead of throwing to prevent UI breaking
        return [];
      }
    },
    enabled: !!connectionId,
    retry: false, // Don't retry if connection fails
  });
}

export function useMongoDBCollections(connectionId: string | null, database: string | null) {
  return useQuery({
    queryKey: ['mongodb-collections', connectionId, database],
    queryFn: async () => {
      if (!connectionId || !database) return [];
      try {
        const response = await mongodbApi.getCollections(connectionId, database);
        return response.collections;
      } catch (error: any) {
        console.error('Error fetching collections:', error);
        // Return empty array instead of throwing to prevent UI breaking
        return [];
      }
    },
    enabled: !!connectionId && !!database,
    retry: false, // Don't retry if connection fails
  });
}

export function useMongoDBDocuments(
  connectionId: string | null,
  database: string | null,
  collection: string | null,
  query: any = {},
  options: {
    limit?: number;
    skip?: number;
    sort?: any;
    projection?: any;
  } = {}
) {
  return useQuery({
    queryKey: ['mongodb-documents', connectionId, database, collection, query, options],
    queryFn: async () => {
      if (!connectionId || !database || !collection) return { documents: [], totalCount: 0, hasMore: false };
      try {
        const response = await mongodbApi.findDocuments(connectionId, database, collection, query, options);
        return response;
      } catch (error: any) {
        console.error('Error fetching documents:', error);
        // Return empty result instead of throwing to prevent UI breaking
        return { documents: [], totalCount: 0, hasMore: false };
      }
    },
    enabled: !!connectionId && !!database && !!collection,
    retry: false, // Don't retry if connection fails
  });
}

export function useInsertMongoDBDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      database,
      collection,
      document,
    }: {
      connectionId: string;
      database: string;
      collection: string;
      document: any;
    }) => {
      const response = await mongodbApi.insertDocument(connectionId, database, collection, document);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: ['mongodb-documents', variables.connectionId, variables.database, variables.collection] 
      });
    },
  });
}

export function useUpdateMongoDBDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      database,
      collection,
      filter,
      update,
      options,
    }: {
      connectionId: string;
      database: string;
      collection: string;
      filter: any;
      update: any;
      options?: { multi?: boolean };
    }) => {
      const response = await mongodbApi.updateDocuments(connectionId, database, collection, filter, update, options);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['mongodb-documents', variables.connectionId, variables.database, variables.collection] 
      });
    },
  });
}

export function useDeleteMongoDBDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      database,
      collection,
      filter,
    }: {
      connectionId: string;
      database: string;
      collection: string;
      filter: any;
    }) => {
      const response = await mongodbApi.deleteDocuments(connectionId, database, collection, filter);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['mongodb-documents', variables.connectionId, variables.database, variables.collection] 
      });
    },
  });
}

export function useAggregateMongoDBDocuments() {
  return useMutation({
    mutationFn: async ({
      connectionId,
      database,
      collection,
      pipeline,
    }: {
      connectionId: string;
      database: string;
      collection: string;
      pipeline: any[];
    }) => {
      const response = await mongodbApi.aggregateDocuments(connectionId, database, collection, pipeline);
      return response;
    },
  });
}