# Kumo Feature Development Guide

Practical guide for developing new features in Kumo.

## Table of Contents

- [Before You Start](#before-you-start)
- [Feature Planning](#feature-planning)
- [Creating a New Feature](#creating-a-new-feature)
- [Feature Patterns](#feature-patterns)
- [Integration Points](#integration-points)
- [Common Feature Examples](#common-feature-examples)
- [Best Practices](#best-practices)

## Before You Start

### 1. Check Existing Features

Kumo has 20+ existing features. Before creating a new one:

```bash
# List all features
ls -1 src/features/

# Search for similar functionality
grep -r "your-keyword" src/features/
```

**Existing Features**:
- `apiTester` - REST API testing
- `aws` - AWS resource management
- `connections` - Database connection management
- `data` - Data import/export
- `dataViewer` - Data grid with inline editing
- `docs` - Documentation system
- `git` - Git integration
- `logviewer` - Application logs
- `mongodb` - MongoDB operations
- `notes` - Rich text notes
- `performance` - Performance monitoring
- `playwrightTester` - Web testing
- `query` - SQL editor
- `queryBuilder` - Visual query builder
- `remote` - Remote access
- `schema` - Schema management
- `security` - Security utilities
- `smartJoin` - Join recommendations
- `terminal` - Terminal emulator
- `tools` - Developer tools

### 2. Review OpenSpec

If your feature is significant, create an OpenSpec proposal:

```bash
# Check for related specs
openspec list --specs

# View project conventions
cat openspec/project.md
```

See `openspec/AGENTS.md` for the full workflow.

### 3. Understand Dependencies

Key libraries you'll likely use:
- **UI**: React 18, Tailwind CSS
- **State**: Zustand (client), TanStack Query (server)
- **Forms**: React Hook Form (if needed)
- **Tables**: TanStack Table
- **Editor**: Monaco Editor
- **Icons**: Lucide React
- **Charts**: Recharts

## Feature Planning

### Feature Scope Checklist

Before creating a feature, answer these questions:

1. **What problem does this solve?**
   - Clear user need or pain point
   - Not already solved by existing feature

2. **What are the user stories?**
   - As a [user], I want to [action] so that [benefit]

3. **What are the acceptance criteria?**
   - Specific, measurable outcomes
   - Edge cases and error states

4. **What are the dependencies?**
   - Backend API endpoints needed
   - External libraries required
   - Other features this interacts with

5. **What's the MVP?**
   - Minimum viable version
   - What can be added later

### Feature Design Template

```markdown
## Feature: [Name]

### Purpose
[1-2 sentences describing the feature]

### User Stories
- As a database admin, I want to view query performance metrics
- As a developer, I want to export slow queries to CSV

### Acceptance Criteria
- [ ] Display query execution time
- [ ] Show query performance over time
- [ ] Export to CSV/JSON
- [ ] Handle 1000+ queries without lag

### Technical Requirements
- Backend: New API endpoint `/api/performance/queries`
- Frontend: Chart component (Recharts)
- State: TanStack Query for data fetching
- Storage: Query history in database

### Dependencies
- None / Requires authentication feature

### Out of Scope (V1)
- Real-time monitoring (add in V2)
- Custom alerts (add in V2)
```

## Creating a New Feature

### Step 1: Create Feature Directory

```bash
# Create feature structure
mkdir -p src/features/myFeature/components
mkdir -p src/features/myFeature/utils
mkdir -p src/features/myFeature/hooks

# Create main component file
touch src/features/myFeature/MyFeature.tsx
```

### Step 2: Create Main Component

```typescript
// src/features/myFeature/MyFeature.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MyFeatureHeader } from './components/MyFeatureHeader';
import { MyFeatureContent } from './components/MyFeatureContent';

interface MyFeatureProps {
  connectionId?: string;
}

export const MyFeature: React.FC<MyFeatureProps> = ({ connectionId }) => {
  // Fetch data using TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['myFeature', connectionId],
    queryFn: () => fetchMyFeatureData(connectionId),
    enabled: !!connectionId, // Only fetch if connectionId exists
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
      <MyFeatureHeader />
      <MyFeatureContent data={data} />
    </div>
  );
};

// API function
async function fetchMyFeatureData(connectionId?: string) {
  if (!connectionId) return null;

  const response = await fetch(`/api/my-feature/${connectionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }
  return response.json();
}
```

### Step 3: Create Sub-Components

```typescript
// src/features/myFeature/components/MyFeatureHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/Button';

export const MyFeatureHeader: React.FC = () => {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Feature</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Refresh
          </Button>
          <Button variant="primary" size="sm">
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};
```

```typescript
// src/features/myFeature/components/MyFeatureContent.tsx
import React from 'react';

interface MyFeatureContentProps {
  data: any;
}

export const MyFeatureContent: React.FC<MyFeatureContentProps> = ({ data }) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Feature content */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
```

### Step 4: Add Backend API

```typescript
// server/routes/myFeature.ts
import { Router } from 'express';
import { getMyFeatureData } from '../services/myFeature';

const router = Router();

router.get('/api/my-feature/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    const data = await getMyFeatureData(connectionId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('MyFeature error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

```typescript
// server/services/myFeature.ts
import { getConnection } from './connections';

export async function getMyFeatureData(connectionId: string) {
  const connection = await getConnection(connectionId);

  const [rows] = await connection.query('SELECT * FROM my_table');

  return rows;
}
```

### Step 5: Register Routes

```typescript
// server/index.ts
import myFeatureRoutes from './routes/myFeature';

// Add with other routes
app.use(myFeatureRoutes);
```

### Step 6: Add to Navigation

```typescript
// src/components/Sidebar.tsx or similar
import { MyFeature } from '@/features/myFeature/MyFeature';

// Add to routes
<Route path="/my-feature" element={<MyFeature />} />
```

## Feature Patterns

### Pattern 1: Data Fetching Feature

**Example**: Display list of tables from database

```typescript
export const TableList: React.FC<{ connectionId: string }> = ({ connectionId }) => {
  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => fetchTables(connectionId),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-2">
      {tables?.map((table) => (
        <TableItem key={table.name} table={table} />
      ))}
    </div>
  );
};
```

### Pattern 2: Form-Based Feature

**Example**: Create new database

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const CreateDatabase: React.FC = () => {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (dbName: string) => createDatabase(connectionId, dbName),
    onSuccess: () => {
      // Invalidate queries to refetch database list
      queryClient.invalidateQueries(['databases', connectionId]);
      setName('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(name);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Database name"
        className="w-full px-3 py-2 border rounded"
      />
      <button
        type="submit"
        disabled={mutation.isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {mutation.isLoading ? 'Creating...' : 'Create Database'}
      </button>
      {mutation.error && (
        <div className="text-red-500">Error: {mutation.error.message}</div>
      )}
    </form>
  );
};
```

### Pattern 3: Real-Time Feature (WebSocket)

**Example**: Live query execution

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const LiveQueryMonitor: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('query-executed', (query: Query) => {
      setQueries((prev) => [query, ...prev].slice(0, 100)); // Keep last 100
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-2">
      {queries.map((query) => (
        <QueryItem key={query.id} query={query} />
      ))}
    </div>
  );
};
```

### Pattern 4: Editor-Based Feature

**Example**: SQL editor with Monaco

```typescript
import Editor from '@monaco-editor/react';

export const SQLEditor: React.FC = () => {
  const [sql, setSql] = useState('');

  const handleExecute = () => {
    // Execute SQL
    executeMutation.mutate(sql);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <Editor
          height="100%"
          language="sql"
          value={sql}
          onChange={(value) => setSql(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
          }}
        />
      </div>
      <div className="border-t p-2">
        <button onClick={handleExecute} className="px-4 py-2 bg-green-500 text-white rounded">
          Execute (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
};
```

### Pattern 5: Data Grid Feature

**Example**: Display and edit table data

```typescript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

export const DataGrid: React.FC<{ data: any[] }> = ({ data }) => {
  const columns = React.useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="w-full border-collapse">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="border p-2 bg-gray-100">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="border p-2">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## Integration Points

### 1. Connection Selection

Most features need to know which database connection is active:

```typescript
import { useConnectionStore } from '@/store/connectionStore';

export const MyFeature: React.FC = () => {
  const activeConnection = useConnectionStore((state) => state.activeConnection);

  if (!activeConnection) {
    return <div>Please select a connection</div>;
  }

  return <div>Working with connection: {activeConnection.id}</div>;
};
```

### 2. Sidebar Navigation

Add your feature to the sidebar:

```typescript
// src/components/Sidebar.tsx
const navigationItems = [
  { name: 'Connections', path: '/connections', icon: DatabaseIcon },
  { name: 'Query', path: '/query', icon: CodeIcon },
  { name: 'My Feature', path: '/my-feature', icon: MyIcon }, // Add here
];
```

### 3. Keyboard Shortcuts

Register keyboard shortcuts for your feature:

```typescript
import { useHotkeys } from 'react-hotkeys-hook';

export const MyFeature: React.FC = () => {
  useHotkeys('ctrl+shift+m', () => {
    // Open my feature modal
    openModal();
  });

  return <div>Press Ctrl+Shift+M to open modal</div>;
};
```

### 4. Context Menus

Add context menu items:

```typescript
const contextMenuItems = [
  { label: 'View in My Feature', action: () => openInMyFeature(item) },
];
```

## Common Feature Examples

### Example 1: Simple List Feature

```typescript
// src/features/savedQueries/SavedQueries.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const SavedQueries: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: queries } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: fetchSavedQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuery,
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-queries']);
    },
  });

  return (
    <div className="p-4 space-y-2">
      {queries?.map((query) => (
        <div key={query.id} className="flex items-center justify-between p-2 border rounded">
          <div>
            <h3 className="font-medium">{query.name}</h3>
            <p className="text-sm text-gray-500">{query.sql}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate(query.id)}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Example 2: Feature with Local State

```typescript
// src/features/queryBuilder/QueryBuilder.tsx
import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';

export const QueryBuilder: React.FC = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const addTable = (tableName: string) => {
    const newNode = {
      id: `table-${Date.now()}`,
      type: 'table',
      data: { label: tableName },
      position: { x: 100, y: 100 },
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="h-full">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={setNodes} onEdgesChange={setEdges}>
        <Controls />
      </ReactFlow>
    </div>
  );
};
```

## Best Practices

### 1. Component Organization

```
myFeature/
├── MyFeature.tsx              # Main export, minimal logic
├── components/
│   ├── MyFeatureHeader.tsx    # Header/toolbar
│   ├── MyFeatureContent.tsx   # Main content area
│   ├── MyFeatureModal.tsx     # Modals
│   └── MyFeatureItem.tsx      # List items
├── hooks/
│   └── useMyFeature.ts        # Custom hook for complex logic
└── utils/
    ├── helpers.ts             # Utility functions
    └── constants.ts           # Constants
```

### 2. Error Handling

```typescript
export const MyFeature: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feature'],
    queryFn: fetchData,
    retry: 3,
    retryDelay: 1000,
  });

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load feature"
        message={error.message}
        onRetry={() => queryClient.invalidateQueries(['my-feature'])}
      />
    );
  }

  return <div>{/* Feature content */}</div>;
};
```

### 3. Loading States

```typescript
export const MyFeature: React.FC = () => {
  const { data, isLoading } = useQuery(/* ... */);

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
          <span className="ml-2">Loading feature...</span>
        </div>
      ) : (
        <FeatureContent data={data} />
      )}
    </div>
  );
};
```

### 4. Empty States

```typescript
export const MyFeature: React.FC = () => {
  const { data } = useQuery(/* ... */);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <EmptyIcon size={48} />
        <h3 className="mt-4 text-lg font-medium">No data yet</h3>
        <p className="mt-2 text-sm">Get started by creating your first item</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Create Item</button>
      </div>
    );
  }

  return <FeatureContent data={data} />;
};
```

### 5. Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateItem,
  onMutate: async (newItem) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['items']);

    // Snapshot current value
    const previousItems = queryClient.getQueryData(['items']);

    // Optimistically update
    queryClient.setQueryData(['items'], (old) => [...old, newItem]);

    // Return context for rollback
    return { previousItems };
  },
  onError: (err, newItem, context) => {
    // Rollback on error
    queryClient.setQueryData(['items'], context.previousItems);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['items']);
  },
});
```

### 6. Accessibility

```typescript
export const MyFeature: React.FC = () => {
  return (
    <div role="main" aria-label="My Feature">
      <button
        onClick={handleAction}
        aria-label="Perform action"
        className="px-4 py-2 bg-blue-500 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Action
      </button>
    </div>
  );
};
```

### 7. Testing

Write tests for your feature:

```typescript
// src/test/features/myFeature.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MyFeature } from '@/features/myFeature/MyFeature';

describe('MyFeature', () => {
  it('renders loading state', () => {
    render(<MyFeature />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays data after loading', async () => {
    render(<MyFeature />);
    await waitFor(() => {
      expect(screen.getByText('Feature Content')).toBeInTheDocument();
    });
  });
});
```

## Checklist for New Features

- [ ] Feature directory created in `src/features/`
- [ ] Main component exports feature
- [ ] Sub-components organized in `components/`
- [ ] Utilities in `utils/` if needed
- [ ] Custom hooks in `hooks/` if needed
- [ ] Backend API endpoint created
- [ ] API service functions created
- [ ] Routes registered in `server/index.ts`
- [ ] Navigation updated (if applicable)
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] Empty states implemented
- [ ] TypeScript types defined
- [ ] Tests written
- [ ] Documentation updated
- [ ] OpenSpec created (if significant feature)

## Next Steps

- Review [architecture.md](architecture.md) for technical patterns
- Check [testing.md](testing.md) for testing strategies
- Explore existing features in `src/features/` for examples
- Review `openspec/project.md` for project conventions
