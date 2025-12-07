# KumoDB Testing Guide

Comprehensive testing strategies for KumoDB using Vitest (unit tests) and Playwright (E2E tests).

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Unit Testing with Vitest](#unit-testing-with-vitest)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Component Testing](#component-testing)
- [API Testing](#api-testing)
- [Test Organization](#test-organization)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [CI/CD Integration](#cicd-integration)

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \  E2E Tests (Playwright)
      /____\  Few, focused on critical user flows
     /      \
    /        \ Integration Tests
   /__________\ More tests, feature interactions
  /            \
 /              \ Unit Tests (Vitest)
/________________\ Most tests, individual functions/components
```

**KumoDB Test Coverage Goals**:
- **80%+ code coverage** for business logic
- **100% coverage** for critical paths (connection, query execution)
- **E2E tests** for all major user workflows
- **Component tests** for complex UI components

### Test Levels

1. **Unit Tests** - Individual functions, utilities, hooks
2. **Component Tests** - React components in isolation
3. **Integration Tests** - Feature interactions, API endpoints
4. **E2E Tests** - Full user workflows in real browser

## Unit Testing with Vitest

### Setup

```bash
# Run all unit tests
npm run test:unit

# Run with UI
npm run test:unit:ui

# Run with coverage
npm run test:unit:coverage

# Watch mode
npm run test:unit:components:watch
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
```

### Testing Utilities and Helpers

```typescript
// src/utils/helpers.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

```typescript
// src/test/utils/helpers.test.ts
import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, validateEmail, debounce } from '@/utils/helpers';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('validateEmail', () => {
  it('validates correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
  });
});

describe('debounce', () => {
  it('delays function execution', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn('test');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledWith('test');

    vi.useRealTimers();
  });

  it('cancels previous calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 1000);

    debouncedFn('first');
    vi.advanceTimersByTime(500);
    debouncedFn('second');
    vi.advanceTimersByTime(1000);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');

    vi.useRealTimers();
  });
});
```

### Testing Custom Hooks

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

```typescript
// src/test/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('reads from localStorage on mount', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    expect(result.current[0]).toBe('stored');
  });

  it('handles complex objects', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', { name: 'John', age: 30 })
    );

    act(() => {
      result.current[1]({ name: 'Jane', age: 25 });
    });

    expect(result.current[0]).toEqual({ name: 'Jane', age: 25 });
  });
});
```

## Component Testing

### Testing React Components

```typescript
// src/components/ui/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded ${variant === 'primary' ? 'bg-blue-500 text-white' : ''}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

```typescript
// src/test/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('applies correct variant class', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-blue-500');
  });
});
```

### Testing Components with TanStack Query

```typescript
// src/test/utils/test-utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
```

```typescript
// src/test/components/TableList.test.tsx
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableList } from '@/features/schema/TableList';
import { renderWithQuery } from '@/test/utils/test-utils';

// Mock API
vi.mock('@/api/tables', () => ({
  fetchTables: vi.fn(() =>
    Promise.resolve([
      { name: 'users', rows: 100 },
      { name: 'posts', rows: 500 },
    ])
  ),
}));

describe('TableList', () => {
  it('displays loading state initially', () => {
    renderWithQuery(<TableList connectionId="conn-1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays tables after loading', async () => {
    renderWithQuery(<TableList connectionId="conn-1" />);

    await waitFor(() => {
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('posts')).toBeInTheDocument();
    });
  });
});
```

## E2E Testing with Playwright

### Setup

```bash
# Install Playwright
npm run test:install

# Run all E2E tests
npm run test

# Run with UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test
npm run test -- api-tester.spec.ts

# Run by browser
npm run test:chrome
npm run test:firefox
npm run test:safari
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

#### 1. Connection Management Test

```typescript
// tests/connections.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Connection Management', () => {
  test('should create new MySQL connection', async ({ page }) => {
    await page.goto('/connections');

    // Click "New Connection" button
    await page.click('button:has-text("New Connection")');

    // Fill connection form
    await page.fill('input[name="name"]', 'Test MySQL Connection');
    await page.fill('input[name="host"]', 'localhost');
    await page.fill('input[name="port"]', '3306');
    await page.fill('input[name="user"]', 'root');
    await page.fill('input[name="password"]', 'password');

    // Test connection
    await page.click('button:has-text("Test Connection")');

    // Wait for success message
    await expect(page.locator('text=Connection successful')).toBeVisible();

    // Save connection
    await page.click('button:has-text("Save")');

    // Verify connection appears in list
    await expect(page.locator('text=Test MySQL Connection')).toBeVisible();
  });

  test('should edit existing connection', async ({ page }) => {
    await page.goto('/connections');

    // Click on connection
    await page.click('text=Test MySQL Connection');

    // Click edit button
    await page.click('button[aria-label="Edit connection"]');

    // Update name
    await page.fill('input[name="name"]', 'Updated Connection');
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Updated Connection')).toBeVisible();
  });

  test('should delete connection', async ({ page }) => {
    await page.goto('/connections');

    // Click on connection
    await page.click('text=Updated Connection');

    // Click delete button
    await page.click('button[aria-label="Delete connection"]');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify deletion
    await expect(page.locator('text=Updated Connection')).not.toBeVisible();
  });
});
```

