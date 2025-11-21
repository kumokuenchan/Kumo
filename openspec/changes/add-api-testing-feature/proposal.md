## Why

Modern developers frequently need to test REST APIs that interact with their databases. Currently, they must switch between database management tools and separate API testing tools like Postman or Insomnia. This context switching is inefficient and breaks workflow. By integrating API testing capabilities into Kumo, users can test API endpoints and verify database changes in a single application, streamlining their development process.

## What Changes

- Add new "API" tab to the main application interface
- Add HTTP request builder with support for all common methods (GET, POST, PUT, DELETE, PATCH, etc.)
- Add request configuration UI for URL, headers, query parameters, and body
- Add request body editor with JSON, form-data, and raw text support
- Add response viewer with syntax highlighting and formatting
- Add saved requests feature with folder organization
- Add request history tracking
- Add basic authentication support (Basic Auth, Bearer Token, API Key)
- Add environment variables for managing different API configurations
- Integrate with existing Monaco Editor for JSON editing

## Impact

- Affected specs:
  - api-request-builder (new)
  - api-response-viewer (new)
  - api-collections (new)
  - api-authentication (new)
  - api-environment-variables (new)

- Affected code:
  - src/App.tsx: Add new "API" tab to main tab system
  - src/features/api/: New feature directory for API testing components
  - server/routes/api-proxy.ts: New backend route for proxying HTTP requests
  - src/hooks/useApiRequests.ts: New hooks for API request state management

- Dependencies:
  - axios or native fetch for HTTP requests
  - Existing Monaco Editor for JSON body editing
  - Existing state management patterns (TanStack Query + Zustand)
  - Leverage existing saved queries pattern for saved requests

## User Benefits

- **Unified Workflow**: Test APIs and verify database state without switching tools
- **Database Integration**: Immediately query database after API calls to verify changes
- **Faster Development**: Reduced context switching increases productivity
- **Cost Savings**: One less tool subscription needed for small teams
- **Consistency**: Use familiar Kumo interface for API testing
