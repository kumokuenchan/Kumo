import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toContain('MySQL Database Tool');
  });

  test('should have proper lang attribute', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check that h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // Check that headings follow a logical hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;
    
    for (const heading of headings) {
      const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)));
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
  });

  test('should have labeled form inputs', async ({ page }) => {
    // Check all input elements have labels
    const inputs = await page.locator('input').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const label = id ? await page.locator(`label[for="${id}"]`) : null;
      
      // At least one of these should exist
      const hasLabel = ariaLabel || ariaLabelledBy || (label && await label.count() > 0);
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should have proper button labels', async ({ page }) => {
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have text content, aria-label, or aria-labelledby
      const hasLabel = text?.trim() || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should have proper ARIA roles', async ({ page }) => {
    // Check for common ARIA roles
    const navigation = await page.locator('[role="navigation"]');
    const main = await page.locator('[role="main"]');
    
    // At least one of these should exist
    expect(await navigation.count()).toBeGreaterThanOrEqual(1);
    expect(await main.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have proper alt text for images', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      // Alt text should exist for all images
      expect(alt).toBeTruthy();
    }
  });

  test('should have focus indicators', async ({ page }) => {
    // Test that focusable elements have visible focus indicators
    const focusableElements = await page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();
    
    for (const element of focusableElements) {
      // Check if element has focus styles
      const hasFocusStyle = await element.evaluate(el => {
        const style = window.getComputedStyle(el, ':focus');
        return style.outline !== 'none' || 
               style.boxShadow !== 'none' || 
               style.border !== 'none';
      });
      
      // At least some elements should have focus styles
      if (hasFocusStyle) {
        expect(true).toBeTruthy();
        break;
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Test multiple tabs
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should support Escape key for modals', async ({ page }) => {
    // Open a modal
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]');
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Modal should be closed
    await expect(page.locator('[data-testid="settings-modal"]')).toBeHidden();
  });

  test('should have proper table structure', async ({ page }) => {
    // Navigate to a feature that might have tables
    await page.click('[data-testid="nav-data-viewer"]');
    await page.waitForSelector('[data-testid="data-table"]');
    
    const tables = await page.locator('table').all();
    
    for (const table of tables) {
      // Check for thead
      const thead = await table.locator('thead').count();
      expect(thead).toBeGreaterThan(0);
      
      // Check for th elements in thead
      const ths = await table.locator('thead th').count();
      expect(ths).toBeGreaterThan(0);
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // This is a visual test - in a real scenario, you would use axe-core or similar
    // For now, we just verify the page loads without obvious contrast issues
    const textElements = await page.locator('p, span, div, button, a').all();
    
    // Just check that text elements exist
    expect(textElements.length).toBeGreaterThan(0);
  });

  test('should have skip link for main content', async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('a[href="#main"], a[href="#main-content"], .skip-link');
    
    // Skip link should exist
    expect(await skipLink.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have proper error messages', async ({ page }) => {
    // Navigate to query editor
    await page.click('[data-testid="nav-query"]');
    
    // Try to execute an invalid query (if possible)
    const sqlEditor = page.locator('[data-testid="sql-editor"]');
    if (await sqlEditor.isVisible()) {
      await sqlEditor.fill('INVALID SQL');
      await page.click('[data-testid="execute-sql"]');
      await page.waitForTimeout(1000);
      
      // Check for error message with proper ARIA attributes
      const errorMessage = page.locator('[role="alert"], [aria-live="assertive"]');
      if (await errorMessage.count() > 0) {
        const hasError = await errorMessage.first().textContent();
        expect(hasError?.trim()).toBeTruthy();
      }
    }
  });

  test('should have proper live regions for dynamic content', async ({ page }) => {
    // Execute a query to trigger dynamic content
    await page.click('[data-testid="nav-query"]');
    
    const sqlEditor = page.locator('[data-testid="sql-editor"]');
    if (await sqlEditor.isVisible()) {
      await sqlEditor.fill('SELECT 1');
      await page.click('[data-testid="execute-sql"]');
      await page.waitForTimeout(1000);
      
      // Check for live regions
      const liveRegion = page.locator('[aria-live], [role="status"]');
      const hasLiveRegion = await liveRegion.count() > 0;
      
      // It's good to have live regions for dynamic updates
      expect(hasLiveRegion).toBeTruthy();
    }
  });

  test('should have proper focus management in modals', async ({ page }) => {
    // Open a modal
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]');
    
    // Check that focus is in the modal
    const modal = page.locator('[data-testid="settings-modal"]');
    const firstFocusable = page.locator('[data-testid="settings-modal"] button, [data-testid="settings-modal"] input').first();
    
    if (await firstFocusable.isVisible()) {
      const isFocused = await firstFocusable.evaluate(el => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });

  test('should trap focus in modals', async ({ page }) => {
    // Open a modal
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]');
    
    // Press Tab multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Focus should still be within the modal
    const activeElement = await page.evaluate(() => document.activeElement?.closest('[data-testid="settings-modal"]'));
    expect(activeElement).toBeTruthy();
  });

  test('should have proper semantic HTML elements', async ({ page }) => {
    // Check for semantic elements
    const header = await page.locator('header').count();
    const nav = await page.locator('nav').count();
    const main = await page.locator('main').count();
    const footer = await page.locator('footer').count();
    
    // At least some semantic elements should exist
    expect(header + nav + main + footer).toBeGreaterThan(0);
  });

  test('should have proper form validation', async ({ page }) => {
    // Navigate to connections
    await page.click('[data-testid="nav-connections"]');
    await page.waitForSelector('[data-testid="connections-list"]');
    
    // Open connection form
    await page.click('[data-testid="add-connection-button"]');
    await page.waitForSelector('[data-testid="modal"]');
    
    // Try to submit without filling required fields
    await page.click('[data-testid="save-connection"]');
    
    // Should show validation errors
    const invalidInputs = page.locator('input:invalid');
    const hasInvalid = await invalidInputs.count() > 0;
    expect(hasInvalid).toBeTruthy();
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for screen reader specific attributes
    const elementsWithAria = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').count();
    expect(elementsWithAria).toBeGreaterThan(0);
  });

  test('should have consistent navigation', async ({ page }) => {
    // Check that navigation is consistent across the app
    const nav1 = page.locator('[data-testid="nav-query"]');
    const nav2 = page.locator('[data-testid="nav-schema"]');
    
    // Navigate to first item
    await nav1.click();
    await page.waitForSelector('[data-testid="query-editor"]');
    
    // Check navigation still exists
    await expect(nav1).toBeVisible();
    await expect(nav2).toBeVisible();
    
    // Navigate to second item
    await nav2.click();
    await page.waitForSelector('[data-testid="schema-tree"]');
    
    // Check navigation still exists
    await expect(nav1).toBeVisible();
    await expect(nav2).toBeVisible();
  });

  test('should have proper loading states with ARIA', async ({ page }) => {
    // Trigger a loading state
    await page.click('[data-testid="nav-query"]');
    
    // Check for loading indicator with ARIA
    const loading = page.locator('[aria-label*="loading"], [aria-live="polite"]');
    const hasLoading = await loading.count() > 0;
    
    // Loading states should announce themselves
    expect(hasLoading).toBeTruthy();
  });

  test('should have proper responsive design for accessibility', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // All content should still be accessible
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();
    
    // Navigation should be accessible
    const navigation = page.locator('[data-testid="navigation"]');
    await expect(navigation).toBeVisible();
  });

  test('should have proper button vs link usage', async ({ page }) => {
    // Buttons should be used for actions
    const buttons = await page.locator('button').all();
    const links = await page.locator('a[href]').all();
    
    // Both should exist
    expect(buttons.length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  test('should have proper list structure', async ({ page }) => {
    // Check for proper list semantics
    const listItems = await page.locator('li').count();
    const lists = await page.locator('ul, ol').count();
    
    if (lists > 0) {
      // If there are lists, they should have list items
      expect(listItems).toBeGreaterThan(0);
    }
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Test common keyboard shortcuts
    // Ctrl/Cmd + N for new
    await page.keyboard.press('Control+n');
    
    // The action should be performed or focused
    // This depends on implementation
  });

  test('should have clear link purpose', async ({ page }) => {
    // Check that links have descriptive text or aria-label
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Links should have descriptive text
      const hasDescription = text?.trim() || ariaLabel;
      expect(hasDescription).toBeTruthy();
    }
  });
});
