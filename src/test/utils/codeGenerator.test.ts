import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCode,
  codeLanguages,
  type CodeLanguage,
  type CodeLanguageInfo,
} from '../../../src/utils/codeGenerator';

// Mock external dependencies if needed
vi.mock('../../../src/api/apiTester');

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it('should contain expected language entries', () => {
      const expectedIds: CodeLanguage[] = [
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

      expectedIds.forEach(id => {
        expect(codeLanguages.find(lang => lang.id === id)).toBeDefined();
      });
    });

    it('should have proper language info structure', () => {
      codeLanguages.forEach(lang => {
        expect(lang).toHaveProperty('id');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('category');
        expect(typeof lang.id).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.category).toBe('string');
      });
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

    it('should return error for undefined URL', () => {
      const result = generateCode({ method: 'GET', url: undefined } as any, 'curl');
      expect(result).toContain('Error: No URL specified');
    });

    it('should generate cURL code', () => {
      const result = generateCode(mockApiRequest, 'curl');
      expect(result).toContain('curl -X POST');
      expect(result).toContain('https://api.example.com/users');
      expect(result).toContain('Content-Type: application/json');
      expect(result).toContain('Authorization: Bearer token123');
      expect(result).toContain('"name":"John Doe"');
      expect(result).toContain('"email":"john@example.com"');
    });

    it('should generate JavaScript Fetch code', () => {
      const result = generateCode(mockApiRequest, 'javascript-fetch');
      expect(result).toContain('fetch(');
      expect(result).toContain("method: 'POST'");
      expect(result).toContain('"Authorization": "Bearer token123"');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should generate JavaScript Axios code', () => {
      const result = generateCode(mockApiRequest, 'javascript-axios');
      expect(result).toContain('axios({');
      expect(result).toContain("method: 'post'");
      expect(result).toContain('url: \'https://api.example.com/users?limit=10&page=1\'');
    });

    it('should generate Python Requests code', () => {
      const result = generateCode(mockApiRequest, 'python-requests');
      expect(result).toContain('import requests');
      expect(result).toContain('response = requests.post(');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should generate Python http.client code', () => {
      const result = generateCode(mockApiRequest, 'python-http');
      expect(result).toContain('import http.client');
      expect(result).toContain('HTTPSConnection');
    });

    it('should generate Java OkHttp code', () => {
      const result = generateCode(mockApiRequest, 'java-okhttp');
      expect(result).toContain('OkHttpClient');
      expect(result).toContain('Request.Builder');
    });

    it('should generate Java HttpClient code', () => {
      const result = generateCode(mockApiRequest, 'java-httpclient');
      expect(result).toContain('HttpClient.newHttpClient()');
      expect(result).toContain('HttpRequest.newBuilder()');
    });

    it('should generate C# HttpClient code', () => {
      const result = generateCode(mockApiRequest, 'csharp-httpclient');
      expect(result).toContain('HttpClient');
      expect(result).toContain('StringContent');
    });

    it('should generate C# RestSharp code', () => {
      const result = generateCode(mockApiRequest, 'csharp-restsharp');
      expect(result).toContain('RestClient');
      expect(result).toContain('RestRequest');
    });

    it('should generate PHP cURL code', () => {
      const result = generateCode(mockApiRequest, 'php-curl');
      expect(result).toContain('curl_init');
      expect(result).toContain('curl_setopt_array');
    });

    it('should generate PHP Guzzle code', () => {
      const result = generateCode(mockApiRequest, 'php-guzzle');
      expect(result).toContain('GuzzleHttp\\Client');
      expect(result).toContain('request(');
    });

    it('should generate Ruby Net::HTTP code', () => {
      const result = generateCode(mockApiRequest, 'ruby-net-http');
      expect(result).toContain('require \'net/http\'');
      expect(result).toContain('Net::HTTP::Post');
    });

    it('should generate Go net/http code', () => {
      const result = generateCode(mockApiRequest, 'go-http');
      expect(result).toContain('package main');
      expect(result).toContain('http.NewRequest');
    });

    it('should generate Swift URLSession code', () => {
      const result = generateCode(mockApiRequest, 'swift-urlsession');
      expect(result).toContain('import Foundation');
      expect(result).toContain('URLSession');
    });

    it('should generate Kotlin OkHttp code', () => {
      const result = generateCode(mockApiRequest, 'kotlin-okhttp');
      expect(result).toContain('val client = OkHttpClient()');
      expect(result).toContain('Request.Builder()');
    });

    it('should handle GET requests without body', () => {
      const getRequest = { method: 'GET' as const, url: 'https://api.example.com/test' };
      const curlResult = generateCode(getRequest, 'curl');
      const fetchResult = generateCode(getRequest, 'javascript-fetch');
      
      expect(curlResult).not.toContain('-d');
      expect(fetchResult).not.toContain('body:');
    });

    it('should handle HEAD requests without body', () => {
      const headRequest = { method: 'HEAD' as const, url: 'https://api.example.com/test' };
      const curlResult = generateCode(headRequest, 'curl');
      
      expect(curlResult).toContain('curl -X HEAD');
      expect(curlResult).not.toContain('-d');
    });

    it('should handle requests with query parameters', () => {
      const request = {
        ...mockApiRequest,
        url: 'https://api.example.com/users',
        params: { search: 'john', limit: '5', sort: 'name' },
      };
      const result = generateCode(request, 'curl');
      
      expect(result).toContain('?search=john');
      expect(result).toContain('limit=5');
      expect(result).toContain('sort=name');
    });

    it('should escape special characters in cURL generation', () => {
      const requestWithSpecialChars = {
        method: 'POST' as const,
        url: 'https://api.example.com/test',
        headers: { 'X-Special': 'value with "quotes" and \'apostrophes\'' },
        body: { message: 'Hello "World"' },
      };
      const result = generateCode(requestWithSpecialChars, 'curl');
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // Should not have unescaped quotes that would break the shell command
      expect(result).not.toContain("'Hello \"World\"'");
    });

    it('should escape special characters in JavaScript generation', () => {
      const requestWithSpecialChars = {
        method: 'POST' as const,
        url: 'https://api.example.com/test',
        body: { message: 'Hello "World"' },
      };
      const result = generateCode(requestWithSpecialChars, 'javascript-fetch');
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Hello \\"World\\"');
    });

    it('should handle string body types', () => {
      const requestWithStringBody = {
        method: 'POST' as const,
        url: 'https://api.example.com/upload',
        headers: { 'Content-Type': 'text/plain' },
        body: 'raw text data',
      };
      const result = generateCode(requestWithStringBody, 'javascript-fetch');
      
      expect(result).toContain('raw text data');
      expect(result).not.toContain('JSON.stringify');
    });

    it('should handle complex nested objects', () => {
      const complexRequest = {
        method: 'POST' as const,
        url: 'https://api.example.com/complex',
        body: {
          user: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'Anytown',
              coordinates: { lat: 40.7128, lng: -74.0060 },
            },
          },
          preferences: {
            theme: 'dark',
            notifications: true,
            tags: ['developer', 'admin'],
          },
        },
      };
      
      const result = generateCode(complexRequest, 'python-requests');
      expect(result).toContain('import requests');
      expect(result).toContain('user');
      expect(result).toContain('address');
    });

    it('should handle requests with no headers', () => {
      const requestNoHeaders = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
      };
      const result = generateCode(requestNoHeaders, 'javascript-fetch');
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle requests with empty headers object', () => {
      const requestEmptyHeaders = {
        method: 'GET' as const,
        url: 'https://api.example.com/test',
        headers: {},
      };
      const result = generateCode(requestEmptyHeaders, 'javascript-fetch');
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle all supported languages successfully', () => {
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
        expect(result).not.toContain('Error generating code:');
      });
    });

    it('should handle very long URLs and parameters', () => {
      const longUrl = 'https://api.example.com/very/long/path/with/many/segments/and/query/parameters/that/go/on/forever';
      const request = {
        method: 'GET' as const,
        url: longUrl,
        params: {
          param1: 'value1',
          param2: 'value2',
          param3: 'value3',
          param4: 'value4',
          param5: 'value5',
        },
      };
      
      const result = generateCode(request, 'curl');
      expect(result).toContain(longUrl);
      expect(result).toContain('param1=value1');
    });

    it('should handle Unicode characters in requests', () => {
      const requestWithUnicode = {
        method: 'POST' as const,
        url: 'https://api.example.com/unicode',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'Hello 世界 🌍',
          name: 'José María',
          emoji: '🔐',
        },
      };
      
      const result = generateCode(requestWithUnicode, 'python-requests');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});