import { test, expect } from '@playwright/test';

test.describe('Connections - Simple Tests', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // Wait for the app to load
    await expect(page.getByText('Connections')).toBeVisible();
    console.log('✅ Page loaded successfully');
  });

  test('should show connections section', async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // Look for connections section
    const connectionsHeading = page.getByRole('heading', { name: 'Connections' });
    await expect(connectionsHeading).toBeVisible();
    console.log('✅ Connections section visible');
  });

  test('should show New button', async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // Look for the New button
    const newButton = page.getByRole('button', { name: 'New' });
    await expect(newButton).toBeVisible();
    console.log('✅ New button visible');
  });

  test('should open connection form when New button is clicked', async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // Click the New button
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check if modal opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Check if form fields are present
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="host"]')).toBeVisible();
    await expect(page.locator('[name="port"]')).toBeVisible();
    await expect(page.locator('[name="database"]')).toBeVisible();
    await expect(page.locator('[name="username"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    
    console.log('✅ Connection form opened successfully');
  });
});