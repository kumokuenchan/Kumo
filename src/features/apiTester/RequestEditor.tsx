import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Trash2, Save, X, Copy, FlaskConical, Download, ChevronUp, ChevronDown, Code2, Wand2, Minimize2, MoreVertical, ChevronDown as ChevronDownIcon, PanelRight, PanelTop } from 'lucide-react';
import { apiTesterApi, type ApiRequest, type ApiResponse, type ApiAuth } from '../../api/apiTester';
import { apiTesterStorage, type Collection, type Assertion, type TestCase } from '../../services/apiTesterStorage';
import { environmentStorage } from '../../services/environmentStorage';
import { responseTimeStorage } from '../../services/responseTimeStorage';
import TestsPanel from './TestsPanel';
import ResponseViewer from './ResponseViewer';
import CodeGenerator from './CodeGenerator';
import GraphQLEditor from './GraphQLEditor';
import CollectionsPanel from './CollectionsPanel';
import Toast from '../../components/Toast';

interface RequestEditorProps {
  request: ApiRequest;
  response: ApiResponse | null;
  onRequestChange: (request: ApiRequest) => void;
  onResponseChange: (response: ApiResponse) => void;
}

type RequestTab = 'params' | 'headers' | 'body' | 'auth' | 'graphql';
type RequestMode = 'rest' | 'graphql';
type LayoutMode = 'vertical' | 'horizontal';