#### 2. Query Editor Test

```typescript
// tests/query-editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Query Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test connection and navigate to query editor
    await page.goto('/connections');
    await page.click('text=Test Connection');
    await page.click('text=Query Editor');
  });

  test('should execute SELECT query', async ({ page }) => {
    // Type SQL query in Monaco editor
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('SELECT * FROM users LIMIT 10');

    // Execute query (Ctrl+Enter)
    await page.keyboard.press('Control+Enter');

    // Wait for results
    await expect(page.locator('[data-testid="query-results"]')).toBeVisible();

    // Verify results table
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check row count indicator
    await expect(page.locator('text=/\\d+ rows/')).toBeVisible();
  });

  test('should show error for invalid query', async ({ page }) => {
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('INVALID SQL QUERY');

    await page.keyboard.press('Control+Enter');

    // Verify error message
    await expect(page.locator('[data-testid="query-error"]')).toBeVisible();
    await expect(page.locator('text=/syntax error/i')).toBeVisible();
  });

  test('should save query to history', async ({ page }) => {
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('SELECT * FROM posts');
    await page.keyboard.press('Control+Enter');

    // Open query history
    await page.click('button:has-text("History")');

    // Verify query appears in history
    await expect(page.locator('text=SELECT * FROM posts')).toBeVisible();
  });

  test('should export results to CSV', async ({ page }) => {
    // Execute query
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('SELECT * FROM users LIMIT 5');
    await page.keyboard.press('Control+Enter');

    // Wait for results
    await page.waitForSelector('[data-testid="query-results"]');

    // Click export button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export CSV")'),
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
```

#### 3. Data Viewer Test

```typescript
// tests/data-viewer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Data Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connections');
    await page.click('text=Test Connection');
    await page.click('text=Data Viewer');
    await page.selectOption('select[name="table"]', 'users');
  });

  test('should display table data', async ({ page }) => {
    // Wait for data to load
    await expect(page.locator('table')).toBeVisible();

    // Verify columns
    await expect(page.locator('th:has-text("id")')).toBeVisible();
    await expect(page.locator('th:has-text("name")')).toBeVisible();
    await expect(page.locator('th:has-text("email")')).toBeVisible();
  });

  test('should filter data', async ({ page }) => {
    // Enter filter
    await page.fill('input[placeholder="Filter..."]', 'john');

    // Wait for filtered results
    await page.waitForTimeout(500); // Debounce

    // Verify filtered results
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount({ min: 1 });
    await expect(rows.first()).toContainText('john');
  });

  test('should edit cell inline', async ({ page }) => {
    // Double-click cell to edit
    const cell = page.locator('tbody tr:first-child td:nth-child(2)');
    await cell.dblclick();

    // Edit value
    const input = page.locator('input[type="text"]');
    await input.fill('Updated Name');
    await page.keyboard.press('Enter');

    // Verify update
    await expect(page.locator('text=Successfully updated')).toBeVisible();
  });

  test('should paginate data', async ({ page }) => {
    // Verify pagination controls
    await expect(page.locator('button:has-text("Next")')).toBeVisible();

    // Click next page
    await page.click('button:has-text("Next")');

    // Verify page change
    await expect(page.locator('text=Page 2')).toBeVisible();
  });
});
```

### Page Object Pattern

```typescript
// tests/page-objects/ConnectionPage.ts
import { Page, Locator } from '@playwright/test';

export class ConnectionPage {
  readonly page: Page;
  readonly newConnectionButton: Locator;
  readonly nameInput: Locator;
  readonly hostInput: Locator;
  readonly portInput: Locator;
  readonly userInput: Locator;
  readonly passwordInput: Locator;
  readonly testConnectionButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newConnectionButton = page.locator('button:has-text("New Connection")');
    this.nameInput = page.locator('input[name="name"]');
    this.hostInput = page.locator('input[name="host"]');
    this.portInput = page.locator('input[name="port"]');
    this.userInput = page.locator('input[name="user"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.testConnectionButton = page.locator('button:has-text("Test Connection")');
    this.saveButton = page.locator('button:has-text("Save")');
  }

  async goto() {
    await this.page.goto('/connections');
  }

  async createConnection(config: {
    name: string;
    host: string;
    port: string;
    user: string;
    password: string;
  }) {
    await this.newConnectionButton.click();
    await this.nameInput.fill(config.name);
    await this.hostInput.fill(config.host);
    await this.portInput.fill(config.port);
    await this.userInput.fill(config.user);
    await this.passwordInput.fill(config.password);
  }

  async testConnection() {
    await this.testConnectionButton.click();
    await this.page.waitForSelector('text=Connection successful');
  }

  async save() {
    await this.saveButton.click();
  }
}

// Usage
test('create connection using page object', async ({ page }) => {
  const connectionPage = new ConnectionPage(page);
  await connectionPage.goto();
  await connectionPage.createConnection({
    name: 'Test',
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'password',
  });
  await connectionPage.testConnection();
  await connectionPage.save();
});
```

