import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('main application layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of main app
    await expect(page).toHaveScreenshot('main-app.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('query editor interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to query editor
    await page.click('[data-testid="nav-query"]');
    await page.waitForSelector('[data-testid="query-editor"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('query-editor.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('schema browser interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to schema browser
    await page.click('[data-testid="nav-schema"]');
    await page.waitForSelector('[data-testid="schema-tree"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('schema-browser.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('data viewer interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to data viewer
    await page.click('[data-testid="nav-data-viewer"]');
    await page.waitForSelector('[data-testid="data-viewer"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('data-viewer.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('API tester interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to API tester
    await page.click('[data-testid="nav-api-tester"]');
    await page.waitForSelector('[data-testid="api-tester"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('api-tester.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('MongoDB interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to MongoDB
    await page.click('[data-testid="nav-mongodb"]');
    await page.waitForSelector('[data-testid="mongodb-manager"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('mongodb.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('performance dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to performance
    await page.click('[data-testid="nav-performance"]');
    await page.waitForSelector('[data-testid="performance-dashboard"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('performance-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('connections management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to connections
    await page.click('[data-testid="nav-connections"]');
    await page.waitForSelector('[data-testid="connections-list"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('connections.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('settings modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Open settings
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('settings-modal.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('table designer modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to schema
    await page.click('[data-testid="nav-schema"]');
    await page.waitForSelector('[data-testid="schema-tree"]');
    
    // Open table designer (right-click on database)
    const databaseNode = page.locator('[data-testid^="database-"]').first();
    if (await databaseNode.isVisible()) {
      await databaseNode.click({ button: 'right' });
      await page.waitForSelector('[data-testid="context-menu"]');
      await page.click('[data-testid="context-menu-create-table"]');
      await page.waitForSelector('[data-testid="table-designer"]');
      
      // Take screenshot
      await expect(page).toHaveScreenshot('table-designer.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('mobile layout (375px)', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('mobile-layout.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('tablet layout (768px)', async ({ page }) => {
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('tablet-layout.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dark theme (if applicable)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Toggle dark theme (if available)
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Take screenshot
      await expect(page).toHaveScreenshot('dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('query editor with results', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to query editor
    await page.click('[data-testid="nav-query"]');
    await page.waitForSelector('[data-testid="query-editor"]');
    
    // Execute a query (if possible)
    const sqlEditor = page.locator('[data-testid="sql-editor"]');
    if (await sqlEditor.isVisible()) {
      await sqlEditor.fill('SELECT 1 as test');
      await page.click('[data-testid="execute-sql"]');
      await page.waitForTimeout(1000);
      
      // Take screenshot with results
      await expect(page).toHaveScreenshot('query-editor-with-results.png', {
        fullPage: true,
        animations: 'disabled',
      });
    }
  });

  test('data viewer with table', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to data viewer
    await page.click('[data-testid="nav-data-viewer"]');
    await page.waitForSelector('[data-testid="data-viewer"]');
    
    // Select a table (if possible)
    const tableSelector = page.locator('[data-testid="table-selector"]');
    if (await tableSelector.isVisible()) {
      const optionCount = await tableSelector.locator('option').count();
      if (optionCount > 1) {
        await tableSelector.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Take screenshot with data
        await expect(page).toHaveScreenshot('data-viewer-with-data.png', {
          fullPage: true,
          animations: 'disabled',
        });
      }
    }
  });

  test('API tester with response', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to API tester
    await page.click('[data-testid="nav-api-tester"]');
    await page.waitForSelector('[data-testid="api-tester"]');
    
    // Set up a sample request
    await page.selectOption('[data-testid="request-method"]', 'GET');
    await page.fill('[data-testid="request-url"]', 'https://httpbin.org/get');
    await page.click('[data-testid="send-request"]');
    await page.waitForTimeout(2000);
    
    // Take screenshot with response
    await expect(page).toHaveScreenshot('api-tester-with-response.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('performance dashboard with metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to performance
    await page.click('[data-testid="nav-performance"]');
    await page.waitForSelector('[data-testid="performance-dashboard"]');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('performance-with-metrics.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('connection form modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to connections
    await page.click('[data-testid="nav-connections"]');
    await page.waitForSelector('[data-testid="connections-list"]');
    
    // Open connection form
    await page.click('[data-testid="add-connection-button"]');
    await page.waitForSelector('[data-testid="modal"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('connection-form.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('error state UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Force an error (e.g., network error)
    await page.route('**/api/**', route => {
      route.abort('internetdisconnected');
    });
    
    // Navigate to a feature that makes API calls
    await page.click('[data-testid="nav-connections"]');
    await page.waitForSelector('[data-testid="error-state"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('error-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('loading state UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to a feature
    await page.click('[data-testid="nav-query"]');
    
    // Take screenshot during navigation/loading
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('loading-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('toast notifications', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Trigger a toast notification
    await page.click('[data-testid="trigger-toast"]');
    await page.waitForSelector('[data-testid="toast"]');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('toast-notification.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});
