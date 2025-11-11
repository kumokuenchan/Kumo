import { test, expect } from '@playwright/test';

test.describe('Connections - Basic Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await expect(page.getByText('Connections')).toBeVisible();
    console.log('✅ Page loaded successfully');
  });

  test('should show connections section and New button', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for connections section
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
    
    // Look for the New button
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    
    console.log('✅ Connections section and New button are visible');
  });
});