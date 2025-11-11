# Playwright Testing Suite

## Overview

This project includes a comprehensive E2E testing suite using Playwright. The tests cover all major features of the MySQL Database Tool application, including:

- Main application functionality
- Connection management
- Query editor
- Schema browser
- Data viewer
- API tester
- MongoDB integration
- Performance monitoring
- Visual regression testing
- Accessibility testing

## Project Structure

```
tests/
├── features/               # Test specifications
│   ├── main-app.spec.ts   # Main application tests
│   ├── connections.spec.ts # Connection management tests
│   ├── query-editor.spec.ts # Query editor tests
│   ├── schema-browser.spec.ts # Schema browser tests
│   ├── data-viewer.spec.ts # Data viewer tests
│   ├── api-tester.spec.ts  # API tester tests
│   ├── mongodb.spec.ts     # MongoDB integration tests
│   ├── performance.spec.ts # Performance monitoring tests
│   ├── visual-regression.spec.ts # Visual regression tests
│   └── accessibility.spec.ts # Accessibility tests
├── fixtures/              # Test fixtures and setup
│   ├── base.fixture.ts    # Base test fixtures
│   └── auth.setup.ts      # Authentication setup
├── utils/                 # Test utilities
│   └── test-utils.ts      # Common test utilities
├── data/                  # Test data
│   ├── connections.json   # Sample connection data
│   ├── queries.json       # Sample queries
│   └── schema.json        # Sample schema data
└── components/            # Component tests (if any)
```

## Installation

The testing dependencies are already installed in your `package.json`:

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests in headed mode
```bash
npx playwright test --headed
```

### Run tests with debug mode
```bash
npx playwright test --debug
```

### Run specific test file
```bash
npx playwright test connections.spec.ts
```

### Run tests with grep pattern
```bash
npx playwright test -g "should create new connection"
```

### Run tests in CI mode
```bash
CI=true npx playwright test
```

## Test Configuration

The tests are configured in `playwright.config.ts`:

- **Test Directory**: `./tests`
- **Browsers**: Chrome, Firefox, Safari, Edge, Mobile Chrome, Mobile Safari
- **Parallel Execution**: Enabled
- **Reporters**: HTML (default)
- **Screenshots**: On failure
- **Videos**: On failure
- **Tracing**: On first retry

## Test Data

The test suite uses mock data located in `tests/data/`:

- **connections.json**: Sample MySQL connection configurations
- **queries.json**: Sample SQL queries
- **schema.json**: Sample database schema information

## Fixtures

### Base Fixture
The `base.fixture.ts` provides:
- **authenticatedPage**: Automatically authenticated page instance
- **testData**: Pre-loaded test data from JSON files

### Authentication
The test suite uses mock authentication:
- Automatically sets `localStorage` authentication flags
- Simulates logged-in user state
- No actual login required

## Utilities

The `TestUtils` class provides common testing methods:

```typescript
// Navigation
await TestUtils.waitForAppLoad(page);

// Forms
await TestUtils.fillForm(page, '[data-testid="form"]', { field1: 'value1' });
await TestUtils.fillModalForm(page, { field1: 'value1' });

// Assertions
await TestUtils.expectElementVisible(page, '[data-testid="element"]');
await TestUtils.expectToastMessage(page, 'Expected message');

// Data operations
await TestUtils.createConnection(page, connectionData);
await TestUtils.connectToDatabase(page, connectionName, password);
await TestUtils.executeSQL(page, 'SELECT * FROM users');

// Schema operations
await TestUtils.expectSchemaInTree(page, 'database_name', ['table1', 'table2']);
```

## Test Categories

### 1. Main Application Tests (`main-app.spec.ts`)
- Application loading
- Navigation between views
- Settings modal
- Connection status
- Keyboard shortcuts
- Toast notifications
- Responsive design
- Error handling

### 2. Connection Management (`connections.spec.ts`)
- Display connections list
- Create new connections
- Edit existing connections
- Delete connections
- Test connections
- Connect to databases
- SSH tunnel support
- Import/export
- Bulk actions
- Form validation
- Search and filtering

### 3. Query Editor (`query-editor.spec.ts`)
- SQL editor interface
- Execute queries
- SQL formatting
- Syntax highlighting
- Save/load queries
- Query history
- Export results (CSV, JSON)
- Query execution plan
- Error handling
- Multiple result sets
- Autocomplete
- Parameterized queries
- Text-to-SQL

### 4. Schema Browser (`schema-browser.spec.ts`)
- Schema tree view
- Expand/collapse nodes
- Table structure
- Column details
- Search functionality
- Filter by database
- Relationship diagrams
- SQL generation
- Data preview
- Table designer
- Table operations
- Indexes
- Foreign keys
- Schema synchronization
- Import/export

