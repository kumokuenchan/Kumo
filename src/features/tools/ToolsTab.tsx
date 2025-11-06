import { useState, useRef, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import JsonView from '@uiw/react-json-view';
import { format as formatSQL } from 'sql-formatter';
import { jwtDecode } from 'jwt-decode';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// Lazy load heavy components
const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));

type ToolType = 'json' | 'sql' | 'diff' | 'regex' | 'base64' | 'jwt' | 'xml';

export default function ToolsTab() {
  const [activeTool, setActiveTool] = useState<ToolType>('json');

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-4 px-4 overflow-x-auto">
          {[
            { id: 'json', label: 'JSON', icon: '{}' },
            { id: 'sql', label: 'SQL', icon: 'SQL' },
            { id: 'diff', label: 'Diff', icon: '≠' },
            { id: 'regex', label: 'RegEx', icon: '.*' },
            { id: 'base64', label: 'Base64', icon: 'B64' },
            { id: 'jwt', label: 'JWT', icon: '🔐' },
            { id: 'xml', label: 'XML', icon: '<>' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as ToolType)}
              className={`relative px-3 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTool === tool.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="mr-2">{tool.icon}</span>
              {tool.label}
              {activeTool === tool.id && (
                <motion.div
                  layoutId="tool-underline"
                  className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'json' && <JSONTool />}
        {activeTool === 'sql' && <SQLTool />}
        {activeTool === 'diff' && <DiffTool />}
        {activeTool === 'regex' && <RegExTool />}
        {activeTool === 'base64' && <Base64Tool />}
        {activeTool === 'jwt' && <JWTTool />}
        {activeTool === 'xml' && <XMLTool />}
      </div>
    </div>
  );
}

// JSON Viewer/Formatter
function JSONTool() {
  const [input, setInput] = useState('{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "address": {\n    "street": "123 Main St",\n    "city": "New York"\n  },\n  "hobbies": ["reading", "coding", "gaming"]\n}');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('tree');

  const parsedJSON = useMemo(() => {
    try {
      setError('');
      return JSON.parse(input);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [input]);

  const formatJSON = () => {
    if (parsedJSON) {
      setInput(JSON.stringify(parsedJSON, null, 2));
    }
  };

  const minifyJSON = () => {
    if (parsedJSON) {
      setInput(JSON.stringify(parsedJSON));
    }
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(input);
  };

  return (
    <div className="h-full flex">
      {/* Input */}
      <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Input JSON</span>
          <div className="flex gap-2">
            <button onClick={formatJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Format
            </button>
            <button onClick={minifyJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Minify
            </button>
            <button onClick={copyJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Copy
            </button>
            <button onClick={() => setInput('')} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Clear
            </button>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <Editor
            language="json"
            value={input}
            onChange={(value) => setInput(value || '')}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      {/* Output */}
      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Preview</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'tree' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'code' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
            >
              Code
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900">
          {parsedJSON && viewMode === 'tree' ? (
            <JsonView value={parsedJSON} collapsed={2} />
          ) : parsedJSON && viewMode === 'code' ? (
            <pre className="text-sm font-mono">{JSON.stringify(parsedJSON, null, 2)}</pre>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center mt-8">Invalid JSON</div>
          )}
        </div>
      </div>
    </div>
  );
}

// SQL Formatter
function SQLTool() {
  const [input, setInput] = useState('SELECT users.id, users.name, orders.total FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE users.active = 1 AND orders.total > 100 ORDER BY orders.total DESC LIMIT 10;');
  const [formatted, setFormatted] = useState('');
  const [language, setLanguage] = useState<'sql' | 'mysql' | 'postgresql'>('mysql');

  const formatQuery = () => {
    try {
      const result = formatSQL(input, { language });
      setFormatted(result);
    } catch (e) {
      setFormatted('Error formatting SQL');
    }
  };

  const copyFormatted = () => {
    navigator.clipboard.writeText(formatted || input);
  };

  return (
    <div className="h-full flex">
      <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">SQL Input</span>
          <div className="flex gap-2 items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="sql">SQL</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
            <button onClick={formatQuery} className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
              Format
            </button>
            <button onClick={() => setInput('')} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Clear
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            language="sql"
            value={input}
            onChange={(value) => setInput(value || '')}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
            }}
          />
        </div>
      </div>

      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Formatted SQL</span>
          <button onClick={copyFormatted} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
            Copy
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            language="sql"
            value={formatted || input}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Diff Viewer
function DiffTool() {
  const [oldText, setOldText] = useState('Hello World\nThis is line 2\nThis is line 3\nFoo Bar');
  const [newText, setNewText] = useState('Hello World!\nThis is line 2\nThis is line 4\nFoo Bar Baz');
  const [splitView, setSplitView] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">Text Comparison</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSplitView(true)}
            className={`px-2 py-1 text-xs rounded ${splitView ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Split View
          </button>
          <button
            onClick={() => setSplitView(false)}
            className={`px-2 py-1 text-xs rounded ${!splitView ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Unified View
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Original</span>
          </div>
          <div className="flex-1">
            <Editor
              language="plaintext"
              value={oldText}
              onChange={(value) => setOldText(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Modified</span>
          </div>
          <div className="flex-1">
            <Editor
              language="plaintext"
              value={newText}
              onChange={(value) => setNewText(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>

      <div className="h-1/2 border-t dark:border-slate-700">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <span className="text-sm font-medium">Comparison Result</span>
        </div>
        <div className="overflow-auto h-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading diff viewer...</div>
              </div>
            }
          >
            <ReactDiffViewer
              oldValue={oldText}
              newValue={newText}
              splitView={splitView}
              useDarkTheme={document.documentElement.classList.contains('dark')}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// RegEx Tester
function RegExTool() {
  const [pattern, setPattern] = useState('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b');
  const [flags, setFlags] = useState('gi');
  const [testString, setTestString] = useState('Contact us at: support@example.com or sales@company.org\nInvalid: not-an-email');
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState('');

  const testRegex = () => {
    try {
      setError('');
      const regex = new RegExp(pattern, flags);
      const found = [...testString.matchAll(regex)];
      setMatches(found);
    } catch (e: any) {
      setError(e.message);
      setMatches([]);
    }
  };

  const commonPatterns = [
    { name: 'Email', pattern: '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', flags: 'gi' },
    { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', flags: 'g' },
    { name: 'Phone', pattern: '\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}', flags: 'g' },
    { name: 'IP Address', pattern: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b', flags: 'g' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16">Pattern:</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
            placeholder="Regular expression pattern"
          />
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-16 px-3 py-1.5 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
            placeholder="flags"
          />
          <button
            onClick={testRegex}
            className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Test
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</div>
        )}
        <div className="flex gap-2 mt-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Common:</span>
          {commonPatterns.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setPattern(p.pattern);
                setFlags(p.flags);
              }}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Test String</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="plaintext"
              value={testString}
              onChange={(value) => setTestString(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        <div className="w-1/3 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Matches ({matches.length})</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {matches.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">No matches found</div>
            ) : (
              <div className="space-y-2">
                {matches.map((match, i) => (
                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Match {i + 1}</div>
                    <div className="text-sm font-mono break-all">{match[0]}</div>
                    {match.length > 1 && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Groups: {match.slice(1).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Base64 Encoder/Decoder
function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('Hello, World! This is a test message.');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const process = () => {
    try {
      setError('');
      if (mode === 'encode') {
        setOutput(btoa(input));
      } else {
        setOutput(atob(input));
      }
    } catch (e: any) {
      setError(e.message);
      setOutput('');
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">Base64 Encoder/Decoder</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('encode')}
            className={`px-3 py-1 text-xs rounded ${mode === 'encode' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-3 py-1 text-xs rounded ${mode === 'decode' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Decode
          </button>
          <button
            onClick={process}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Convert
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Input</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm resize-none"
              placeholder={mode === 'encode' ? 'Enter text to encode' : 'Enter Base64 to decode'}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <button
              onClick={copyOutput}
              disabled={!output}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex-1 p-4 overflow-auto">
            <pre className="font-mono text-sm break-all whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// JWT Decoder
function JWTTool() {
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const [decoded, setDecoded] = useState<any>(null);
  const [error, setError] = useState('');

  const decodeToken = () => {
    try {
      setError('');
      const decoded = jwtDecode(token);
      setDecoded(decoded);
    } catch (e: any) {
      setError(e.message);
      setDecoded(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">JWT Decoder</span>
        <button
          onClick={decodeToken}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Decode
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">JWT Token</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full h-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm resize-none"
              placeholder="Paste JWT token here"
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Decoded Payload</span>
          </div>
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900">
            {decoded ? (
              <JsonView value={decoded} collapsed={1} />
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-center mt-8">
                Decoded payload will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// XML Viewer/Formatter
function XMLTool() {
  const [input, setInput] = useState('<root>\n  <user id="1">\n    <name>John Doe</name>\n    <email>john@example.com</email>\n  </user>\n</root>');
  const [formatted, setFormatted] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');

  const formatXML = () => {
    try {
      setError('');
      const parser = new XMLParser({ ignoreAttributes: false });
      const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
      const parsed = parser.parse(input);
      setFormatted(builder.build(parsed));
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyFormatted = () => {
    navigator.clipboard.writeText(formatted);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(jsonOutput);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">XML Formatter & Converter</span>
        <button
          onClick={formatXML}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Format & Convert
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">XML Input</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="xml"
              value={input}
              onChange={(value) => setInput(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Formatted XML</span>
            <button
              onClick={copyFormatted}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Copy
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="xml"
              value={formatted}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/3 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">JSON Output</span>
            <button
              onClick={copyJSON}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Copy
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="json"
              value={jsonOutput}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
