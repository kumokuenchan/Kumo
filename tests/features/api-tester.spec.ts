import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('API Tester', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-api-tester"]');
  });

  test('should display API tester interface', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="api-tester"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="request-url"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="send-request"]')).toBeVisible();
  });

  test('should select HTTP method', async ({ authenticatedPage }) => {
    // Test GET method
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveValue('GET');
    
    // Test POST method
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'POST');
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveValue('POST');
    
    // Test PUT method
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'PUT');
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveValue('PUT');
    
    // Test DELETE method
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'DELETE');
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveValue('DELETE');
  });

  test('should send GET request', async ({ authenticatedPage }) => {
    // Set up GET request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://jsonplaceholder.typicode.com/posts/1');
    
    // Send request
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show loading state
    await expect(authenticatedPage.locator('[data-testid="request-loading"]')).toBeVisible();
    
    // Should show response
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toBeVisible();
  });

  test('should send POST request with JSON body', async ({ authenticatedPage }) => {
    // Set up POST request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'POST');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://jsonplaceholder.typicode.com/posts');
    
    // Add JSON body
    await authenticatedPage.fill('[data-testid="request-body"]', JSON.stringify({
      title: 'Test Post',
      body: 'This is a test',
      userId: 1
    }));
    
    // Send request
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show response
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toBeVisible();
  });

  test('should add request headers', async ({ authenticatedPage }) => {
    // Add header
    await authenticatedPage.click('[data-testid="add-header"]');
    
    // Fill header details
    await authenticatedPage.fill('[data-testid="header-name-0"]', 'Content-Type');
    await authenticatedPage.fill('[data-testid="header-value-0"]', 'application/json');
    
    // Add another header
    await authenticatedPage.click('[data-testid="add-header"]');
    await authenticatedPage.fill('[data-testid="header-name-1"]', 'Authorization');
    await authenticatedPage.fill('[data-testid="header-value-1"]', 'Bearer token123');
    
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/headers');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show response with headers
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toContainText('Content-Type');
  });

  test('should add query parameters', async ({ authenticatedPage }) => {
    // Add query parameter
    await authenticatedPage.click('[data-testid="add-param"]');
    
    // Fill parameter details
    await authenticatedPage.fill('[data-testid="param-name-0"]', 'userId');
    await authenticatedPage.fill('[data-testid="param-value-0"]', '1');
    
    // Add another parameter
    await authenticatedPage.click('[data-testid="add-param"]');
    await authenticatedPage.fill('[data-testid="param-name-1"]', 'status');
    await authenticatedPage.fill('[data-testid="param-value-1"]', 'active');
    
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show response with query params
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toContainText('userId');
  });

  test('should show response status code', async ({ authenticatedPage }) => {
    // Send successful request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/status/200');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show status code
    await expect(authenticatedPage.locator('[data-testid="response-status"]')).toBeVisible();
    const statusText = await authenticatedPage.locator('[data-testid="response-status"]').textContent();
    expect(statusText).toContain('200');
  });

  test('should show response headers', async ({ authenticatedPage }) => {
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/response-headers?Content-Type=application/json');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Click response headers tab
    await authenticatedPage.click('[data-testid="response-headers-tab"]');
    
    // Should show response headers
    await expect(authenticatedPage.locator('[data-testid="response-headers"]')).toBeVisible();
  });

  test('should format JSON response', async ({ authenticatedPage }) => {
    // Send request that returns JSON
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://jsonplaceholder.typicode.com/posts/1');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should format JSON response
    const responseBody = authenticatedPage.locator('[data-testid="response-body"]');
    await expect(responseBody).toContainText('{');
    await expect(responseBody).toContainText('}');
  });

  test('should import cURL command', async ({ authenticatedPage }) => {
    // Click import cURL button
    await authenticatedPage.click('[data-testid="import-curl"]');
    
    // Should show cURL input dialog
    await expect(authenticatedPage.locator('[data-testid="curl-input-dialog"]')).toBeVisible();
    
    // Paste cURL command
    const curlCommand = 'curl -X GET "https://httpbin.org/get" -H "Content-Type: application/json"';
    await authenticatedPage.fill('[data-testid="curl-input"]', curlCommand);
    
    // Import
    await authenticatedPage.click('[data-testid="import-curl-confirm"]');
    
    // Should populate request fields
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveValue('GET');
  });

  test('should save request to collections', async ({ authenticatedPage }) => {
    // Set up a request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    
    // Save request
    await authenticatedPage.click('[data-testid="save-request"]');
    
    // Should show save dialog
    await expect(authenticatedPage.locator('[data-testid="save-request-dialog"]')).toBeVisible();
    
    // Enter request name
    await authenticatedPage.fill('[data-testid="request-name"]', 'Test GET Request');
    
    // Save
    await authenticatedPage.click('[data-testid="save-request-confirm"]');
  });

  test('should load saved requests', async ({ authenticatedPage }) => {
    // Open saved requests
    await authenticatedPage.click('[data-testid="saved-requests"]');
    
    // Should show saved requests list
    await expect(authenticatedPage.locator('[data-testid="requests-list"]')).toBeVisible();
    
    // Click on a saved request
    const requestItem = authenticatedPage.locator('[data-testid="saved-request-item"]').first();
    await requestItem.click();
    
    // Should load request
    await expect(authenticatedPage.locator('[data-testid="request-url"]')).toHaveValue(/http/);
  });

  test('should organize requests in folders', async ({ authenticatedPage }) => {
    // Create folder
    await authenticatedPage.click('[data-testid="create-folder"]');
    await authenticatedPage.fill('[data-testid="folder-name"]', 'Test Folder');
    await authenticatedPage.click('[data-testid="create-folder-confirm"]');
    
    // Should show folder in sidebar
    await expect(authenticatedPage.locator('[data-testid="folder-Test-Folder"]')).toBeVisible();
  });

  test('should handle request timeout', async ({ authenticatedPage }) => {
    // Set timeout
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/delay/10');
    await authenticatedPage.fill('[data-testid="request-timeout"]', '5');
    
    // Send request
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show timeout error
    await expect(authenticatedPage.locator('[data-testid="error-message"]')).toContainText('timeout');
  });

  test('should show response time', async ({ authenticatedPage }) => {
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show response time
    await expect(authenticatedPage.locator('[data-testid="response-time"]')).toBeVisible();
    const timeText = await authenticatedPage.locator('[data-testid="response-time"]').textContent();
    expect(timeText).toMatch(/\d+ms/);
  });

  test('should handle request authentication', async ({ authenticatedPage }) => {
    // Add auth header
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/basic-auth/user/passwd');
    
    // Use basic auth
    await authenticatedPage.click('[data-testid="add-auth"]');
    await authenticatedPage.selectOption('[data-testid="auth-type"]', 'Basic Auth');
    await authenticatedPage.fill('[data-testid="auth-username"]', 'user');
    await authenticatedPage.fill('[data-testid="auth-password"]', 'passwd');
    
    // Send request
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show successful response
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toContainText('authenticated');
  });

  test('should export requests to Postman', async ({ authenticatedPage }) => {
    // Select requests to export
    await authenticatedPage.check('[data-testid="saved-request-item"] >> nth=0 >> input[type="checkbox"]');
    
    // Click export
    await authenticatedPage.click('[data-testid="export-postman"]');
    
    // Should trigger download
    // Verification depends on implementation
  });

  test('should view request history', async ({ authenticatedPage }) => {
    // Send a few requests
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Open history
    await authenticatedPage.click('[data-testid="request-history"]');
    
    // Should show history list
    await expect(authenticatedPage.locator('[data-testid="history-list"]')).toBeVisible();
    
    // Click on history item
    const historyItem = authenticatedPage.locator('[data-testid="history-item"]').first();
    await historyItem.click();
    
    // Should load request
  });

  test('should handle environment variables', async ({ authenticatedPage }) => {
    // Create environment
    await authenticatedPage.click('[data-testid="environments"]');
    await authenticatedPage.click('[data-testid="create-environment"]');
    await authenticatedPage.fill('[data-testid="env-name"]', 'Test Env');
    await authenticatedPage.fill('[data-testid="env-variable-0-name"]', 'baseUrl');
    await authenticatedPage.fill('[data-testid="env-variable-0-value"]', 'https://httpbin.org');
    await authenticatedPage.click('[data-testid="save-environment"]');
    
    // Select environment
    await authenticatedPage.selectOption('[data-testid="environment-selector"]', 'Test Env');
    
    // Use variable in URL
    await authenticatedPage.fill('[data-testid="request-url"]', '{{baseUrl}}/get');
    
    // Variable should be replaced
    await authenticatedPage.click('[data-testid="send-request"]');
  });

  test('should handle file uploads', async ({ authenticatedPage }) => {
    // Set up POST request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'POST');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/post');
    
    // Add file upload
    await authenticatedPage.click('[data-testid="add-file-param"]');
    await authenticatedPage.fill('[data-testid="param-name-0"]', 'file');
    await TestUtils.uploadFile(authenticatedPage, '[data-testid="file-input-0"]', 'test-file.txt');
    
    // Send request
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show response
    await expect(authenticatedPage.locator('[data-testid="response-body"]')).toBeVisible();
  });

  test('should validate response against schema', async ({ authenticatedPage }) => {
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://jsonplaceholder.typicode.com/posts/1');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Open schema validation
    await authenticatedPage.click('[data-testid="validate-schema"]');
    
    // Enter JSON schema
    await authenticatedPage.fill('[data-testid="schema-editor"]', JSON.stringify({
      type: 'object',
      properties: {
        userId: { type: 'number' },
        id: { type: 'number' },
        title: { type: 'string' }
      }
    }));
    
    // Validate
    await authenticatedPage.click('[data-testid="run-validation"]');
    
    // Should show validation result
    await expect(authenticatedPage.locator('[data-testid="validation-result"]')).toBeVisible();
  });

  test('should handle pre-request scripts', async ({ authenticatedPage }) => {
    // Add pre-request script
    await authenticatedPage.fill('[data-testid="pre-request-script"]', 'console.log("Running pre-request script")');
    
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Script should run (verification depends on implementation)
  });

  test('should handle test scripts', async ({ authenticatedPage }) => {
    // Add test script
    await authenticatedPage.fill('[data-testid="test-script"]', 'pm.test("Status code is 200", function () { pm.response.to.have.status(200); });');
    
    // Send request
    await authenticatedPage.selectOption('[data-testid="request-method"]', 'GET');
    await authenticatedPage.fill('[data-testid="request-url"]', 'https://httpbin.org/status/200');
    await authenticatedPage.click('[data-testid="send-request"]');
    
    // Should show test results
    await expect(authenticatedPage.locator('[data-testid="test-results"]')).toBeVisible();
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="request-method"]')).toHaveAttribute('aria-label');
    await expect(authenticatedPage.locator('[data-testid="request-url"]')).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    // Should move through form elements
  });
});
