/**
 * Pre-configured request templates for common API testing scenarios
 */

import type { ApiRequest } from '../api/apiTester';

export interface RequestTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  request: ApiRequest;
  tags: string[];
}

export const requestTemplates: RequestTemplate[] = [
  // Authentication
  {
    id: 'oauth-token',
    name: 'OAuth 2.0 - Get Access Token',
    description: 'Exchange credentials for an access token',
    category: 'Authentication',
    tags: ['auth', 'oauth', 'token'],
    request: {
      method: 'POST',
      url: '{{authUrl}}/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=password&username={{username}}&password={{password}}&client_id={{clientId}}&client_secret={{clientSecret}}',
    },
  },
  {
    id: 'bearer-auth',
    name: 'Bearer Token Authentication',
    description: 'API call with Bearer token',
    category: 'Authentication',
    tags: ['auth', 'bearer', 'token'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/user/profile',
      headers: {
        'Authorization': 'Bearer {{accessToken}}',
      },
    },
  },
  {
    id: 'basic-auth',
    name: 'Basic Authentication',
    description: 'API call with basic auth',
    category: 'Authentication',
    tags: ['auth', 'basic'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/protected',
      auth: {
        type: 'basic',
        username: '{{username}}',
        password: '{{password}}',
      },
    },
  },
  {
    id: 'api-key-header',
    name: 'API Key (Header)',
    description: 'API call with API key in header',
    category: 'Authentication',
    tags: ['auth', 'api-key'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/data',
      headers: {
        'X-API-Key': '{{apiKey}}',
      },
    },
  },

  // CRUD Operations
  {
    id: 'rest-list',
    name: 'REST - List Resources',
    description: 'Get a list of resources',
    category: 'CRUD',
    tags: ['rest', 'get', 'list'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/users',
      params: {
        page: '1',
        limit: '10',
      },
    },
  },
  {
    id: 'rest-get',
    name: 'REST - Get Single Resource',
    description: 'Get a single resource by ID',
    category: 'CRUD',
    tags: ['rest', 'get', 'detail'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/users/{{userId}}',
    },
  },
  {
    id: 'rest-create',
    name: 'REST - Create Resource',
    description: 'Create a new resource',
    category: 'CRUD',
    tags: ['rest', 'post', 'create'],
    request: {
      method: 'POST',
      url: '{{baseUrl}}/api/users',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      },
    },
  },
  {
    id: 'rest-update',
    name: 'REST - Update Resource',
    description: 'Update an existing resource',
    category: 'CRUD',
    tags: ['rest', 'put', 'update'],
    request: {
      method: 'PUT',
      url: '{{baseUrl}}/api/users/{{userId}}',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    },
  },
  {
    id: 'rest-patch',
    name: 'REST - Partial Update',
    description: 'Partially update a resource',
    category: 'CRUD',
    tags: ['rest', 'patch', 'update'],
    request: {
      method: 'PATCH',
      url: '{{baseUrl}}/api/users/{{userId}}',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        status: 'active',
      },
    },
  },
  {
    id: 'rest-delete',
    name: 'REST - Delete Resource',
    description: 'Delete a resource',
    category: 'CRUD',
    tags: ['rest', 'delete'],
    request: {
      method: 'DELETE',
      url: '{{baseUrl}}/api/users/{{userId}}',
    },
  },

  // Pagination & Filtering
  {
    id: 'pagination-offset',
    name: 'Pagination - Offset/Limit',
    description: 'Page through results using offset and limit',
    category: 'Pagination',
    tags: ['pagination', 'offset', 'limit'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/items',
      params: {
        offset: '0',
        limit: '20',
      },
    },
  },
  {
    id: 'pagination-page',
    name: 'Pagination - Page Number',
    description: 'Page through results using page numbers',
    category: 'Pagination',
    tags: ['pagination', 'page'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/items',
      params: {
        page: '1',
        per_page: '25',
      },
    },
  },
  {
    id: 'pagination-cursor',
    name: 'Pagination - Cursor-based',
    description: 'Page through results using cursors',
    category: 'Pagination',
    tags: ['pagination', 'cursor'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/items',
      params: {
        cursor: '{{nextCursor}}',
        limit: '20',
      },
    },
  },
  {
    id: 'filter-search',
    name: 'Filtering & Search',
    description: 'Filter and search resources',
    category: 'Pagination',
    tags: ['filter', 'search'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/users',
      params: {
        q: 'search term',
        status: 'active',
        role: 'admin',
        sort: 'created_at',
        order: 'desc',
      },
    },
  },

  // File Upload
  {
    id: 'file-upload-multipart',
    name: 'File Upload - Multipart',
    description: 'Upload a file using multipart/form-data',
    category: 'File Upload',
    tags: ['upload', 'file', 'multipart'],
    request: {
      method: 'POST',
      url: '{{baseUrl}}/api/upload',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: 'file=@/path/to/file.jpg&description=My uploaded file',
    },
  },
  {
    id: 'file-upload-base64',
    name: 'File Upload - Base64',
    description: 'Upload a file as base64 encoded string',
    category: 'File Upload',
    tags: ['upload', 'file', 'base64'],
    request: {
      method: 'POST',
      url: '{{baseUrl}}/api/upload',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        filename: 'image.png',
        content: 'data:image/png;base64,iVBORw0KG...',
      },
    },
  },

  // Batch Operations
  {
    id: 'batch-create',
    name: 'Batch Create',
    description: 'Create multiple resources in one request',
    category: 'Batch Operations',
    tags: ['batch', 'bulk', 'create'],
    request: {
      method: 'POST',
      url: '{{baseUrl}}/api/users/batch',
      headers: {
        'Content-Type': 'application/json',
      },
      body: [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' },
      ],
    },
  },
  {
    id: 'batch-update',
    name: 'Batch Update',
    description: 'Update multiple resources in one request',
    category: 'Batch Operations',
    tags: ['batch', 'bulk', 'update'],
    request: {
      method: 'PATCH',
      url: '{{baseUrl}}/api/users/batch',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        ids: ['{{userId1}}', '{{userId2}}', '{{userId3}}'],
        updates: { status: 'active' },
      },
    },
  },

  // Webhooks
  {
    id: 'webhook-register',
    name: 'Register Webhook',
    description: 'Register a webhook endpoint',
    category: 'Webhooks',
    tags: ['webhook', 'register'],
    request: {
      method: 'POST',
      url: '{{baseUrl}}/api/webhooks',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        url: '{{webhookUrl}}',
        events: ['user.created', 'user.updated', 'user.deleted'],
        secret: '{{webhookSecret}}',
      },
    },
  },

  // Health Checks
  {
    id: 'health-check',
    name: 'Health Check',
    description: 'Check API health status',
    category: 'Monitoring',
    tags: ['health', 'status', 'ping'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/health',
    },
  },
  {
    id: 'api-version',
    name: 'API Version Info',
    description: 'Get API version information',
    category: 'Monitoring',
    tags: ['version', 'info'],
    request: {
      method: 'GET',
      url: '{{baseUrl}}/api/version',
    },
  },
];

export function getTemplatesByCategory(category: string): RequestTemplate[] {
  return requestTemplates.filter(t => t.category === category);
}

export function getTemplateCategories(): string[] {
  return Array.from(new Set(requestTemplates.map(t => t.category)));
}

export function searchTemplates(query: string): RequestTemplate[] {
  const lowerQuery = query.toLowerCase();
  return requestTemplates.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.includes(lowerQuery))
  );
}
