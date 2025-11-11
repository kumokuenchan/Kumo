import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mongodbApi } from '../../api/mongodb';
import { api } from '../../api/client';

// Mock the api module
vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('mongodbApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('getAll', () => {
      it('should get all MongoDB connections', async () => {
        const mockResponse = {
          connections: [
            { id: 'conn-1', name: 'Local MongoDB', uri: 'mongodb://localhost:27017' },
            { id: 'conn-2', name: 'Production DB', uri: 'mongodb://prod.example.com:27017' },
          ],
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getAll();

        expect(api.get).toHaveBeenCalledWith('/mongodb/connections');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getById', () => {
      it('should get specific MongoDB connection', async () => {
        const connectionId = 'conn-123';
        const mockResponse = {
          connection: {
            id: connectionId,
            name: 'Local MongoDB',
            uri: 'mongodb://localhost:27017',
            options: { useUnifiedTopology: true },
          },
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getById(connectionId);

        expect(api.get).toHaveBeenCalledWith(`/mongodb/connections/${connectionId}`);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('create', () => {
      it('should create new MongoDB connection', async () => {
        const connectionData = {
          name: 'New MongoDB',
          uri: 'mongodb://localhost:27017',
          options: { useUnifiedTopology: true },
        };

        const mockResponse = {
          connection: {
            id: 'conn-new',
            createdAt: '2024-01-01T00:00:00.000Z',
            ...connectionData,
          },
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.create(connectionData);

        expect(api.post).toHaveBeenCalledWith('/mongodb/connections', connectionData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('update', () => {
      it('should update existing MongoDB connection', async () => {
        const connectionId = 'conn-123';
        const updateData = { name: 'Updated MongoDB', options: { timeout: 5000 } };

        const mockResponse = {
          connection: {
            id: connectionId,
            name: 'Updated MongoDB',
            uri: 'mongodb://localhost:27017',
            options: { timeout: 5000 },
          },
        };

        (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.update(connectionId, updateData);

        expect(api.put).toHaveBeenCalledWith(`/mongodb/connections/${connectionId}`, updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('delete', () => {
      it('should delete MongoDB connection', async () => {
        const connectionId = 'conn-123';
        const mockResponse = { message: 'Connection deleted successfully' };

        (api.delete as vi.MockedFunction<typeof api.delete>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.delete(connectionId);

        expect(api.delete).toHaveBeenCalledWith(`/mongodb/connections/${connectionId}`);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('test', () => {
      it('should test MongoDB connection with URI only', async () => {
        const uri = 'mongodb://localhost:27017';
        const mockResponse = {
          success: true,
          message: 'Connection successful',
          serverInfo: { version: '5.0.0' },
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.test(uri);

        expect(api.post).toHaveBeenCalledWith('/mongodb/test', { uri, options: undefined });
        expect(result).toEqual(mockResponse);
      });

      it('should test MongoDB connection with URI and options', async () => {
        const uri = 'mongodb://localhost:27017';
        const options = { useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 };
        const mockResponse = {
          success: true,
          message: 'Connection successful',
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.test(uri, options);

        expect(api.post).toHaveBeenCalledWith('/mongodb/test', { uri, options });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('connect/disconnect', () => {
      it('should connect to MongoDB', async () => {
        const connectionId = 'conn-123';
        const mockResponse = {
          message: 'Connected to MongoDB',
          connectionId: 'active-conn-123',
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.connect(connectionId);

        expect(api.post).toHaveBeenCalledWith(`/mongodb/${connectionId}/connect`);
        expect(result).toEqual(mockResponse);
      });

      it('should disconnect from MongoDB', async () => {
        const connectionId = 'conn-123';
        const mockResponse = { message: 'Disconnected from MongoDB' };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.disconnect(connectionId);

        expect(api.post).toHaveBeenCalledWith(`/mongodb/${connectionId}/disconnect`);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getStats', () => {
      it('should get connection statistics', async () => {
        const connectionId = 'conn-123';
        const mockResponse = {
          stats: {
            uptime: 3600,
            connections: { current: 5, available: 95 },
            memory: { resident: 128, virtual: 256 },
          },
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getStats(connectionId);

        expect(api.get).toHaveBeenCalledWith(`/mongodb/${connectionId}/stats`);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Database Operations', () => {
    describe('getDatabases', () => {
      it('should get all databases for connection', async () => {
        const connectionId = 'conn-123';
        const mockResponse = {
          success: true,
          databases: ['admin', 'local', 'testdb'],
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getDatabases(connectionId);

        expect(api.get).toHaveBeenCalledWith(`/mongodb/${connectionId}/databases`);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCollections', () => {
      it('should get collections for database', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const mockResponse = {
          success: true,
          collections: ['users', 'products', 'orders'],
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getCollections(connectionId, database);

        expect(api.get).toHaveBeenCalledWith(`/mongodb/${connectionId}/databases/${database}/collections`);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Document Operations', () => {
    describe('findDocuments', () => {
      it('should find documents with basic query', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const query = { active: true };

        const mockResponse = {
          success: true,
          documents: [
            { _id: '1', name: 'John', active: true },
            { _id: '2', name: 'Jane', active: true },
          ],
          totalCount: 2,
          hasMore: false,
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.findDocuments(connectionId, database, collection, query);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          {
            params: {
              query: JSON.stringify(query),
            },
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should find documents with options', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const query = { active: true };
        const options = {
          limit: 10,
          skip: 5,
          sort: { name: 1 },
          projection: { name: 1, email: 1 },
        };

        const mockResponse = {
          success: true,
          documents: [
            { _id: '1', name: 'John', email: 'john@example.com' },
          ],
          totalCount: 15,
          hasMore: true,
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.findDocuments(connectionId, database, collection, query, options);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          {
            params: {
              query: JSON.stringify(query),
              limit: 10,
              skip: 5,
              sort: JSON.stringify(options.sort),
              projection: JSON.stringify(options.projection),
            },
          }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should find documents with empty query', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';

        const mockResponse = {
          success: true,
          documents: [{ _id: '1', name: 'John' }],
          totalCount: 1,
          hasMore: false,
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.findDocuments(connectionId, database, collection);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          { params: { query: '{}' } }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('insertDocument', () => {
      it('should insert single document', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const document = { name: 'John', email: 'john@example.com', active: true };

        const mockResponse = {
          success: true,
          insertedId: '507f1f77bcf86cd799439011',
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.insertDocument(connectionId, database, collection, document);

        expect(api.post).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          { document }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('insertManyDocuments', () => {
      it('should insert multiple documents', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const documents = [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ];

        const mockResponse = {
          success: true,
          insertedCount: 2,
          insertedIds: ['id1', 'id2'],
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.insertManyDocuments(connectionId, database, collection, documents);

        expect(api.post).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents/bulk`,
          { documents }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateDocuments', () => {
      it('should update single document', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const filter = { _id: 'user-123' };
        const update = { $set: { active: true } };
        const options = { multi: false };

        const mockResponse = {
          success: true,
          matchedCount: 1,
          modifiedCount: 1,
        };

        (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.updateDocuments(connectionId, database, collection, filter, update, options);

        expect(api.put).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          { filter, update, options }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should update multiple documents', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const filter = { active: false };
        const update = { $set: { active: true } };
        const options = { multi: true };

        const mockResponse = {
          success: true,
          matchedCount: 5,
          modifiedCount: 5,
        };

        (api.put as vi.MockedFunction<typeof api.put>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.updateDocuments(connectionId, database, collection, filter, update, options);

        expect(api.put).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          { filter, update, options }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteDocuments', () => {
      it('should delete documents by filter', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const filter = { active: false };

        const mockResponse = {
          success: true,
          deletedCount: 3,
        };

        (api.delete as vi.MockedFunction<typeof api.delete>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.deleteDocuments(connectionId, database, collection, filter);

        expect(api.delete).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`,
          { data: { filter } }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('aggregateDocuments', () => {
      it('should execute aggregation pipeline', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'orders';
        const pipeline = [
          { $match: { status: 'completed' } },
          { $group: { _id: '$user_id', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
        ];

        const mockResponse = {
          success: true,
          documents: [
            { _id: 'user1', total: 1500 },
            { _id: 'user2', total: 1200 },
          ],
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.aggregateDocuments(connectionId, database, collection, pipeline);

        expect(api.post).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/aggregate`,
          { pipeline }
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Index Management', () => {
    describe('getIndexes', () => {
      it('should get collection indexes', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const mockResponse = {
          success: true,
          indexes: [
            { name: '_id_', key: { _id: 1 }, unique: true },
            { name: 'email_1', key: { email: 1 }, unique: true },
            { name: 'name_text', key: { name: 'text' } },
          ],
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.getIndexes(connectionId, database, collection);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes`
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('createIndex', () => {
      it('should create simple index', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const keys = { email: 1 };
        const options = { unique: true };

        const mockResponse = {
          success: true,
          indexName: 'email_1',
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.createIndex(connectionId, database, collection, keys, options);

        expect(api.post).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes`,
          { keys, options }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should create compound index', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'orders';
        const keys = { user_id: 1, created_at: -1 };

        const mockResponse = {
          success: true,
          indexName: 'user_id_1_created_at_-1',
        };

        (api.post as vi.MockedFunction<typeof api.post>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.createIndex(connectionId, database, collection, keys);

        expect(api.post).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes`,
          { keys, options: undefined }
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('dropIndex', () => {
      it('should drop specific index', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const indexName = 'email_1';

        const mockResponse = {
          success: true,
          message: 'Index dropped successfully',
        };

        (api.delete as vi.MockedFunction<typeof api.delete>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.dropIndex(connectionId, database, collection, indexName);

        expect(api.delete).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/indexes/${indexName}`
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Schema Analysis', () => {
    describe('analyzeSchema', () => {
      it('should analyze schema with default sample size', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'users';
        const mockResponse = {
          success: true,
          fields: [
            { name: '_id', type: 'ObjectId', presentIn: 100 },
            { name: 'name', type: 'String', presentIn: 100 },
            { name: 'email', type: 'String', presentIn: 95 },
            { name: 'age', type: 'Number', presentIn: 80 },
          ],
          totalDocuments: 1000,
          sampledDocuments: 100,
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.analyzeSchema(connectionId, database, collection);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/schema`,
          { params: undefined }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should analyze schema with custom sample size', async () => {
        const connectionId = 'conn-123';
        const database = 'testdb';
        const collection = 'products';
        const sampleSize = 500;
        const mockResponse = {
          success: true,
          fields: [
            { name: '_id', type: 'ObjectId', presentIn: 500 },
            { name: 'name', type: 'String', presentIn: 500 },
            { name: 'price', type: 'Number', presentIn: 495 },
          ],
          totalDocuments: 10000,
          sampledDocuments: 500,
        };

        (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue(mockResponse);

        const result = await mongodbApi.analyzeSchema(connectionId, database, collection, sampleSize);

        expect(api.get).toHaveBeenCalledWith(
          `/mongodb/${connectionId}/databases/${database}/collections/${collection}/schema`,
          { params: { sampleSize } }
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockRejectedValue(new Error('API Error'));

      await expect(mongodbApi.getAll()).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      (api.post as vi.MockedFunction<typeof api.post>).mockRejectedValue(new Error('Network Error'));

      await expect(mongodbApi.test('mongodb://localhost:27017')).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve MongoDB types', async () => {
      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({
        connections: [],
      });

      const result = await mongodbApi.getAll();
      
      expect(result).toHaveProperty('connections');
      expect(Array.isArray(result.connections)).toBe(true);
    });

    it('should handle complex query objects', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const collection = 'users';
      const complexQuery = {
        $and: [{ active: true }, { age: { $gte: 18 } }],
        $or: [{ role: 'admin' }, { permissions: { $in: ['write'] } }],
      };

      const options = {
        sort: { created_at: -1 },
        projection: { name: 1, email: 1, _id: 0 },
      };

      (api.get as vi.MockedFunction<typeof api.get>).mockResolvedValue({
        success: true,
        documents: [],
        totalCount: 0,
        hasMore: false,
      });

      await mongodbApi.findDocuments(connectionId, database, collection, complexQuery, options);

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining(`/mongodb/${connectionId}/databases/${database}/collections/${collection}/documents`),
        expect.objectContaining({
          params: expect.objectContaining({
            query: JSON.stringify(complexQuery),
            sort: JSON.stringify(options.sort),
            projection: JSON.stringify(options.projection),
          }),
        })
      );
    });
  });
});