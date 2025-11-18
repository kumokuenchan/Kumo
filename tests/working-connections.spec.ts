import { test, expect } from '@playwright/test';

test.describe('Connections Management - Complete Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the main page
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  test('should display connections section', async ({ page }) => {
    // Check if connections section is visible
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
  });

  test('should show New button', async ({ page }) => {
    // Look for the New button
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
  });

  test('should display connection items', async ({ page }) => {
    // Check if connection items are displayed (like "test" and "veltra")
    await expect(page.getByText('test')).toBeVisible();
    await expect(page.getByText('veltra')).toBeVisible();
  });

  test('should open connection form when New button is clicked', async ({ page }) => {
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
  });

  test('should show connection action buttons', async ({ page }) => {
    // Check for Connect, Edit, and Delete buttons
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit connection' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete connection' })).toBeVisible();
  });

  test('should display connection details', async ({ page }) => {
    // Check if connection details are shown
    await expect(page.getByText('MySQL - localhost:3306')).toBeVisible();
    await expect(page.getByText('PROD')).toBeVisible();
    await expect(page.getByText('DEV')).toBeVisible();
  });

  test('should show environment badges', async ({ page }) => {
    // Check if environment badges are displayed
    await expect(page.getByText('Environment: production')).toBeVisible();
    await expect(page.getByText('Environment: development')).toBeVisible();
  });

  test('should show connection status', async ({ page }) => {
    // Check if connection status is displayed
    await expect(page.getByText('Disconnected')).toBeVisible();
  });

  test('should show group presets', async ({ page }) => {
    // Check if group presets are visible
    await expect(page.getByText('Presets:')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
    await expect(page.getByText('Staging')).toBeVisible();
    await expect(page.getByText('Development')).toBeVisible();
    await expect(page.getByText('Ungrouped')).toBeVisible();
  });

  test('should show Active connections section', async ({ page }) => {
    // Check if Active connections section is visible
    await expect(page.getByRole('heading', { name: 'Active' })).toBeVisible();
  });

  test('should show main welcome content', async ({ page }) => {
    // Check if main content is visible
    await expect(page.getByText('Welcome to Kumo DB')).toBeVisible();
    await expect(page.getByText('Create or select a connection to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Connection' })).toBeVisible();
  });

  test('should allow clicking on connection to select it', async ({ page }) => {
    // Click on a connection
    await page.getByText('test').click();
    
    // Connection should still be visible
    await expect(page.getByText('test')).toBeVisible();
  });

  test('should open edit form when edit button is clicked', async ({ page }) => {
    // Click the edit button for the first connection
    await page.getByTitle('Edit connection').first().click();
    
    // Check if modal opened for editing
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Check if form is populated (the name field should contain "test" or "veltra")
    const nameField = page.locator('[name="name"]');
    await expect(nameField).toBeVisible();
  });

  test('should show delete confirmation when delete button is clicked', async ({ page }) => {
    // Click the delete button for the first connection
    await page.getByTitle('Delete connection').first().click();
    
    // Should show confirmation dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toContainText('Are you sure');
  });

  test('should open connection form from main page New Connection button', async ({ page }) => {
    // Click the "New Connection" button in main content
    await page.getByRole('button', { name: 'New Connection' }).click();
    
    // Check if modal opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
  });

  test('should show SSH tunnel option when enabled', async ({ page }) => {
    // Open the connection form
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check if SSH tunnel checkbox is present
    await expect(page.locator('[name="sshEnabled"]')).toBeVisible();
    
    // Click the SSH tunnel checkbox
    await page.check('[name="sshEnabled"]');
    
    // SSH tunnel fields should become visible
    await expect(page.locator('[name="sshHost"]')).toBeVisible();
    await expect(page.locator('[name="sshPort"]')).toBeVisible();
    await expect(page.locator('[name="sshUsername"]')).toBeVisible();
  });

  test('should show environment selector', async ({ page }) => {
    // Open the connection form
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check if environment dropdown is present
    await expect(page.locator('[name="environment"]')).toBeVisible();
  });
});