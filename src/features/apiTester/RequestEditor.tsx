import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Trash2, Save, X, Copy, FlaskConical, Download, ChevronUp, ChevronDown, Code2, Wand2, Minimize2, MoreVertical, ChevronDown as ChevronDownIcon, PanelRight, PanelTop, Key, Globe, Terminal, Layers, Play, Edit2 } from 'lucide-react';
import { apiTesterApi, type ApiRequest, type ApiResponse, type ApiAuth } from '../../api/apiTester';
import { apiTesterStorage, type Collection, type Assertion, type TestCase } from '../../services/apiTesterStorage';
import { environmentStorage } from '../../services/environmentStorage';
import { responseTimeStorage } from '../../services/responseTimeStorage';
import TestsPanel from './TestsPanel';
import ResponseViewer from './ResponseViewer';
import CodeGenerator from './CodeGenerator';
import GraphQLEditor from './GraphQLEditor';
import CollectionsPanel from './CollectionsPanel';
import EnvironmentManager from './EnvironmentManager';
import Toast, { ToastContainer } from '../../components/Toast';
import TerminalOutputViewer from './TerminalOutputViewer';

// Define file parameter type for internal use
type FileParam = {
  type: 'file';
  file?: File | null;
  name: string;
};

// Extend the existing ApiRequest interface with file parameter support
type ExtendedApiRequest = Omit<ApiRequest, 'params'> & {
  params?: Record<string, string | FileParam>;
};

