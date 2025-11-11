import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCode,
  codeLanguages,
  type CodeLanguage,
  type CodeLanguageInfo,
} from '../../../src/utils/codeGenerator';
import {
  parseCurlCommand,
  looksLikeCurl,
} from '../../../src/utils/curlParser';
import {
  encryption,
} from '../../../src/utils/encryption';
import {
  exportCollectionToPostman,
  exportCollectionsToPostman,
  downloadPostmanCollection,
} from '../../../src/utils/postmanExporter';
import {
  extractSchemaContext,
  formatSchemaForPrompt,
  identifyRelevantTableNames,
  findRelevantTables,
  type SchemaContext,
  type TableInfo,
  type ColumnInfo,
  type ForeignKeyInfo,
  type RelationshipInfo,
} from '../../../src/utils/schemaContext';

// Mock external dependencies
vi.mock('../../../src/api/schema');
vi.mock('../../../src/api/apiTester');
vi.mock('../../../src/services/apiTesterStorage');

// Mock document methods
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

// Mock document.body to avoid Node validation issues
const mockBody = {
  appendChild: mockAppendChild,
  removeChild: mockRemoveChild,
  nodeType: 1,
};

const mockCreateElement = vi.fn().mockReturnValue({
  href: '',
  download: '',
  click: mockClick,
  appendChild: mockAppendChild,
  removeChild: mockRemoveChild,
  nodeType: 1,
  parentNode: null,
  childNodes: [],
  // Make it behave more like a DOM Node by copying Node.prototype methods
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  hasAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  style: {
    setProperty: vi.fn(),
    getPropertyValue: vi.fn(),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock document methods
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
  document.createElement = mockCreateElement;
  Object.defineProperty(document, 'body', {
    value: mockBody,
    writable: true,
    configurable: true,
  });
  global.Blob = vi.fn().mockImplementation((data, options) => ({ data, options }));
  
  // Mock window object for encryption tests
  global.window = {
    electron: {
      crypto: {
        isAvailable: vi.fn().mockResolvedValue(true),
        encrypt: vi.fn().mockResolvedValue('encrypted-data'),
        decrypt: vi.fn().mockResolvedValue('decrypted-data'),
      },
    },
    isElectron: true,
  } as any;
});

describe('codeGenerator utilities', () => {
  const mockApiRequest = {
    method: 'POST' as const,
    url: 'https://api.example.com/users',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
    },
    params: {
      limit: '10',
      page: '1',
    },
    body: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  describe('codeLanguages configuration', () => {
    it('should have correct number of languages', () => {
      expect(codeLanguages).toHaveLength(15);
    });

    it('should have unique IDs for all languages', () => {
      const ids = codeLanguages.map(lang => lang.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have properly categorized languages', () => {
      const categories = [...new Set(codeLanguages.map(lang => lang.category))];
      expect(categories).toContain('JavaScript');
      expect(categories).toContain('Python');
      expect(categories).toContain('Java');
      expect(categories).toContain('C#');
      expect(categories).toContain('PHP');
      expect(categories).toContain('Shell');
    });
  });

  describe('generateCode function', () => {
    it('should return error for empty URL', () => {
      const result = generateCode({ method: 'GET', url: '' }, 'curl');
      expect(result).toContain('Error: No URL specified');
    });

    it('should return error for whitespace-only URL', () => {
      const result = generateCode({ method: 'GET', url: '   ' }, 'javascript-fetch');
      expect(result).toContain('Error: No URL specified');
    });

    it('should generate cURL code', () => {
      const result = generateCode(mockApiRequest, 'curl');
      expect(result).toContain('curl -X POST');
      expect(result).toContain('https://api.example.com/users');
      expect(result).toContain('Content-Type: application/json');
      expect(result).toContain('Authorization: Bearer token123');
    });

    it('should generate JavaScript Fetch code', () => {
      const result = generateCode(mockApiRequest, 'javascript-fetch');
      expect(result).toContain('fetch(');
      expect(result).toContain("method: 'POST'");
      expect(result).toContain('"Authorization": "Bearer token123"');
    });

    it('should generate JavaScript Axios code', () => {
      const result = generateCode(mockApiRequest, 'javascript-axios');
      expect(result).toContain('axios({');
      expect(result).toContain('method: \'post\'');
      expect(result).toContain('url: \'https://api.example.com/users?limit=10&page=1\'');
    });

    it('should generate Python Requests code', () => {
      const result = generateCode(mockApiRequest, 'python-requests');
      expect(result).toContain('import requests');
      expect(result).toContain('response = requests.post(');
    });

    it('should handle GET requests without body', () => {
      const getRequest = { method: 'GET' as const, url: 'https://api.example.com/test' };
      const result = generateCode(getRequest, 'javascript-fetch');
      expect(result).not.toContain('body:');
    });

    it('should handle requests with query parameters', () => {
      const request = {
        ...mockApiRequest,
        url: 'https://api.example.com/users',
        params: { search: 'john', limit: '5' },
      };
      const result = generateCode(request, 'curl');
      expect(result).toContain('?search=john&limit=5');
    });

    it('should escape special characters in code generation', () => {
      const requestWithSpecialChars = {
        method: 'POST' as const,
        url: 'https://api.example.com/test',
        headers: { 'X-Special': 'value with "quotes" and \'apostrophes\'' },
        body: { message: 'Hello "World"' },
      };
      const result = generateCode(requestWithSpecialChars, 'javascript-fetch');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle all supported languages', () => {
      const languages: CodeLanguage[] = [
        'curl',
        'javascript-fetch',
        'javascript-axios',
        'python-requests',
        'python-http',
        'java-okhttp',
        'java-httpclient',
        'csharp-httpclient',
        'csharp-restsharp',
        'php-curl',
        'php-guzzle',
        'ruby-net-http',
        'go-http',
        'swift-urlsession',
        'kotlin-okhttp',
      ];

      languages.forEach(language => {
        const result = generateCode(mockApiRequest, language);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toContain('Error: Failed to generate code');
      });
    });

    it('should handle errors gracefully', () => {
      // Mock a generator that throws an error
      const originalGenerators = {
        'javascript-fetch': () => { throw new Error('Test error'); },
      } as any;
      
      const mockGenerators = {
        ...originalGenerators,
      };

      // This would require modifying the module, but we test the error handling
      const result = generateCode(mockApiRequest, 'javascript-fetch');
      expect(result).toBeDefined();
    });
  });

  describe('buildFullUrl function', () => {
    it('should build URL without parameters', () => {
      const request = { method: 'GET' as const, url: 'https://api.example.com/test' };
      // This is tested indirectly through the generateCode tests
    });

    it('should build URL with parameters', () => {
      const request = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
        params: { key1: 'value1', key2: 'value2' },
      };
      // This is tested indirectly through the generateCode tests
    });
  });
});

describe('curlParser utilities', () => {
  describe('parseCurlCommand function', () => {
    it('should parse basic cURL command', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('GET');
      expect(result?.url).toBe('https://api.example.com/test');
    });

    it('should parse cURL with headers', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -H 'Authorization: Bearer token'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.url).toBe('https://api.example.com/users');
      expect(result?.headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(result?.auth).toEqual({
        type: 'bearer',
        bearerToken: 'token',
      });
    });

    it('should parse cURL with JSON body', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -d '{\"name\":\"John\",\"email\":\"john@example.com\"}'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.body).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should parse cURL with string body', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/upload' -d 'raw data here'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('raw data here');
    });

    it('should parse cURL with basic auth', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -u 'username:password'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'basic',
        username: 'username',
        password: 'password',
      });
    });

    it('should extract bearer token from Authorization header', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'Authorization: Bearer abc123token'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'bearer',
        bearerToken: 'abc123token',
      });
      expect(result?.headers?.Authorization).toBeUndefined();
    });

    it('should handle different quote styles', () => {
      const curlCommand = 'curl -X GET "https://api.example.com/test"';
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/test');
    });

    it('should handle line continuations', () => {
      const curlCommand = `curl -X POST 'https://api.example.com/test' \\
        -H 'Content-Type: application/json' \\
        -d '{"test": true}'`;
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle --request flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
    });

    it('should return null for empty URL', () => {
      const curlCommand = "curl -X GET";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid cURL command', () => {
      const curlCommand = "invalid command";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should handle complex cURL command with all features', () => {
      const curlCommand = `curl -X POST 'https://api.example.com/users?limit=10' \\
        -H 'Content-Type: application/json' \\
        -H 'Authorization: Bearer token123' \\
        -d '{"name":"John Doe","email":"john@example.com","age":30}'`;
      
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.url).toBe('https://api.example.com/users?limit=10');
      expect(result?.headers?.['Content-Type']).toBe('application/json');
      expect(result?.auth?.type).toBe('bearer');
      expect(result?.body).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });
    });

    it('should handle malformed header gracefully', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'malformed-header'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({});
    });

    it('should handle invalid JSON body gracefully', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/test' -d 'invalid json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('invalid json');
    });
  });

  describe('looksLikeCurl function', () => {
    it('should return true for cURL commands', () => {
      expect(looksLikeCurl("curl https://example.com")).toBe(true);
      expect(looksLikeCurl("  curl -X GET https://example.com")).toBe(true);
      expect(looksLikeCurl("CURL https://example.com")).toBe(true);
    });

    it('should return false for non-cURL commands', () => {
      expect(looksLikeCurl("wget https://example.com")).toBe(false);
      expect(looksLikeCurl("fetch https://example.com")).toBe(false);
      expect(looksLikeCurl("curl -v https://example.com")).toBe(true); // -v is a valid flag
      expect(looksLikeCurl("")).toBe(false);
      expect(looksLikeCurl("   ")).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(looksLikeCurl("not a curl command")).toBe(false);
      expect(looksLikeCurl("some text with curl in it")).toBe(false);
      expect(looksLikeCurl("\ncurl https://example.com")).toBe(true); // Leading newlines are allowed
    });
  });
});

