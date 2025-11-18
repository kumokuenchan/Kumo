import { test, expect } from '@playwright/test';

test.describe('Connections Management - Final Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  test('1. Display connections section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
  });

  test('2. Display connections list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
    await expect(page.getByText('test')).toBeVisible();
    await expect(page.getByText('veltra')).toBeVisible();
  });

  test('3. Show New button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
  });

  test('4. Open connection form', async ({ page }) => {
    await page.getByRole('button', { name: 'New' }).click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    await expect(page.locator('[name="name"]')).toBeVisible();
    await expect(page.locator('[name="host"]')).toBeVisible();
    await expect(page.locator('[name="port"]')).toBeVisible();
  });

  test('5. Show action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible();
  });

  test('6. Show connection details', async ({ page }) => {
    await expect(page.getByText('MySQL - localhost:3306')).toBeVisible();
  });

  test('7. Show status', async ({ page }) => {
    await expect(page.getByText('Disconnected')).toBeVisible();
  });

  test('8. Show presets', async ({ page }) => {
    await expect(page.getByText('Presets:')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
  });

  test('9. Show welcome content', async ({ page }) => {
    await expect(page.getByText('Welcome to Kumo DB')).toBeVisible();
  });

  test('10. Open edit form', async ({ page }) => {
    await page.getByTitle('Edit connection').first().click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
  });

  test('11. Show delete confirmation', async ({ page }) => {
    await page.getByTitle('Delete connection').first().click();
    
    await expect(page.getByText('Delete Connection')).toBeVisible();
  });
});