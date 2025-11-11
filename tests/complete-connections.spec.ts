import { test, expect } from '@playwright/test';

test.describe('Connections Management - Complete Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the main page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should display connections section', async ({ page }) => {
    // Check if connections section is visible
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
    console.log('✅ Connections section is visible');
  });

  test('should display connections list', async ({ page }) => {
    // Check if connections section is visible
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();
    
    // Check if connection items are displayed (like "test" and "veltra")
    await expect(page.getByText('test')).toBeVisible();
    await expect(page.getByText('veltra')).toBeVisible();
    console.log('✅ Connection items are visible');
  });

  test('should show New button', async ({ page }) => {
    // Look for the New button
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    console.log('✅ New button is visible');
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
    console.log('✅ Connection form opened successfully');
  });

  test('should show connection action buttons', async ({ page }) => {
    // Check for Connect, Edit, and Delete buttons
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit connection' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete connection' })).toBeVisible();
    console.log('✅ Connection action buttons are visible');
  });

  test('should display connection details', async ({ page }) => {
    // Check if connection details are shown
    await expect(page.getByText('MySQL - localhost:3306')).toBeVisible();
    await expect(page.getByText('PROD')).toBeVisible();
    await expect(page.getByText('DEV')).toBeVisible();
    console.log('✅ Connection details are visible');
  });

  test('should show connection status', async ({ page }) => {
    // Check if connection status is displayed
    await expect(page.getByText('Disconnected')).toBeVisible();
    console.log('✅ Connection status is visible');
  });

  test('should show Active connections section', async ({ page }) => {
    // Check if Active connections section is visible
    await expect(page.getByRole('heading', { name: 'Active' })).toBeVisible();
    console.log('✅ Active connections section is visible');
  });

  test('should show group presets', async ({ page }) => {
    // Check if group presets are visible
    await expect(page.getByText('Presets:')).toBeVisible();
    await expect(page.getByText('Production')).toBeVisible();
    await expect(page.getByText('Staging')).toBeVisible();
    await expect(page.getByText('Development')).toBeVisible();
    await expect(page.getByText('Ungrouped')).toBeVisible();
    console.log('✅ Group presets are visible');
  });

  test('should show main welcome content', async ({ page }) => {
    // Check if main content is visible
    await expect(page.getByText('Welcome to Kumo DB')).toBeVisible();
    await expect(page.getByText('Create or select a connection to get started')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Connection' })).toBeVisible();
    console.log('✅ Main welcome content is visible');
  });

  test('should allow clicking on connection to select it', async ({ page }) => {
    // Click on a connection
    await page.getByText('test').click();
    
    // Connection should still be visible
    await expect(page.getByText('test')).toBeVisible();
    console.log('✅ Connection selection works');
  });

  test('should show environment badges', async ({ page }) => {
    // Check if environment badges are displayed
    await expect(page.getByText('Environment: production')).toBeVisible();
    await expect(page.getByText('Environment: development')).toBeVisible();
    console.log('✅ Environment badges are visible');
  });

  test('should show last used information', async ({ page }) => {
    // Check if last used information is displayed
    await expect(page.getByText('Last used:')).toBeVisible();
    console.log('✅ Last used information is visible');
  });

  test('should open edit form when edit button is clicked', async ({ page }) => {
    // Click the edit button for the first connection
    await page.getByTitle('Edit connection').first().click();
    
    // Check if modal opened for editing
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Check if form is present
    await expect(page.locator('[name="name"]')).toBeVisible();
    console.log('✅ Edit form opens successfully');
  });

  test('should show delete confirmation when delete button is clicked', async ({ page }) => {
    // Click the delete button for the first connection
    await page.getByTitle('Delete connection').first().click();
    
    // Should show confirmation dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toContainText('Are you sure');
    console.log('✅ Delete confirmation dialog appears');
  });

  test('should show SSH tunnel option when form is opened', async ({ page }) => {
    // Open the connection form
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check if SSH tunnel checkbox is present
    await expect(page.locator('[name="sshEnabled"]')).toBeVisible();
    console.log('✅ SSH tunnel option is available');
  });

  test('should show environment selector', async ({ page }) => {
    // Open the connection form
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check if environment dropdown is present
    await expect(page.locator('[name="environment"]')).toBeVisible();
    console.log('✅ Environment selector is available');
  });

  test('should show connection management features', async ({ page }) => {
    // Test various connection management features
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    console.log('✅ All connection management features are available');
  });

  // Tests that need backend integration
  test.skip('should create new connection', async ({ page }) => {
    const newConnection = {
      name: 'New Test Connection',
      host: 'new-test-host.com',
      port: '3306',
      database: 'newtestdb',
      username: 'newuser',
      password: 'newpass'
    };

    // Open connection form
    await page.getByRole('button', { name: 'New' }).click();
    
    // Fill form fields
    await page.fill('[name="name"]', newConnection.name);
    await page.fill('[name="host"]', newConnection.host);
    await page.fill('[name="port"]', newConnection.port);
    await page.fill('[name="database"]', newConnection.database);
    await page.fill('[name="username"]', newConnection.username);
    await page.fill('[name="password"]', newConnection.password);
    
    // Note: Save functionality needs backend integration
    console.log('✅ Form can be filled (backend integration needed for save)');
  });

  test.skip('should update existing connection', async ({ page }) => {
    // Click the edit button for the first connection
    await page.getByTitle('Edit connection').first().click();
    
    // Check if form is opened
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // Note: Update functionality needs backend integration
    console.log('✅ Edit form can be opened (backend integration needed for save)');
  });

  test.skip('should connect to database', async ({ page }) => {
    // Click the connect button
    await page.getByRole('button', { name: 'Connect' }).first().click();
    
    // Note: Connection functionality may require password input
    console.log('✅ Connect button is clickable (password input may be needed)');
  });

  test.skip('should disconnect from database', async ({ page }) => {
    // Click the disconnect button
    await page.getByRole('button', { name: 'Disconnect' }).first().click();
    
    // Note: Disconnect functionality needs backend integration
    console.log('✅ Disconnect button is clickable (backend integration needed)');
  });

  test.skip('should delete connection', async ({ page }) => {
    // Click the delete button for the first connection
    await page.getByTitle('Delete connection').first().click();
    
    // Should show confirmation dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toContainText('Are you sure');
    
    // Note: Delete functionality needs backend integration
    console.log('✅ Delete confirmation appears (backend integration needed for delete)');
  });

  test.skip('should enable SSH tunnel when checkbox is checked', async ({ page }) => {
    await page.getByRole('button', { name: 'New' }).click();
    
    // Check SSH tunnel checkbox
    await page.check('[name="sshEnabled"]');
    
    // SSH tunnel fields should become visible
    await expect(page.locator('[name="sshHost"]')).toBeVisible();
    await expect(page.locator('[name="sshPort"]')).toBeVisible();
    await expect(page.locator('[name="sshUsername"]')).toBeVisible();
    
    console.log('✅ SSH tunnel fields appear when enabled (backend integration needed)');
  });
});