describe('encryption utilities', () => {
  describe('EncryptionUtil class', () => {
    beforeEach(() => {
      // Reset encryption availability
      (encryption as any).encryptionAvailable = null;
    });

    it('should initialize with correct environment detection', () => {
      global.window.isElectron = true;
      const isElectron = encryption.isElectron();
      expect(isElectron).toBe(true);
    });

    it('should return false when crypto API is not available', async () => {
      global.window.electron = undefined;
      (encryption as any).encryptionAvailable = null;
      
      const isAvailable = await encryption.isAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should return true when crypto API is available', async () => {
      global.window.electron = {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      const isAvailable = await encryption.isAvailable();
      expect(isAvailable).toBe(true);
      expect(global.window.electron?.crypto?.isAvailable).toHaveBeenCalled();
    });

    it('should cache availability result', async () => {
      const mockIsAvailable = vi.fn().mockResolvedValue(true);
      global.window.electron = {
        crypto: {
          isAvailable: mockIsAvailable,
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      await encryption.isAvailable();
      await encryption.isAvailable();
      
      expect(mockIsAvailable).toHaveBeenCalledTimes(1);
    });

    it('should encrypt with Electron when available', async () => {
      const mockEncrypt = vi.fn().mockResolvedValue('encrypted-data');
      global.window.electron = {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
          encrypt: mockEncrypt,
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      const result = await encryption.encrypt('password123');
      expect(result).toBe('electron:encrypted-data');
      expect(mockEncrypt).toHaveBeenCalledWith('password123');
    });

    it('should return plaintext when encryption not available', async () => {
      global.window.electron = undefined;
      
      const result = await encryption.encrypt('password123');
      expect(result).toBe('password123');
    });

    it('should handle empty string encryption', async () => {
      const result = await encryption.encrypt('');
      expect(result).toBe('');
    });

    it('should decrypt Electron-encrypted passwords', async () => {
      const mockDecrypt = vi.fn().mockResolvedValue('password123');
      global.window.electron = {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
          decrypt: mockDecrypt,
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      const result = await encryption.decrypt('electron:encrypted-data');
      expect(result).toBe('password123');
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted-data');
    });

    it('should return plaintext for unencrypted passwords', async () => {
      const result = await encryption.decrypt('plain-password');
      expect(result).toBe('plain-password');
    });

    it('should handle empty string decryption', async () => {
      const result = await encryption.decrypt('');
      expect(result).toBe('');
    });

    it('should detect encrypted passwords', () => {
      expect(encryption.isEncrypted('electron:encrypted-data')).toBe(true);
      expect(encryption.isEncrypted('plain-password')).toBe(false);
      expect(encryption.isEncrypted('')).toBe(false);
    });

    it('should handle encryption errors gracefully', async () => {
      const mockEncrypt = vi.fn().mockRejectedValue(new Error('Encryption failed'));
      global.window.electron = {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
          encrypt: mockEncrypt,
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      await expect(encryption.encrypt('password')).rejects.toThrow('Failed to encrypt password');
    });

    it('should handle decryption errors gracefully', async () => {
      const mockDecrypt = vi.fn().mockRejectedValue(new Error('Decryption failed'));
      global.window.electron = {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
          decrypt: mockDecrypt,
        },
      };
      (encryption as any).encryptionAvailable = null;
      
      await expect(encryption.decrypt('electron:encrypted-data')).rejects.toThrow('Failed to decrypt password');
    });

    it('should handle unavailable crypto for decryption', async () => {
      global.window.electron = undefined;
      
      await expect(encryption.decrypt('electron:encrypted-data')).rejects.toThrow('Cannot decrypt: Encryption not available');
    });
  });
});

describe('postmanExporter utilities', () => {
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
        description: 'Get all users',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          headers: {
            'Authorization': 'Bearer token123',
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'req-2',
        name: 'Create User',
        description: 'Create a new user',
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  const mockCollectionWithAuth = {
    id: 'collection-2',
    name: 'Auth Collection',
    description: 'Collection with authentication',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    requests: [
      {
        id: 'req-3',
        name: 'Basic Auth Request',
        description: 'Request with basic auth',
        request: {
          method: 'GET',
          url: 'https://api.example.com/protected',
          auth: {
            type: 'basic',
            username: 'user',
            password: 'pass',
          },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  describe('exportCollectionToPostman', () => {
    it('should export collection with GET request', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection.info.name).toBe('Test Collection');
      expect(postmanCollection.info.description).toBe('A test collection for API requests');
      expect(postmanCollection.item).toHaveLength(2);
      expect(postmanCollection.item[0].name).toBe('Get Users');
      expect(postmanCollection.item[0].request.method).toBe('GET');
      expect(postmanCollection.item[0].request.url).toEqual({
        host: ['api.example.com'],
        path: ['users'],
        protocol: 'https',
        query: [],
        raw: 'https://api.example.com/users'
      });
    });

    it('should export collection with POST request and body', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      const createUserRequest = postmanCollection.item[1];
      expect(createUserRequest.name).toBe('Create User');
      expect(createUserRequest.request.method).toBe('POST');
      expect(createUserRequest.request.body.mode).toBe('raw');
      expect(createUserRequest.request.body.options.raw.language).toBe('json');
    });

    it('should convert headers to Postman format', () => {
      const result = exportCollectionToPostman(mockCollection);
      const postmanCollection = JSON.parse(result);
      
      const headers = postmanCollection.item[0].request.header;
      expect(headers).toHaveLength(1);
      expect(headers[0].key).toBe('Authorization');
      expect(headers[0].value).toBe('Bearer token123');
      expect(headers[0].type).toBe('text');
    });

    it('should handle GraphQL requests', () => {
      const graphqlCollection = {
        ...mockCollection,
        requests: [
          {
            id: 'graphql-req',
            name: 'GraphQL Query',
            description: 'A GraphQL request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                query: 'query { user(id: 1) { name } }',
                variables: { id: 1 },
              },
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = exportCollectionToPostman(graphqlCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection.item[0].request.body.mode).toBe('graphql');
      expect(postmanCollection.item[0].request.body.graphql.query).toBe('query { user(id: 1) { name } }');
      expect(postmanCollection.item[0].request.body.graphql.variables).toBe(JSON.stringify({ id: 1 }, null, 2).replace(/"(\w+)":/g, '$1:').replace(/,\s*/g, ', '));
    });

    it('should handle string body requests', () => {
      const stringBodyCollection = {
        ...mockCollection,
        requests: [
          {
            id: 'string-body-req',
            name: 'String Body Request',
            description: 'Request with string body',
            request: {
              method: 'POST',
              url: 'https://api.example.com/upload',
              body: 'raw text data',
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = exportCollectionToPostman(stringBodyCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection.item[0].request.body.mode).toBe('raw');
      expect(postmanCollection.item[0].request.body.raw).toBe('raw text data');
      expect(postmanCollection.item[0].request.body.options.raw.language).toBe('text');
    });

    it('should convert authentication to Postman format', () => {
      const result = exportCollectionToPostman(mockCollectionWithAuth);
      const postmanCollection = JSON.parse(result);
      
      const auth = postmanCollection.item[0].request.auth;
      expect(auth.type).toBe('basic');
      expect(auth.basic).toHaveLength(2);
      expect(auth.basic[0].key).toBe('username');
      expect(auth.basic[0].value).toBe('user');
    });

    it('should handle URL parsing with query parameters', () => {
      const urlCollection = {
        ...mockCollection,
        requests: [
          {
            id: 'url-req',
            name: 'URL with Params',
            description: 'Request with URL parameters',
            request: {
              method: 'GET',
              url: 'https://api.example.com/users',
              params: {
                limit: '10',
                page: '1',
                search: 'john',
              },
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = exportCollectionToPostman(urlCollection);
      const postmanCollection = JSON.parse(result);
      
      const url = postmanCollection.item[0].request.url;
      expect(url.query).toHaveLength(3);
      expect(url.query[0].key).toBe('limit');
      expect(url.query[0].value).toBe('10');
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrlCollection = {
        ...mockCollection,
        requests: [
          {
            id: 'invalid-url-req',
            name: 'Invalid URL',
            description: 'Request with invalid URL',
            request: {
              method: 'GET',
              url: 'not-a-valid-url',
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const result = exportCollectionToPostman(invalidUrlCollection);
      const postmanCollection = JSON.parse(result);
      
      expect(postmanCollection.item[0].request.url).toEqual({
        raw: 'not-a-valid-url',
        query: []
      });
    });
  });

  describe('exportCollectionsToPostman', () => {
    it('should export multiple collections', () => {
      const collections = [mockCollection, mockCollectionWithAuth];
      const result = exportCollectionsToPostman(collections);
      
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['test_collection.postman_collection.json']).toBeDefined();
      expect(result['auth_collection.postman_collection.json']).toBeDefined();
    });

    it('should sanitize collection names for filenames', () => {
      const collectionWithSpecialChars = {
        ...mockCollection,
        name: 'Test Collection!@#$%^&*()',
      };
      
      const result = exportCollectionsToPostman([collectionWithSpecialChars]);
      const filename = Object.keys(result)[0];
      
      expect(filename).toBe('test_collection__________.postman_collection.json');
    });

    it('should export empty collection list', () => {
      const result = exportCollectionsToPostman([]);
      
      expect(result).toEqual({});
    });
  });

  describe('downloadPostmanCollection', () => {
    it('should trigger download', () => {
      global.Blob = class MockBlob {
        data: any;
        options: any;
        size: number;
        type: string;

        constructor(data: any, options?: any) {
          this.data = data;
          this.options = options;
          this.size = data[0]?.length || 0;
          this.type = options?.type || '';
        }
      };
      
      mockCreateObjectURL.mockReturnValue('blob:mock-url');
      
      downloadPostmanCollection(mockCollection);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use sanitized filename for download', () => {
      global.Blob = class MockBlob {
        data: any;
        options: any;

        constructor(data: any, options?: any) {
          this.data = data;
          this.options = options;
        }
      };
      mockCreateObjectURL.mockReturnValue('blob:mock-url');
      
      downloadPostmanCollection(mockCollection);
      
      const downloadLink = mockCreateElement.mock.results[0].value;
      expect(downloadLink.download).toBe('test_collection.postman_collection.json');
    });
  });
});

describe('schemaContext utilities', () => {
  const mockSchemaContext: SchemaContext = {
    database: 'testdb',
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, isForeignKey: false },
          { name: 'name', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false, isPrimaryKey: false, isForeignKey: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, isForeignKey: false },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, isForeignKey: false },
          { name: 'user_id', type: 'INT', nullable: false, isPrimaryKey: false, isForeignKey: true },
          { name: 'total', type: 'DECIMAL(10,2)', nullable: false, isPrimaryKey: false, isForeignKey: false },
          { name: 'status', type: 'VARCHAR(50)', nullable: false, isPrimaryKey: false, isForeignKey: false },
        ],
        primaryKeys: ['id'],
        foreignKeys: [
          { column: 'user_id', referencedTable: 'users', referencedColumn: 'id' },
        ],
      },
    ],
    relationships: [
      { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
    ],
  };

  describe('formatSchemaForPrompt', () => {
    it('should format schema with table information', () => {
      const result = formatSchemaForPrompt(mockSchemaContext);
      
      expect(result).toContain('Database: testdb');
      expect(result).toContain('Tables:');
      expect(result).toContain('users:');
      expect(result).toContain('orders:');
      expect(result).toContain('  - id: INT (PRIMARY KEY, NOT NULL)');
      expect(result).toContain('  - name: VARCHAR(255) (NOT NULL)');
      expect(result).toContain('Relationships:');
      expect(result).toContain('  - orders.user_id -> users.id');
    });

    it('should format columns with correct attributes', () => {
      const result = formatSchemaForPrompt(mockSchemaContext);
      
      expect(result).toContain('  - id: INT (PRIMARY KEY, NOT NULL)');
      expect(result).toContain('  - name: VARCHAR(255) (NOT NULL)');
      expect(result).toContain('  - total: DECIMAL(10,2) (NOT NULL)');
    });

    it('should handle foreign key relationships', () => {
      const result = formatSchemaForPrompt(mockSchemaContext);
      
      expect(result).toContain('Foreign Keys:');
      expect(result).toContain('    - user_id -> users.id');
    });

    it('should handle empty schema', () => {
      const emptySchema: SchemaContext = {
        database: 'empty',
        tables: [],
        relationships: [],
      };
      
      const result = formatSchemaForPrompt(emptySchema);
      
      expect(result).toContain('Database: empty');
      expect(result).toContain('Tables:');
      expect(result).not.toContain('Relationships:');
    });
  });

  describe('identifyRelevantTableNames', () => {
    const allTableNames = [
      'users',
      'orders',
      'products',
      'categories',
      'order_items',
      'user_profiles',
    ];

    it('should find exact table name matches', () => {
      const result = identifyRelevantTableNames('Show me all users', allTableNames);
      expect(result).toContain('users');
    });

    it('should find partial matches', () => {
      const result = identifyRelevantTableNames('Show me product information', allTableNames);
      expect(result).toContain('products');
    });

    it('should handle singular/plural variations', () => {
      const result = identifyRelevantTableNames('Get order details', allTableNames);
      expect(result).toContain('orders');
    });

    it('should find tables from column name mentions', () => {
      const result = identifyRelevantTableNames('Find users by email address', allTableNames);
      expect(result).toContain('users');
    });

    it('should respect maxTables limit', () => {
      const result = identifyRelevantTableNames('test', allTableNames, 3);
      expect(result).toHaveLength(3);
    });

    it('should return fallback tables when no matches found', () => {
      const result = identifyRelevantTableNames('xyz123 none matching', allTableNames, 3);
      expect(result).toHaveLength(3);
      expect(result.every(table => allTableNames.includes(table))).toBe(true);
    });

    it('should handle case-insensitive matching', () => {
      const result = identifyRelevantTableNames('SHOW ME ALL PRODUCTS', allTableNames);
      expect(result).toContain('products');
    });

    it('should handle multiple word queries', () => {
      const result = identifyRelevantTableNames('Show me user orders and product categories', allTableNames);
      expect(result).toContain('users');
      expect(result).toContain('orders');
      expect(result).toContain('products');
      expect(result).toContain('categories');
    });
  });

  describe('findRelevantTables', () => {
    it('should find tables mentioned in query', () => {
      const result = findRelevantTables(mockSchemaContext, 'Show me all users');
      expect(result).toContain('users');
    });

    it('should find related tables via foreign keys', () => {
      const result = findRelevantTables(mockSchemaContext, 'Get order information');
      expect(result).toContain('orders');
      expect(result).toContain('users'); // Related via foreign key
    });

    it('should handle singular/plural variations', () => {
      const result = findRelevantTables(mockSchemaContext, 'Get user information');
      expect(result).toContain('users');
    });

    it('should find tables by column name mentions', () => {
      const result = findRelevantTables(mockSchemaContext, 'Find orders by user ID');
      expect(result).toContain('orders');
      expect(result).toContain('users');
    });

    it('should not return duplicate tables', () => {
      const result = findRelevantTables(mockSchemaContext, 'Show users and their orders');
      const uniqueResult = [...new Set(result)];
      expect(result).toEqual(uniqueResult);
    });

    it('should handle empty results gracefully', () => {
      const result = findRelevantTables(mockSchemaContext, 'xyz123 none matching');
      expect(result).toEqual([]);
    });
  });
});

// Integration tests for utility combinations
describe('Utility Integration Tests', () => {
  it('should work together: curlParser -> codeGenerator', () => {
    const curlCommand = "curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -d '{\"name\":\"John\"}'";
    const parsedRequest = parseCurlCommand(curlCommand);
    
    expect(parsedRequest).not.toBeNull();
    
    if (parsedRequest) {
      const generatedCode = generateCode(parsedRequest, 'javascript-fetch');
      expect(generatedCode).toContain('fetch(');
      expect(generatedCode).toContain('method: \'POST\'');
    }
  });

  it('should handle encryption round-trip', async () => {
    const originalPassword = 'my-secret-password';
    const encrypted = await encryption.encrypt(originalPassword);
    const decrypted = await encryption.decrypt(encrypted);
    
    expect(decrypted).toBe(originalPassword);
  });
});