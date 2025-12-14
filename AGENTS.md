# AGENTS.md - KumoDB AI Assistant Guide

**Version:** 1.0
**Last Updated:** 2025-12-14

This document provides comprehensive guidance for AI assistants working on the KumoDB project. Read this file before making any changes to the codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Using Specialized Skills](#using-specialized-skills)
5. [OpenSpec Workflow](#openspec-workflow)
6. [Development Guidelines](#development-guidelines)
7. [Code Conventions](#code-conventions)
8. [Testing Strategy](#testing-strategy)
9. [Common Development Tasks](#common-development-tasks)
10. [Security & Performance](#security--performance)
11. [Troubleshooting](#troubleshooting)
12. [Resources](#resources)

---

## Project Overview

**KumoDB** is a comprehensive, cross-platform database management application built with TypeScript, React, and Electron.

### Key Features

- **Database Support**: MySQL and MongoDB with multi-connection management
- **Query Tools**: Monaco editor with SQL syntax highlighting, visual query builder (React Flow)
- **Data Management**: Advanced data viewer with inline editing, import/export (CSV, JSON, SQL, Excel)
- **Development Tools**: API tester, terminal, Playwright integration, Git browser
- **AI Features**: Anthropic Claude integration for query assistance and natural language to SQL
- **Git Integration**: Repository browser, pull request viewer, code diff viewer

### Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query, Tailwind CSS, Monaco Editor
- **Backend**: Node.js, Express, mysql2, mongodb driver, socket.io
- **Desktop**: Electron with secure IPC
- **Testing**: Vitest (unit), Playwright (E2E)
- **State**: Zustand (client state), TanStack Query (server state)

### Project Stats

- **20+ Features**: Feature-based architecture in `src/features/`
- **50+ API Endpoints**: RESTful API with WebSocket support
- **100+ Components**: Reusable UI components
- **Comprehensive Testing**: Unit, E2E, visual regression, accessibility

---

## Quick Start

### Running the Application

```bash
# Terminal 1: Frontend (Vite dev server)
npm run dev                    # http://localhost:5174

# Terminal 2: Backend API
npm run dev:server             # http://localhost:3001

# Terminal 3 (optional): Electron app
npm run dev:electron
```

### Key Commands

```bash
# Development
npm run dev                    # Start frontend
npm run dev:server             # Start backend
npm run dev:electron           # Start Electron app

# Code Quality
npm run format                 # Format with Prettier
npm run type-check             # TypeScript type checking
npm run lint                   # ESLint code linting

# Testing
npm run test                   # Run E2E tests (Playwright)
npm run test:unit              # Run unit tests (Vitest)
npm run test:ui                # Playwright UI mode

# Building
npm run build                  # Build frontend and server
npm run build:electron:win     # Build for Windows
npm run build:electron:mac     # Build for macOS
npm run build:electron:linux   # Build for Linux
```

### Project Structure

```
KumoDB/
├── src/                           # Frontend React application
│   ├── features/                  # Feature modules (20+ features)
│   │   ├── apiTester/            # REST API testing
│   │   ├── connections/          # Database connection management
│   │   ├── dataViewer/           # Data grid with inline editing
│   │   ├── mongodb/              # MongoDB features
│   │   ├── query/                # SQL editor and execution
│   │   ├── queryBuilder/         # Visual query builder
│   │   ├── schema/               # Schema exploration
│   │   └── ...                   # 13+ more features
│   ├── components/               # Shared UI components
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # Frontend API clients
│   ├── store/                    # Zustand state management
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions
├── server/                       # Node.js Express API
│   ├── routes/                   # API route handlers
│   ├── services/                 # Business logic
│   ├── types/                    # Server types
│   └── utils/                    # Server utilities
├── electron/                     # Electron main process
│   ├── main.cjs                  # Entry point
│   └── preload.js                # Preload script
├── tests/                        # E2E tests (Playwright)
├── openspec/                     # Spec-driven development
│   ├── project.md                # Project conventions
│   ├── specs/                    # Feature specifications
│   └── changes/                  # Change proposals
└── .claude/                      # Claude Code configuration
    ├── commands/                 # Slash commands
    └── skills/                   # Agent skills
```

---

## Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────────┐
│         React Frontend (Vite)           │
│    - UI Components (React 18)           │
│    - State Management (Zustand)         │
│    - Server State (TanStack Query)      │
│    Port: 5174 (dev) / bundled (prod)    │
└─────────────────┬───────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────┐
│      Node.js API Server (Express)       │
│    - RESTful API endpoints              │
│    - WebSocket (Socket.io)              │
│    - Connection pooling                 │
│    Port: 3001                           │
└─────────────────┬───────────────────────┘
                  │ mysql2 / mongodb driver
┌─────────────────▼───────────────────────┐
│        MySQL / MongoDB Databases        │
│    - User's database instances          │
│    - Multiple connections supported     │
└─────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Feature-Based Structure**: Each feature is self-contained in `src/features/`
2. **Server-Side Connections**: Never direct database access from browser
3. **RESTful API**: With WebSocket for streaming operations
4. **State Separation**: TanStack Query (server state) vs Zustand (client state)
5. **TypeScript Path Aliases**: `@/*` for `src/*`, `@server/*` for `server/*`
6. **Security First**: Parameterized queries, encrypted credentials, input validation
7. **Performance Aware**: Virtual scrolling, connection pooling, code splitting

---

## Using Specialized Skills

KumoDB has specialized skills for different parts of the codebase. Use these skills for focused assistance on specific modules.

### Available Skills

#### 1. KumoDB Assistant (`kumodb`)

**Use When:**
- Adding new features to KumoDB
- Understanding the feature-based architecture
- Working with database connections (MySQL/MongoDB)
- Creating or modifying UI components
- Writing API endpoints
- Adding tests (Vitest unit tests or Playwright E2E tests)
- Working with the Electron desktop app

**Documentation:**
- `.claude/skills/kumodb/SKILL.md` - Main guide
- `.claude/skills/kumodb/architecture.md` - Architecture patterns
- `.claude/skills/kumodb/features.md` - Feature development guide
- `.claude/skills/kumodb/testing.md` - Testing strategies

**Example Usage:**
```
"Add a new feature for database backup management"
"How do I create a new API endpoint?"
"Write unit tests for the connection manager"
```

#### 2. Query Module Assistant (`query-module`)

**Use When:**
- Working on the SQL Editor (`src/features/query/SQLEditor.tsx`)
- Adding features to Monaco Editor integration
- Modifying query execution logic
- Working with ResultGrid or result display
- Managing editor tabs system
- Implementing AI-powered features (natural language to SQL, query optimization)
- Building toolbar components or editor controls
- Handling datetime/timezone display
- Working with export/copy functionality

**Documentation:**
- `.claude/skills/query-module/SKILL.md` - Comprehensive query module guide

**Example Usage:**
```
"Add a new toolbar button to the SQL editor"
"How do I modify the datetime display format?"
"Implement a new AI feature for query suggestions"
```

### When to Use Which Skill

| Task | Skill to Use |
|------|-------------|
| Adding a new feature module | `kumodb` |
| Modifying SQL Editor | `query-module` |
| Working with API endpoints | `kumodb` |
| Adding query result export formats | `query-module` |
| Creating database connection logic | `kumodb` |
| Implementing Monaco editor features | `query-module` |
| Writing E2E tests | `kumodb` |
| Modifying tab management | `query-module` |
| General architecture questions | `kumodb` |
| SQL utility functions | `query-module` |

---

## OpenSpec Workflow

KumoDB uses **OpenSpec** for spec-driven development. For significant features or changes, follow the OpenSpec workflow.

### When to Use OpenSpec

Use OpenSpec when:
- Adding a new feature (more than just a small tweak)
- Making breaking changes
- Implementing architectural changes
- Adding new API endpoints
- Modifying database schema
- Making changes that affect multiple files/features

### OpenSpec Commands

```bash
# Create a new change proposal
/openspec:proposal <change-name>

# List active changes
openspec list

# View feature specifications
openspec list --specs

# Validate a proposal
openspec validate <change-id>

# Apply an approved change
/openspec:apply <change-id>

# Archive a completed change
/openspec:archive <change-id>
```

### OpenSpec Workflow Steps

1. **Proposal Phase** (`/openspec:proposal`)
   - Create a new change proposal
   - Define the scope, requirements, and acceptance criteria
   - Scaffold the spec structure

2. **Approval Phase**
   - User reviews and approves the proposal
   - Discuss any concerns or modifications

3. **Implementation Phase** (`/openspec:apply`)
   - Implement the approved change
   - Keep tasks in sync with the spec
   - Update spec deltas as needed

4. **Archive Phase** (`/openspec:archive`)
   - Archive the completed change
   - Update project specs
   - Clean up change artifacts

### OpenSpec File Structure

```
openspec/
├── AGENTS.md              # OpenSpec workflow guide (if exists)
├── project.md             # Project conventions
├── specs/                 # Feature specifications
│   └── <feature>/         # Feature specs
└── changes/               # Active changes
    └── <change-name>/     # Change proposal
        ├── proposal.md    # Change description
        ├── tasks.md       # Implementation tasks
        └── specs/         # Spec deltas
```

**See:** `openspec/AGENTS.md` for detailed workflow instructions (if file exists)

---

## Development Guidelines

### Before You Start

1. **Check Existing Features**: KumoDB has 20+ features. Search before creating something new.
   ```bash
   ls -1 src/features/
   grep -r "your-keyword" src/features/
   ```

2. **Review Documentation**:
   - `README.md` - Project overview and setup
   - `.claude/skills/kumodb/SKILL.md` - Development guide
   - `.claude/skills/kumodb/architecture.md` - Architecture patterns
   - `.claude/skills/kumodb/features.md` - Feature development

3. **Understand Dependencies**: Check `package.json` for libraries used
   - UI: React 18, Tailwind CSS
   - State: Zustand (client), TanStack Query (server)
   - Editor: Monaco Editor
   - Tables: TanStack Table
   - Icons: Lucide React
   - Charts: Recharts

### Adding a New Feature

#### Step 1: Create Feature Structure

```bash
mkdir -p src/features/myFeature/components
mkdir -p src/features/myFeature/utils
touch src/features/myFeature/MyFeature.tsx
```

#### Step 2: Create Main Component

```typescript
// src/features/myFeature/MyFeature.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface MyFeatureProps {
  connectionId?: string;
}

export const MyFeature: React.FC<MyFeatureProps> = ({ connectionId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['myFeature', connectionId],
    queryFn: () => fetchMyFeatureData(connectionId),
    enabled: !!connectionId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Feature content */}
    </div>
  );
};

async function fetchMyFeatureData(connectionId?: string) {
  if (!connectionId) return null;
  const response = await fetch(`/api/my-feature/${connectionId}`);
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}
```

#### Step 3: Create Backend API

```typescript
// server/routes/myFeature.ts
import { Router } from 'express';

const router = Router();

router.get('/api/my-feature/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const data = await getMyFeatureData(connectionId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

```typescript
// server/index.ts
import myFeatureRoutes from './routes/myFeature';
app.use(myFeatureRoutes);
```

#### Step 4: Add Tests

```typescript
// src/test/components/MyFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { MyFeature } from '@/features/myFeature/MyFeature';

describe('MyFeature', () => {
  it('renders loading state', () => {
    render(<MyFeature />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

---

## Code Conventions

### TypeScript Style

- **2-space indentation**
- **Single quotes** for strings
- **Trailing commas** in multi-line objects/arrays
- **PascalCase** for components, **camelCase** for functions/variables
- **kebab-case** for file names

### React Patterns

```typescript
// ✅ Good: Functional component with TypeScript
interface Props {
  connectionId: string;
  onExecute: (query: string) => void;
}

export const SQLEditor: React.FC<Props> = ({ connectionId, onExecute }) => {
  const [query, setQuery] = useState('');

  const handleExecute = useCallback(() => {
    onExecute(query);
  }, [query, onExecute]);

  return (
    <div className="sql-editor">
      {/* Component JSX */}
    </div>
  );
};

// ❌ Avoid: Class components
class SQLEditor extends React.Component { }
```

### State Management

- **Server State**: Use TanStack Query (`useQuery`, `useMutation`)
  ```typescript
  const { data, isLoading } = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => fetchTables(connectionId),
  });
  ```

- **Client State**: Use Zustand stores for UI state
  ```typescript
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  ```

- **Form State**: Use controlled components with local `useState`

### API Patterns

```typescript
// ✅ Good: Parameterized queries (SAFE)
await connection.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ Bad: String interpolation (SQL INJECTION RISK)
await connection.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `SQLEditor.tsx`)
- Utilities: `camelCase.ts` (e.g., `sqlUtils.ts`)
- Hooks: `useCamelCase.ts` (e.g., `useDatabase.ts`)
- Types: `camelCase.types.ts` (e.g., `query.types.ts`)

### Import Order

```typescript
// 1. React and external libraries
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules (path aliases)
import { Button } from '@/components/ui/Button';
import { useDatabase } from '@/hooks/useDatabase';

// 3. Relative imports
import { MyComponent } from './components/MyComponent';
import { helper } from './utils/helpers';

// 4. Types
import type { QueryResult } from '@/types/query';
```

### TypeScript Path Aliases

```typescript
// ✅ Use path aliases
import { Button } from '@/components/ui/Button';
import { query } from '@server/utils/database';

// ❌ Avoid relative paths
import { Button } from '../../../components/ui/Button';
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Location**: `src/test/`

```bash
# Run all unit tests
npm run test:unit

# Run with UI
npm run test:unit:ui

# Run with coverage
npm run test:unit:coverage

# Component tests only
npm run test:unit:components
```

**Example**:
```typescript
// src/test/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

**Location**: `tests/`

```bash
# Run all E2E tests
npm run test

# Run in UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test suite
npm run test:query          # Query editor tests
npm run test:data           # Data viewer tests
npm run test:connections    # Connection tests
```

**Example**:
```typescript
// tests/features/myFeature.spec.ts
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('http://localhost:5174');
  await page.click('text=My Feature');
  await expect(page.locator('.my-feature')).toBeVisible();
});
```

### Testing Best Practices

1. **Write tests for new features** - Add tests when creating new features
2. **Test edge cases** - Handle errors, empty states, loading states
3. **Use descriptive test names** - `it('displays error message when API fails')`
4. **Mock external dependencies** - Mock API calls, database connections
5. **Test user interactions** - Click events, form submissions, navigation

---

## Common Development Tasks

### Task 1: Database Operations

**MySQL Example**:
```typescript
import { query } from '@server/utils/database';

const results = await query(
  connectionId,
  'SELECT * FROM users WHERE id = ?',
  [userId]
);
```

**MongoDB Example**:
```typescript
import { getMongoClient } from '@server/services/mongodb';

const client = await getMongoClient(connectionId);
const db = client.db(databaseName);
const collection = db.collection(collectionName);
const docs = await collection.find({ status: 'active' }).toArray();
```

### Task 2: API Endpoints

**Creating a new endpoint**:
```typescript
// server/routes/myRoute.ts
import { Router } from 'express';

const router = Router();

router.post('/api/my-endpoint', async (req, res) => {
  try {
    const { connectionId, data } = req.body;

    // Validate input
    if (!connectionId || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Process request
    const result = await processData(connectionId, data);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Task 3: TanStack Query Integration

```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['tables', connectionId],
  queryFn: () => fetchTables(connectionId),
  staleTime: 5 * 60 * 1000,      // 5 minutes
  cacheTime: 10 * 60 * 1000,     // 10 minutes
});

// Mutations
const mutation = useMutation({
  mutationFn: (newTable: TableSchema) => createTable(connectionId, newTable),
  onSuccess: () => {
    queryClient.invalidateQueries(['tables', connectionId]);
  },
});
```

### Task 4: Zustand Store

```typescript
// src/store/myStore.ts
import { create } from 'zustand';

interface MyState {
  value: string;
  setValue: (value: string) => void;
}

export const useMyStore = create<MyState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));

// Usage
const { value, setValue } = useMyStore();
```

### Task 5: Custom Hooks

```typescript
// src/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export const useMyHook = (connectionId: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(connectionId).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [connectionId]);

  return { data, loading };
};
```

---

## Security & Performance

### Security Best Practices

#### 1. SQL Injection Prevention

```typescript
// ✅ SAFE: Use parameterized queries
await connection.query(
  'SELECT * FROM users WHERE email = ?',
  [userEmail]
);

// ❌ UNSAFE: String interpolation
await connection.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

#### 2. Input Validation

```typescript
import { z } from 'zod';

const querySchema = z.object({
  connectionId: z.string().uuid(),
  query: z.string().min(1).max(100000),
});

const validation = querySchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({ error: 'Invalid input' });
}
```

#### 3. Credential Storage

- **Desktop (Electron)**: Use OS keychain (macOS Keychain, Windows Credential Manager)
- **Web**: Encrypt credentials before storing in localStorage
- Never store passwords in plain text

### Performance Best Practices

#### 1. Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: data.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 35,  // Row height
  overscan: 10,
});
```

#### 2. Code Splitting

```typescript
import { lazy } from 'react';

const QueryEditor = lazy(() => import('@/features/query/SQLEditor'));
const DataViewer = lazy(() => import('@/features/dataViewer/DataViewer'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <QueryEditor />
</Suspense>
```

#### 3. Debouncing

```typescript
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 300);

useEffect(() => {
  performSearch(debouncedSearch);
}, [debouncedSearch]);
```

#### 4. Connection Pooling

```typescript
// server/services/connections.ts
const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
});
```

---

## Troubleshooting

### Common Issues

#### 1. Connection Failed
- Verify database server is running
- Check firewall settings
- Validate connection credentials
- For SSH tunnels, verify SSH server is accessible

#### 2. Build Errors
```bash
# Clear dependencies and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install

# For legacy peer dependencies
npm install --legacy-peer-deps
```

#### 3. Port Already in Use
```bash
# macOS/Linux
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

#### 4. Electron App Won't Start
- Check if ports (3001, 5174) are available
- Verify all dependencies are installed
- Check console logs in Developer Tools (F12)
- Try `npm run clean` then rebuild

#### 5. Native Module Issues (macOS/Linux)
```bash
npx @electron/rebuild
# Or for specific modules
npx @electron/rebuild -o sqlite3,node-pty
```

### Debug Mode

```bash
# Start with debug logging
DEBUG=kumo:* npm run dev:electron

# Show detailed error logs
NODE_DEBUG=* npm run dev:server
```

---

## Resources

### Documentation

- **README.md** - Project overview and setup guide
- **CLAUDE.md** - OpenSpec instructions
- **.claude/skills/kumodb/** - KumoDB development guides
  - `SKILL.md` - Main guide
  - `architecture.md` - Architecture patterns
  - `features.md` - Feature development
  - `testing.md` - Testing strategies
- **.claude/skills/query-module/** - Query module guide
  - `SKILL.md` - Query module comprehensive guide

### OpenSpec

- **openspec/project.md** - Project conventions
- **openspec/specs/** - Feature specifications
- **openspec/changes/** - Active change proposals

### Commands

```bash
# OpenSpec
openspec list                  # View active changes
openspec list --specs          # View feature specifications

# Testing
npm run test:report            # View Playwright test reports
npm run test:unit:ui           # Vitest UI

# Code Quality
npm run format                 # Format code
npm run type-check             # Type checking
npm run lint                   # Lint code
```

### External Resources

- [React 18 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/)
- [Electron Documentation](https://www.electronjs.org/docs)

---

## AI Assistant Guidelines

### Do's ✅

1. **Read existing code first** - Never propose changes without reading relevant files
2. **Use specialized skills** - Use `kumodb` or `query-module` skills for focused tasks
3. **Follow OpenSpec** - Use OpenSpec for significant features or changes
4. **Write tests** - Add tests when creating new features
5. **Use path aliases** - Import with `@/*` instead of relative paths
6. **Security first** - Validate input, use parameterized queries
7. **Performance aware** - Consider virtual scrolling for large datasets
8. **Type safety** - Leverage TypeScript for better developer experience
9. **Check existing features** - Similar functionality may already exist

### Don'ts ❌

1. **Don't guess URLs** - Only use URLs provided by user or in files
2. **Don't skip tests** - Always add tests for new features
3. **Don't use string interpolation for SQL** - SQL injection risk
4. **Don't create unnecessary files** - Prefer editing existing files
5. **Don't ignore errors** - Handle errors gracefully
6. **Don't hardcode values** - Use configuration and environment variables
7. **Don't skip documentation** - Update docs when adding features

### When in Doubt

1. Check existing features in `src/features/`
2. Read the relevant skill documentation
3. Review `openspec/project.md` for project conventions
4. Ask clarifying questions before making changes
5. Start with a small, incremental change

---

## Version History

- **v1.0** (2025-12-14) - Initial comprehensive AGENTS.md
  - Project overview
  - Architecture documentation
  - Skill integration
  - OpenSpec workflow
  - Development guidelines
  - Code conventions
  - Testing strategy
  - Security & performance best practices
  - Troubleshooting guide

---

## Contributing to This Document

This document should be updated when:
- New features are added
- Architecture patterns change
- New skills are created
- Development workflows change
- Common issues are discovered

Keep this document comprehensive but concise. Use links to external documentation for detailed technical information.

---

**Last Updated:** 2025-12-14
**Maintained By:** KumoDB Development Team
