# Testing Guide

This document provides comprehensive information about testing the MySQL Database Tool application.

## Test Structure

The project uses **Vitest** as the primary testing framework with the following test organization:

```
src/
├── test/
│   ├── api/           # API module unit tests
│   ├── components/    # React component tests
│   ├── hooks/         # Custom hook tests
│   ├── utils/         # Utility function tests
│   └── setup.ts       # Test environment setup
```

## Running Tests

### Available Test Commands

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode (re-run on file changes)
npm run test:unit -- --watch

# Run tests with coverage report
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- --run src/test/api/connections.test.ts

# Run tests matching pattern
npm run test:unit -- --run -t "connections"

# Run tests in CI mode (single run, no watch)
npm run test:unit -- --run --reporter=verbose
```

### API Testing

Test all API modules with comprehensive coverage:

```bash
# Run all API tests
npm run test:unit -- --run src/test/api/

# Run specific API module tests
npm run test:unit -- --run src/test/api/connections.test.ts
npm run test:unit -- --run src/test/api/query.test.ts
npm run test:unit -- --run src/test/api/schema.test.ts
```

### Component Testing

Test React components:

```bash
# Run component tests
npm run test:unit -- --run src/test/components/

# Run specific component test
npm run test:unit -- --run src/test/components/ResultGrid.test.tsx
```

### Hook Testing

Test custom React hooks:

```bash
# Run hook tests
npm run test:unit -- --run src/test/hooks/

# Run specific hook test
npm run test:unit -- --run src/test/hooks/useConnection.test.ts
```

### Utility Testing

Test utility functions:

```bash
# Run utility tests
npm run test:unit -- --run src/test/utils/

# Run specific utility test
npm run test:unit -- --run src/test/utils/sqlFormatter.test.ts
```

## Test Configuration

### Vitest Configuration

The testing setup is configured in `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Environment Setup

The test setup file (`src/test/setup.ts`) configures:

- **jsdom environment** for DOM testing
- **Global test utilities** and matchers
- **Component testing utilities**
- **API mocking configuration**

## Testing Best Practices

### Writing Tests

1. **Use descriptive test names** that explain what is being tested
2. **Test both success and failure scenarios**
3. **Mock external dependencies** (API calls, database connections)
4. **Use proper assertions** to verify expected behavior
5. **Follow AAA pattern**: Arrange, Act, Assert

### Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { yourApi } from '../../api/yourApi';

describe('yourApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should handle success case', async () => {
      // Arrange
      const mockData = { success: true, data: 'test' };
      // Mock implementation...

      // Act
      const result = await yourApi.functionName();

      // Assert
      expect(result).toEqual(mockData);
    });

    it('should handle error case', async () => {
      // Arrange
      // Mock error implementation...

      // Act & Assert
      await expect(yourApi.functionName()).rejects.toThrow('Error message');
    });
  });
});
```

### Mocking Guidelines

1. **API calls**: Use `vi.mock()` for module-level mocking
2. **Fetch requests**: Use `global.fetch = vi.fn()` for fetch mocking
3. **Component props**: Provide minimal required props for testing
4. **State management**: Mock store states and actions

## Test Coverage

Generate coverage reports to ensure comprehensive testing:

```bash
# Generate coverage report
npm run test:unit -- --coverage

# View coverage in browser
open coverage/index.html
```

### Coverage Thresholds

The project aims for:
- **Statements**: >80%
- **Branches**: >70%
- **Functions**: >80%
- **Lines**: >80%

## Debugging Tests

### Debug Specific Test

```bash
# Run single test with debug output
npm run test:unit -- --run --reporter=verbose src/test/api/connections.test.ts
```

### Debug Failed Tests

```bash
# Run tests with detailed output
npm run test:unit -- --run --reporter=verbose

# Run in watch mode to debug interactively
npm run test:unit -- --watch
```

### Common Issues

1. **Import path errors**: Ensure relative paths are correct from test file
2. **Mock not resetting**: Use `vi.clearAllMocks()` in `beforeEach`
3. **Async test timeouts**: Increase timeout for slow operations
4. **Environment variables**: Mock in test setup if needed

## CI/CD Integration

Tests are automatically run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit -- --run --reporter=verbose
      - run: npm run test:unit -- --coverage
```

## Test Data and Fixtures

### Creating Test Data

1. **Use factory functions** for consistent test data
2. **Store fixtures** in `src/test/fixtures/`
3. **Mock API responses** with realistic data structures

### Example Fixture

```typescript
// src/test/fixtures/userData.ts
export const mockUser = {
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});
```

## Performance Testing

For performance-critical operations:

```typescript
it('should complete within time limit', async () => {
  const start = performance.now();
  await yourApi.expensiveOperation();
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(1000); // Should complete in < 1s
});
```

## Integration Testing

Test complete workflows:

```typescript
it('should handle full user workflow', async () => {
  // Test complete user journey
  // Create connection -> Execute query -> View results -> Export data
});
```

## Tips for Effective Testing

1. **Keep tests isolated** - Each test should be independent
2. **Use meaningful descriptions** - Test names should describe behavior
3. **Test edge cases** - Empty data, null values, large datasets
4. **Mock appropriately** - Focus on testing your code, not dependencies
5. **Maintain test files** - Keep tests updated with code changes
6. **Use constants** - Extract magic numbers/strings to constants
7. **Group related tests** - Use describe blocks for organization

## Troubleshooting

### Common Error Messages

- **"Module not found"**: Check import paths and file existence
- **"Test timeout"**: Increase timeout or optimize test performance
- **"Mock not called"**: Verify mock setup and test execution flow
- **"Assertion failed"**: Check expected vs actual values

### Getting Help

1. Check Vitest documentation: https://vitest.dev/
2. Review existing test patterns in the codebase
3. Use debugging tools: `console.log`, browser dev tools
4. Ask for help in team channels

---

This testing guide ensures comprehensive, maintainable, and effective testing practices for the MySQL Database Tool project.