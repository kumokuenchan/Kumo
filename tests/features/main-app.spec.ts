import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('Main Application', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
  });

  test('should load the main application', async ({ authenticatedPage }) => {
    // Wait for main app to be visible
    await expect(authenticatedPage.locator('[data-testid="main-app"]')).toBeVisible();
    
    // Check main navigation
    await expect(authenticatedPage.locator('[data-testid="navigation"]')).toBeVisible();
    
    // Check main content area
    await expect(authenticatedPage.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test('should show navigation menu with all features', async ({ authenticatedPage }) => {
    const navigationItems = [
      'Query',
      'Schema',
      'Data Viewer',
      'API Tester',
      'MongoDB',
      'Performance',
      'Connections'
    ];

    for (const item of navigationItems) {
      await expect(authenticatedPage.locator(`[data-testid="nav-${item.toLowerCase().replace(' ', '-')}"]`)).toBeVisible();
    }
  });

  test('should switch between different views', async ({ authenticatedPage }) => {
    // Test switching to Query view
    await authenticatedPage.click('[data-testid="nav-query"]');
    await expect(authenticatedPage.locator('[data-testid="query-editor"]')).toBeVisible();
    
    // Test switching to Schema view
    await authenticatedPage.click('[data-testid="nav-schema"]');
    await expect(authenticatedPage.locator('[data-testid="schema-tree"]')).toBeVisible();
    
    // Test switching to Data Viewer
    await authenticatedPage.click('[data-testid="nav-data-viewer"]');
    await expect(authenticatedPage.locator('[data-testid="data-viewer"]')).toBeVisible();
    
    // Test switching to API Tester
    await authenticatedPage.click('[data-testid="nav-api-tester"]');
    await expect(authenticatedPage.locator('[data-testid="api-tester"]')).toBeVisible();
  });

  test('should show settings/preferences modal', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="settings-button"]');
    await expect(authenticatedPage.locator('[data-testid="settings-modal"]')).toBeVisible();
    
    // Check settings categories
    await expect(authenticatedPage.locator('[data-testid="settings-general"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="settings-connections"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="settings-editor"]')).toBeVisible();
    
    // Close modal
    await authenticatedPage.click('[data-testid="settings-close"]');
    await expect(authenticatedPage.locator('[data-testid="settings-modal"]')).toBeHidden();
  });

  test('should display connection status indicator', async ({ authenticatedPage }) => {
    // Check if connection status indicator is visible
    await expect(authenticatedPage.locator('[data-testid="connection-status"]')).toBeVisible();
    
    // Status should show disconnected state initially
    const statusText = await authenticatedPage.locator('[data-testid="connection-status"]').textContent();
    expect(statusText).toMatch(/disconnected|not connected/i);
  });

  test('should show help/about modal', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="help-button"]');
    await expect(authenticatedPage.locator('[data-testid="help-modal"]')).toBeVisible();
    
    // Check help content
    await expect(authenticatedPage.locator('[data-testid="help-content"]')).toContainText('MySQL Database Tool');
    await expect(authenticatedPage.locator('[data-testid="help-content"]')).toContainText('version');
    
    await authenticatedPage.click('[data-testid="help-close"]');
    await expect(authenticatedPage.locator('[data-testid="help-modal"]')).toBeHidden();
  });

  test('should handle keyboard shortcuts', async ({ authenticatedPage }) => {
    // Test Ctrl+N for new query
    await authenticatedPage.keyboard.press('Control+n');
    // Should open new query or show query editor
    // This depends on the actual implementation
  });

  test('should show toast notifications', async ({ authenticatedPage }) => {
    // Trigger a test action that shows a toast
    await authenticatedPage.click('[data-testid="trigger-toast"]');
    await TestUtils.expectToastMessage(authenticatedPage, 'Test notification');
  });

  test('should be responsive on different screen sizes', async ({ authenticatedPage }) => {
    // Test desktop view (default)
    await expect(authenticatedPage.locator('[data-testid="main-app"]')).toBeVisible();
    
    // Test tablet view
    await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
    await expect(authenticatedPage.locator('[data-testid="main-app"]')).toBeVisible();
    
    // Test mobile view
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await expect(authenticatedPage.locator('[data-testid="main-app"]')).toBeVisible();
    
    // Reset to desktop
    await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should handle error states gracefully', async ({ authenticatedPage }) => {
    // Simulate a network error
    await authenticatedPage.route('**/api/**', route => {
      route.abort('internetdisconnected');
    });
    
    // Navigate to a feature that makes API calls
    await authenticatedPage.click('[data-testid="nav-connections"]');
    
    // Should show error state or handle gracefully
    await expect(authenticatedPage.locator('[data-testid="error-state"]')).toBeVisible();
    
    // Restore network
    await authenticatedPage.unroute('**/api/**');
  });
});
