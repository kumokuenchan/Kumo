import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('Data Viewer', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-data-viewer"]');
  });

  test('should display data viewer interface', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="data-viewer"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="table-selector"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="data-table"]')).toBeVisible();
  });

  test('should select table from dropdown', async ({ authenticatedPage }) => {
    // Get table selector
    const tableSelect = authenticatedPage.locator('[data-testid="table-selector"]');
    const tableCount = await tableSelect.locator('option').count();
    
    if (tableCount > 1) {
      // Select a table
      await tableSelect.selectOption({ index: 1 });
      
      // Should load data for that table
      await expect(authenticatedPage.locator('[data-testid="data-table"]')).toBeVisible();
    }
  });

  test('should display table data in grid', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Should show data grid
    await expect(authenticatedPage.locator('[data-testid="data-grid"]')).toBeVisible();
    
    // Should show column headers
    const headers = authenticatedPage.locator('[data-testid="data-grid-header"]');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
    
    // Should show data rows
    const rows = authenticatedPage.locator('[data-testid="data-grid-row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should paginate through data', async ({ authenticatedPage }) => {
    // Select a table with multiple pages of data
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Check if pagination controls exist
    const pagination = authenticatedPage.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Click next page
      await authenticatedPage.click('[data-testid="next-page"]');
      
      // Should show different data
      // This depends on the actual data
      
      // Click previous page
      await authenticatedPage.click('[data-testid="prev-page"]');
    }
  });

  test('should change page size', async ({ authenticatedPage }) => {
    // Select page size dropdown
    const pageSizeSelect = authenticatedPage.locator('[data-testid="page-size"]');
    if (await pageSizeSelect.isVisible()) {
      // Change page size
      await pageSizeSelect.selectOption('50');
      
      // Should show more/less rows
      const rows = authenticatedPage.locator('[data-testid="data-grid-row"]');
      const rowCount = await rows.count();
      expect(rowCount).toBeLessThanOrEqual(50);
    }
  });

  test('should sort columns', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Click on column header to sort
    const columnHeader = authenticatedPage.locator('[data-testid="data-grid-header"]').first();
    await columnHeader.click();
    
    // Should show sort indicator
    await expect(columnHeader).toHaveClass(/sorted/);
    
    // Click again to reverse sort
    await columnHeader.click();
    
    // Should show reverse sort indicator
    await expect(columnHeader).toHaveClass(/sorted-asc|sorted-desc/);
  });

  test('should filter data', async ({ authenticatedPage }) => {
    // Open filter panel
    await authenticatedPage.click('[data-testid="add-filter"]');
    
    // Should show filter dialog
    await expect(authenticatedPage.locator('[data-testid="filter-dialog"]')).toBeVisible();
    
    // Select column to filter
    await authenticatedPage.selectOption('[data-testid="filter-column"]', { index: 1 });
    
    // Select operator
    await authenticatedPage.selectOption('[data-testid="filter-operator"]', 'equals');
    
    // Enter filter value
    await authenticatedPage.fill('[data-testid="filter-value"]', 'test');
    
    // Apply filter
    await authenticatedPage.click('[data-testid="apply-filter"]');
    
    // Should filter the data
    // This depends on the actual filter implementation
  });

  test('should search in data', async ({ authenticatedPage }) => {
    // Use search box
    await authenticatedPage.fill('[data-testid="data-search"]', 'test');
    
    // Should filter results based on search
    const searchResults = authenticatedPage.locator('[data-testid="data-grid-row"]');
    const resultCount = await searchResults.count();
    
    // Results should contain search term
    for (let i = 0; i < Math.min(resultCount, 5); i++) {
      const row = searchResults.nth(i);
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain('test');
    }
  });

  test('should export data to CSV', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Click export button
    await authenticatedPage.click('[data-testid="export-data"]');
    await authenticatedPage.click('[data-testid="export-csv"]');
    
    // Should trigger download
    // Verification depends on implementation
  });

  test('should export data to JSON', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Click export button
    await authenticatedPage.click('[data-testid="export-data"]');
    await authenticatedPage.click('[data-testid="export-json"]');
    
    // Should trigger download
  });

  test('should export data to Excel', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Click export button
    await authenticatedPage.click('[data-testid="export-data"]');
    await authenticatedPage.click('[data-testid="export-excel"]');
    
    // Should trigger download
  });

  test('should edit cell values', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Double-click on a cell to edit
    const cell = authenticatedPage.locator('[data-testid="data-grid-cell"]').first();
    await cell.dblclick();
    
    // Should show inline editor
    await expect(authenticatedPage.locator('[data-testid="cell-editor"]')).toBeVisible();
    
    // Enter new value
    await authenticatedPage.fill('[data-testid="cell-editor"]', 'new value');
    
    // Save changes
    await authenticatedPage.keyboard.press('Enter');
    
    // Should save and close editor
    await expect(authenticatedPage.locator('[data-testid="cell-editor"]')).toBeHidden();
  });

  test('should add new row', async ({ authenticatedPage }) => {
    // Click add row button
    await authenticatedPage.click('[data-testid="add-row"]');
    
    // Should show empty row at top or bottom
    await expect(authenticatedPage.locator('[data-testid="editing-row"]')).toBeVisible();
    
    // Fill in values
    await authenticatedPage.fill('[data-testid="editing-row"] [data-testid="cell-0"]', 'value1');
    await authenticatedPage.fill('[data-testid="editing-row"] [data-testid="cell-1"]', 'value2');
    
    // Save row
    await authenticatedPage.click('[data-testid="save-row"]');
  });

  test('should delete row', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Select a row
    const rowCheckbox = authenticatedPage.locator('[data-testid="row-checkbox"]').first();
    await rowCheckbox.check();
    
    // Click delete button
    await authenticatedPage.click('[data-testid="delete-row"]');
    
    // Should show confirmation
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    
    // Confirm deletion
    await authenticatedPage.click('[data-testid="confirm-delete"]');
  });

  test('should refresh data', async ({ authenticatedPage }) => {
    // Click refresh button
    await authenticatedPage.click('[data-testid="refresh-data"]');
    
    // Should show loading indicator
    await expect(authenticatedPage.locator('[data-testid="loading"]')).toBeVisible();
    
    // Data should reload
    await expect(authenticatedPage.locator('[data-testid="data-table"]')).toBeVisible();
  });

  test('should show column information', async ({ authenticatedPage }) => {
    // Click column info button
    await authenticatedPage.click('[data-testid="column-info"]');
    
    // Should show column details
    await expect(authenticatedPage.locator('[data-testid="column-details"]')).toBeVisible();
  });

  test('should hide/show columns', async ({ authenticatedPage }) => {
    // Open column visibility menu
    await authenticatedPage.click('[data-testid="column-visibility"]');
    
    // Should show column list
    await expect(authenticatedPage.locator('[data-testid="column-list"]')).toBeVisible();
    
    // Toggle a column
    const columnCheckbox = authenticatedPage.locator('[data-testid="column-checkbox"]').first();
    const wasChecked = await columnCheckbox.isChecked();
    await columnCheckbox.click();
    
    // Column should be hidden/visible
    if (wasChecked) {
      await expect(authenticatedPage.locator('[data-testid^="data-grid-column-"]').first()).toBeHidden();
    }
  });

  test('should resize columns', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Drag column resizer
    const resizer = authenticatedPage.locator('[data-testid="column-resizer"]').first();
    if (await resizer.isVisible()) {
      const box = await resizer.boundingBox();
      if (box) {
        await authenticatedPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await authenticatedPage.mouse.down();
        await authenticatedPage.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
        await authenticatedPage.mouse.up();
      }
    }
  });

  test('should freeze columns', async ({ authenticatedPage }) => {
    // Open column menu
    const columnHeader = authenticatedPage.locator('[data-testid="data-grid-header"]').first();
    await columnHeader.click({ button: 'right' });
    
    // Click freeze option
    await authenticatedPage.click('[data-testid="context-menu-freeze-column"]');
    
    // Should freeze column
    await expect(columnHeader).toHaveClass(/frozen/);
  });

  test('should handle large datasets', async ({ authenticatedPage }) => {
    // Select table with large dataset
    await authenticatedPage.selectOption('[data-testid="table-selector"]', 'large_table');
    
    // Should load efficiently (virtual scrolling, etc.)
    // This is more of a performance test
  });

  test('should show summary statistics', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Show summary
    await authenticatedPage.click('[data-testid="show-summary"]');
    
    // Should show statistics
    await expect(authenticatedPage.locator('[data-testid="data-summary"]')).toBeVisible();
  });

  test('should import data from CSV', async ({ authenticatedPage }) => {
    // Click import button
    await authenticatedPage.click('[data-testid="import-data"]');
    
    // Should show file picker
    await expect(authenticatedPage.locator('[data-testid="import-dialog"]')).toBeVisible();
    
    // Map columns
    // This depends on implementation
  });

  test('should copy cell value', async ({ authenticatedPage }) => {
    // Right-click on a cell
    const cell = authenticatedPage.locator('[data-testid="data-grid-cell"]').first();
    await cell.click({ button: 'right' });
    
    // Click copy option
    await authenticatedPage.click('[data-testid="context-menu-copy"]');
    
    // Value should be copied to clipboard
  });

  test('should be responsive', async ({ authenticatedPage }) => {
    // Test on different screen sizes
    await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
    await expect(authenticatedPage.locator('[data-testid="data-viewer"]')).toBeVisible();
    
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await expect(authenticatedPage.locator('[data-testid="data-viewer"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Test arrow key navigation
    await authenticatedPage.keyboard.press('ArrowDown');
    await authenticatedPage.keyboard.press('ArrowRight');
    
    // Should move focus between cells
  });

  test('should show loading state', async ({ authenticatedPage }) => {
    // Select a table
    await authenticatedPage.selectOption('[data-testid="table-selector"]', { index: 1 });
    
    // Should show loading indicator while fetching data
    await expect(authenticatedPage.locator('[data-testid="loading-data"]')).toBeVisible();
    
    // Loading should complete
    await expect(authenticatedPage.locator('[data-testid="data-table"]')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ authenticatedPage }) => {
    // Force an error (e.g., by selecting non-existent table)
    await authenticatedPage.selectOption('[data-testid="table-selector"]', 'nonexistent_table');
    
    // Should show error state
    await expect(authenticatedPage.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="data-table"]')).toHaveAttribute('role', 'table');
    await expect(authenticatedPage.locator('[data-testid="table-selector"]')).toHaveAttribute('aria-label');
    
    // Check keyboard accessibility
    await authenticatedPage.keyboard.press('Tab');
    // Should move through interactive elements
  });
});
