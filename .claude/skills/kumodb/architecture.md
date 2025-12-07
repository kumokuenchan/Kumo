# KumoDB Architecture Reference

Comprehensive technical architecture documentation for KumoDB development.

## Table of Contents

- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [State Management](#state-management)
- [Database Layer](#database-layer)
- [Electron Integration](#electron-integration)
- [Security Architecture](#security-architecture)
- [Performance Patterns](#performance-patterns)

## System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│         React Frontend (Vite)           │
│    - UI Components (React 18)           │
│    - State Management (Zustand)         │
│    - Server State (TanStack Query)      │
│    - Monaco Editor, React Flow          │
│    Port: 5174 (dev) / bundled (prod)    │
└─────────────────┬───────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────┐
│      Node.js API Server (Express)       │
│    - RESTful API endpoints              │
│    - WebSocket (Socket.io)              │
│    - Connection pooling                 │
│    - Business logic                     │
│    Port: 3001                           │
└─────────────────┬───────────────────────┘
                  │ mysql2 / mongodb driver
┌─────────────────▼───────────────────────┐
│        MySQL / MongoDB Databases        │
│    - User's database instances          │
│    - Multiple connections supported     │
│    - Connection pool per database       │
└─────────────────────────────────────────┘
```

### Deployment Modes

**Web Mode** (Development):
```bash
npm run dev           # Frontend: localhost:5174
npm run dev:server    # Backend:  localhost:3001
```

**Electron Mode** (Desktop App):
```bash
npm run dev:electron  # Runs all three processes
```
- Electron main process manages app lifecycle
- Renderer process hosts React frontend
- Backend API runs as child process

## Frontend Architecture

### Component Hierarchy

```
App.tsx
├── Layout Components
│   ├── Sidebar
│   ├── TopBar
│   └── StatusBar
├── Feature Routes
│   ├── /connections  → ConnectionManager
│   ├── /query        → SQLEditor
│   ├── /data         → DataViewer
│   ├── /schema       → SchemaExplorer
│   └── ...           → Other features
└── Global Providers
    ├── QueryClientProvider (TanStack Query)
    ├── ThemeProvider
    └── ToastProvider
```

### Feature-Based Structure

Each feature is a self-contained module:

```typescript
// Example: src/features/query/
query/
├── SQLEditor.tsx              // Main component
├── components/                // Feature-specific components
│   ├── QueryControls.tsx
│   ├── EditorTabs.tsx
│   └── ResultsPanel.tsx
├── utils/                     // Feature utilities
│   ├── sqlParser.ts
│   ├── syntaxHighlight.ts
│   └── queryFormatter.ts
├── hooks/                     // Feature hooks (optional)
│   └── useQueryExecution.ts
└── types/                     // Feature types (optional)
    └── query.types.ts
```

**Benefits**:
- Clear feature boundaries
- Easy to locate related code
- Can be extracted to separate package if needed
- Team members can work on features independently

### Component Patterns

#### 1. Functional Components with Hooks

```typescript
// Good: Functional component with TypeScript
interface Props {
  connectionId: string;
  onQueryExecute: (query: string) => void;
}

export const SQLEditor: React.FC<Props> = ({ connectionId, onQueryExecute }) => {
  const [query, setQuery] = useState('');

  const handleExecute = useCallback(() => {
    onQueryExecute(query);
  }, [query, onQueryExecute]);

  return (
    <div className="sql-editor">
      {/* Component JSX */}
    </div>
  );
};
```

#### 2. Custom Hooks for Reusable Logic

```typescript
// src/hooks/useDatabase.ts
export const useDatabase = (connectionId: string) => {
  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => fetchTables(connectionId),
  });

  const executeMutation = useMutation({
    mutationFn: (query: string) => executeQuery(connectionId, query),
  });

  return { tables, isLoading, execute: executeMutation.mutate };
};
```

#### 3. Compound Components

```typescript
// Complex components broken into sub-components
export const QueryEditor = {
  Root: QueryEditorRoot,
  Toolbar: QueryToolbar,
  Editor: MonacoEditor,
  Results: ResultsPanel,
};

// Usage
<QueryEditor.Root>
  <QueryEditor.Toolbar onExecute={handleExecute} />
  <QueryEditor.Editor value={query} onChange={setQuery} />
  <QueryEditor.Results data={results} />
</QueryEditor.Root>
```

### TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@server/*": ["./server/*"]
    }
  }
}
```

**Usage**:
```typescript
// Good: Use path aliases
import { Button } from '@/components/ui/Button';
import { query } from '@server/utils/database';

// Avoid: Relative paths
import { Button } from '../../../components/ui/Button';
```

### Styling with Tailwind CSS

```typescript
// Consistent Tailwind usage
export const Card: React.FC<Props> = ({ children, className }) => {
  return (
    <div className={cn(
      "rounded-lg border border-gray-200 bg-white p-4 shadow-sm",
      className
    )}>
      {children}
    </div>
  );
};
```

**Conventions**:
- Use Tailwind utility classes
- Extract repeated patterns to components
- Use `cn()` (classnames) for conditional classes
- Keep component-specific styles in the component file

## Backend Architecture

### API Server Structure

```typescript
// server/index.ts
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import connectionRoutes from './routes/connections';
import queryRoutes from './routes/query';
import schemaRoutes from './routes/schema';

app.use('/api', connectionRoutes);
app.use('/api', queryRoutes);
app.use('/api', schemaRoutes);

// WebSocket for real-time updates
io.on('connection', (socket) => {
  socket.on('execute-query', handleQueryExecution);
});

server.listen(3001, () => console.log('API server running'));
```

### Route Patterns

```typescript
// server/routes/query.ts
import { Router } from 'express';
import { executeQuery, explainQuery } from '../services/query';

const router = Router();

// GET for fetching data
router.get('/api/query/history', async (req, res) => {
  try {
    const { connectionId } = req.query;
    const history = await getQueryHistory(connectionId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST for executing queries
router.post('/api/query/execute', async (req, res) => {
  try {
    const { connectionId, query } = req.body;

    // Validate input
    if (!connectionId || !query) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const results = await executeQuery(connectionId, query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// EXPLAIN endpoint
router.post('/api/query/explain', async (req, res) => {
  try {
    const { connectionId, query } = req.body;
    const explanation = await explainQuery(connectionId, query);
    res.json({ success: true, data: explanation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### Service Layer

```typescript
// server/services/query.ts
import { getConnection } from './connections';

export async function executeQuery(
  connectionId: string,
  query: string
): Promise<QueryResult> {
  // Get connection from pool
  const connection = await getConnection(connectionId);

  try {
    // Execute query with timeout
    const [rows, fields] = await connection.query({
      sql: query,
      timeout: 30000, // 30 seconds
    });

    // Log query execution
    await logQuery(connectionId, query, rows.length);

    return {
      rows,
      fields: fields.map(f => ({
        name: f.name,
        type: f.type,
      })),
      rowCount: rows.length,
    };
  } catch (error) {
    // Log error
    await logQueryError(connectionId, query, error);
    throw error;
  }
}
```

### Connection Pooling

```typescript
// server/services/connections.ts
import mysql from 'mysql2/promise';

const connectionPools = new Map<string, mysql.Pool>();

export async function createConnection(config: ConnectionConfig) {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true,
  });

  const connectionId = generateId();
  connectionPools.set(connectionId, pool);

  return connectionId;
}

export async function getConnection(connectionId: string) {
  const pool = connectionPools.get(connectionId);
  if (!pool) {
    throw new Error(`Connection ${connectionId} not found`);
  }
  return pool;
}

export async function closeConnection(connectionId: string) {
  const pool = connectionPools.get(connectionId);
  if (pool) {
    await pool.end();
    connectionPools.delete(connectionId);
  }
}
```

## State Management

### Server State with TanStack Query

**For server data fetching and caching**:

```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['tables', connectionId],
  queryFn: () => fetchTables(connectionId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Mutations
const mutation = useMutation({
  mutationFn: (newTable: TableSchema) => createTable(connectionId, newTable),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries(['tables', connectionId]);
  },
});
```

**Query Key Patterns**:
```typescript
// Entity lists
['tables', connectionId]
['databases', connectionId]
['connections']

// Single entities
['table', connectionId, tableName]
['schema', connectionId, database, table]

// Filtered/paginated
['query-history', connectionId, { page: 1, limit: 20 }]
```

### Client State with Zustand

**For UI state**:

```typescript
// src/store/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  theme: 'light' | 'dark';
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeTab: 'query',
  theme: 'light',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTheme: (theme) => set({ theme }),
}));

