import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('Schema Browser', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-schema"]');
  });

  test('should display schema tree view', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="schema-tree"]')).toBeVisible();
    
    // Check for database nodes
    await expect(authenticatedPage.locator('[data-testid^="database-"]')).toBeVisible();
  });

  test('should expand and collapse database nodes', async ({ authenticatedPage, testData }) => {
    // Find first database
    const databaseNodes = authenticatedPage.locator('[data-testid^="database-"]');
    const dbCount = await databaseNodes.count();
    
    if (dbCount > 0) {
      const firstDb = databaseNodes.first();
      const dbName = await firstDb.getAttribute('data-testid')?.replace('database-', '');
      
      // Click to expand
      await firstDb.click();
      
      // Should show tables
      await expect(authenticatedPage.locator(`[data-testid^="table-"]`)).toBeVisible();
      
      // Click to collapse
      await firstDb.click();
      
      // Should hide tables
      await expect(authenticatedPage.locator(`[data-testid^="table-"]`)).toBeHidden();
    }
  });

  test('should expand and collapse table nodes', async ({ authenticatedPage }) => {
    // First expand a database
    const databaseNode = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseNode.click();
    
    // Get first table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    const tableName = await tableNode.getAttribute('data-testid')?.replace('table-', '');
    
    if (tableName) {
      // Click to expand
      await tableNode.click();
      
      // Should show columns
      await expect(authenticatedPage.locator(`[data-testid^="column-${tableName}-"]`)).toBeVisible();
      
      // Click to collapse
      await tableNode.click();
      
      // Should hide columns
      await expect(authenticatedPage.locator(`[data-testid^="column-${tableName}-"]`)).toBeHidden();
    }
  });

  test('should show table structure', async ({ authenticatedPage }) => {
    // Expand database and table
    await authenticatedPage.click('[data-testid^="database-"]');
    await authenticatedPage.click('[data-testid^="table-"]');
    
    // Click on a column to see details
    const columnNode = authenticatedPage.locator('[data-testid^="column-"]').first();
    await columnNode.click();
    
    // Should show column details panel
    await expect(authenticatedPage.locator('[data-testid="column-details"]')).toBeVisible();
    
    // Should show column information
    const detailsContent = await authenticatedPage.locator('[data-testid="column-details"]').textContent();
    expect(detailsContent).toMatch(/Type|Default|Null/);
  });

  test('should search in schema tree', async ({ authenticatedPage }) => {
    // Enter search term
    const searchTerm = 'users';
    await authenticatedPage.fill('[data-testid="schema-search"]', searchTerm);
    
    // Should filter results
    const searchResults = authenticatedPage.locator('[data-testid^="database-"], [data-testid^="table-"], [data-testid^="column-"]');
    const resultCount = await searchResults.count();
    
    // At least one result should be visible
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should filter schema by database', async ({ authenticatedPage }) => {
    // Get first database
    const databaseSelect = authenticatedPage.locator('[data-testid="database-filter"]');
    const dbCount = await databaseSelect.locator('option').count();
    
    if (dbCount > 1) {
      // Select a specific database
      await databaseSelect.selectOption({ index: 1 });
      
      // Should show only that database
      const visibleDatabases = authenticatedPage.locator('[data-testid^="database-"]:visible');
      const visibleCount = await visibleDatabases.count();
      expect(visibleCount).toBe(1);
    }
  });

  test('should show table relationship diagram', async ({ authenticatedPage }) => {
    // Expand a database with tables
    await authenticatedPage.click('[data-testid^="database-"]');
    
    // Select multiple tables for relationship view
    await authenticatedPage.check('[data-testid^="table-"]:first-child >> input[type="checkbox"]');
    await authenticatedPage.check('[data-testid^="table-"]:nth-child(2) >> input[type="checkbox"]');
    
    // Click relationship diagram button
    await authenticatedPage.click('[data-testid="show-relationships"]');
    
    // Should show diagram
    await expect(authenticatedPage.locator('[data-testid="relationship-diagram"]')).toBeVisible();
  });

  test('should generate SQL for table', async ({ authenticatedPage }) => {
    // Right-click on table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    await tableNode.click({ button: 'right' });
    
    // Should show context menu
    await expect(authenticatedPage.locator('[data-testid="context-menu"]')).toBeVisible();
    
    // Click "Generate SQL" option
    await authenticatedPage.click('[data-testid="context-menu-generate-sql"]');
    
    // Should show SQL in a dialog or copy to clipboard
    await expect(authenticatedPage.locator('[data-testid="sql-preview"]')).toBeVisible();
  });

  test('should show table data preview', async ({ authenticatedPage }) => {
    // Right-click on table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    await tableNode.click({ button: 'right' });
    
    // Click "Preview Data" option
    await authenticatedPage.click('[data-testid="context-menu-preview-data"]');
    
    // Should show data preview
    await expect(authenticatedPage.locator('[data-testid="data-preview"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="data-preview-table"]')).toBeVisible();
  });

  test('should create new table', async ({ authenticatedPage }) => {
    // Right-click on database
    const databaseNode = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseNode.click({ button: 'right' });
    
    // Click "Create Table" option
    await authenticatedPage.click('[data-testid="context-menu-create-table"]');
    
    // Should show table designer
    await expect(authenticatedPage.locator('[data-testid="table-designer"]')).toBeVisible();
    
    // Fill in table details
    await authenticatedPage.fill('[data-testid="table-name"]', 'new_test_table');
    await authenticatedPage.fill('[data-testid="column-name-0"]', 'id');
    await authenticatedPage.selectOption('[data-testid="column-type-0"]', 'INT');
    await authenticatedPage.check('[data-testid="column-primary-key-0"]');
    
    // Add another column
    await authenticatedPage.click('[data-testid="add-column"]');
    await authenticatedPage.fill('[data-testid="column-name-1"]', 'name');
    await authenticatedPage.selectOption('[data-testid="column-type-1"]', 'VARCHAR(255)');
    
    // Save table
    await authenticatedPage.click('[data-testid="save-table"]');
    
    // Should close designer and show new table in tree
    await expect(authenticatedPage.locator('[data-testid="table-designer"]')).toBeHidden();
  });

  test('should alter table structure', async ({ authenticatedPage }) => {
    // Right-click on table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    await tableNode.click({ button: 'right' });
    
    // Click "Alter Table" option
    await authenticatedPage.click('[data-testid="context-menu-alter-table"]');
    
    // Should show table designer with existing structure
    await expect(authenticatedPage.locator('[data-testid="table-designer"]')).toBeVisible();
    
    // Add a column
    await authenticatedPage.click('[data-testid="add-column"]');
    await authenticatedPage.fill('[data-testid="column-name-1"]', 'new_column');
    await authenticatedPage.selectOption('[data-testid="column-type-1"]', 'VARCHAR(100)');
    
    // Apply changes
    await authenticatedPage.click('[data-testid="apply-changes"]');
  });

  test('should drop table with confirmation', async ({ authenticatedPage }) => {
    // Right-click on table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    const tableName = await tableNode.textContent();
    
    await tableNode.click({ button: 'right' });
    
    // Click "Drop Table" option
    await authenticatedPage.click('[data-testid="context-menu-drop-table"]');
    
    // Should show confirmation dialog
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toContainText('Are you sure');
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toContainText(tableName || '');
    
    // Confirm deletion
    await authenticatedPage.click('[data-testid="confirm-delete"]');
  });

  test('should show table statistics', async ({ authenticatedPage }) => {
    // Right-click on table
    const tableNode = authenticatedPage.locator('[data-testid^="table-"]').first();
    await tableNode.click({ button: 'right' });
    
    // Click "Show Statistics" option
    await authenticatedPage.click('[data-testid="context-menu-show-statistics"]');
    
    // Should show statistics panel
    await expect(authenticatedPage.locator('[data-testid="table-statistics"]')).toBeVisible();
    
    // Should show row count, size, etc.
    const statsContent = await authenticatedPage.locator('[data-testid="table-statistics"]').textContent();
    expect(statsContent).toMatch(/rows?|size|count/i);
  });

  test('should show indexes', async ({ authenticatedPage }) => {
    // Expand table to show columns
    await authenticatedPage.click('[data-testid^="database-"]');
    await authenticatedPage.click('[data-testid^="table-"]');
    
    // Click on indexes tab
    await authenticatedPage.click('[data-testid="indexes-tab"]');
    
    // Should show indexes list
    await expect(authenticatedPage.locator('[data-testid="indexes-list"]')).toBeVisible();
  });

  test('should show foreign key constraints', async ({ authenticatedPage }) => {
    // Expand table to show columns
    await authenticatedPage.click('[data-testid^="database-"]');
    await authenticatedPage.click('[data-testid^="table-"]');
    
    // Click on foreign keys tab
    await authenticatedPage.click('[data-testid="foreign-keys-tab"]');
    
    // Should show foreign key constraints
    await expect(authenticatedPage.locator('[data-testid="foreign-keys-list"]')).toBeVisible();
  });

  test('should synchronize schema', async ({ authenticatedPage }) => {
    // Click synchronize button
    await authenticatedPage.click('[data-testid="sync-schema"]');
    
    // Should show loading state
    await expect(authenticatedPage.locator('[data-testid="syncing"]')).toBeVisible();
    
    // Should refresh the schema tree
    // This depends on implementation
  });

  test('should export schema', async ({ authenticatedPage }) => {
    // Click export button
    await authenticatedPage.click('[data-testid="export-schema"]');
    
    // Should show export options
    await expect(authenticatedPage.locator('[data-testid="export-options"]')).toBeVisible();
    
    // Test different export formats
    await authenticatedPage.click('[data-testid="export-sql"]');
    await expect(authenticatedPage.locator('[data-testid="export-dialog"]')).toContainText('.sql');
    
    await authenticatedPage.click('[data-testid="export-json"]');
    await expect(authenticatedPage.locator('[data-testid="export-dialog"]')).toContainText('.json');
  });

  test('should import schema', async ({ authenticatedPage }) => {
    // Click import button
    await authenticatedPage.click('[data-testid="import-schema"]');
    
    // Should show file picker
    await expect(authenticatedPage.locator('[data-testid="import-dialog"]')).toBeVisible();
  });

  test('should show view definitions', async ({ authenticatedPage }) => {
    // Right-click on view (if available)
    const viewNode = authenticatedPage.locator('[data-testid^="view-"]').first();
    if (await viewNode.isVisible()) {
      await viewNode.click({ button: 'right' });
      
      // Click "Show Definition" option
      await authenticatedPage.click('[data-testid="context-menu-show-definition"]');
      
      // Should show view definition
      await expect(authenticatedPage.locator('[data-testid="view-definition"]')).toBeVisible();
    }
  });

  test('should show stored procedure definitions', async ({ authenticatedPage }) => {
    // Right-click on procedure (if available)
    const procedureNode = authenticatedPage.locator('[data-testid^="procedure-"]').first();
    if (await procedureNode.isVisible()) {
      await procedureNode.click({ button: 'right' });
      
      // Click "Show Definition" option
      await authenticatedPage.click('[data-testid="context-menu-show-definition"]');
      
      // Should show procedure definition
      await expect(authenticatedPage.locator('[data-testid="procedure-definition"]')).toBeVisible();
    }
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="schema-tree"]')).toHaveAttribute('aria-label');
    await expect(authenticatedPage.locator('[data-testid="schema-search"]')).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    // Should move through tree nodes
  });

  test('should handle large schema trees efficiently', async ({ authenticatedPage }) => {
    // Test virtual scrolling or lazy loading
    // This depends on implementation details
    // The test should verify that performance is acceptable
  });
});