## API Testing

### Testing Express Routes

```typescript
// server/routes/__tests__/query.test.ts
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../index';

describe('Query API', () => {
  let connectionId: string;

  beforeAll(async () => {
    // Setup test connection
    const response = await request(app)
      .post('/api/connections')
      .send({
        name: 'Test',
        host: 'localhost',
        port: 3306,
        user: 'test',
        password: 'test',
      });
    connectionId = response.body.data.id;
  });

  afterAll(async () => {
    // Cleanup
    await request(app).delete(`/api/connections/${connectionId}`);
  });

  it('should execute SELECT query', async () => {
    const response = await request(app)
      .post('/api/query/execute')
      .send({
        connectionId,
        query: 'SELECT * FROM users LIMIT 10',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rows).toBeInstanceOf(Array);
  });

  it('should return error for invalid query', async () => {
    const response = await request(app)
      .post('/api/query/execute')
      .send({
        connectionId,
        query: 'INVALID SQL',
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('should validate input', async () => {
    const response = await request(app).post('/api/query/execute').send({
      // Missing connectionId
      query: 'SELECT 1',
    });

    expect(response.status).toBe(400);
  });
});
```

## Test Organization

### Directory Structure

```
KumoDB/
├── src/
│   └── test/
│       ├── setup.ts                    # Test setup
│       ├── utils/                      # Test utilities
│       │   ├── test-utils.tsx          # Render helpers
│       │   └── helpers.test.ts         # Utility tests
│       ├── hooks/                      # Hook tests
│       │   └── useLocalStorage.test.ts
│       └── components/                 # Component tests
│           ├── Button.test.tsx
│           └── Input.test.tsx
├── tests/                              # E2E tests
│   ├── fixtures/                       # Test data
│   ├── page-objects/                   # Page objects
│   ├── main-app.spec.ts                # Smoke tests
│   ├── connections.spec.ts             # Connection tests
│   ├── query-editor.spec.ts            # Query editor tests
│   └── data-viewer.spec.ts             # Data viewer tests
└── server/
    └── routes/
        └── __tests__/                  # API tests
            ├── connections.test.ts
            └── query.test.ts
```

## Best Practices

### 1. Test Naming Conventions

```typescript
describe('ComponentName', () => {
  it('should do something when condition', () => {
    // Test implementation
  });

  it('should not do something when other condition', () => {
    // Test implementation
  });
});
```

### 2. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should update user name', async () => {
  // Arrange
  const user = { id: 1, name: 'John' };
  const newName = 'Jane';

  // Act
  const result = await updateUser(user.id, { name: newName });

  // Assert
  expect(result.name).toBe(newName);
});
```

### 3. Test Isolation

```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Reset database or mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
  });

  // Tests remain independent
});
```

### 4. Mock External Dependencies

```typescript
// Mock API calls
vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn(() => Promise.resolve([{ id: 1, name: 'John' }])),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

### 5. Test Coverage

Aim for high coverage in critical areas:

```bash
# Generate coverage report
npm run test:unit:coverage

# View report
open coverage/index.html
```

### 6. Snapshot Testing (Use Sparingly)

```typescript
it('renders correctly', () => {
  const { container } = render(<Button>Click me</Button>);
  expect(container).toMatchSnapshot();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run test:unit:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Patterns

### 1. Testing Async Operations

```typescript
it('should fetch data asynchronously', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### 2. Testing Error States

```typescript
it('should handle errors gracefully', async () => {
  const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

  await expect(fetchData()).rejects.toThrow('Network error');
});
```

### 3. Testing User Interactions

```typescript
it('should handle button click', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);

  await userEvent.click(screen.getByText('Click'));

  expect(handleClick).toHaveBeenCalled();
});
```

### 4. Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const handleSubmit = vi.fn();
  render(<LoginForm onSubmit={handleSubmit} />);

  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password123');
  await userEvent.click(screen.getByText('Login'));

  expect(handleSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

## Quick Reference

### Vitest Commands

```bash
npm run test:unit              # Run all unit tests
npm run test:unit:ui           # Run with UI
npm run test:unit:coverage     # Run with coverage
npm run test:unit:watch        # Watch mode
```

### Playwright Commands

```bash
npm run test                   # Run all E2E tests
npm run test:ui                # Interactive UI mode
npm run test:headed            # Headed mode
npm run test:debug             # Debug mode
npm run test:chrome            # Chrome only
npm run codegen                # Generate tests
npm run test:report            # View report
```

### Test Checklist

- [ ] Unit tests for utilities and helpers
- [ ] Component tests for UI components
- [ ] Integration tests for features
- [ ] E2E tests for critical workflows
- [ ] API tests for endpoints
- [ ] Error state testing
- [ ] Loading state testing
- [ ] Edge case testing
- [ ] Accessibility testing

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [architecture.md](architecture.md) - Architecture patterns
- [features.md](features.md) - Feature development