// Usage
const { sidebarOpen, setSidebarOpen } = useUIStore();
```

**State Organization**:
- `uiStore.ts` - UI preferences, layout state
- `connectionStore.ts` - Active connection, connection list
- `queryStore.ts` - Query editor state, active queries
- `settingsStore.ts` - User settings, preferences

## Database Layer

### MySQL Operations

```typescript
// Parameterized queries (SAFE)
const results = await connection.query(
  'SELECT * FROM users WHERE id = ? AND status = ?',
  [userId, 'active']
);

// Named parameters
const results = await connection.query(
  'SELECT * FROM users WHERE id = :userId AND status = :status',
  { userId, status: 'active' }
);
```

**Never do this** (SQL injection risk):
```typescript
// UNSAFE - DO NOT USE
const results = await connection.query(
  `SELECT * FROM users WHERE id = ${userId}` // ❌ VULNERABLE
);
```

### MongoDB Operations

```typescript
// server/services/mongodb.ts
import { MongoClient } from 'mongodb';

const mongoClients = new Map<string, MongoClient>();

export async function createMongoConnection(config: MongoConfig) {
  const client = new MongoClient(config.uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  await client.connect();

  const connectionId = generateId();
  mongoClients.set(connectionId, client);

  return connectionId;
}

export async function queryMongoDB(
  connectionId: string,
  database: string,
  collection: string,
  filter: object = {}
) {
  const client = mongoClients.get(connectionId);
  if (!client) throw new Error('Connection not found');

  const db = client.db(database);
  const coll = db.collection(collection);

  return await coll.find(filter).toArray();
}
```

## Electron Integration

### Main Process

```javascript
// electron/main.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let apiServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile('dist/index.html');
  }
}

