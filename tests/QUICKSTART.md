# Quick Start Guide - Playwright Testing

## Getting Started

### 1. Install Playwright Browsers

If you haven't already, install the Playwright browsers:

```bash
npm run test:install
```

This will install Chromium, Firefox, and WebKit browsers along with system dependencies.

### 2. Run Your First Test

Run all tests:

```bash
npm test
```

Or run tests in a specific browser:

```bash
npm run test:chrome
```

### 3. Run Tests in UI Mode

Launch the interactive UI:

```bash
npm run test:ui
```

This provides a visual interface to:
- See test results
- Run individual tests
- Debug tests
- View traces and screenshots

## Common Commands

### Run Specific Test Suite

```bash
# Test main application
npm run test:smoke

# Test connections
npm run test:connections

# Test query editor
npm run test:query

# Test schema browser
npm run test:schema

# Test data viewer
npm run test:data

# Test API tester
npm run test:api

# Test MongoDB features
npm run test:mongo

# Test performance monitoring
npm run test:performance

# Test visual regression
npm run test:visual

# Test accessibility
npm run test:accessibility
```

### Run Tests with Different Options

```bash
# Run in headed mode (see browser)
npm run test:headed

# Run with debug mode
npm run test:debug

# Run specific test file
npx playwright test connections.spec.ts

# Run test with grep pattern
npx playwright test -g "should create"
```

## View Test Results

After running tests, view the HTML report:

```bash
npm run test:report
```

The report includes:
- Test results and status
- Screenshots on failure
- Video recordings
- Trace viewer
- Failure details

## Debugging Tests

### Using Playwright Inspector

```bash
npm run test:debug
```

This launches the Playwright inspector where you can:
- Step through tests
- See what's happening in the browser
- Inspect selectors
- Execute commands interactively

### Using Browser Developer Tools

```bash
npm run test:headed
```

Run tests in headed mode and use browser dev tools (F12) to inspect elements.

### Generate Test Code

```bash
npm run codegen
```

This opens a browser where you can interact with your app and Playwright will generate test code for you.

## Test File Structure

```
tests/
├── features/              # Test specifications
│   ├── main-app.spec.ts           # 10+ tests
│   ├── connections.spec.ts        # 20+ tests
│   ├── query-editor.spec.ts       # 25+ tests
│   ├── schema-browser.spec.ts     # 30+ tests
│   ├── data-viewer.spec.ts        # 30+ tests
│   ├── api-tester.spec.ts         # 35+ tests
│   ├── mongodb.spec.ts            # 30+ tests
│   ├── performance.spec.ts        # 30+ tests
│   ├── visual-regression.spec.ts  # 20+ tests
│   └── accessibility.spec.ts      # 25+ tests
├── fixtures/             # Test setup
│   ├── base.fixture.ts
│   └── auth.setup.ts
├── utils/               # Test utilities
│   └── test-utils.ts
├── data/               # Mock data
│   ├── connections.json
│   ├── queries.json
│   └── schema.json
└── README.md          # Detailed documentation
```

## Test Coverage

The test suite covers:

✅ **Main Application**
- Navigation
- Settings
- Authentication
- Keyboard shortcuts
- Responsive design

✅ **Connection Management**
- CRUD operations
- SSH tunneling
- Import/export
- Validation

✅ **Query Editor**
- SQL execution
- Formatting
- Autocomplete
- Text-to-SQL
- Export

✅ **Schema Browser**
- Tree navigation
- Table operations
- Relationships
- SQL generation

✅ **Data Viewer**
- Data grid
- Editing
- Filtering
- Export

✅ **API Tester**
- HTTP requests
- Collections
- Environments
- Import cURL

✅ **MongoDB**
- Connection management
- CRUD operations
- Aggregation
- Indexes

✅ **Performance**
- Real-time metrics
- Slow query analysis
- System monitoring
- Alerts

✅ **Visual Regression**
- Screenshots
- Layout testing
- Mobile/tablet views

✅ **Accessibility**
- ARIA attributes
- Keyboard navigation
- Screen reader support
- WCAG compliance

## Tips

### 1. Use the UI Mode
```bash
npm run test:ui
```
Best way to explore and debug tests interactively.

### 2. Run Specific Tests
```bash
npx playwright test -g "create connection"
```
Run only tests matching the pattern.

### 3. Debug Failing Tests
```bash
npx playwright test --debug --project=chromium
```
Debug in slow motion with the inspector.

### 4. View Traces
```bash
npx playwright show-trace trace.zip
```
Analyze test execution step by step.

### 5. Use Test Utils
Leverage the `TestUtils` class for common operations:
```typescript
await TestUtils.createConnection(page, connectionData);
await TestUtils.executeSQL(page, 'SELECT * FROM users');
await TestUtils.expectElementVisible(page, '[data-testid="result"]');
```

### 6. Check Test Results
Always check the HTML report after running tests:
```bash
npm run test:report
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Playwright tests
  run: npm test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-report
    path: playwright-report
    retention-days: 30
```

## Troubleshooting

### Tests are timing out
- Increase timeout in playwright.config.ts
- Add explicit waits with `page.waitForSelector()`
- Check if the app is loading properly

### Elements not found
- Verify data-testid attributes exist
- Check if element is visible
- Ensure proper page state

### Authentication issues
- Check auth fixture setup
- Verify localStorage mocking
- Check authentication flow

### Flaky tests
- Add more explicit waits
- Use more stable selectors
- Check for race conditions

## Next Steps

1. Run the full test suite: `npm test`
2. Explore the UI mode: `npm run test:ui`
3. Read the detailed docs: `tests/README.md`
4. Start debugging: `npm run test:debug`
5. Generate test code: `npm run codegen`

## Need Help?

- Check `tests/README.md` for detailed documentation
- Use `npm run test:ui` for interactive debugging
- View the Playwright docs: https://playwright.dev/
- Check test results: `npm run test:report`

Happy Testing! 🎭