interface RequestVariant {
  id: string;
  name: string;
  body?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

interface RequestEditorProps {
  request: ApiRequest;
  response: ApiResponse | null;
  onRequestChange: (request: ApiRequest) => void;
  onResponseChange: (response: ApiResponse) => void;
  requestTitle?: string;
  layoutMode?: LayoutMode;
  onLoadCollectionAsGroup?: (collection: Collection) => void;
  // Variant props
  variants?: RequestVariant[];
  activeVariantId?: string | null;
  onSaveVariant?: () => void;
  onSwitchVariant?: (variantId: string | null) => void;
  onDeleteVariant?: (variantId: string) => void;
  onRunAllVariants?: () => void;
  onRenameVariant?: (variantId: string, name: string) => void;
}

type RequestTab = 'params' | 'headers' | 'body' | 'auth' | 'graphql';
type RequestMode = 'rest' | 'graphql';
type LayoutMode = 'vertical' | 'horizontal';

export default function RequestEditor({
  request,
  response,
  onRequestChange,
  onResponseChange,
  requestTitle,
  layoutMode: externalLayoutMode,
  onLoadCollectionAsGroup: externalLoadCollectionAsGroup,
  variants,
  activeVariantId,
  onSaveVariant,
  onSwitchVariant,
  onDeleteVariant,
  onRunAllVariants,
  onRenameVariant,
}: RequestEditorProps) {
  // Load layout mode from localStorage only if not provided as prop
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(externalLayoutMode || loadLayoutMode());
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
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [variableDropdownTarget, setVariableDropdownTarget] = useState<{ type: 'url' | 'param', paramKey?: string } | null>(null);
  // Terminal output viewer state
  const [responseViewTab, setResponseViewTab] = useState<'response' | 'terminal'>(() => {
    try {
      const saved = localStorage.getItem('apiTester_responseViewTab');
      return saved === 'terminal' ? 'terminal' : 'response';
    } catch {
      return 'response';
    }
  });
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('apiTester_selectedTerminalId');
    } catch {
      return null;
    }
  });
  const [terminals, setTerminals] = useState<Array<{ id: string; name: string }>>([]);
  // Variant UI state
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantName, setEditingVariantName] = useState('');
  const [variantDropdownPos, setVariantDropdownPos] = useState({ top: 0, left: 0 });
  const variantButtonRef = useRef<HTMLButtonElement>(null);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [showEnvironments, setShowEnvironments] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const variableButtonRef = useRef<HTMLButtonElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [saveDropdownPos, setSaveDropdownPos] = useState({ top: 0, left: 0 });
  const [moreDropdownPos, setMoreDropdownPos] = useState({ top: 0, left: 0 });
  const [variableDropdownPos, setVariableDropdownPos] = useState({ top: 0, left: 0 });

  const methods: ApiRequest['method'][] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // Update layout mode when external prop changes
  useEffect(() => {
    if (externalLayoutMode) {
      setLayoutMode(externalLayoutMode);
    }
  }, [externalLayoutMode]);

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
        setShowVariableDropdown(false);
        setShowVariantDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load terminals from localStorage
  useEffect(() => {
    const loadTerminals = () => {
      try {
        const stored = localStorage.getItem('kumodb_terminals');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTerminals(parsed);
        }
      } catch (e) {
        console.error('Failed to load terminals:', e);
      }
    };

    loadTerminals();

    // Listen for storage changes to update terminals list
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kumodb_terminals') {
        loadTerminals();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save terminal selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apiTester_responseViewTab', responseViewTab);
    } catch (e) {
      console.error('Failed to save response view tab:', e);
    }
  }, [responseViewTab]);

  useEffect(() => {
    try {
      if (selectedTerminalId) {
        localStorage.setItem('apiTester_selectedTerminalId', selectedTerminalId);
      } else {
        localStorage.removeItem('apiTester_selectedTerminalId');
      }
    } catch (e) {
      console.error('Failed to save selected terminal:', e);
    }
  }, [selectedTerminalId]);

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
      // Check if we have file parameters
      const hasFileParams = request.params && Object.values(request.params).some(param => 
        param && typeof param === 'object' && (param as any).type === 'file' && (param as any).file
      );
      
      let res: ApiResponse;
      
      if (hasFileParams) {
        // Handle file uploads directly from frontend
        res = await executeRequestWithFiles(request);
      } else {
        // Use existing proxy method
        const requestWithVars = applyVariables(request);
        res = await apiTesterApi.executeRequest(requestWithVars);
      }
      
      onResponseChange(res);

      // Save to history with original request (includes variable placeholders)
      apiTesterStorage.addToHistory(request, res, requestTitle);

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

  const executeRequestWithFiles = async (request: ApiRequest): Promise<ApiResponse> => {
    try {
      const startTime = Date.now();
      
      // Check if this is a GET/HEAD/OPTIONS request with file parameters
      const isGetRequest = ['GET', 'HEAD', 'OPTIONS'].includes(request.method?.toUpperCase() || '');
      const hasFileParams = request.params && Object.values(request.params).some(param => 
        param && typeof param === 'object' && (param as any).type === 'file' && (param as any).file
      );
      
      if (isGetRequest && hasFileParams) {
        // For GET requests with files, we can't send files in query parameters
        // So we'll send only non-file parameters
        console.warn('File uploads are not supported for GET requests. Only sending non-file parameters.');
        const nonFileParams = Object.fromEntries(
          Object.entries(request.params || {}).filter(([_, value]) => 
            !(value && typeof value === 'object' && (value as any).type === 'file')
          ).map(([key, value]) => [key, String(value)])
        );
        
        // Use the proxy method for GET requests without files
        const requestWithoutFiles = { ...request, params: nonFileParams };
        const requestWithVars = applyVariables(requestWithoutFiles);
        return await apiTesterApi.executeRequest(requestWithVars);
      }
      
      // Create FormData for multipart request
      const formData = new FormData();
      
      // Add parameters to form data
      if (request.params) {
        Object.entries(request.params).forEach(([key, value]) => {
          if (value && typeof value === 'object' && (value as any).type === 'file') {
            const fileParam = value as any;
            if (fileParam.file) {
              formData.append(key, fileParam.file);
            }
          } else {
            formData.append(key, String(value));
          }
        });
      }
      
      // Apply environment variables to URL
      const requestWithVars = applyVariables(request);
      
      // Prepare fetch config
      const fetchConfig: RequestInit = {
        method: request.method || 'GET',
        headers: {
          ...request.headers, // We'll let fetch set Content-Type for multipart/form-data
        },
        signal: AbortSignal.timeout(request.timeout || 30000),
      };
      
      // Add form data for POST/PUT/PATCH/DELETE
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method?.toUpperCase() || '')) {
        fetchConfig.body = formData;
      }
      
      // Execute request directly
      const response = await fetch(requestWithVars.url, fetchConfig);
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If not JSON, return as text
        responseData = responseText;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Calculate response size
      const responseSize = JSON.stringify(responseData).length;
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        duration,
        size: responseSize,
      };
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - Date.now();
      
      if (error.name === 'AbortError') {
        throw {
          status: 0,
          statusText: 'Request timeout',
          headers: {},
          data: 'Request timed out',
          duration,
          size: 0,
        };
      }
      
      throw {
        status: 0,
        statusText: error.message || 'Network error',
        headers: {},
        data: error.message,
        duration,
        size: 0,
      };
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

  const updateParam = (oldKey: string, newKey: string, value: string | { type: 'file', file: File | null, name: string }) => {
    const params = { ...request.params };
    delete params[oldKey];
    if (newKey) params[newKey] = value as any;
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
    // Use external callback if provided (from PostmanTab), otherwise just load first request
    if (externalLoadCollectionAsGroup) {
      externalLoadCollectionAsGroup(collection);
    } else if (collection.requests && collection.requests.length > 0) {
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
      <div className={`${layoutMode === 'horizontal' ? 'flex-1' : 'flex-shrink-0'} flex flex-col overflow-hidden`}>
        {/* Apple-style Glass Header */}
        <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-slate-700/60">
          <div className="px-4 py-3">
            {/* Mode & Layout Toggle */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex gap-1.5 bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-2xl">
                <button
                  onClick={() => {
                    setRequestMode('rest');
                    setActiveTab('params');
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    requestMode === 'rest'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    requestMode === 'graphql'
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-600/60'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  GraphQL
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Save Dropdown */}
                <div className="relative" data-dropdown>
                  <motion.button
                    ref={saveButtonRef}
                    onClick={() => {
                      if (saveButtonRef.current) {
                        const rect = saveButtonRef.current.getBoundingClientRect();
                        const buttonCenter = rect.left + rect.width / 2;
                        setSaveDropdownPos({
                          top: rect.bottom + 4,
                          left: buttonCenter - 100
                        });
                      }
                      setShowSaveDropdown(!showSaveDropdown);
                    }}
                    disabled={!request.url}
                    className="p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/60 dark:hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    title="Save options"
                    whileHover={{ scale: request.url ? 1.02 : 1 }}
                    whileTap={{ scale: request.url ? 0.98 : 1 }}
                  >
                    <Save className="w-4 h-4" />
                  </motion.button>

                  {showSaveDropdown && createPortal(
                    <motion.div
                      data-dropdown
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="fixed bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-xl py-1 min-w-[200px] pointer-events-auto"
                      style={{
                        top: `${saveDropdownPos.top}px`,
                        left: `${saveDropdownPos.left}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'auto'
                      }}
                    >
                      <button
                        onClick={() => {
                          openSaveDialog();
                          setShowSaveDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 text-gray-900 dark:text-white transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <div>
                          <div className="font-medium">Save to Collection</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Store this request</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowSaveTest(true);
                          setShowSaveDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 text-gray-900 dark:text-white transition-colors"
                      >
                        <FlaskConical className="w-4 h-4" />
                        <div>
                          <div className="font-medium">Save as Test</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Create automated test</div>
                        </div>
                      </button>
                    </motion.div>,
                    document.body
                  )}
                </div>

                {/* Tests Button */}
                <motion.button
                  onClick={() => setShowTests(true)}
                  className="p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/60 dark:hover:bg-slate-700/60 transition-all duration-200"
                  title="View and run tests"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FlaskConical className="w-4 h-4" />
                </motion.button>

                {/* More Menu */}
                <div className="relative" data-dropdown>
                  <motion.button
                    ref={moreButtonRef}
                    onClick={() => {
                      if (moreButtonRef.current) {
                        const rect = moreButtonRef.current.getBoundingClientRect();
                        const buttonCenter = rect.left + rect.width / 2;
                        setMoreDropdownPos({
                          top: rect.bottom + 4,
                          left: buttonCenter - 100
                        });
                      }
                      setShowMoreMenu(!showMoreMenu);
                    }}
                    className="p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/60 dark:hover:bg-slate-700/60 transition-all duration-200"
                    title="More actions"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </motion.button>

                  {showMoreMenu && createPortal(
                    <motion.div
                      data-dropdown
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="fixed bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-xl py-1 min-w-[220px] pointer-events-auto"
                      style={{
                        top: `${moreDropdownPos.top}px`,
                        left: `${moreDropdownPos.left}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'auto'
                      }}
                    >
                      <button
                        onClick={() => {
                          copyAsCurl();
                          setShowMoreMenu(false);
                        }}
                        disabled={!request.url}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <div>
                          <div className="font-medium">Copy as cURL</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Export request command</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowCodeGenerator(true);
                          setShowMoreMenu(false);
                        }}
                        disabled={!request.url}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                        <div>
                          <div className="font-medium">Generate Code</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Multiple languages</div>
                        </div>
                      </button>
                      <div className="border-t border-gray-200 dark:border-slate-600 my-1" />
                      <button
                        onClick={() => {
                          runFuzz();
                          setShowMoreMenu(false);
                        }}
                        disabled={!request.url || isFuzzRunning}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-3 text-purple-700 dark:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FlaskConical className="w-4 h-4" />
                        <div>
                          <div className="font-medium">
                            {isFuzzRunning ? 'Running Fuzz Tests...' : 'Run Fuzz Tests'}
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Security & edge cases</div>
                        </div>
                      </button>
                    </motion.div>,
                    document.body
                  )}
                </div>

                {/* Environment Selector Button */}
                <button
                  onClick={() => setShowEnvironments(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-yellow-500 hover:to-orange-600 hover:shadow-lg"
                  title={environmentStorage.getActiveEnvironment()?.name ? `Environment: ${environmentStorage.getActiveEnvironment()?.name}` : 'Manage Environments'}
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden lg:inline">
                    {environmentStorage.getActiveEnvironment()?.name || 'dev'}
                  </span>
                </button>

                {/* Variants Selector */}
                {(variants && variants.length > 0 || onSaveVariant) && (
                  <div className="relative" data-dropdown>
                    <button
                      ref={variantButtonRef}
                      onClick={() => {
                        if (variantButtonRef.current) {
                          const rect = variantButtonRef.current.getBoundingClientRect();
                          setVariantDropdownPos({
                            top: rect.bottom + 4,
                            left: rect.right - 256 // 256 = w-64
                          });
                        }
                        setShowVariantDropdown(!showVariantDropdown);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:scale-105 ${
                        activeVariantId
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:shadow-lg'
                      }`}
                      title="Request Variants"
                    >
                      <Layers className="w-4 h-4" />
                      <span className="hidden lg:inline">
                        {activeVariantId
                          ? variants?.find(v => v.id === activeVariantId)?.name || 'Variant'
                          : `Variants${variants && variants.length > 0 ? ` (${variants.length})` : ''}`}
                      </span>
                      <ChevronDownIcon className="w-3 h-3" />
                    </button>

                    {showVariantDropdown && createPortal(
                      <div
                        data-dropdown
                        className="fixed w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 z-[9999]"
                        style={{ top: variantDropdownPos.top, left: Math.max(8, variantDropdownPos.left) }}
                      >
                        {/* Main Request Option */}
                        <button
                          onClick={() => {
                            onSwitchVariant?.(null);
                            setShowVariantDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                            !activeVariantId
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${!activeVariantId ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          Main Request
                        </button>

                        {variants && variants.length > 0 && (
                          <>
                            <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                            <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                              Saved Variants
                            </div>
                            {variants.map((variant) => (
                              <div
                                key={variant.id}
                                className={`group flex items-center justify-between px-4 py-2 text-sm ${
                                  activeVariantId === variant.id
                                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {editingVariantId === variant.id ? (
                                  <input
                                    type="text"
                                    value={editingVariantName}
                                    onChange={(e) => setEditingVariantName(e.target.value)}
                                    onBlur={() => {
                                      if (editingVariantName.trim()) {
                                        onRenameVariant?.(variant.id, editingVariantName.trim());
                                      }
                                      setEditingVariantId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editingVariantName.trim()) {
                                        onRenameVariant?.(variant.id, editingVariantName.trim());
                                        setEditingVariantId(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingVariantId(null);
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded"
                                  />
                                ) : (
                                  <button
                                    onClick={() => {
                                      onSwitchVariant?.(variant.id);
                                      setShowVariantDropdown(false);
                                    }}
                                    className="flex-1 text-left flex items-center gap-2"
                                  >
                                    <div className={`w-2 h-2 rounded-full ${activeVariantId === variant.id ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    {variant.name}
                                  </button>
                                )}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingVariantId(variant.id);
                                      setEditingVariantName(variant.name);
                                    }}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                                    title="Rename"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteVariant?.(variant.id);
                                    }}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        <div className="border-t border-gray-200 dark:border-slate-700 my-1" />

                        {/* Actions */}
                        <button
                          onClick={() => {
                            onSaveVariant?.();
                            setShowVariantDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Save Current as Variant
                        </button>

                        {variants && variants.length > 0 && (
                          <button
                            onClick={() => {
                              onRunAllVariants?.();
                              setShowVariantDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Run All Variants
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            </div>

        {/* Method & URL with Apple-style design */}
            <div className="flex gap-3">
              {requestMode === 'rest' && (
                <div className="relative">
                  <select
                    value={request.method}
                    onChange={(e) => updateMethod(e.target.value as ApiRequest['method'])}
                    className={`appearance-none px-4 py-2.5 pr-10 font-medium rounded-xl border transition-all duration-200 cursor-pointer ${
                      request.method === 'GET'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                        : request.method === 'POST'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
                        : request.method === 'PUT'
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
                        : request.method === 'DELETE'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60'
                        : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {methods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-current pointer-events-none" />
                </div>
              )}
              {requestMode === 'graphql' && (
                <div className="px-4 py-2.5 font-medium rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                  POST
                </div>
              )}

              <div className="flex-1 relative">
                <input
                  ref={urlInputRef}
                  type="text"
                  value={request.url}
                  onChange={(e) => updateUrl(e.target.value)}
                  placeholder="Enter request URL (e.g., https://api.example.com/users)"
                  className="w-full px-4 py-2.5 pl-12 pr-12 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 dark:focus:border-blue-400/50 transition-all duration-200"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                {/* Variables dropdown button */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                  <div className="relative" data-dropdown>
                    <motion.button
                      ref={variableButtonRef}
                      onClick={() => {
                        const allVariables = environmentStorage.getVariableNames();
                        setAvailableVariables(allVariables);
                        if (variableButtonRef.current) {
                          const rect = variableButtonRef.current.getBoundingClientRect();
                          setVariableDropdownPos({
                            top: rect.bottom + 4,
                            left: rect.left
                          });
                        }
                        setShowVariableDropdown(!showVariableDropdown);
                      }}
                      className="p-1.5 bg-gray-100/60 dark:bg-slate-700/60 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-600/60 transition-colors"
                      title="Insert environment variable"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </motion.button>
                    
                    {showVariableDropdown && createPortal(
                      <motion.div
                        data-dropdown
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl shadow-xl py-1 min-w-[200px] pointer-events-auto"
                        style={{
                          top: `${variableDropdownPos.top}px`,
                          left: `${variableDropdownPos.left}px`,
                          zIndex: 9999,
                          pointerEvents: 'auto'
                        }}
                      >
                        {availableVariables.length > 0 ? (
                          availableVariables.map((variable, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const start = urlInputRef.current?.selectionStart || 0;
                                const end = urlInputRef.current?.selectionEnd || 0;
                                const currentValue = request.url || '';
                                const newValue = currentValue.substring(0, start) + 
                                  `{{${variable}}}` + 
                                  currentValue.substring(end);
                                updateUrl(newValue);
                                setShowVariableDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-3 text-gray-900 dark:text-white transition-colors"
                            >
                              <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                {"{{" + variable + "}}"}
                              </span>
                              <div className="flex-1 text-xs truncate">{variable}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                            No variables available
                          </div>
                        )}
                      </motion.div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>

              {/* Primary Action: Send */}
              <motion.button
                onClick={handleExecute}
                disabled={isLoading || !request.url}
                className="relative px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all duration-200"
                title="Send request (Ctrl/Cmd + Enter)"
                whileHover={{ scale: request.url ? 1.02 : 1 }}
                whileTap={{ scale: request.url ? 0.98 : 1 }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </motion.button>

              
            </div>
          </div>
        </div>

        {/* Apple-style Request Tabs */}
        {requestMode === 'rest' && (
          <div className="px-4 py-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-b border-gray-200/40 dark:border-slate-700/40">
            <div className="flex gap-1">
              {(['params', 'headers', 'body', 'auth'] as RequestTab[]).map((tab) => {
                const hasContent = tab === 'params' && request.params && Object.keys(request.params).length > 0 ||
                                  tab === 'headers' && request.headers && Object.keys(request.headers).length > 0;
                return (
                  <motion.button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200 ${
                      activeTab === tab
                        ? 'text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-800/80 shadow-sm border border-gray-200/60 dark:border-slate-700/60'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center gap-2">
                      {tab}
                      {hasContent && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                          {tab === 'params' ? Object.keys(request.params).length : Object.keys(request.headers).length}
                        </span>
                      )}
                    </span>
                    {activeTab === tab && (
                      <motion.div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        layoutId="activeTab"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Content - Apple-style with Glass Cards */}
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {/* GraphQL Mode */}
            {requestMode === 'graphql' && (
              <motion.div
                key="graphql"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <GraphQLEditor
                  request={request}
                  onRequestChange={onRequestChange}
                  onExecute={handleExecute}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {/* Query Params */}
            {requestMode === 'rest' && activeTab === 'params' && (
              <motion.div
                key="params"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-2xl p-1">
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
                    
                    // Check if this parameter is a file
                    const isFileParam = value && typeof value === 'object' && (value as any).type === 'file';
                    
                    return (
                      <motion.div
                        key={`${key}_${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="flex gap-3 p-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/40 rounded-xl transition-colors"
                      >
                        <div className="flex-1">
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
                            placeholder="Parameter name"
                            className="w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                        </div>
                        <div className="flex-1">
                          {isFileParam ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    updateParam(key, key, { type: 'file', file, name: file.name });
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {(value as any).name}
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateParam(key, key, e.target.value)}
                              placeholder="Parameter value"
                              className="w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isFileParam ? (
                            <motion.button
                              onClick={() => updateParam(key, key, '')}
                              className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                              title="Switch to text input"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </motion.button>
                          ) : (
                            <motion.button
                              onClick={() => updateParam(key, key, { type: 'file', file: null, name: '' })}
                              className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                              title="Switch to file upload"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() => removeParam(key)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                  <motion.button
                    onClick={addParam}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 rounded-xl transition-colors border-2 border-dashed border-blue-200/60 dark:border-blue-800/60 hover:border-blue-300/80 dark:hover:border-blue-700/80"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Parameter</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

          {/* Headers */}
            {requestMode === 'rest' && activeTab === 'headers' && (
              <motion.div
                key="headers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-2xl p-1">
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
                      <motion.div
                        key={`${key}_${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        className="flex gap-3 p-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/40 rounded-xl transition-colors"
                      >
                        <div className="flex-1">
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
                            placeholder="Header name"
                            className="w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateHeader(key, key, e.target.value)}
                            placeholder="Header value"
                            className="w-full px-3 py-2 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                        </div>
                        <motion.button
                          onClick={() => removeHeader(key)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                  <motion.button
                    onClick={addHeader}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 rounded-xl transition-colors border-2 border-dashed border-blue-200/60 dark:border-blue-800/60 hover:border-blue-300/80 dark:hover:border-blue-700/80"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Header</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

          {/* Body */}
            {requestMode === 'rest' && activeTab === 'body' && (
              <motion.div
                key="body"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-2xl p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2 bg-gray-100/60 dark:bg-slate-700/60 p-1 rounded-xl">
                      {(['json', 'form', 'raw'] as const).map((type) => (
                        <motion.button
                          key={type}
                          onClick={() => {
                            setBodyType(type);
                            setJsonError(null);
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            bodyType === type
                              ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-600/60'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {type.toUpperCase()}
                        </motion.button>
                      ))}
                    </div>

                    {bodyType === 'json' && (
                      <div className="flex gap-2">
                        <motion.button
                          onClick={formatJson}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-900/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                          title="Format JSON (Beautify)"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Wand2 className="w-4 h-4" />
                          <span>Format</span>
                        </motion.button>
                        <motion.button
                          onClick={minifyJson}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-900/30 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
                          title="Minify JSON (Compact)"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Minimize2 className="w-4 h-4" />
                          <span>Minify</span>
                        </motion.button>
                        <motion.button
                          onClick={validateJson}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-900/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                          title="Validate JSON"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Validate</span>
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
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
                      className={`w-full h-56 px-4 py-3 border rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm text-sm font-mono resize-none transition-all duration-200 ${
                        jsonError
                          ? 'border-red-400 dark:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-200/60 dark:border-slate-700/60 focus:ring-blue-500/20 focus:border-blue-500/50'
                      }`}
                    />
                    {bodyType === 'json' && (
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          jsonError 
                            ? 'bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {jsonError ? 'Invalid JSON' : 'Valid JSON'}
                        </div>
                      </div>
                    )}
                  </div>

                  {jsonError && bodyType === 'json' && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="text-red-800 dark:text-red-200 text-sm font-medium">JSON Error</div>
                          <div className="text-red-700 dark:text-red-300 text-sm mt-1">{jsonError}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

          {/* Auth */}
            {requestMode === 'rest' && activeTab === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-2xl p-6">
                  {/* Type selector */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Authentication Type</label>
                      <div className="flex gap-2 bg-gray-100/60 dark:bg-slate-700/60 p-1 rounded-xl">
                        {(['none', 'bearer', 'basic', 'apikey'] as const).map((type) => (
                          <motion.button
                            key={type}
                            onClick={() => {
                              let next: ApiAuth;
                              if (type === 'none') {
                                next = { type };
                              } else if (type === 'bearer') {
                                next = { type, bearerToken: '' };
                              } else if (type === 'basic') {
                                next = { type, username: '', password: '' };
                              } else {
                                next = { type, apiKeyIn: 'header', apiKeyName: '', apiKey: '' };
                              }
                              setAuth(next);
                              onRequestChange(applyAuthToRequest(next, request));
                            }}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all duration-200 ${
                              auth.type === type
                                ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-slate-600/60'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {type}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Bearer */}
                    {auth.type === 'bearer' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bearer Token</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={auth.bearerToken || ''}
                            onChange={(e) => {
                              const next = { ...auth, bearerToken: e.target.value } as ApiAuth;
                              setAuth(next);
                              onRequestChange(applyAuthToRequest(next, request));
                            }}
                            placeholder="eyJhbGciOi..."
                            className="w-full px-4 py-3 pl-10 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                      </motion.div>
                    )}

                    {/* Basic */}
                    {auth.type === 'basic' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                          <input
                            type="text"
                            value={auth.username || ''}
                            onChange={(e) => {
                              const next = { ...auth, username: e.target.value } as ApiAuth;
                              setAuth(next);
                              onRequestChange(applyAuthToRequest(next, request));
                            }}
                            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                          <input
                            type="password"
                            value={auth.password || ''}
                            onChange={(e) => {
                              const next = { ...auth, password: e.target.value } as ApiAuth;
                              setAuth(next);
                              onRequestChange(applyAuthToRequest(next, request));
                            }}
                            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* API Key */}
                    {auth.type === 'apikey' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Name</label>
                            <input
                              type="text"
                              value={auth.apiKeyName || ''}
                              onChange={(e) => {
                                const next = { ...auth, apiKeyName: e.target.value } as ApiAuth;
                                setAuth(next);
                                onRequestChange(applyAuthToRequest(next, request));
                              }}
                              placeholder="e.g., X-API-Key"
                              className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Value</label>
                            <input
                              type="text"
                              value={auth.apiKey || ''}
                              onChange={(e) => {
                                const next = { ...auth, apiKey: e.target.value } as ApiAuth;
                                setAuth(next);
                                onRequestChange(applyAuthToRequest(next, request));
                              }}
                              className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add To</label>
                          <select
                            value={auth.apiKeyIn || 'header'}
                            onChange={(e) => {
                              const next = { ...auth, apiKeyIn: e.target.value as 'header' | 'query' } as ApiAuth;
                              setAuth(next);
                              onRequestChange(applyAuthToRequest(next, request));
                            }}
                            className="px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                          >
                            <option value="header">Header</option>
                            <option value="query">Query Params</option>
                          </select>
                        </div>
                      </motion.div>
                    )}

                    {/* Preview */}
                    <div className="bg-gray-50/80 dark:bg-slate-900/40 border border-gray-200/60 dark:border-slate-700/60 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Applied Auth Preview</span>
                      </div>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-slate-800/60 p-3 rounded border overflow-auto">
{JSON.stringify({
  headers: request.headers || {},
  params: request.params || {},
}, null, 2)}
                      </pre>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Edit headers or params directly in their tabs to override.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Response Section */}
      <div className={`${layoutMode === 'horizontal' ? 'flex-1' : 'flex-1'} overflow-hidden flex flex-col`}>
        {/* Response/Terminal Tabs */}
        <div className="flex items-center border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2">
          <button
            onClick={() => setResponseViewTab('response')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              responseViewTab === 'response'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Response
          </button>
          <button
            onClick={() => setResponseViewTab('terminal')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              responseViewTab === 'terminal'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Terminal
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {responseViewTab === 'response' ? (
            <ResponseViewer
              response={response}
              request={request}
              layoutMode={layoutMode}
              onGenerateTests={(asrts) => {
                setAssertions(asrts);
                if (!testName) {
                  try {
                    const u = new URL(request.url || '');
                    setTestName(`${request.method} ${u.pathname}`);
                  } catch {
                    setTestName(`${request.method} ${request.url || ''}`);
                  }
                }
                setShowSaveTest(true);
              }}
              onResponseChange={onResponseChange}
            />
          ) : (
            <TerminalOutputViewer
              terminalId={selectedTerminalId}
              terminals={terminals}
              onTerminalChange={setSelectedTerminalId}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      <ToastContainer>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </ToastContainer>

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

      {/* Apple-style Save as Test Dialog */}
      {showSaveTest && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-gray-200/60 dark:border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-3xl mx-4"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200/60 dark:border-slate-700/60">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Save as Test</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create automated test for this request</p>
              </div>
              <motion.button 
                onClick={() => setShowSaveTest(false)} 
                className="p-2 hover:bg-gray-100/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Name *</label>
                  <input 
                    value={testName} 
                    onChange={e => setTestName(e.target.value)} 
                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200" 
                    placeholder="e.g., Create user returns 201" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags (comma-separated)</label>
                  <input 
                    value={testTags} 
                    onChange={e => setTestTags(e.target.value)} 
                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200" 
                    placeholder="e.g., smoke, users" 
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Assertions</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Define the expected behavior for this test</p>
                  </div>
                  <motion.button 
                    onClick={() => setAssertions([...assertions, { type: 'status', op: 'equals', value: 200 } as Assertion])} 
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Assertion
                  </motion.button>
                </div>
                <div className="space-y-3">
                  {assertions.map((a, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-gray-50/60 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60 rounded-xl p-4"
                    >
                      <div className="flex flex-wrap items-center gap-3 mb-3">
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
                          className="px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="status">Status Code</option>
                          <option value="header">Header</option>
                          <option value="json">JSON Path</option>
                        </select>
                        {a.type === 'status' && (
                          <input 
                            type="number" 
                            value={a.value as number} 
                            onChange={e => { 
                              const next = [...assertions]; 
                              (next[idx] as any).value = Number(e.target.value); 
                              setAssertions(next); 
                            }} 
                            className="w-24 px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                            placeholder="200" 
                          />
                        )}
                        {a.type === 'header' && (
                          <>
                            <input 
                              value={a.key} 
                              onChange={e => { 
                                const next = [...assertions]; 
                                (next[idx] as any).key = e.target.value; 
                                setAssertions(next); 
                              }} 
                              className="w-48 px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                              placeholder="Header name" 
                            />
                            <select 
                              value={a.op} 
                              onChange={e => { 
                                const next = [...assertions]; 
                                (next[idx] as any).op = e.target.value; 
                                setAssertions(next); 
                              }} 
                              className="px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="contains">contains</option>
                              <option value="equals">equals</option>
                            </select>
                            <input 
                              value={a.value as string} 
                              onChange={e => { 
                                const next = [...assertions]; 
                                (next[idx] as any).value = e.target.value; 
                                setAssertions(next); 
                              }} 
                              className="min-w-0 w-full sm:flex-1 px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                              placeholder="Expected value" 
                            />
                          </>
                        )}
                        {a.type === 'json' && (
                          <>
                            <input 
                              value={(a as any).path} 
                              onChange={e => { 
                                const next = [...assertions]; 
                                (next[idx] as any).path = e.target.value.replace(/^\$\./,''); 
                                setAssertions(next); 
                              }} 
                              className="w-64 px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                              placeholder="path e.g., data.id" 
                            />
                            <select 
                              value={a.op} 
                              onChange={e => { 
                                const next = [...assertions]; 
                                (next[idx] as any).op = e.target.value; 
                                setAssertions(next); 
                              }} 
                              className="px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="exists">exists</option>
                              <option value="equals">equals</option>
                            </select>
                            {(a as any).op === 'equals' && (
                              <textarea
                                rows={2}
                                value={String((a as any).value ?? '')}
                                onChange={e => { 
                                  const next = [...assertions]; 
                                  (next[idx] as any).value = e.target.value; 
                                  setAssertions(next); 
                                }}
                                className="min-w-0 w-full sm:flex-1 px-3 py-2 bg-white/60 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600/60 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="expected (JSON or value)"
                              />
                            )}
                          </>
                        )}
                        <motion.button 
                          onClick={() => setAssertions(assertions.filter((_, i) => i !== idx))} 
                          className="p-2 text-red-500 hover:bg-red-50/60 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/60 dark:border-slate-700/60">
              <motion.button 
                onClick={() => setShowSaveTest(false)} 
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/60 dark:bg-slate-700/60 hover:bg-gray-200/60 dark:hover:bg-slate-600/60 rounded-xl transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
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
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save Test
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Apple-style Fuzz Modal */}
      {showFuzzModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-gray-200/60 dark:border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200/60 dark:border-slate-700/60">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Fuzz Test Results</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Security and edge case testing results</p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={copyFuzzTSV}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/60 dark:bg-slate-700/60 hover:bg-gray-200/60 dark:hover:bg-slate-600/60 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Copy Table (TSV)
                </motion.button>
                <motion.button
                  onClick={downloadFuzzCSV}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/60 dark:bg-slate-700/60 hover:bg-gray-200/60 dark:hover:bg-slate-600/60 rounded-xl transition-colors flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="w-4 h-4" /> CSV
                </motion.button>
                <motion.button
                  onClick={() => setShowFuzzModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/60 dark:bg-slate-700/60 hover:bg-gray-200/60 dark:hover:bg-slate-600/60 rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </div>
            <div ref={fuzzContentRef} className="relative p-6 overflow-auto flex-1">
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 rounded-2xl overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50/80 dark:bg-slate-700/40">
                    <tr className="text-left text-gray-600 dark:text-gray-300">
                      <th className="px-4 py-3 font-medium">Test Case</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Response Time</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/60 dark:divide-slate-700/60">
                    {fuzzCases.map((c, i) => {
                      const r = fuzzResults[i];
                      const status = r?.status;
                      const note = r?.unexpectedSuccess ? 'Unexpected Success' : r?.error ? 'Error' : c.expectFailure ? 'Expected Failure' : 'OK';
                      const statusColor = status != null
                        ? (status >= 400 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300')
                        : r?.error ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300';
                      return (
                        <motion.tr 
                          key={c.name} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`hover:bg-gray-50/60 dark:hover:bg-slate-700/40 transition-colors ${r?.unexpectedSuccess ? 'bg-red-50/80 dark:bg-red-900/20' : ''}`}
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{c.name}</td>
                          <td className={`px-4 py-3 ${statusColor} font-medium`}>
                            {status != null ? `${status} ${r?.statusText || ''}` : (r?.error || 'Pending')}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {r?.duration != null ? `${r.duration}ms` : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {r?.size != null ? `${r.size} bytes` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              note === 'Unexpected Success' 
                                ? 'bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                : note === 'Error'
                                ? 'bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                : note === 'Expected Failure'
                                ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {note}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {isFuzzRunning && (
                  <div className="mt-4 px-4 pb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      Running tests… {fuzzResults.length}/{fuzzCases.length}
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(fuzzResults.length / fuzzCases.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Scroll controls */}
                <div className="hidden sm:flex flex-col gap-2 absolute right-6 bottom-6 z-10">
                  <motion.button
                    onClick={() => {
                      const el = fuzzContentRef.current;
                      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-slate-700/80 shadow-lg transition-colors"
                    title="Scroll to top"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      const el = fuzzContentRef.current;
                      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                    }}
                    className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-slate-700/60 text-gray-700 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-slate-700/80 shadow-lg transition-colors"
                    title="Scroll to bottom"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Apple-style Save to Collection Dialog */}
      {showSaveDialog && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-gray-200/60 dark:border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-md mx-4"
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/60 dark:border-slate-700/60">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Save to Collection
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Store this request for later use</p>
              </div>
              <motion.button
                onClick={closeSaveDialog}
                className="p-2 hover:bg-gray-100/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-5">
              {/* Request Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Request Name *
                </label>
                <input
                  type="text"
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  placeholder="e.g., Get User Profile"
                  className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                  autoFocus
                />
              </div>

              {/* Request Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={saveRequestDescription}
                  onChange={(e) => setSaveRequestDescription(e.target.value)}
                  placeholder="Add a description for this request"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-500/70 dark:placeholder-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200 resize-none"
                />
              </div>

              {/* Collection Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collection *
                </label>

                {!isCreatingNewCollection ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <select
                        value={selectedCollectionId}
                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200 appearance-none"
                      >
                        <option value="">Select a collection...</option>
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name} ({collection.requests.length} {collection.requests.length === 1 ? 'request' : 'requests'})
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    <motion.button
                      onClick={() => setIsCreatingNewCollection(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Create New Collection</span>
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="New collection name"
                      className="w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-gray-200/60 dark:border-slate-700/60 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                    />
                    <motion.button
                      onClick={() => {
                        setIsCreatingNewCollection(false);
                        setNewCollectionName('');
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ← Back to existing collections
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200/60 dark:border-slate-700/60">
              <motion.button
                onClick={closeSaveDialog}
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/60 dark:bg-slate-700/60 hover:bg-gray-200/60 dark:hover:bg-slate-600/60 rounded-xl transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSaveToCollection}
                disabled={
                  !saveRequestName.trim() ||
                  (!selectedCollectionId && (!isCreatingNewCollection || !newCollectionName.trim()))
                }
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save Request
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Environment Manager */}
      {showEnvironments && (
        <EnvironmentManager onClose={() => setShowEnvironments(false)} />
      )}
    </div>
  );
}