function startAPIServer() {
  // Start Node.js API server as child process
  apiServer = fork(path.join(__dirname, '../server/index.js'));
}

app.whenReady().then(() => {
  startAPIServer();
  createWindow();
});

app.on('quit', () => {
  if (apiServer) apiServer.kill();
});
```

### Preload Script (Secure IPC)

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // File operations
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),

  // Secure storage
  getPassword: (service, account) =>
    ipcRenderer.invoke('keychain-get', service, account),
  setPassword: (service, account, password) =>
    ipcRenderer.invoke('keychain-set', service, account, password),
});
```

## Security Architecture

### Credential Storage

**Desktop (Electron)**:
- Use OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Never store passwords in plain text
- Encrypt sensitive data at rest

**Web**:
- Encrypt credentials before storing in localStorage
- Use secure key derivation (PBKDF2, Argon2)
- Session-based encryption keys

### API Security

```typescript
// Input validation
import { z } from 'zod';

const querySchema = z.object({
  connectionId: z.string().uuid(),
  query: z.string().min(1).max(100000),
});

router.post('/api/query/execute', async (req, res) => {
  const validation = querySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error
    });
  }

  const { connectionId, query } = validation.data;
  // Proceed with execution
});
```

### SQL Injection Prevention

**Always use parameterized queries**:
```typescript
// ✅ SAFE
await connection.query(
  'SELECT * FROM users WHERE email = ?',
  [userEmail]
);

// ❌ UNSAFE
await connection.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

## Performance Patterns

### Virtual Scrolling for Large Data

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export const DataGrid: React.FC<Props> = ({ data }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35, // Row height
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Row data={data[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Code Splitting

```typescript
// Lazy load feature components
const QueryEditor = lazy(() => import('@/features/query/SQLEditor'));
const DataViewer = lazy(() => import('@/features/dataViewer/DataViewer'));
const SchemaExplorer = lazy(() => import('@/features/schema/SchemaExplorer'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/query" element={<QueryEditor />} />
    <Route path="/data" element={<DataViewer />} />
    <Route path="/schema" element={<SchemaExplorer />} />
  </Routes>
</Suspense>
```

### Debouncing and Throttling

```typescript
import { useDebounce } from 'use-debounce';

export const SearchInput: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  useEffect(() => {
    // Only fires after 300ms of no typing
    performSearch(debouncedSearch);
  }, [debouncedSearch]);

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
};
```

### Streaming Large Datasets

```typescript
// Server-side streaming
router.get('/api/export/csv', async (req, res) => {
  const { connectionId, table } = req.query;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);

  const stream = await createQueryStream(connectionId, `SELECT * FROM ${table}`);

  stream.pipe(csvTransform).pipe(res);
});
```

## Design Patterns Summary

1. **Feature-based structure** - Self-contained feature modules
2. **Three-tier architecture** - Clear separation of concerns
3. **TypeScript throughout** - Type safety across the stack
4. **Server state vs client state** - TanStack Query for server, Zustand for UI
5. **Parameterized queries** - SQL injection prevention
6. **Connection pooling** - Efficient database connections
7. **Virtual scrolling** - Handle large datasets
8. **Code splitting** - Lazy load features
9. **Secure IPC** - Electron preload script
10. **Error boundaries** - Graceful error handling

## Further Reading

- [features.md](features.md) - Feature development guide
- [testing.md](testing.md) - Testing strategies
- `openspec/project.md` - Project conventions
- `README.md` - Setup and usage
