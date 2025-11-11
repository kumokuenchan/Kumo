import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportCollectionToPostman,
  exportCollectionsToPostman,
  downloadPostmanCollection,
} from '../../../src/utils/postmanExporter';

describe('postmanExporter utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global objects
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
    
    // Create proper Blob constructor
    class MockBlob {
      data: any;
      options: any;
      size: number;
      type: string;
      
      constructor(data: any, options: any = {}) {
        this.data = data;
        this.options = options;
        this.size = Array.isArray(data) ? data.length : (data?.length || 0);
        this.type = options?.type || '';
      }
    }
    global.Blob = MockBlob;
    
    // Mock document
    const mockElement = {
      href: '',
      download: '',
      click: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      parentNode: null,
    };
    document.createElement = vi.fn().mockReturnValue(mockElement);
    
    // Mock document.body for JSDOM by appending to actual body
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  const mockCollection = {
    id: 'collection-1',
    name: 'Test Collection',
    description: 'A test collection for API requests',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    requests: [
      {
        id: 'req-1',
        name: 'Get Users',
        description: 'Get all users from the API',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          headers: {
            'Authorization': 'Bearer token123',
            'Accept': 'application/json',
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  describe('exportCollectionToPostman', () => {
    it('should export collection with correct structure', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection).toHaveProperty('info');
      expect(postmanCollection).toHaveProperty('item');
      expect(postmanCollection.info.name).toBe('Test Collection');
      expect(postmanCollection.info.description).toBe('A test collection for API requests');
      expect(postmanCollection.info.schema).toBe('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
      expect(postmanCollection.info._postman_id).toBe('collection-1');
    });

    it('should export requests correctly', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection.item).toHaveLength(1);
      expect(postmanCollection.item[0].name).toBe('Get Users');
    });

    it('should convert GET request correctly', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      const getRequest = postmanCollection.item[0];
      expect(getRequest.request.method).toBe('GET');
      expect(getRequest.request.url.raw).toBe('https://api.example.com/users');
      expect(getRequest.request.header).toHaveLength(2);
    });

    it('should convert headers to Postman format', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      const headers = postmanCollection.item[0].request.header;
      expect(headers).toEqual([
        {
          key: 'Authorization',
          value: 'Bearer token123',
          type: 'text',
        },
        {
          key: 'Accept',
          value: 'application/json',
          type: 'text',
        },
      ]);
    });
  });

  describe('exportCollectionsToPostman', () => {
    it('should export single collection', () => {
      const result = exportCollectionsToPostman([mockCollection]);
      
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['test_collection.postman_collection.json']).toBeDefined();
    });

    it('should export empty collection list', () => {
      const result = exportCollectionsToPostman([]);
      
      expect(result).toEqual({});
    });
  });

  describe('downloadPostmanCollection', () => {
    it('should trigger download with correct parameters', () => {
      global.URL.createObjectURL.mockReturnValue('blob:mock-url');
      
      downloadPostmanCollection(mockCollection);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });
});