export default function RequestEditor({
  request,
  response,
  onRequestChange,
  onResponseChange,
}: RequestEditorProps) {
  // Load layout mode from localStorage
  const loadLayoutMode = (): LayoutMode => {
    try {
      const saved = localStorage.getItem('apiTesterLayoutMode');
      return (saved === 'horizontal' || saved === 'vertical') ? saved : 'vertical';
    } catch {
      return 'vertical';
    }
  };

  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const [requestMode, setRequestMode] = useState<RequestMode>('rest');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(loadLayoutMode);
  const [isLoading, setIsLoading] = useState(false);
  const [bodyType, setBodyType] = useState<'json' | 'form' | 'raw'>('json');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveRequestName, setSaveRequestName] = useState('');
  const [saveRequestDescription, setSaveRequestDescription] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  // Tests UI state
  const [showTests, setShowTests] = useState(false);
  const [showSaveTest, setShowSaveTest] = useState(false);
  const [testName, setTestName] = useState('');
  const [testTags, setTestTags] = useState('');
  const [assertions, setAssertions] = useState<Assertion[]>([{ type: 'status', op: 'equals', value: 200 }]);
  // Code generation state
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  // Fuzz testing state
  const [showFuzzModal, setShowFuzzModal] = useState(false);
  const [isFuzzRunning, setIsFuzzRunning] = useState(false);
  const [fuzzCases, setFuzzCases] = useState<Array<{ name: string; request: ApiRequest; expectFailure: boolean }>>([]);
  const [fuzzResults, setFuzzResults] = useState<Array<{
    name: string;
    status?: number;
    statusText?: string;
    duration?: number;
    size?: number;
    unexpectedSuccess?: boolean;
    error?: string;
  }>>([]);
  const fuzzContentRef = useRef<HTMLDivElement>(null);
  // Local editing state to keep key inputs stable while typing
  const [editingParamKeys, setEditingParamKeys] = useState<Record<string, string>>({});
  const [editingHeaderKeys, setEditingHeaderKeys] = useState<Record<string, string>>({});
  // JSON formatting state
  const [jsonError, setJsonError] = useState<string | null>(null);
  // Dropdown menu states
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const methods: ApiRequest['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // Persist layout mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apiTesterLayoutMode', layoutMode);
    } catch (e) {
      console.error('Failed to save layout mode:', e);
    }
  }, [layoutMode]);

  // Toggle layout mode
  const toggleLayoutMode = () => {
    setLayoutMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  };

  // Keyboard shortcut for sending request
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Enter: Send request
      if (cmdOrCtrl && e.key === 'Enter' && request.url && !isLoading) {
        e.preventDefault();
        handleExecute();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [request, isLoading]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowSaveDropdown(false);
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== Auth management =====
  const initialAuth: ApiAuth = request.auth || { type: 'none' };
  const [auth, setAuth] = useState<ApiAuth>(initialAuth);

  // Sync auth state when request.auth changes (e.g., when bearer token is set for group)
  useEffect(() => {
    if (request.auth) {
      setAuth(request.auth);
    }
  }, [request.auth]);

  const applyAuthToRequest = (nextAuth: ApiAuth, base: ApiRequest): ApiRequest => {
    // Create copies to avoid mutation
    let headers: Record<string, string> = { ...(base.headers || {}) };
    let params: Record<string, string> = { ...(base.params || {}) };

    // Clean previous auth artifacts
    // Authorization header
    if (headers['Authorization']) delete headers['Authorization'];
    // Potential API key header from prior state
    if (base.auth?.type === 'apikey' && base.auth.apiKeyName && base.auth.apiKeyIn === 'header') {
      delete headers[base.auth.apiKeyName];
    }
    // Potential API key query param from prior state
    if (base.auth?.type === 'apikey' && base.auth.apiKeyName && base.auth.apiKeyIn === 'query') {
      delete params[base.auth.apiKeyName];
    }

    // Apply new auth
    if (nextAuth.type === 'bearer' && nextAuth.bearerToken) {
      headers['Authorization'] = `Bearer ${nextAuth.bearerToken}`;
    } else if (nextAuth.type === 'basic' && nextAuth.username != null) {
      const raw = `${nextAuth.username}:${nextAuth.password || ''}`;
      try {
        // btoa may not exist in some environments; fallback to raw
        // In Electron/Browser it exists
        // @ts-ignore
        const encoded = typeof btoa !== 'undefined' ? btoa(raw) : raw;
        headers['Authorization'] = `Basic ${encoded}`;
      } catch {
        headers['Authorization'] = `Basic ${raw}`;
      }
    } else if (nextAuth.type === 'apikey' && nextAuth.apiKey && nextAuth.apiKeyName) {
      if (nextAuth.apiKeyIn === 'query') {
        params[nextAuth.apiKeyName] = nextAuth.apiKey;
      } else {
        headers[nextAuth.apiKeyName] = nextAuth.apiKey;
      }
    }

    const updated: ApiRequest = {
      ...base,
      headers: Object.keys(headers).length ? headers : undefined,
      params: Object.keys(params).length ? params : undefined,
      auth: nextAuth,
    };
    return updated;
  };

  // ===== Copy as cURL =====
  const buildCurlCommand = (req: ApiRequest): string => {
    const escape = (s: string) => String(s).replace(/'/g, "'\\''");

    // Build final URL including params, env variables and path substitutions
    const replaceVars = (text: string) => environmentStorage.replaceVariables(text);
    let urlStr = replaceVars(req.url || '');
    const qp: Record<string, string> = Object.fromEntries(
      Object.entries(req.params || {}).map(([k, v]) => [k, replaceVars(String(v))])
    );
    if (urlStr) {
      const used = new Set<string>();
      // Substitute path params from query params first
      urlStr = urlStr.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
        if (qp[key] != null) {
          used.add(key);
          return encodeURIComponent(String(qp[key]));
        }
        return m;
      });
      used.forEach(k => delete qp[k]);
      // Fallback to environment variables for remaining {var}
      urlStr = urlStr.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
        const envVal = environmentStorage.getVariable(key);
        return envVal != null ? encodeURIComponent(String(envVal)) : m;
      });
    }
    try {
      const u = new URL(urlStr || 'http://localhost');
      Object.entries(qp).forEach(([k, v]) => {
        if (v != null) u.searchParams.set(k, String(v));
      });
      // If original had no protocol and failed, keep raw
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        urlStr = u.toString();
      } else {
        // For non-absolute, rebuild naive query append
        const qs = new URLSearchParams(qp || {}).toString();
        urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
      }
    } catch {
      const qs = new URLSearchParams(qp || {}).toString();
      urlStr = qs ? `${urlStr}${urlStr.includes('?') ? '&' : '?'}${qs}` : urlStr;
    }

    // Headers (apply env variable replacements to header values)
    const headers = Object.fromEntries(
      Object.entries(req.headers || {}).map(([k, v]) => [k, replaceVars(String(v))])
    ) as Record<string, string>;

    // Body
    let dataFlag = '';
    if (req.body !== undefined && req.body !== null && req.method !== 'GET' && req.method !== 'HEAD') {
      let bodyStr: string;
      if (typeof req.body === 'string') {
        bodyStr = replaceVars(req.body);
      } else if (req.body instanceof Blob) {
        bodyStr = '[binary]';
      } else {
        try {
          bodyStr = JSON.stringify(JSON.parse(replaceVars(JSON.stringify(req.body))));
        } catch {
          bodyStr = JSON.stringify(req.body);
        }
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      }
      dataFlag = ` \\\n+  --data-raw '${escape(bodyStr)}'`;
    }

    const headerFlags = Object.entries(headers)
      .map(([k, v]) => ` \\\n+  -H '${escape(k)}: ${escape(v)}'`)
      .join('');

    const methodFlag = req.method && req.method !== 'GET' ? `-X ${req.method} ` : '';

    const curl = `curl ${methodFlag}'${escape(urlStr)}'${headerFlags}${dataFlag}`;
    return curl;
  };

  const copyAsCurl = async () => {
    try {
      const cmd = buildCurlCommand(request);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cmd);
      } else {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setToast({ message: 'Copied as cURL', type: 'success' });
    } catch (err: any) {
      console.error('Copy as cURL failed:', err);
      setToast({ message: 'Failed to copy cURL', type: 'error' });
    }
  };

  // ===== Schema-aware negative tests (fuzz) =====
  const generateFuzzCases = (base: ApiRequest): Array<{ name: string; request: ApiRequest; expectFailure: boolean }> => {
    const cases: Array<{ name: string; request: ApiRequest; expectFailure: boolean }> = [];
    const clone = (r: ApiRequest): ApiRequest => JSON.parse(JSON.stringify(r));
    const canHaveBody = !['GET', 'HEAD'].includes(base.method);

    const add = (name: string, mut: (r: ApiRequest) => void, expectFailure = true) => {
      const r = clone(base);
      mut(r);
      cases.push({ name, request: r, expectFailure });
    };

    // Headers-based tests
    add('Missing Content-Type (JSON body)', r => {
      if (canHaveBody && r.body && typeof r.body !== 'string') {
        r.headers = { ...(r.headers || {}) };
        delete r.headers['Content-Type'];
      }
    }, true);
    add('Wrong Content-Type (send JSON as text/plain)', r => {
      if (canHaveBody && r.body) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'text/plain' };
        if (typeof r.body !== 'string') r.body = JSON.stringify(r.body);
      }
    }, true);

    // Params tests
    if (base.params && Object.keys(base.params).length) {
      const firstKey = Object.keys(base.params)[0];
      add(`Param ${firstKey} empty`, r => {
        r.params = { ...(r.params || {}) };
        r.params[firstKey] = '';
      }, true);
      add(`Param ${firstKey} long string`, r => {
        r.params = { ...(r.params || {}) };
        r.params[firstKey] = 'x'.repeat(2048);
      }, true);
    }

    // Body-based tests
    if (canHaveBody) {
      if (typeof base.body === 'string') {
        add('Body empty string', r => { r.body = ''; }, true);
        add('Body extremely long string', r => { r.body = 'x'.repeat(10000); }, true);
        add('Body invalid JSON string', r => {
          r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
          r.body = '{invalid json]';
        }, true);
      } else if (base.body && typeof base.body === 'object') {
        const obj = base.body as Record<string, any>;
        const keys = Object.keys(obj);
        // Remove a field
        if (keys.length) {
          const k = keys[0];
          add(`Missing field: ${k}`, r => {
            if (r.body && typeof r.body === 'object') {
              const b: any = { ...(r.body as any) };
              delete b[k];
              r.body = b;
              r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
            }
          }, true);
        }
        // Null a field
        if (keys.length) {
          const k = keys[0];
          add(`Null field: ${k}`, r => {
            if (r.body && typeof r.body === 'object') {
              const b: any = { ...(r.body as any) };
              b[k] = null;
              r.body = b;
              r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
            }
          }, true);
        }
        // Wrong type for first key
        if (keys.length) {
          const k = keys[0];
          add(`Wrong type for ${k}`, r => {
            if (r.body && typeof r.body === 'object') {
              const b: any = { ...(r.body as any) };
              const v = b[k];
              b[k] = typeof v === 'number' ? 'not-a-number' : 12345;
              r.body = b;
              r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
            }
          }, true);
        }
        // Extra unexpected field
        add('Extra unexpected field __junk', r => {
          if (r.body && typeof r.body === 'object') {
            const b: any = { ...(r.body as any), __junk: 'unexpected' };
            r.body = b;
            r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
          }
        }, true);
        // Empty object
        add('Empty object body', r => {
          r.body = {};
          r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        }, true);
        // Array tests if body is array
        if (Array.isArray(base.body)) {
          add('Empty array body', r => { r.body = []; }, true);
          add('Large array body', r => { r.body = new Array(200).fill(base.body[0] ?? {}); }, true);
        }
      } else {
        // No body set; try sending body when not expected
        add('Unexpected body for method', r => { r.body = { ping: 'pong' }; r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' }; }, true);
      }
    }

    // Generic negative tests (apply regardless of method/body)
    add('Timeout extremely low (1ms)', r => { r.timeout = 1; }, true);
    add('Invalid Accept header (XML)', r => { r.headers = { ...(r.headers || {}), 'Accept': 'application/xml' }; }, false);
    add('Huge header X-Debug', r => { r.headers = { ...(r.headers || {}), 'X-Debug': 'x'.repeat(4096) }; }, true);
    add('Add unexpected JSON body (even for GET)', r => {
      r.body = { unexpected: true };
      r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
    }, true);
    add('Param limit very large', r => { r.params = { ...(r.params || {}), limit: '1000000' }; }, true);
    add('Param page negative', r => { r.params = { ...(r.params || {}), page: '-1' }; }, true);
    add('Param q very long', r => { r.params = { ...(r.params || {}), q: 'x'.repeat(2048) }; }, true);
    add('Toggle trailing slash in URL', r => { if (r.url) { r.url = r.url.endsWith('/') ? r.url.slice(0, -1) : r.url + '/'; } }, false);
    add('Double slash in path', r => {
      try {
        const u = new URL(r.url);
        if (!u.pathname.includes('//')) u.pathname = u.pathname.replace(/\/+$/, '') + '//';
        r.url = u.toString();
      } catch {
        // fallback naive
        if (r.url && !r.url.includes('//')) r.url = r.url + '//';
      }
    }, false);
    add('Invalid Authorization token (if present)', r => {
      const h = { ...(r.headers || {}) } as Record<string, string>;
      const keys = Object.keys(h);
      const authKey = keys.find(k => k.toLowerCase() === 'authorization');
      if (authKey) {
        h[authKey] = 'Bearer invalid-token';
        r.headers = h;
      }
    }, true);

    // Security-focused cases
    const addSec = (name: string, mut: (r: ApiRequest) => void) => add(`SEC: ${name}`, mut, true);

    // XSS payloads
    addSec('XSS in first param', r => {
      const xss = "<script>alert(1)</script>";
      const key = r.params && Object.keys(r.params).length ? Object.keys(r.params)[0] : 'q';
      r.params = { ...(r.params || {}), [key]: xss };
    });
    addSec('XSS in JSON string field', r => {
      if (canHaveBody) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        const b = (typeof r.body === 'object' && r.body) ? { ...(r.body as any) } : {};
        b.message = '<img src=x onerror=alert(1) />';
        r.body = b;
      }
    });

    // SQL injection
    addSec("SQLi in param: ' OR '1'='1 --", r => {
      const inj = "' OR '1'='1 --";
      const key = r.params && Object.keys(r.params).length ? Object.keys(r.params)[0] : 'id';
      r.params = { ...(r.params || {}), [key]: inj };
    });
    addSec('SQLi in JSON field', r => {
      if (canHaveBody) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        const b = (typeof r.body === 'object' && r.body) ? { ...(r.body as any) } : {};
        b.username = "admin' --";
        r.body = b;
      }
    });

    // Path traversal
    addSec('Path traversal in filename param', r => {
      r.params = { ...(r.params || {}), filename: '../../etc/passwd' };
    });

    // Header injection (CRLF). Many clients sanitize; still worth testing server behavior
    addSec('Header injection (CRLF) in X-Test', r => {
      r.headers = { ...(r.headers || {}), 'X-Test': 'ok\r\nInjected: 1' };
    });

    // SSRF candidates: callback/url parameters pointing to local metadata or loopback
    addSec('SSRF param url=169.254.169.254', r => {
      r.params = { ...(r.params || {}), url: 'http://169.254.169.254/latest/meta-data/' };
    });
    addSec('SSRF param url=localhost', r => {
      r.params = { ...(r.params || {}), url: 'http://127.0.0.1:80/' };
    });

    // NoSQL injection
    addSec('NoSQL $ne in JSON field', r => {
      if (canHaveBody) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        const b = (typeof r.body === 'object' && r.body) ? { ...(r.body as any) } : {};
        b.filter = { $ne: '' };
        r.body = b;
      }
    });

    // Prototype pollution attempt
    addSec('Prototype pollution __proto__', r => {
      if (canHaveBody) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        const b = (typeof r.body === 'object' && r.body) ? { ...(r.body as any) } : {};
        (b as any)['__proto__'] = { polluted: true };
        r.body = b;
      }
    });

    // Command injection strings
    addSec('Command injection string in field', r => {
      if (canHaveBody) {
        r.headers = { ...(r.headers || {}), 'Content-Type': 'application/json' };
        const b = (typeof r.body === 'object' && r.body) ? { ...(r.body as any) } : {};
        b.name = 'test; cat /etc/passwd | head -n1';
        r.body = b;
      }
    });

    // Unicode confusables
    addSec('Unicode confusables in param (homoglyphs)', r => {
      r.params = { ...(r.params || {}), domain: 'раypal.com' }; // Cyrillic p/a
    });

    // JWT tampering (only if Authorization present)
    addSec('JWT tamper (alg=none unsigned)', r => {
      const h = { ...(r.headers || {}) } as Record<string, string>;
      const keys = Object.keys(h);
      const authKey = keys.find(k => k.toLowerCase() === 'authorization');
      if (!authKey) return; // apply only when present
      const b64u = (s: string) => {
        try {
          // @ts-ignore
          return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
        } catch {
          return '';
        }
      };
      const header = b64u(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = b64u(JSON.stringify({ sub: 'tampered', iat: Math.floor(Date.now()/1000), exp: 0 }));
      const token = `${header}.${payload}.`;
      h[authKey] = `Bearer ${token}`;
      r.headers = h;
    });
    addSec('JWT tamper (invalid signature, escalated role)', r => {
      const h = { ...(r.headers || {}) } as Record<string, string>;
      const keys = Object.keys(h);
      const authKey = keys.find(k => k.toLowerCase() === 'authorization');
      if (!authKey) return; // only when present
      const b64u = (s: string) => {
        try {
          // @ts-ignore
          return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
        } catch {
          return '';
        }
      };
      const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = b64u(JSON.stringify({ sub: 'user', role: 'admin', iat: Math.floor(Date.now()/1000) }));
      const token = `${header}.${payload}.invalidsig`;
      h[authKey] = `Bearer ${token}`;
      r.headers = h;
    });

    // Cap to ~15 cases
    if (cases.length > 20) return cases.slice(0, 20);
    // Ensure we return at least ~10 cases by duplicating some with slight variations
    while (cases.length < 10) {
      const baseCase = cases[cases.length % Math.max(1, cases.length)];
      if (!baseCase) break;
      const variant = clone(baseCase.request);
      variant.headers = { ...(variant.headers || {}), 'X-Fuzz-Variant': String(cases.length) };
      cases.push({ name: baseCase.name + ` (v${cases.length})`, request: variant, expectFailure: baseCase.expectFailure });
    }
    return cases;
  };

  const runFuzz = async () => {
    const cases = generateFuzzCases(request);
    setFuzzCases(cases);
    setFuzzResults([]);
    setShowFuzzModal(true);
    setIsFuzzRunning(true);
    const results: typeof fuzzResults = [];
    for (const c of cases) {
      try {
        const res = await apiTesterApi.executeRequest(c.request);
        results.push({
          name: c.name,
          status: res.status,
          statusText: res.statusText,
          duration: res.duration,
          size: res.size,
          unexpectedSuccess: c.expectFailure && res.status >= 200 && res.status < 300,
        });
      } catch (err: any) {
        results.push({ name: c.name, error: err?.message || 'Request failed' });
      }
      setFuzzResults([...results]);
    }
    setIsFuzzRunning(false);
    setToast({ message: `Fuzz run completed: ${results.length} cases`, type: 'success' });
  };

  const copyFuzzTSV = () => {
    const rows = [
      ['Case', 'Status', 'Time(ms)', 'Size', 'Unexpected Success'],
      ...fuzzResults.map(r => [
        r.name,
        r.status ? `${r.status} ${r.statusText || ''}`.trim() : (r.error || ''),
        r.duration != null ? String(r.duration) : '',
        r.size != null ? String(r.size) : '',
        r.unexpectedSuccess ? 'YES' : '',
      ]),
    ];
    const tsv = rows.map(cols => cols.map(c => (c ?? '').toString().replace(/\t/g, '  ').replace(/\r?\n/g, ' ')).join('\t')).join('\n');
    try {
      navigator.clipboard.writeText(tsv);
      setToast({ message: 'Fuzz matrix copied (TSV)', type: 'success' });
    } catch {
      setToast({ message: 'Failed to copy', type: 'error' });
    }
  };

  const downloadFuzzCSV = () => {
    const rows = [
      ['Case', 'Status', 'Time(ms)', 'Size', 'Unexpected Success'],
      ...fuzzResults.map(r => [
        r.name,
        r.status ? `${r.status} ${r.statusText || ''}`.trim() : (r.error || ''),
        r.duration != null ? String(r.duration) : '',
        r.size != null ? String(r.size) : '',
        r.unexpectedSuccess ? 'YES' : '',
      ]),
    ];
    const csv = rows.map(cols => cols.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `fuzz_results_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Apply environment variables to request and substitute path params like {id}
  const applyVariables = (req: ApiRequest): ApiRequest => {
    const replaceVars = (text: string): string => environmentStorage.replaceVariables(text);

    // First, apply environment variables
    let urlWithVars = replaceVars(req.url || '');
    const paramsWithVars = req.params
      ? Object.fromEntries(
          Object.entries(req.params).map(([k, v]) => [k, replaceVars(String(v))])
        )
      : req.params;
    const headersWithVars = req.headers
      ? Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, replaceVars(String(v))])
        )
      : req.headers;
    const bodyWithVars =
      typeof req.body === 'string'
        ? replaceVars(req.body)
        : req.body && typeof req.body === 'object'
        ? JSON.parse(replaceVars(JSON.stringify(req.body)))
        : req.body;

    // Then, substitute {param} from params, removing consumed ones
    let finalParams: Record<string, string> | undefined = paramsWithVars ? { ...paramsWithVars } : undefined;
    if (urlWithVars) {
      const usedKeys = new Set<string>();
      urlWithVars = urlWithVars.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
        const val = finalParams?.[key];
        if (val != null) {
          usedKeys.add(key);
          return encodeURIComponent(String(val));
        }
        return m;
      });
      if (finalParams && usedKeys.size) usedKeys.forEach(k => delete finalParams![k]);

      // Fallback: {var} from active environment if still present
      urlWithVars = urlWithVars.replace(/\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/g, (m, key: string) => {
        const envVal = environmentStorage.getVariable(key);
        return envVal != null ? encodeURIComponent(String(envVal)) : m;
      });
    }

    return {
      ...req,
      url: urlWithVars,
      params: finalParams,
      headers: headersWithVars,
      body: bodyWithVars,
    };
  };

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      // Apply environment variables before sending
      const requestWithVars = applyVariables(request);
      const res = await apiTesterApi.executeRequest(requestWithVars);
      onResponseChange(res);

      // Save to history with original request (includes variable placeholders)
      apiTesterStorage.addToHistory(request, res);

      // Track response time for performance monitoring
      if (request.url) {
        responseTimeStorage.addEntry(
          request.url,
          request.method,
          res.status,
          res.duration,
          res.size
        );
      }
    } catch (error: any) {
      console.error('Request failed:', error);
      // Create an error response to display in the UI
      const errorResponse: ApiResponse = {
        status: 0,
        statusText: error.message || 'Request Failed',
        headers: {},
        data: error.response?.data || error.message || 'An error occurred while executing the request',
        duration: 0,
        size: 0,
      };
      onResponseChange(errorResponse);
      setToast({ message: 'Request failed: ' + (error.message || 'Unknown error'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateMethod = (method: ApiRequest['method']) => {
    onRequestChange({ ...request, method });
  };

  const updateUrl = (url: string) => {
    onRequestChange({ ...request, url });
  };

  const addParam = () => {
    onRequestChange({
      ...request,
      params: { ...request.params, '': '' },
    });
  };

  const updateParam = (oldKey: string, newKey: string, value: string) => {
    const params = { ...request.params };
    delete params[oldKey];
    if (newKey) params[newKey] = value;
    onRequestChange({ ...request, params });
  };

  const removeParam = (key: string) => {
    const params = { ...request.params };
    delete params[key];
    onRequestChange({ ...request, params });
  };

  const addHeader = () => {
    onRequestChange({
      ...request,
      headers: { ...request.headers, '': '' },
    });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const headers = { ...request.headers };
    delete headers[oldKey];
    if (newKey) headers[newKey] = value;
    onRequestChange({ ...request, headers });
  };

  const removeHeader = (key: string) => {
    const headers = { ...request.headers };
    delete headers[key];
    onRequestChange({ ...request, headers });
  };

  const updateBody = (body: any) => {
    onRequestChange({ ...request, body });
  };

  // Format JSON in body
  const formatJson = () => {
    try {
      let parsed: any;
      if (typeof request.body === 'string') {
        parsed = JSON.parse(request.body);
      } else if (request.body && typeof request.body === 'object') {
        parsed = request.body;
      } else {
        setToast({ message: 'No JSON to format', type: 'info' });
        return;
      }

      // Update body with formatted JSON (as object, textarea will render it pretty)
      updateBody(parsed);
      setJsonError(null);
      setToast({ message: 'JSON formatted successfully', type: 'success' });
    } catch (err: any) {
      const errorMsg = err?.message || 'Invalid JSON';
      setJsonError(errorMsg);
      setToast({ message: `Invalid JSON: ${errorMsg}`, type: 'error' });
    }
  };

  // Minify JSON in body
  const minifyJson = () => {
    try {
      let parsed: any;
      if (typeof request.body === 'string') {
        parsed = JSON.parse(request.body);
      } else if (request.body && typeof request.body === 'object') {
        parsed = request.body;
      } else {
        setToast({ message: 'No JSON to minify', type: 'info' });
        return;
      }

      // Convert to minified string
      const minified = JSON.stringify(parsed);
      updateBody(minified);
      setJsonError(null);
      setToast({ message: 'JSON minified successfully', type: 'success' });
    } catch (err: any) {
      const errorMsg = err?.message || 'Invalid JSON';
      setJsonError(errorMsg);
      setToast({ message: `Invalid JSON: ${errorMsg}`, type: 'error' });
    }
  };

  // Validate JSON in body
  const validateJson = () => {
    if (bodyType !== 'json') {
      setToast({ message: 'Switch to JSON mode to validate', type: 'info' });
      return;
    }

    try {
      if (typeof request.body === 'string') {
        JSON.parse(request.body);
      } else if (request.body && typeof request.body === 'object') {
        JSON.stringify(request.body);
      }

      setJsonError(null);
      setToast({ message: 'JSON is valid', type: 'success' });
    } catch (err: any) {
      const errorMsg = err?.message || 'Invalid JSON';
      setJsonError(errorMsg);
      setToast({ message: `Invalid JSON: ${errorMsg}`, type: 'error' });
    }
  };

  // Auto-beautify JSON on paste in body textarea when JSON mode is active
  const handleJsonPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (bodyType !== 'json') return;
    try {
      const text = e.clipboardData.getData('text');
      if (!text) return;
      const parsed = JSON.parse(text);
      e.preventDefault();
      // Store as object so the textarea renders pretty JSON via JSON.stringify with spacing
      updateBody(parsed);
    } catch {
      // If not valid JSON, allow normal paste
    }
  };

  const openSaveDialog = () => {
    const allCollections = apiTesterStorage.getCollections();
    setCollections(allCollections);

    // Pre-fill request name from URL if available
    if (request.url) {
      try {
        const url = new URL(request.url);
        setSaveRequestName(`${request.method} ${url.pathname}`);
      } catch {
        setSaveRequestName(`${request.method} Request`);
      }
    }

    setShowSaveDialog(true);
  };

  const handleSaveToCollection = () => {
    let collectionId = selectedCollectionId;

    // Create new collection if needed
    if (isCreatingNewCollection && newCollectionName.trim()) {
      const newCollection = apiTesterStorage.createCollection(newCollectionName);
      collectionId = newCollection.id;
    }

    if (collectionId && saveRequestName.trim()) {
      apiTesterStorage.addRequestToCollection(
        collectionId,
        saveRequestName,
        request,
        saveRequestDescription || undefined
      );

      // Reset dialog state
      setShowSaveDialog(false);
      setSaveRequestName('');
      setSaveRequestDescription('');
      setSelectedCollectionId('');
      setNewCollectionName('');
      setIsCreatingNewCollection(false);
    }
  };

  const closeSaveDialog = () => {
    setShowSaveDialog(false);
    setSaveRequestName('');
    setSaveRequestDescription('');
    setSelectedCollectionId('');
    setNewCollectionName('');
    setIsCreatingNewCollection(false);
  };

  const handleLoadRequest = (request: ApiRequest, name?: string) => {
    // Create a new tab with the loaded request - this will be handled by parent (PostmanTab)
    onRequestChange(request);
  };

  const handleLoadCollectionAsGroup = (collection: Collection) => {
    // In horizontal mode, we'll just load the first request
    if (collection.requests && collection.requests.length > 0) {
      onRequestChange(collection.requests[0].request);
    }
  };

  return (
    <div className={`flex h-full ${layoutMode === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
      {/* Collections Sidebar (only in horizontal mode) */}
      {layoutMode === 'horizontal' && (
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <CollectionsPanel
            onLoadRequest={handleLoadRequest}
            onLoadCollectionAsGroup={handleLoadCollectionAsGroup}
            onClose={() => {}} // No close action for sidebar
            currentRequest={request}
            asSidebar={true}
          />
        </div>
      )}

      {/* Request Section */}
      <div className={`${layoutMode === 'horizontal' ? 'flex-1 border-r' : 'flex-shrink-0 border-b'} border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden`}>
        <div className="p-4 flex-shrink-0">
          {/* Mode & Layout Toggle */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRequestMode('rest');
                  setActiveTab('params');
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                  requestMode === 'rest'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                REST
              </button>
              <button
                onClick={() => {
                  setRequestMode('graphql');
                  setActiveTab('graphql');
                  // Set method to POST for GraphQL
                  if (request.method !== 'POST') {
                    updateMethod('POST');
                  }
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                  requestMode === 'graphql'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                GraphQL
              </button>
            </div>

            {/* Layout Toggle Button */}
            <button
              onClick={toggleLayoutMode}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
              title={layoutMode === 'vertical' ? 'Switch to side panel mode' : 'Switch to vertical mode'}
            >
              {layoutMode === 'vertical' ? (
                <>
                  <PanelRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Side Panel</span>
                </>
              ) : (
                <>
                  <PanelTop className="w-4 h-4" />
                  <span className="hidden sm:inline">Vertical</span>
                </>
              )}
            </button>
          </div>

        {/* Method & URL */}
        <div className="flex gap-2 mb-4">
          {requestMode === 'rest' && (
            <select
              value={request.method}
              onChange={(e) => updateMethod(e.target.value as ApiRequest['method'])}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium"
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          )}
          {requestMode === 'graphql' && (
            <div className="px-3 py-2 border border-purple-300 dark:border-purple-600 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium">
              POST
            </div>
          )}

          <input
            type="text"
            value={request.url}
            onChange={(e) => updateUrl(e.target.value)}
            placeholder="Enter request URL (e.g., https://api.example.com/users)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />

          {/* Primary Action: Send */}
          <button
            onClick={handleExecute}
            disabled={isLoading || !request.url}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
            title="Send request (Ctrl/Cmd + Enter)"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>

          {/* Save Dropdown */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowSaveDropdown(!showSaveDropdown)}
              disabled={!request.url}
              className="px-4 py-2 bg-gray-600 dark:bg-slate-600 text-white rounded hover:bg-gray-700 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              title="Save options"
            >
              <Save className="w-4 h-4" />
              Save
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>

            {showSaveDropdown && (
              <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    openSaveDialog();
                    setShowSaveDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-900 dark:text-white"
                >
                  <Save className="w-4 h-4" />
                  Save to Collection
                </button>
                <button
                  onClick={() => {
                    setShowSaveTest(true);
                    setShowSaveDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-900 dark:text-white"
                >
                  <FlaskConical className="w-4 h-4" />
                  Save as Test
                </button>
              </div>
            )}
          </div>

          {/* Tests Button */}
          <button
            onClick={() => setShowTests(true)}
            className="px-4 py-2 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 font-medium transition-colors"
            title="View and run tests"
          >
            <FlaskConical className="w-4 h-4" />
            Tests
          </button>

          {/* More Menu */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="px-4 py-3 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center font-medium transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    copyAsCurl();
                    setShowMoreMenu(false);
                  }}
                  disabled={!request.url}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copy as cURL
                </button>
                <button
                  onClick={() => {
                    setShowCodeGenerator(true);
                    setShowMoreMenu(false);
                  }}
                  disabled={!request.url}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Code2 className="w-4 h-4" />
                  Generate Code
                </button>
                <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                <button
                  onClick={() => {
                    runFuzz();
                    setShowMoreMenu(false);
                  }}
                  disabled={!request.url || isFuzzRunning}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-purple-700 dark:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FlaskConical className="w-4 h-4" />
                  {isFuzzRunning ? 'Running Fuzz Tests...' : 'Run Fuzz Tests'}
                </button>
              </div>
            )}
          </div>
        </div>

        </div>

        {/* Request Tabs */}
        {requestMode === 'rest' && (
          <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 px-4">
            {(['params', 'headers', 'body', 'auth'] as RequestTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
                {tab === 'params' && request.params && Object.keys(request.params).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {Object.keys(request.params).length}
                  </span>
                )}
                {tab === 'headers' && request.headers && Object.keys(request.headers).length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {Object.keys(request.headers).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4">
          {/* GraphQL Mode */}
          {requestMode === 'graphql' && (
            <GraphQLEditor
              request={request}
              onRequestChange={onRequestChange}
              onExecute={handleExecute}
              isLoading={isLoading}
            />
          )}

          {/* Query Params */}
          {requestMode === 'rest' && activeTab === 'params' && (
            <div className="space-y-2">
              {request.params && Object.entries(request.params).map(([key, value], idx) => {
                const displayKey = Object.prototype.hasOwnProperty.call(editingParamKeys, key)
                  ? editingParamKeys[key]
                  : key;
                const commitKey = () => {
                  const newKey = (Object.prototype.hasOwnProperty.call(editingParamKeys, key) ? editingParamKeys[key] : key) || '';
                  if (newKey !== key) {
                    updateParam(key, newKey, value);
                  }
                  setEditingParamKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                const cancelEdit = () => {
                  setEditingParamKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                return (
                  <div key={`${key}_${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={displayKey}
                      onChange={(e) =>
                        setEditingParamKeys(prev => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={commitKey}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitKey();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="Key"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateParam(key, key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <button
                      onClick={() => removeParam(key)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addParam}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Plus className="w-4 h-4" />
                Add Parameter
              </button>
            </div>
          )}

          {/* Headers */}
          {requestMode === 'rest' && activeTab === 'headers' && (
            <div className="space-y-2">
              {request.headers && Object.entries(request.headers).map(([key, value], idx) => {
                const displayKey = Object.prototype.hasOwnProperty.call(editingHeaderKeys, key)
                  ? editingHeaderKeys[key]
                  : key;
                const commitKey = () => {
                  const newKey = (Object.prototype.hasOwnProperty.call(editingHeaderKeys, key) ? editingHeaderKeys[key] : key) || '';
                  if (newKey !== key) {
                    updateHeader(key, newKey, value);
                  }
                  setEditingHeaderKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                const cancelEdit = () => {
                  setEditingHeaderKeys(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                };
                return (
                  <div key={`${key}_${idx}`} className="flex gap-2">
                    <input
                      type="text"
                      value={displayKey}
                      onChange={(e) =>
                        setEditingHeaderKeys(prev => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={commitKey}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitKey();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="Header"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={addHeader}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Plus className="w-4 h-4" />
                Add Header
              </button>
            </div>
          )}

          {/* Body */}
          {requestMode === 'rest' && activeTab === 'body' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex gap-2">
                  {(['json', 'form', 'raw'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setBodyType(type);
                        setJsonError(null);
                      }}
                      className={`px-3 py-1 text-sm rounded ${
                        bodyType === type
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>

                {bodyType === 'json' && (
                  <div className="flex gap-2">
                    <button
                      onClick={formatJson}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors"
                      title="Format JSON (Beautify)"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Format
                    </button>
                    <button
                      onClick={minifyJson}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors"
                      title="Minify JSON (Compact)"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      Minify
                    </button>
                    <button
                      onClick={validateJson}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Validate JSON"
                    >
                      Validate
                    </button>
                  </div>
                )}
              </div>

              <textarea
                value={
                  typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body || {}, null, 2)
                }
                onChange={(e) => {
                  setJsonError(null);
                  try {
                    if (bodyType === 'json') {
                      updateBody(JSON.parse(e.target.value));
                    } else {
                      updateBody(e.target.value);
                    }
                  } catch {
                    updateBody(e.target.value);
                  }
                }}
                onPaste={handleJsonPaste}
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body'}
                className={`w-full h-48 px-3 py-2 border rounded bg-white dark:bg-slate-700 text-sm font-mono ${
                  jsonError
                    ? 'border-red-500 dark:border-red-400'
                    : 'border-gray-300 dark:border-slate-600'
                }`}
              />

              {jsonError && bodyType === 'json' && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">JSON Error:</span>
                    <span className="text-red-700 dark:text-red-300 text-xs">{jsonError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth */}
          {requestMode === 'rest' && activeTab === 'auth' && (
            <div className="space-y-4">
              {/* Type selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auth Type</label>
                <select
                  value={auth.type}
                  onChange={(e) => {
                    const type = e.target.value as ApiAuth['type'];
                    const next: ApiAuth = type === 'none' ? { type } : { type, apiKeyIn: 'header' } as ApiAuth;
                    setAuth(next);
                    onRequestChange(applyAuthToRequest(next, request));
                  }}
                  className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apikey">API Key</option>
                </select>
              </div>

              {/* Bearer */}
              {auth.type === 'bearer' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Token</label>
                  <input
                    type="text"
                    value={auth.bearerToken || ''}
                    onChange={(e) => {
                      const next = { ...auth, bearerToken: e.target.value } as ApiAuth;
                      setAuth(next);
                      onRequestChange(applyAuthToRequest(next, request));
                    }}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
              )}

              {/* Basic */}
              {auth.type === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input
                      type="text"
                      value={auth.username || ''}
                      onChange={(e) => {
                        const next = { ...auth, username: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <input
                      type="password"
                      value={auth.password || ''}
                      onChange={(e) => {
                        const next = { ...auth, password: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* API Key */}
              {auth.type === 'apikey' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Key Name</label>
                    <input
                      type="text"
                      value={auth.apiKeyName || ''}
                      onChange={(e) => {
                        const next = { ...auth, apiKeyName: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      placeholder="e.g., X-API-Key"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                    <input
                      type="text"
                      value={auth.apiKey || ''}
                      onChange={(e) => {
                        const next = { ...auth, apiKey: e.target.value } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add To</label>
                    <select
                      value={auth.apiKeyIn || 'header'}
                      onChange={(e) => {
                        const next = { ...auth, apiKeyIn: e.target.value as 'header' | 'query' } as ApiAuth;
                        setAuth(next);
                        onRequestChange(applyAuthToRequest(next, request));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="header">Header</option>
                      <option value="query">Query Params</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <div className="font-medium mb-1">Applied Auth Preview</div>
                <pre className="bg-gray-50 dark:bg-slate-900 p-2 rounded overflow-auto">
{JSON.stringify({
  headers: request.headers || {},
  params: request.params || {},
}, null, 2)}
                </pre>
                <div className="mt-2 text-gray-500 dark:text-gray-400">Edit headers or params directly in their tabs to override.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response Section */}
      <div className={`${layoutMode === 'horizontal' ? 'flex-1' : 'flex-1'} overflow-auto`}>
        <ResponseViewer response={response} request={request} />
      </div>

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Tests Side Panel */}
      {showTests && (
        <TestsPanel
          onClose={() => setShowTests(false)}
          onLoadRequest={(req) => {
            onRequestChange(req);
            setShowTests(false);
          }}
          currentRequest={request}
        />
      )}

      {/* Code Generator */}
      {showCodeGenerator && (
        <CodeGenerator
          request={request}
          onClose={() => setShowCodeGenerator(false)}
        />
      )}

      {/* Save as Test Dialog */}
      {showSaveTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Save as Test</h3>
              <button onClick={() => setShowSaveTest(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Name *</label>
                <input value={testName} onChange={e => setTestName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" placeholder="e.g., Create user returns 201" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                <input value={testTags} onChange={e => setTestTags(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm" placeholder="e.g., smoke, users" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Assertions</div>
                {assertions.map((a, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 mb-2">
                    <select
                      value={a.type}
                      onChange={e => {
                        const type = e.target.value as Assertion['type'];
                        const next = [...assertions];
                        if (type === 'status') next[idx] = { type: 'status', op: 'equals', value: 200 } as Assertion;
                        if (type === 'header') next[idx] = { type: 'header', key: 'Content-Type', op: 'contains', value: 'json' } as Assertion;
                        if (type === 'json') next[idx] = { type: 'json', path: '$.data.id'.replace('$.',''), op: 'exists' } as Assertion;
                        setAssertions(next);
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                    >
                      <option value="status">Status</option>
                      <option value="header">Header</option>
                      <option value="json">JSON</option>
                    </select>
                    {a.type === 'status' && (
                      <input type="number" value={a.value as number} onChange={e => { const next = [...assertions]; (next[idx] as any).value = Number(e.target.value); setAssertions(next); }} className="w-24 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm" />
                    )}
                    {a.type === 'header' && (
                      <>
                        <input value={a.key} onChange={e => { const next = [...assertions]; (next[idx] as any).key = e.target.value; setAssertions(next); }} className="w-40 sm:w-48 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm" placeholder="Header" />
                        <select value={a.op} onChange={e => { const next = [...assertions]; (next[idx] as any).op = e.target.value; setAssertions(next); }} className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm">
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                        </select>
                        <input value={a.value as string} onChange={e => { const next = [...assertions]; (next[idx] as any).value = e.target.value; setAssertions(next); }} className="min-w-0 w-full sm:flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm" placeholder="value" />
                      </>
                    )}
                    {a.type === 'json' && (
                      <>
                        <input value={(a as any).path} onChange={e => { const next = [...assertions]; (next[idx] as any).path = e.target.value.replace(/^\$\./,''); setAssertions(next); }} className="w-56 sm:w-72 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm" placeholder="path e.g., data.id" />
                        <select value={a.op} onChange={e => { const next = [...assertions]; (next[idx] as any).op = e.target.value; setAssertions(next); }} className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm">
                          <option value="exists">exists</option>
                          <option value="equals">equals</option>
                        </select>
                        {(a as any).op === 'equals' && (
                          <textarea
                            rows={3}
                            value={String((a as any).value ?? '')}
                            onChange={e => { const next = [...assertions]; (next[idx] as any).value = e.target.value; setAssertions(next); }}
                            className="min-w-0 w-full sm:flex-1 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm font-mono resize-y"
                            placeholder="expected (JSON or value)"
                          />
                        )}
                      </>
                    )}
                    <button onClick={() => setAssertions(assertions.filter((_, i) => i !== idx))} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Remove</button>
                  </div>
                ))}
                <button onClick={() => setAssertions([...assertions, { type: 'status', op: 'equals', value: 200 } as Assertion])} className="mt-1 text-sm text-blue-600 hover:underline">+ Add assertion</button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
              <button onClick={() => setShowSaveTest(false)} className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">Cancel</button>
              <button
                onClick={() => {
                  if (!testName.trim()) return;
                  const tags = testTags.split(',').map(t => t.trim()).filter(Boolean);
                  apiTesterStorage.createTest(testName.trim(), request, assertions, tags);
                  setShowSaveTest(false);
                  setTestName('');
                  setTestTags('');
                  setAssertions([{ type: 'status', op: 'equals', value: 200 }]);
                  setToast({ message: 'Test saved', type: 'success' });
                }}
                className="px-4 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded"
              >
                Save Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fuzz Modal */}
      {showFuzzModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fuzz Test Results</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyFuzzTSV}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                >
                  Copy Table (TSV)
                </button>
                <button
                  onClick={downloadFuzzCSV}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => setShowFuzzModal(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                >
                  Close
                </button>
              </div>
            </div>
            <div ref={fuzzContentRef} className="relative p-4 overflow-auto flex-1">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-300">
                    <th className="px-2 py-2">Case</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Size</th>
                    <th className="px-2 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {fuzzCases.map((c, i) => {
                    const r = fuzzResults[i];
                    const status = r?.status;
                    const note = r?.unexpectedSuccess ? 'Unexpected Success' : r?.error ? 'Error' : c.expectFailure ? 'OK if rejected' : '';
                    const statusColor = status != null
                      ? (status >= 400 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300')
                      : r?.error ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300';
                    return (
                      <tr key={c.name} className={r?.unexpectedSuccess ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                        <td className="px-2 py-2 text-gray-900 dark:text-white">{c.name}</td>
                        <td className={`px-2 py-2 ${statusColor}`}>{status != null ? `${status} ${r?.statusText || ''}` : (r?.error || '')}</td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{r?.duration != null ? `${r.duration}ms` : ''}</td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{r?.size != null ? `${r.size}` : ''}</td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isFuzzRunning && (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">Running tests… {fuzzResults.length}/{fuzzCases.length}</div>
              )}

              {/* Scroll controls */}
              <div className="hidden sm:flex flex-col gap-2 absolute right-4 bottom-4 z-10">
                <button
                  onClick={() => {
                    const el = fuzzContentRef.current;
                    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 rounded-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow"
                  title="Scroll to top"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const el = fuzzContentRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                  }}
                  className="p-2 rounded-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow"
                  title="Scroll to bottom"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save to Collection Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Save to Collection
              </h3>
              <button
                onClick={closeSaveDialog}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-4 space-y-4">
              {/* Request Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Request Name *
                </label>
                <input
                  type="text"
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  placeholder="e.g., Get User Profile"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Request Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={saveRequestDescription}
                  onChange={(e) => setSaveRequestDescription(e.target.value)}
                  placeholder="Add a description for this request"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Collection Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection *
                </label>

                {!isCreatingNewCollection ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a collection...</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>
                          {collection.name} ({collection.requests.length} {collection.requests.length === 1 ? 'request' : 'requests'})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsCreatingNewCollection(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Collection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        setIsCreatingNewCollection(false);
                        setNewCollectionName('');
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      ← Back to existing collections
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={closeSaveDialog}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToCollection}
                disabled={
                  !saveRequestName.trim() ||
                  (!selectedCollectionId && (!isCreatingNewCollection || !newCollectionName.trim()))
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                Save Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
