import { test, expect } from '../fixtures/base.fixture';

test.describe('Connections Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Start at the main page
    await authenticatedPage.goto('http://localhost:5173');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display connections section', async ({ authenticatedPage }) => {
    // Check if connections section is visible
    await expect(authenticatedPage.getByRole('heading', { name: 'Connections' })).toBeVisible();
  });

  test('should show New button', async ({ authenticatedPage }) => {
    // Look for the New button
    await expect(authenticatedPage.getByRole('button', { name: 'New' })).toBeVisible();
  });

  test('should open connection form when New button is clicked', async ({ authenticatedPage }) => {
    // Click the New button
    await authenticatedPage.getByRole('button', { name: 'New' }).click();
    
    // Check if modal opened
    const modal = authenticatedPage.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Check if form fields are present
    await expect(authenticatedPage.locator('[name="name"]')).toBeVisible();
    await expect(authenticatedPage.locator('[name="host"]')).toBeVisible();
  });

  test('should show connection action buttons', async ({ authenticatedPage }) => {
    // Check for Connect, Edit, and Delete buttons
    await expect(authenticatedPage.getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Edit connection' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Delete connection' })).toBeVisible();
  });

  test('should display connection details', async ({ authenticatedPage }) => {
    // Check if connection details are shown
    await expect(authenticatedPage.getByText('MySQL - localhost:3306')).toBeVisible();
  });

  test('should show main welcome content', async ({ authenticatedPage }) => {
    // Check if main content is visible
    await expect(authenticatedPage.getByText('Welcome to Kumo DB')).toBeVisible();
    await expect(authenticatedPage.getByText('Create or select a connection to get started')).toBeVisible();
  });
});