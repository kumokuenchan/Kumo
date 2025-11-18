import { test, expect } from '@playwright/test';

test.describe('Connections - Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  test('1. should display connections section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
  });

  test('2. should display connections list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
    await expect(page.getByText('test')).toBeVisible();
    await expect(page.getByText('veltra')).toBeVisible();
  });

  test('3. should show New button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
  });

  test('4. should open connection form when New button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'New' }).click();
    
    // Wait for modal to appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Check form fields
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="host"]')).toBeVisible();
    await expect(page.locator('[name="port"]')).toBeVisible();
  });

  test('5. should show connection action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible();
  });

  test('6. should display connection details', async ({ page }) => {
    await expect(page.getByText('MySQL - localhost:3306')).toBeVisible();
  });

  test('7. should show connection status', async ({ page }) => {
    await expect(page.getByText('Disconnected')).toBeVisible();
  });

  test('8. should show group presets', async ({ page }) => {
    await expect(page.getByText('Presets:')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
  });

  test('9. should show main welcome content', async ({ page }) => {
    await expect(page.getByText('Welcome to Kumo DB')).toBeVisible();
    await expect(page.getByText('Create or select a connection to get started')).toBeVisible();
  });

  test('10. should open edit form when edit button is clicked', async ({ page }) => {
    await page.getByTitle('Edit connection').first().click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page.locator('[name="name"]')).toBeVisible();
  });

  test('11. should show delete confirmation when delete button is clicked', async ({ page }) => {
    await page.getByTitle('Delete connection').first().click();
    
    await expect(page.getByText('Delete Connection')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to delete/)).toBeVisible();
  });
});