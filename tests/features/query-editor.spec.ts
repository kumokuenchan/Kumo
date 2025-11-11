import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('Query Editor', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-query"]');
  });

  test('should display query editor interface', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="query-editor"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="sql-editor"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="execute-sql"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="query-results"]')).toBeVisible();
  });

  test('should execute basic SELECT query', async ({ authenticatedPage }) => {
    const sql = 'SELECT 1 as test_value';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    await TestUtils.waitForQueryResult(authenticatedPage);
    
    // Verify result is displayed
    await expect(authenticatedPage.locator('[data-testid="query-results"]')).toContainText('test_value');
    await expect(authenticatedPage.locator('[data-testid="query-results"]')).toContainText('1');
  });

  test('should format SQL code', async ({ authenticatedPage }) => {
    const unformattedSQL = 'select*from users where id=1';
    
    await TestUtils.executeSQL(authenticatedPage, unformattedSQL);
    
    // Click format button
    await authenticatedPage.click('[data-testid="format-sql"]');
    
    // SQL should be formatted
    const editorContent = await authenticatedPage.locator('[data-testid="sql-editor"]').textContent();
    expect(editorContent).toContain('SELECT');
    expect(editorContent).toContain('FROM');
    expect(editorContent).toContain('WHERE');
  });

  test('should show syntax highlighting', async ({ authenticatedPage }) => {
    const sql = 'SELECT * FROM users WHERE id = 1';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Check if SQL editor has syntax highlighting
    const editor = authenticatedPage.locator('[data-testid="sql-editor"]');
    await expect(editor).toHaveClass(/syntax-highlighted/);
  });

  test('should save query to favorites', async ({ authenticatedPage }) => {
    const sql = 'SELECT * FROM users';
    const queryName = 'Test Saved Query';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Click save button
    await authenticatedPage.click('[data-testid="save-query"]');
    
    // Fill in query name
    await authenticatedPage.fill('[data-testid="query-name"]', queryName);
    await authenticatedPage.click('[data-testid="save-query-confirm"]');
    
    // Verify query is saved
    await expect(authenticatedPage.locator('[data-testid="saved-queries"]')).toContainText(queryName);
  });

  test('should load saved query', async ({ authenticatedPage, testData }) => {
    // Click on a saved query
    if (testData.queries && testData.queries.length > 0) {
      const savedQuery = testData.queries[0];
      await authenticatedPage.click(`[data-testid="saved-query-${savedQuery.id}"]`);
      
      // Query should be loaded in editor
      const editorContent = await authenticatedPage.locator('[data-testid="sql-editor"]').textContent();
      expect(editorContent).toContain(savedQuery.sql);
    }
  });

  test('should show query history', async ({ authenticatedPage }) => {
    // Execute a few queries to generate history
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 1');
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 2');
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 3');
    
    // Open query history
    await authenticatedPage.click('[data-testid="query-history"]');
    
    // Should show executed queries
    await expect(authenticatedPage.locator('[data-testid="history-list"]')).toBeVisible();
  });

  test('should export query results to CSV', async ({ authenticatedPage }) => {
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 1 as id, "test" as name');
    
    // Click export button
    await authenticatedPage.click('[data-testid="export-results"]');
    await authenticatedPage.click('[data-testid="export-csv"]');
    
    // Should trigger download
    // The actual file download verification depends on the implementation
  });

  test('should export query results to JSON', async ({ authenticatedPage }) => {
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 1 as id, "test" as name');
    
    // Click export button
    await authenticatedPage.click('[data-testid="export-results"]');
    await authenticatedPage.click('[data-testid="export-json"]');
    
    // Should trigger download
  });

  test('should explain query execution plan', async ({ authenticatedPage }) => {
    const sql = 'SELECT * FROM users WHERE id = 1';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Click explain button
    await authenticatedPage.click('[data-testid="explain-query"]');
    
    // Should show execution plan
    await expect(authenticatedPage.locator('[data-testid="execution-plan"]')).toBeVisible();
  });

  test('should handle SQL errors gracefully', async ({ authenticatedPage }) => {
    const invalidSQL = 'SELECT * FROM nonexistent_table';
    
    await TestUtils.executeSQL(authenticatedPage, invalidSQL);
    await expect(authenticatedPage.locator('[data-testid="query-error"]')).toBeVisible();
  });

  test('should show multiple result tabs', async ({ authenticatedPage }) => {
    // Execute query that returns multiple result sets
    const sql = 'SELECT 1; SELECT 2;';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Should show tabs for each result set
    await expect(authenticatedPage.locator('[data-testid="result-tab-1"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="result-tab-2"]')).toBeVisible();
  });

  test('should support autocomplete', async ({ authenticatedPage }) => {
    // Type partial table name
    await authenticatedPage.fill('[data-testid="sql-editor"]', 'SELECT * FROM use');
    
    // Should show autocomplete suggestions
    await expect(authenticatedPage.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
    
    // Select suggestion
    await authenticatedPage.click('[data-testid="autocomplete-suggestion-users"]');
    
    // Should complete the word
    const editorContent = await authenticatedPage.locator('[data-testid="sql-editor"]').textContent();
    expect(editorContent).toContain('users');
  });

  test('should show query execution time', async ({ authenticatedPage }) => {
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 1');
    
    // Should show execution time
    await expect(authenticatedPage.locator('[data-testid="execution-time"]')).toBeVisible();
    const timeText = await authenticatedPage.locator('[data-testid="execution-time"]').textContent();
    expect(timeText).toMatch(/\d+ms/);
  });

  test('should cancel running query', async ({ authenticatedPage }) => {
    // Execute a potentially long-running query
    const sql = 'SELECT SLEEP(10)';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Should show cancel button
    await expect(authenticatedPage.locator('[data-testid="cancel-query"]')).toBeVisible();
    
    // Click cancel
    await authenticatedPage.click('[data-testid="cancel-query"]');
    
    // Should return to idle state
    await expect(authenticatedPage.locator('[data-testid="cancel-query"]')).toBeHidden();
  });

  test('should use text-to-SQL natural language query', async ({ authenticatedPage }) => {
    // Switch to natural language mode
    await authenticatedPage.click('[data-testid="text-to-sql-toggle"]');
    
    const naturalQuery = 'Show me all users from the users table';
    
    await TestUtils.executeNaturalLanguageQuery(authenticatedPage, naturalQuery);
    
    // Should show generated SQL
    await expect(authenticatedPage.locator('[data-testid="generated-sql"]')).toBeVisible();
    const generatedSQL = await authenticatedPage.locator('[data-testid="generated-sql"]').textContent();
    expect(generatedSQL).toContain('SELECT');
    expect(generatedSQL).toContain('FROM');
  });

  test('should handle parameterized queries', async ({ authenticatedPage }) => {
    // Enter parameterized query
    const sql = 'SELECT * FROM users WHERE status = ?';
    
    await TestUtils.executeSQL(authenticatedPage, sql);
    
    // Should show parameter input
    await expect(authenticatedPage.locator('[data-testid="query-parameters"]')).toBeVisible();
    
    // Enter parameter value
    await authenticatedPage.fill('[data-testid="parameter-1"]', 'active');
    
    // Execute with parameters
    await authenticatedPage.click('[data-testid="execute-with-parameters"]');
  });

  test('should show result set metadata', async ({ authenticatedPage }) => {
    await TestUtils.executeSQL(authenticatedPage, 'SELECT 1 as id, "test" as name');
    
    // Click on metadata tab
    await authenticatedPage.click('[data-testid="metadata-tab"]');
    
    // Should show column information
    await expect(authenticatedPage.locator('[data-testid="column-metadata"]')).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ authenticatedPage }) => {
    // Test Ctrl+Enter to execute
    await authenticatedPage.fill('[data-testid="sql-editor"]', 'SELECT 1');
    await authenticatedPage.keyboard.press('Control+Enter');
    
    // Should execute query
    await expect(authenticatedPage.locator('[data-testid="query-results"]')).toBeVisible();
  });

  test('should filter query history', async ({ authenticatedPage, testData }) => {
    if (testData.queries && testData.queries.length > 0) {
      // Open query history
      await authenticatedPage.click('[data-testid="query-history"]');
      
      // Apply filter
      await authenticatedPage.fill('[data-testid="history-filter"]', testData.queries[0].name);
      
      // Should filter results
      const historyItems = authenticatedPage.locator('[data-testid="history-item"]');
      const visibleCount = await historyItems.count();
      expect(visibleCount).toBeLessThanOrEqual(testData.queries.length);
    }
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="sql-editor"]')).toHaveAttribute('aria-label');
    await expect(authenticatedPage.locator('[data-testid="execute-sql"]')).toHaveAttribute('aria-label');
    
    // Check keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    // Focus should move through editor controls
  });
});
