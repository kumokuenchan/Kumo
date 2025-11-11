import { describe, it, expect } from 'vitest';
import {
  parseCurlCommand,
  looksLikeCurl,
} from '../../../src/utils/curlParser';

describe('curlParser utilities', () => {
  describe('parseCurlCommand function', () => {
    it('should parse basic cURL command', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('GET');
      expect(result?.url).toBe('https://api.example.com/test');
    });

    it('should parse cURL with POST method', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/users'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.url).toBe('https://api.example.com/users');
    });

    it('should parse cURL with PUT method', () => {
      const curlCommand = "curl -X PUT 'https://api.example.com/users/1'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('PUT');
    });

    it('should parse cURL with DELETE method', () => {
      const curlCommand = "curl -X DELETE 'https://api.example.com/users/1'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('DELETE');
    });

    it('should parse cURL with PATCH method', () => {
      const curlCommand = "curl -X PATCH 'https://api.example.com/users/1'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('PATCH');
    });

    it('should parse cURL with single header', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'Content-Type: application/json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should parse cURL with multiple headers', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'Content-Type: application/json' -H 'Authorization: Bearer token' -H 'Accept: application/json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      expect(result?.headers?.['Content-Type']).toBe('application/json');
    });

    it('should parse cURL with string body', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/upload' -d 'raw data here'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('raw data here');
    });

    it('should parse cURL with basic auth using -u flag', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -u 'username:password'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'basic',
        username: 'username',
        password: 'password',
      });
    });

    it('should parse cURL with basic auth using --user flag', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' --user 'admin:secret'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'basic',
        username: 'admin',
        password: 'secret',
      });
    });

    it('should parse cURL with username only (no password)', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -u 'username'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'basic',
        username: 'username',
        password: '',
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
      // Bearer should be removed from headers
      expect(result?.headers?.Authorization).toBeUndefined();
    });

    it('should handle case-insensitive Authorization header', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'authorization: Bearer token123'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth).toEqual({
        type: 'bearer',
        bearerToken: 'token123',
      });
      expect(result?.headers?.authorization).toBeUndefined();
    });

    it('should handle double quotes', () => {
      const curlCommand = 'curl -X GET "https://api.example.com/test"';
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/test');
    });

    it('should handle mixed quote styles', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H \"Content-Type: application/json\"";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/test');
      expect(result?.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle line continuations (backslashes)', () => {
      const curlCommand = `curl -X POST 'https://api.example.com/test' \\
        -H 'Content-Type: application/json' \\
        -d '{\"test\": true}'`;
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(result?.body).toEqual({ test: true });
    });

    it('should handle --request flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
    });

    it('should handle --header flag', () => {
      const curlCommand = "curl --request GET 'https://api.example.com/test' --header 'Accept: application/json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({
        'Accept': 'application/json',
      });
    });

    it('should handle --data flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test' --data 'name=value'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('name=value');
    });

    it('should handle --data-raw flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test' --data-raw '{\"name\":\"John\"}'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toEqual({ name: 'John' });
    });

    it('should handle --data-binary flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test' --data-binary 'binary data'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('binary data');
    });

    it('should handle --data-urlencode flag', () => {
      const curlCommand = "curl --request POST 'https://api.example.com/test' --data-urlencode 'name=John Doe'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('name=John Doe');
    });

    it('should handle URLs with query parameters', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/users?limit=10&page=1&sort=name'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/users?limit=10&page=1&sort=name');
    });

    it('should return null for empty URL', () => {
      const curlCommand = "curl -X GET";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should return null for command without URL', () => {
      const curlCommand = "curl -X POST -H 'Content-Type: application/json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should return null for empty cURL command', () => {
      const curlCommand = "";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const curlCommand = "";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should return null for whitespace only', () => {
      const curlCommand = "   \n\t  ";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).toBeNull();
    });

    it('should handle malformed header gracefully', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'malformed-header'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({});
    });

    it('should handle header with empty value', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'X-Empty:'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({
        'X-Empty': '',
      });
    });

    it('should handle header with colon in value', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });
    });

    it('should handle invalid JSON body gracefully', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/test' -d 'invalid json'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('invalid json');
    });

    it('should handle complex JSON body', () => {
      const complexBody = JSON.stringify({
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          source: 'api-tester',
        },
      });

      const curlCommand = `curl -X POST 'https://api.example.com/test' -d '${complexBody}'`;
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toHaveProperty('user');
      expect(result?.body.user.name).toBe('John Doe');
      expect(result?.body.metadata.source).toBe('api-tester');
    });

    it('should handle Bearer token with different formats', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -H 'Authorization: BEARER abc123'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.auth?.bearerToken).toBe('abc123');
    });

    it('should handle multiple authentication methods (Bearer should take precedence)', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' -u 'user:pass' -H 'Authorization: Bearer token'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      // Bearer token should take precedence and remove the Authorization header
      expect(result?.auth?.type).toBe('bearer');
      expect(result?.auth?.bearerToken).toBe('token');
      expect(result?.headers?.Authorization).toBeUndefined();
    });

    it('should handle unquoted URL', () => {
      const curlCommand = "curl -X GET https://api.example.com/test";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/test');
    });

    it('should handle URL with port number', () => {
      const curlCommand = "curl -X GET 'https://api.example.com:8080/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com:8080/test');
    });

    it('should handle localhost URLs', () => {
      const curlCommand = "curl -X GET 'http://localhost:3000/api/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('http://localhost:3000/api/test');
    });

    it('should handle FTP URLs', () => {
      const curlCommand = "curl -X GET 'ftp://example.com/file.txt'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('ftp://example.com/file.txt');
    });

    it('should handle case-insensitive HTTP methods', () => {
      const curlCommand = "curl -x post 'https://api.example.com/test'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
    });

    it('should handle data with special characters', () => {
      const curlCommand = "curl -X POST 'https://api.example.com/test' -d 'name=John Doe&email=john@example.com'";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.body).toBe('name=John Doe&email=john@example.com');
    });

    it('should handle command with comments', () => {
      const curlCommand = "curl -X GET 'https://api.example.com/test' # This is a comment";
      const result = parseCurlCommand(curlCommand);
      
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://api.example.com/test');
    });
  });

  describe('looksLikeCurl function', () => {
    it('should return true for basic cURL commands', () => {
      expect(looksLikeCurl("curl https://example.com")).toBe(true);
    });

    it('should return true for cURL with flags', () => {
      expect(looksLikeCurl("curl -X GET https://example.com")).toBe(true);
      expect(looksLikeCurl("curl -v https://example.com")).toBe(true);
      expect(looksLikeCurl("curl -H 'Content-Type: application/json' https://example.com")).toBe(true);
    });

    it('should return true for cURL with long flags', () => {
      expect(looksLikeCurl("curl --request GET https://example.com")).toBe(true);
      expect(looksLikeCurl("curl --header 'Content-Type: application/json' https://example.com")).toBe(true);
    });

    it('should return true for cURL with method specified', () => {
      expect(looksLikeCurl("curl -X POST https://api.example.com/users")).toBe(true);
    });

    it('should handle case-insensitive cURL', () => {
      expect(looksLikeCurl("CURL https://example.com")).toBe(true);
      expect(looksLikeCurl("cURL https://example.com")).toBe(true);
    });

    it('should handle cURL with leading whitespace', () => {
      expect(looksLikeCurl("  curl https://example.com")).toBe(true);
      expect(looksLikeCurl("\tcurl https://example.com")).toBe(true);
      expect(looksLikeCurl("\ncurl https://example.com")).toBe(true);
    });

    it('should return false for non-cURL commands', () => {
      expect(looksLikeCurl("wget https://example.com")).toBe(false);
      expect(looksLikeCurl("fetch https://example.com")).toBe(false);
      expect(looksLikeCurl("http https://example.com")).toBe(false);
    });

    it('should return false for invalid cURL patterns', () => {
      expect(looksLikeCurl("not a curl command")).toBe(false);
      expect(looksLikeCurl("some text curl in it")).toBe(false);
      expect(looksLikeCurl("use curl for this")).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(looksLikeCurl("")).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(looksLikeCurl("   ")).toBe(false);
      expect(looksLikeCurl("\t\n ")).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(looksLikeCurl(null as any)).toBe(false);
      expect(looksLikeCurl(undefined as any)).toBe(false);
    });

    it('should return false for partial matches', () => {
      expect(looksLikeCurl("not a curl command but has curl in description")).toBe(false);
      expect(looksLikeCurl("download with curl tool")).toBe(false);
    });

    it('should handle complex valid cURL commands', () => {
      const complexCurl = `curl -X POST 'https://api.example.com/users' \\
        -H 'Content-Type: application/json' \\
        -H 'Authorization: Bearer token123' \\
        -d '{\"name\":\"John\",\"email\":\"john@example.com\"}'`;
      
      expect(looksLikeCurl(complexCurl)).toBe(true);
    });
  });
});
