import type { ApiRequest, ApiResponse, ApiAuth } from '../api/apiTester';

export interface HistoryItem {
  id: string;
  request: ApiRequest;
  response: {
    status: number;
    statusText: string;
    duration: number;
    size: number;
  };
  timestamp: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedRequest {
  id: string;
  name: string;
  request: ApiRequest;
  description?: string;
  createdAt: number;
}

class ApiTesterStorage {
  private historyKey = 'apiTester:history';
  private collectionsKey = 'apiTester:collections';
  private testsKey = 'apiTester:tests';
  private maxHistoryItems = 100;

  // ===== HISTORY =====

  /**
   * Add a request to history
   */
  addToHistory(request: ApiRequest, response: ApiResponse): void {
    try {
      const history = this.getHistory();
      const item: HistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        request,
        response: {
          status: response.status,
          statusText: response.statusText,
          duration: response.duration,
          size: response.size,
        },
        timestamp: Date.now(),
      };

      // Add to beginning and limit size
      history.unshift(item);
      if (history.length > this.maxHistoryItems) {
        history.splice(this.maxHistoryItems);
      }

      localStorage.setItem(this.historyKey, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  }

  /**
   * Get all history items
   */
  getHistory(): HistoryItem[] {
    try {
      const raw = localStorage.getItem(this.historyKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    try {
      localStorage.setItem(this.historyKey, JSON.stringify([]));
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }

  /**
   * Delete a specific history item
   */
  deleteHistoryItem(id: string): void {
    try {
      const history = this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(this.historyKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  }

  // ===== COLLECTIONS =====

  /**
   * Get all collections
   */
  getCollections(): Collection[] {
    try {
      const raw = localStorage.getItem(this.collectionsKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Failed to load collections:', error);
      return [];
    }
  }

  /**
   * Create a new collection
   */
  createCollection(name: string, description?: string): Collection {
    try {
      const collections = this.getCollections();
      const collection: Collection = {
        id: `coll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        description,
        requests: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      collections.push(collection);
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      return collection;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Update a collection
   */
  updateCollection(id: string, updates: Partial<Omit<Collection, 'id' | 'createdAt'>>): void {
    try {
      const collections = this.getCollections();
      const index = collections.findIndex(c => c.id === id);
      if (index !== -1) {
        collections[index] = {
          ...collections[index],
          ...updates,
          updatedAt: Date.now(),
        };
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  }

  /**
   * Delete a collection
   */
  deleteCollection(id: string): void {
    try {
      const collections = this.getCollections();
      const filtered = collections.filter(c => c.id !== id);
      localStorage.setItem(this.collectionsKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  }

  /**
   * Add a request to a collection
   */
  addRequestToCollection(collectionId: string, name: string, request: ApiRequest, description?: string): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        const savedRequest: SavedRequest = {
          id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name,
          request,
          description,
          createdAt: Date.now(),
        };

        collection.requests.push(savedRequest);
        collection.updatedAt = Date.now();
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to add request to collection:', error);
    }
  }

  /**
   * Update a request in a collection
   */
  updateRequestInCollection(
    collectionId: string,
    requestId: string,
    updates: Partial<Omit<SavedRequest, 'id' | 'createdAt'>>
  ): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        const reqIndex = collection.requests.findIndex(r => r.id === requestId);
        if (reqIndex !== -1) {
          collection.requests[reqIndex] = {
            ...collection.requests[reqIndex],
            ...updates,
          };
          collection.updatedAt = Date.now();
          localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
        }
      }
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  }

  /**
   * Delete a request from a collection
   */
  deleteRequestFromCollection(collectionId: string, requestId: string): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);

      if (collection) {
        collection.requests = collection.requests.filter(r => r.id !== requestId);
        collection.updatedAt = Date.now();
        localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
    }
  }

  /**
   * Reorder collections to match the given list of IDs
   */
  reorderCollections(orderIds: string[]): void {
    try {
      const collections = this.getCollections();
      const order = new Map(orderIds.map((id, idx) => [id, idx] as const));
      collections.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
    } catch (error) {
      console.error('Failed to reorder collections:', error);
    }
  }

  /**
   * Reorder requests within a collection
   */
  reorderRequests(collectionId: string, orderRequestIds: string[]): void {
    try {
      const collections = this.getCollections();
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) return;
      const order = new Map(orderRequestIds.map((id, idx) => [id, idx] as const));
      collection.requests.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      collection.updatedAt = Date.now();
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
    } catch (error) {
      console.error('Failed to reorder requests:', error);
    }
  }

  // ===== IMPORT (Swagger/OpenAPI) =====

  /**
   * Import a Swagger/OpenAPI v2 or v3 spec into a new collection
   * Returns the created collection.
   */
  importSwaggerSpec(data: any): Collection | null {
    try {
      if (!data || (!data.swagger && !data.openapi)) return null;

      const now = Date.now();
      const isOpenAPI3 = !!data.openapi;
      const collectionName = data.info?.title || 'Imported Swagger API';
      const description = data.info?.description;

      // Determine base URL/server
      let baseUrl = '';
      if (isOpenAPI3 && Array.isArray(data.servers) && data.servers.length > 0) {
        baseUrl = data.servers[0].url || '';
      } else if (data.host) {
        const scheme = Array.isArray(data.schemes) && data.schemes.length > 0 ? data.schemes[0] : 'https';
        const basePath = data.basePath || '';
        baseUrl = `${scheme}://${data.host}${basePath}`;
      }

      const savedRequests: SavedRequest[] = [];
      const paths = data.paths || {};

      // Helper to convert parameter to query param or header
      const extractParams = (parameters: any[]): { params?: Record<string, string>; headers?: Record<string, string> } => {
        const params: Record<string, string> = {};
        const headers: Record<string, string> = {};

        if (!Array.isArray(parameters)) return {};

        parameters.forEach((param: any) => {
          if (!param || !param.name) return;
          const loc = param.in;
          const example = param.example || param.default || '';

          if (loc === 'query') {
            params[param.name] = String(example);
          } else if (loc === 'header') {
            headers[param.name] = String(example);
          }
        });

        return {
          params: Object.keys(params).length ? params : undefined,
          headers: Object.keys(headers).length ? headers : undefined,
        };
      };

      // Helper to extract request body from OpenAPI 3.x or Swagger 2.x
      const extractBody = (operation: any, isV3: boolean): any => {
        if (isV3) {
          // OpenAPI 3.x uses requestBody
          if (!operation.requestBody || !operation.requestBody.content) return undefined;
          const content = operation.requestBody.content;
          // Try JSON first
          if (content['application/json']) {
            const schema = content['application/json'].schema;
            return schema?.example || schema?.default || { /* example from schema */ };
          }
          // Fallback to first content type
          const firstContentType = Object.keys(content)[0];
          if (firstContentType) {
            const schema = content[firstContentType].schema;
            return schema?.example || schema?.default;
          }
        } else {
          // Swagger 2.x uses parameters with in: 'body'
          if (!Array.isArray(operation.parameters)) return undefined;
          const bodyParam = operation.parameters.find((p: any) => p.in === 'body');
          if (bodyParam && bodyParam.schema) {
            return bodyParam.schema.example || bodyParam.schema.default;
          }
        }
        return undefined;
      };

      // Parse each path and method
      Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
        if (!pathItem || typeof pathItem !== 'object') return;

        const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
        methods.forEach(method => {
          const operation = pathItem[method];
          if (!operation) return;

          const url = baseUrl + path;
          const name = operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`;
          const desc = operation.description;

          // Extract parameters (query, headers)
          const allParams = [
            ...(pathItem.parameters || []),
            ...(operation.parameters || [])
          ];
          const { params, headers } = extractParams(allParams);

          // Extract body
          const body = extractBody(operation, isOpenAPI3);

          // Build request
          const request: ApiRequest = {
            method: method.toUpperCase() as ApiRequest['method'],
            url,
            params,
            headers,
            body,
          };

          const saved: SavedRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            request,
            description: desc,
            createdAt: now,
          };
          savedRequests.push(saved);
        });
      });

      if (savedRequests.length === 0) {
        console.warn('No endpoints found in Swagger spec');
        return null;
      }

      const collections = this.getCollections();
      const newCollection: Collection = {
        id: `coll_${now}_${Math.random().toString(36).slice(2, 6)}`,
        name: collectionName,
        description,
        requests: savedRequests,
        createdAt: now,
        updatedAt: now,
      };
      collections.push(newCollection);
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      return newCollection;
    } catch (error) {
      console.error('Failed to import Swagger spec:', error);
      return null;
    }
  }

  // ===== IMPORT (Postman Collection) =====

  /**
   * Import a Postman v2 collection JSON into a new collection
   * Returns the created collection.
   */
  importPostmanCollection(data: any): Collection | null {
    try {
      if (!data || (!data.info && !data.item)) return null;

      const now = Date.now();
      const collectionName: string = (data.info?.name as string) || 'Imported Collection';

      const toText = (desc: any): string | undefined => {
        if (!desc) return undefined;
        if (typeof desc === 'string') return desc;
        if (typeof desc === 'object' && 'content' in desc) return (desc as any).content as string;
        return undefined;
      };

      const parseUrl = (pmUrl: any): { url: string; params?: Record<string, string> } => {
        try {
          if (!pmUrl) return { url: '' };
          if (typeof pmUrl === 'string') {
            const u = new URL(pmUrl);
            const params: Record<string, string> = {};
            u.searchParams.forEach((v, k) => (params[k] = v));
            return { url: u.toString(), params: Object.keys(params).length ? params : undefined };
          }
          // Postman URL object
          if (pmUrl.raw) {
            const raw = String(pmUrl.raw);
            try {
              const u = new URL(raw);
              const params: Record<string, string> = {};
              u.searchParams.forEach((v, k) => (params[k] = v));
              return { url: u.toString(), params: Object.keys(params).length ? params : undefined };
            } catch {
              return { url: raw };
            }
          }
          const protocol = pmUrl.protocol ? pmUrl.protocol + '://' : '';
          const host = Array.isArray(pmUrl.host) ? pmUrl.host.join('.') : pmUrl.host || '';
          const path = Array.isArray(pmUrl.path) ? '/' + pmUrl.path.join('/') : pmUrl.path || '';
          const base = `${protocol}${host}${path}`;
          const queryArr = Array.isArray(pmUrl.query) ? pmUrl.query : [];
          const params: Record<string, string> = {};
          const qs = queryArr
            .filter((q: any) => q && !q.disabled && q.key)
            .map((q: any) => {
              const v = q.value != null ? String(q.value) : '';
              params[String(q.key)] = v;
              return `${encodeURIComponent(q.key)}=${encodeURIComponent(v)}`;
            })
            .join('&');
          const url = qs ? `${base}?${qs}` : base;
          return { url, params: Object.keys(params).length ? params : undefined };
        } catch {
          return { url: '' };
        }
      };

      const parseHeaders = (pmHeaders: any): Record<string, string> | undefined => {
        if (!Array.isArray(pmHeaders)) return undefined;
        const headers: Record<string, string> = {};
        pmHeaders.forEach((h: any) => {
          if (!h || h.disabled || !h.key) return;
          headers[String(h.key)] = h.value != null ? String(h.value) : '';
        });
        return Object.keys(headers).length ? headers : undefined;
      };

      const parseBody = (pmBody: any, headers: Record<string, string>): any => {
        if (!pmBody || !pmBody.mode) return undefined;
        const mode = pmBody.mode as string;
        if (mode === 'raw') {
          return pmBody.raw ?? '';
        }
        if (mode === 'urlencoded' && Array.isArray(pmBody.urlencoded)) {
          headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
          const obj: Record<string, string> = {};
          pmBody.urlencoded.forEach((p: any) => {
            if (!p || p.disabled || !p.key) return;
            obj[String(p.key)] = p.value != null ? String(p.value) : '';
          });
          return obj;
        }
        if (mode === 'formdata' && Array.isArray(pmBody.formdata)) {
          // Map text fields; skip files.
          const obj: Record<string, string> = {};
          pmBody.formdata.forEach((p: any) => {
            if (!p || p.disabled || !p.key) return;
            if (p.type === 'text' || p.src == null) {
              obj[String(p.key)] = p.value != null ? String(p.value) : '';
            }
          });
          return obj;
        }
        if (mode === 'graphql' && pmBody.graphql) {
          return {
            query: pmBody.graphql.query || '',
            variables: (() => {
              try { return JSON.parse(pmBody.graphql.variables || '{}'); } catch { return {}; }
            })(),
          };
        }
        return undefined;
      };

      const applyAuthToHeaders = (pmAuth: any, headers: Record<string, string>) => {
        if (!pmAuth || !pmAuth.type) return;
        const type = pmAuth.type as string;
        const params = Array.isArray(pmAuth[type]) ? pmAuth[type] : [];
        const map: Record<string, string> = {};
        params.forEach((p: any) => {
          if (p && p.key) map[p.key] = p.value != null ? String(p.value) : '';
        });
        if (type === 'bearer' && map.token) {
          headers['Authorization'] = `Bearer ${map.token}`;
        } else if (type === 'apikey' && map.key && map.value) {
          // Prefer header placement
          headers[map.key] = map.value;
        } else if (type === 'basic' && map.username) {
          const raw = `${map.username}:${map.password || ''}`;
          if (typeof btoa !== 'undefined') {
            try {
              headers['Authorization'] = `Basic ${btoa(raw)}`;
            } catch {
              headers['Authorization'] = `Basic ${raw}`;
            }
          } else {
            headers['Authorization'] = `Basic ${raw}`;
          }
        }
      };

      const mapPmRequestToApi = (pmReq: any): ApiRequest => {
        const method = (pmReq?.method || 'GET').toUpperCase();
        const { url, params } = parseUrl(pmReq?.url);
        const headers = parseHeaders(pmReq?.header) || {};
        // Apply per-request auth if present
        applyAuthToHeaders(pmReq?.auth, headers);
        const body = parseBody(pmReq?.body, headers);

        // Build auth object (best-effort) to persist in our model
        let auth: ApiAuth | undefined;
        if (pmReq?.auth && pmReq.auth.type) {
          const t = String(pmReq.auth.type);
          const paramsArr = Array.isArray(pmReq.auth[t]) ? pmReq.auth[t] : [];
          const amap: Record<string, string> = {};
          paramsArr.forEach((p: any) => { if (p && p.key) amap[p.key] = p.value != null ? String(p.value) : ''; });
          if (t === 'bearer' && amap.token) auth = { type: 'bearer', bearerToken: amap.token };
          else if (t === 'basic' && (amap.username || amap.password)) auth = { type: 'basic', username: amap.username, password: amap.password } as any;
          else if (t === 'apikey' && (amap.key || amap.value)) auth = { type: 'apikey', apiKeyName: amap.key, apiKey: amap.value, apiKeyIn: (amap.in as any) || 'header' } as any;
        }

        return {
          method,
          url,
          headers: Object.keys(headers).length ? headers : undefined,
          params,
          body,
          auth,
        } as ApiRequest;
      };

      const savedRequests: SavedRequest[] = [];

      const walkItems = (items: any[], prefix: string[] = []) => {
        if (!Array.isArray(items)) return;
        items.forEach((it: any) => {
          if (!it) return;
          if (it.request) {
            const req = mapPmRequestToApi(it.request);
            const nameParts = [...prefix, String(it.name || req.url || 'Request')];
            const saved: SavedRequest = {
              id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: nameParts.join(' / '),
              request: req,
              description: toText(it.request?.description) || toText(it.description),
              createdAt: now,
            };
            savedRequests.push(saved);
          } else if (Array.isArray(it.item)) {
            const nextPrefix = it.name ? [...prefix, String(it.name)] : prefix;
            walkItems(it.item, nextPrefix);
          }
        });
      };

      walkItems(data.item || []);

      const collections = this.getCollections();
      const newCollection: Collection = {
        id: `coll_${now}_${Math.random().toString(36).slice(2, 6)}`,
        name: collectionName,
        description: toText(data.info?.description),
        requests: savedRequests,
        createdAt: now,
        updatedAt: now,
      };
      collections.push(newCollection);
      localStorage.setItem(this.collectionsKey, JSON.stringify(collections));
      return newCollection;
    } catch (error) {
      console.error('Failed to import Postman collection:', error);
      return null;
    }
  }

  // ===== TESTS =====

  getTests(): TestCase[] {
    try {
      const raw = localStorage.getItem(this.testsKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load tests:', e);
      return [];
    }
  }

  createTest(name: string, request: ApiRequest, assertions: Assertion[], tags?: string[]): TestCase {
    const tests = this.getTests();
    const test: TestCase = {
      id: `test_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name,
      request,
      assertions,
      tags: tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    tests.push(test);
    try { localStorage.setItem(this.testsKey, JSON.stringify(tests)); } catch {}
    return test;
  }

  updateTest(id: string, updates: Partial<Omit<TestCase, 'id' | 'createdAt'>>): void {
    const tests = this.getTests();
    const idx = tests.findIndex(t => t.id === id);
    if (idx !== -1) {
      tests[idx] = { ...tests[idx], ...updates, updatedAt: Date.now() } as TestCase;
      try { localStorage.setItem(this.testsKey, JSON.stringify(tests)); } catch {}
    }
  }

  deleteTest(id: string): void {
    const tests = this.getTests();
    const next = tests.filter(t => t.id !== id);
    try { localStorage.setItem(this.testsKey, JSON.stringify(next)); } catch {}
  }
}

export const apiTesterStorage = new ApiTesterStorage();

// ===== Types for Tests and Assertions =====
export type Assertion =
  | { type: 'status'; op: 'equals'; value: number }
  | { type: 'header'; key: string; op: 'contains' | 'equals'; value: string }
  | { type: 'json'; path: string; op: 'exists' | 'equals'; value?: any };

export interface TestCase {
  id: string;
  name: string;
  request: ApiRequest;
  assertions: Assertion[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastResult?: {
    passed: boolean;
    status: number;
    duration: number;
    at: number;
    details: Array<{ assertion: Assertion; passed: boolean; actual?: any; message?: string }>;
  };
}
