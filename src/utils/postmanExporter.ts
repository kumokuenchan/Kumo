/**
 * Export API tester collections to Postman Collection Format v2.1
 */

import type { Collection, SavedRequest } from '../services/apiTesterStorage';
import type { ApiRequest } from '../api/apiTester';

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
    _postman_id?: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request: PostmanRequest;
  response?: any[];
}

interface PostmanRequest {
  method: string;
  header: Array<{ key: string; value: string; type: string }>;
  body?: PostmanBody;
  url: PostmanUrl | string;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanBody {
  mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  options?: {
    raw?: {
      language: string;
    };
  };
  graphql?: {
    query: string;
    variables?: string;
  };
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string }>;
}

interface PostmanVariable {
  key: string;
  value: string;
  type: string;
}

interface PostmanAuth {
  type: 'basic' | 'bearer' | 'apikey' | 'noauth';
  basic?: Array<{ key: string; value: string; type: string }>;
  bearer?: Array<{ key: string; value: string; type: string }>;
  apikey?: Array<{ key: string; value: string; type: string }>;
}

/**
 * Convert ApiRequest to Postman request format
 */
function convertRequestToPostman(savedRequest: SavedRequest): PostmanItem {
  const req = savedRequest.request;

  // Convert headers
  const headers = req.headers
    ? Object.entries(req.headers).map(([key, value]) => ({
        key,
        value: String(value),
        type: 'text',
      }))
    : [];

  // Convert body
  let body: PostmanBody | undefined;
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && 'query' in req.body) {
      // GraphQL
      body = {
        mode: 'graphql',
        graphql: {
          query: (req.body as any).query || '',
          variables: (req.body as any).variables || '',
        },
      };
    } else if (typeof req.body === 'string') {
      body = {
        mode: 'raw',
        raw: req.body,
        options: {
          raw: {
            language: 'text',
          },
        },
      };
    } else {
      body = {
        mode: 'raw',
        raw: JSON.stringify(req.body, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }
  }

  // Convert URL and query params
  let url: PostmanUrl | string;
  try {
    const urlObj = new URL(req.url || '');
    const queryParams = req.params
      ? Object.entries(req.params).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];

    url = {
      raw: req.url || '',
      protocol: urlObj.protocol.replace(':', ''),
      host: urlObj.hostname.split('.'),
      path: urlObj.pathname.split('/').filter(Boolean),
      query: queryParams.length > 0 ? queryParams : undefined,
    };
  } catch {
    // Fallback for invalid URLs
    url = req.url || '';
  }

  // Convert auth
  let auth: PostmanAuth | undefined;
  if (req.auth && req.auth.type !== 'none') {
    if (req.auth.type === 'basic') {
      auth = {
        type: 'basic',
        basic: [
          { key: 'username', value: req.auth.username || '', type: 'string' },
          { key: 'password', value: req.auth.password || '', type: 'string' },
        ],
      };
    } else if (req.auth.type === 'bearer') {
      auth = {
        type: 'bearer',
        bearer: [
          { key: 'token', value: req.auth.bearerToken || '', type: 'string' },
        ],
      };
    } else if (req.auth.type === 'apikey') {
      auth = {
        type: 'apikey',
        apikey: [
          { key: 'key', value: req.auth.apiKeyName || '', type: 'string' },
          { key: 'value', value: req.auth.apiKey || '', type: 'string' },
          { key: 'in', value: req.auth.apiKeyIn || 'header', type: 'string' },
        ],
      };
    }
  }

  return {
    name: savedRequest.name,
    request: {
      method: req.method,
      header: headers,
      body,
      url,
      auth,
      description: savedRequest.description,
    },
    response: [],
  };
}

/**
 * Export a single collection to Postman format
 */
export function exportCollectionToPostman(collection: Collection): string {
  const postmanCollection: PostmanCollection = {
    info: {
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: collection.id,
    },
    item: collection.requests.map(convertRequestToPostman),
  };

  return JSON.stringify(postmanCollection, null, 2);
}

/**
 * Export multiple collections to Postman format (as separate files in a ZIP would be ideal,
 * but for simplicity we'll return an object with collection names as keys)
 */
export function exportCollectionsToPostman(collections: Collection[]): Record<string, string> {
  const exports: Record<string, string> = {};

  collections.forEach((collection) => {
    const filename = `${collection.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.postman_collection.json`;
    exports[filename] = exportCollectionToPostman(collection);
  });

  return exports;
}

/**
 * Download a Postman collection file
 */
export function downloadPostmanCollection(collection: Collection): void {
  const json = exportCollectionToPostman(collection);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `${collection.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.postman_collection.json`;

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
