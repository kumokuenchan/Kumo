## Architecture Overview

The API testing feature will be implemented as a new feature module following the existing application architecture patterns. It will reuse existing UI components and patterns where possible to maintain consistency.

## Component Architecture

```
src/features/api/
├── ApiTab.tsx                 # Main tab container
├── RequestBuilder.tsx         # Request configuration UI
├── ResponseViewer.tsx         # Response display panel
├── SavedRequests.tsx          # Collections sidebar
├── RequestHistory.tsx         # History panel
├── EnvironmentSelector.tsx   # Environment variable manager
└── components/
    ├── MethodSelector.tsx     # HTTP method dropdown
    ├── UrlInput.tsx           # URL input with autocomplete
    ├── HeadersEditor.tsx      # Key-value editor for headers
    ├── QueryParamsEditor.tsx  # Query parameters builder
    ├── BodyEditor.tsx         # Request body editor (tabs for JSON/form/raw)
    └── AuthConfig.tsx         # Authentication configuration
```

## Request Flow

```
User Input → Request Builder → Backend Proxy → External API
                                    ↓
                              Response Viewer ← Backend Proxy
```

### Why Backend Proxy?

Instead of making requests directly from the browser, we proxy through the backend server to:

1. **Avoid CORS Issues**: Browser CORS restrictions don't apply to server-side requests
2. **Handle Authentication**: Securely store and use API credentials without exposing them in browser
3. **Support All HTTP Methods**: Some methods (like PATCH) may have browser limitations
4. **Enable Advanced Features**: Proxy certificates, custom DNS, and other server-side capabilities

## Data Storage

### Saved Requests Storage

```typescript
interface SavedRequest {
  id: string;
  name: string;
  folder?: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  body?: RequestBody;
  auth?: AuthConfig;
  createdAt: string;
  updatedAt: string;
}
```

Stored in: `data/api-requests.json` (similar to saved queries pattern)

### Request History Storage

```typescript
interface RequestHistory {
  id: string;
  savedRequestId?: string;
  method: HttpMethod;
  url: string;
  status: number;
  responseTime: number;
  timestamp: string;
}
```

Stored in: localStorage (kept in memory for fast access)

### Environment Variables Storage

```typescript
interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  isActive: boolean;
}
```

Stored in: `data/api-environments.json`

## State Management

### Client State (Zustand)
- Current request being edited
- Active environment
- UI state (sidebar visibility, split pane sizes)

### Server State (TanStack Query)
- Saved requests list
- Environments list
- Request execution results

## Reusable Components

Leverage existing components to maintain consistency:

1. **Monaco Editor**: Reuse for JSON body editing (already used in SQL Editor)
2. **Key-Value Editor**: Similar to headers/params editors can be generalized
3. **Folder Structure**: Reuse connection groups pattern for request collections
4. **Save Dialog**: Reuse saved queries dialog pattern
5. **Split Pane Layout**: Similar to SQL Editor request/response layout

## Security Considerations

1. **Credential Storage**: API keys and tokens stored encrypted (reuse existing encryption service)
2. **Request Proxying**: All external requests go through backend to avoid exposing credentials
3. **HTTPS Enforcement**: Warn users when making requests to non-HTTPS endpoints in production
4. **Environment Isolation**: Production environments should be clearly marked (reuse connection environment badges)

## Performance Considerations

1. **Response Size Limits**: Warn on responses > 10MB, truncate display for very large responses
2. **History Limits**: Keep last 100 requests in history, auto-cleanup older entries
3. **Debouncing**: URL autocomplete and variable interpolation should be debounced
4. **Streaming**: For large file uploads/downloads, use streaming instead of loading into memory

## Integration Points

### Database Integration
- Quick action: "Query Database" button in response viewer
- Auto-switch to SQL tab with pre-populated query
- Share environment variables between API and SQL tabs

### Existing Features Integration
- Use same tab system as Schema/Query/Data tabs
- Integrate with existing keyboard shortcuts
- Use consistent styling and theme support (light/dark mode)

## Phased Implementation

### Phase 1: MVP (Core Functionality)
- Basic request builder (GET, POST, PUT, DELETE)
- Response viewer with JSON formatting
- Save/load requests
- Request history

### Phase 2: Enhanced Features
- All HTTP methods
- Form-data and file upload support
- Collections with folders
- Basic authentication (Bearer, API Key)

### Phase 3: Advanced Features
- Environment variables with interpolation
- Pre-request scripts (optional)
- Test assertions (optional)
- OAuth 2.0 support (optional)

## Open Questions

1. Should we support WebSocket testing? (Decision: Defer to Phase 3)
2. Should we support GraphQL? (Decision: Defer, focus on REST first)
3. Should we support importing Postman collections? (Decision: Nice to have, Phase 2+)
4. Should we support code generation? (Decision: Defer to Phase 3)
