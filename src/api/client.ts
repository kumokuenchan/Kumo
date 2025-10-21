// Use relative path in development to leverage Vite proxy, or absolute URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Try to parse JSON error; if not JSON, fall back to text
      const error = await response
        .json()
        .catch(async () => {
          const text = await response.text().catch(() => '');
          return { message: text || 'Request failed' } as { message?: string };
        });
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty/no-content responses gracefully
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    // If server responded with non-JSON (e.g., HTML), surface a clear error
    const text = await response.text().catch(() => '');
    try {
      return JSON.parse(text) as T;
    } catch {
      const snippet = (text || '').slice(0, 200);
      throw new Error(
        snippet
          ? `Expected JSON but received non-JSON response: ${snippet}`
          : 'Expected JSON but received empty response.'
      );
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
