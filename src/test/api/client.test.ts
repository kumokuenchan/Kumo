import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, api } from '../../api/client';

// Mock fetch
global.fetch = vi.fn();

// Mock window and environment
const originalWindow = global.window;
const originalLocation = global.window?.location;

beforeEach(() => {
  vi.clearAllMocks();
  // Reset global mocks
  global.window = originalWindow;
  if (originalLocation) {
    global.window.location = originalLocation;
  }
});

describe('apiRequest', () => {
  it('should make successful GET request', async () => {
    const mockData = { success: true, data: 'test' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    const result = await apiRequest('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test/endpoint',
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    expect(result).toEqual(mockData);
  });

  it('should make POST request with data', async () => {
    const requestData = { name: 'test', value: 123 };
    const mockResponse = { id: 'new-id', ...requestData };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await apiRequest('/test/endpoint', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test/endpoint'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      }
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle custom headers', async () => {
    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await apiRequest('/test/endpoint', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token123',
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test/endpoint'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        }),
      })
    );
  });

  it('should handle HTTP error responses', async () => {
    const errorData = { error: 'Validation failed', message: 'Invalid input' };
    const mockResponse = new Response(JSON.stringify(errorData), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Validation failed');
  });

  it('should handle HTTP error with message field', async () => {
    const errorData = { message: 'Resource not found' };
    const mockResponse = new Response(JSON.stringify(errorData), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Resource not found');
  });

  it('should handle HTTP error with status text fallback', async () => {
    const mockResponse = new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Request failed');
  });

  it('should handle non-JSON error responses', async () => {
    const mockResponse = new Response('<html><body>Error Page</body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Request failed');
  });

  it('should handle empty error responses', async () => {
    const mockResponse = new Response('', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Request failed');
  });

  it('should handle 204 No Content responses', async () => {
    const mockResponse = new Response(null, {
      status: 204,
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    const result = await apiRequest('/test/endpoint');
    expect(result).toBeUndefined();
  });

  it('should handle network errors', async () => {
    (fetch as vi.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network Error'));

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Network Error');
  });

  it('should handle JSON parsing errors', async () => {
    const mockResponse = new Response('not valid json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow("Unexpected token 'o', \"not valid json\" is not valid JSON");
  });

  it('should handle empty successful responses', async () => {
    const mockResponse = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(apiRequest('/test/endpoint')).rejects.toThrow('Unexpected end of JSON input');
  });

  it('should handle default API_URL when no custom URL is provided', async () => {
    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await apiRequest('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', expect.any(Object));
  });

  it('should handle Electron environment', async () => {
    // Mock Electron environment
    global.window = {
      ...global.window,
      location: { protocol: 'file:' },
      electron: true,
    } as any;

    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await apiRequest('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', expect.any(Object));
  });

  it('should handle default API_URL in production', async () => {
    // Mock production environment
    Object.defineProperty(import.meta, 'env', {
      value: { VITE_API_URL: undefined, DEV: false },
      writable: true,
    });

    global.window = {
      ...global.window,
      location: { protocol: 'http:' },
    } as any;

    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await apiRequest('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', expect.any(Object));
  });
});

describe('api.get', () => {
  it('should make GET request without params', async () => {
    const mockResponse = { data: 'test' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.get('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it('should make GET request with query parameters', async () => {
    const mockResponse = { data: 'test' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.get('/test/endpoint', {
      params: {
        page: 1,
        limit: 10,
        search: 'test query',
        active: true,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/test/endpoint?page=1&limit=10&search=test+query&active=true',
      expect.any(Object)
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle null and undefined params', async () => {
    const mockResponse = { data: 'test' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.get('/test/endpoint', {
      params: {
        valid: 'value',
        nullValue: null,
        undefinedValue: undefined,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/test/endpoint?valid=value',
      expect.any(Object)
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle empty params object', async () => {
    const mockResponse = { data: 'test' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.get('/test/endpoint', { params: {} });

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', expect.any(Object));
    expect(result).toEqual(mockResponse);
  });
});

describe('api.post', () => {
  it('should make POST request with data', async () => {
    const postData = { name: 'test', value: 123 };
    const mockResponse = { id: 'new-id', ...postData };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.post('/test/endpoint', postData);

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
    expect(result).toEqual(mockResponse);
  });

  it('should make POST request without data', async () => {
    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.post('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(undefined),
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('api.put', () => {
  it('should make PUT request with data', async () => {
    const updateData = { name: 'updated', value: 456 };
    const mockResponse = { id: 'existing-id', ...updateData };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.put('/test/endpoint', updateData);

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('api.patch', () => {
  it('should make PATCH request with data', async () => {
    const patchData = { name: 'patched' };
    const mockResponse = { id: 'existing-id', name: 'patched' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.patch('/test/endpoint', patchData);

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchData),
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('api.delete', () => {
  it('should make DELETE request without data', async () => {
    const mockResponse = { success: true, message: 'Deleted' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.delete('/test/endpoint');

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it('should make DELETE request with data', async () => {
    const deleteData = { reason: 'cleanup' };
    const mockResponse = { success: true, message: 'Deleted' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.delete('/test/endpoint', { data: deleteData });

    expect(fetch).toHaveBeenCalledWith('/api/test/endpoint', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deleteData),
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('Error Handling Integration', () => {
  it('should handle various HTTP status codes', async () => {
    const statusCodes = [400, 401, 403, 404, 500, 502, 503];
    
    for (const status of statusCodes) {
      const mockResponse = new Response(JSON.stringify({ error: `Error ${status}` }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(api.get('/test/endpoint')).rejects.toThrow(`Error ${status}`);
    }
  });

  it('should handle complex error scenarios', async () => {
    // Test with both error and message fields
    const errorData = { error: 'Primary error', message: 'Secondary message' };
    const mockResponse = new Response(JSON.stringify(errorData), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(api.get('/test/endpoint')).rejects.toThrow('Primary error');
  });

  it('should handle empty error response body', async () => {
    const mockResponse = new Response('', {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

    await expect(api.get('/test/endpoint')).rejects.toThrow('Request failed');
  });
});

describe('Type Safety', () => {
  it('should preserve generic types', async () => {
    interface TestResponse {
      id: string;
      name: string;
    }

    const mockResponse: TestResponse = { id: '123', name: 'Test' };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.get<TestResponse>('/test/endpoint');
    
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(typeof result.id).toBe('string');
    expect(typeof result.name).toBe('string');
  });

  it('should handle complex data structures', async () => {
    const complexData = {
      users: [
        { id: 1, name: 'John', tags: ['admin', 'user'] },
        { id: 2, name: 'Jane', metadata: { lastLogin: '2024-01-01' } },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
      },
    };

    const mockFetchResponse = new Response(JSON.stringify(complexData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    const result = await api.post('/test/endpoint', complexData);
    
    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('pagination');
    expect(Array.isArray(result.users)).toBe(true);
  });
});

describe('URL Construction', () => {
  it('should handle special characters in parameters', async () => {
    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await api.get('/test/endpoint', {
      params: {
        query: 'hello world',
        symbols: '!@#$%',
        unicode: 'café',
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('query=hello+world'),
      expect.any(Object)
    );
  });

  it('should handle numeric and boolean parameters', async () => {
    const mockResponse = { success: true };
    const mockFetchResponse = new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

    await api.get('/test/endpoint', {
      params: {
        page: 1,
        limit: 50,
        active: true,
        verified: false,
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=1') &&
      expect.stringContaining('limit=50') &&
      expect.stringContaining('active=true') &&
      expect.stringContaining('verified=false'),
      expect.any(Object)
    );
  });
});