### 5. Data Viewer (`data-viewer.spec.ts`)
- Data grid display
- Table selection
- Pagination
- Sorting
- Filtering
- Search
- Export (CSV, JSON, Excel)
- Inline editing
- Add/delete rows
- Column management
- Large dataset handling
- Summary statistics

### 6. API Tester (`api-tester.spec.ts`)
- HTTP method selection
- Send requests
- Add headers
- Query parameters
- Response display
- cURL import
- Request collections
- Environment variables
- Authentication
- File uploads
- Schema validation
- Pre-request scripts
- Test scripts

### 7. MongoDB Integration (`mongodb.spec.ts`)
- MongoDB connections
- Database listing
- Collection listing
- Document viewing
- CRUD operations
- Aggregation
- Index management
- Validation rules
- Import/export
- Replica sets
- Sharded clusters
- User management
- Logging

### 8. Performance Monitoring (`performance.spec.ts`)
- Performance dashboard
- Connection metrics
- Query performance
- System metrics
- Slow query log
- Query analysis
- Process list
- Locks
- Buffer pool metrics
- InnoDB metrics
- Alerts
- Reports
- Comparison views

### 9. Visual Regression (`visual-regression.spec.ts`)
- Screenshots of all major views
- Mobile/tablet layouts
- Dark theme
- Error states
- Loading states
- Modal dialogs
- With data populated

### 10. Accessibility (`accessibility.spec.ts`)
- Page structure
- ARIA attributes
- Keyboard navigation
- Focus management
- Color contrast
- Screen reader support
- Semantic HTML
- Form validation
- Link purpose
- List structure

## Best Practices

### Writing Tests

1. **Use descriptive test names**:
   ```typescript
   test('should create new connection with SSH tunnel', async ({ page }) => {
     // Test implementation
   });
   ```

2. **Use data-testid attributes** for reliable element selection:
   ```typescript
   // Good
   await page.click('[data-testid="save-button"]');
   
   // Avoid
   await page.click('button:nth-child(2)');
   ```

3. **Use fixtures for setup**:
   ```typescript
   test.beforeEach(async ({ authenticatedPage }) => {
     await authenticatedPage.click('[data-testid="nav-connections"]');
   });
   ```

4. **Use utilities for common operations**:
   ```typescript
   // Good
   await TestUtils.createConnection(page, connectionData);
   
   // Avoid repetitive code
   ```

5. **Clean up after tests**:
   ```typescript
   test.afterEach(async ({ page }) => {
     // Cleanup if needed
   });
   ```

### Selectors

- **Prefer data-testid** for stable element selection
- **Avoid brittle selectors** (nth-child, complex CSS)
- **Use semantic queries** when appropriate:
  - `page.getByRole('button', { name: 'Save' })`
  - `page.getByLabel('Password')`

### Assertions

- **Use Playwright's built-in assertions**:
  ```typescript
  await expect(page.locator('[data-testid="result"]')).toBeVisible();
  await expect(page.locator('[data-testid="count"]')).toHaveText('10');
  ```

- **Wait for elements explicitly**:
  ```typescript
  await page.waitForSelector('[data-testid="loading"]');
  await expect(page.locator('[data-testid="loading"]')).toBeHidden();
  ```

### Timeouts

- Use appropriate timeouts:
  ```typescript
  await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });
  ```

## Debugging Tests

### Headed Mode
Run tests in headed mode to see the browser:
```bash
npx playwright test --headed
```

### Debug Mode
Use Playwright's debugger:
```bash
npx playwright test --debug
```

### Trace Viewer
View test traces in the HTML report:
```bash
npx playwright show-trace trace.zip
```

### Screenshot on Failure
Screenshots are automatically captured on test failures and saved to `test-results/`.

## Continuous Integration

### GitHub Actions Example
```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 30
```

## Reports

### HTML Report
After running tests, open the HTML report:
```bash
npx playwright show-report
```

The report includes:
- Test results
- Screenshots on failure
- Video recordings
- Trace viewer
- Failure analysis

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in config
   - Check for proper waits
   - Ensure page is loaded

2. **Flaky tests**
   - Add explicit waits
   - Check for proper cleanup
   - Use more stable selectors

3. **Element not found**
   - Verify data-testid attributes exist
   - Check for proper page state
   - Ensure element is visible

4. **Authentication issues**
   - Check auth fixture setup
   - Verify localStorage mocking
   - Check authentication flow

### Tips

- Use `page.pause()` to debug interactively
- Check the Playwright test runner output
- Review HTML report for failures
- Use browser developer tools
- Add screenshots for debugging

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use appropriate fixtures
3. Add data-testid attributes to new UI elements
4. Update this documentation
5. Run the full test suite
6. Ensure all tests pass

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test Documentation](https://playwright.dev/docs/test-intro)
- [Assertions Guide](https://playwright.dev/docs/test-assertions)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/test-configuration)
