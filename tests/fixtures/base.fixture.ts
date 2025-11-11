import { test as base, Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestFixtures {
  authenticatedPage: Page;
  testData: Record<string, any>;
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: [
    async ({ page }, use) => {
      // Ensure we're authenticated
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Check if we need to authenticate
      try {
        if (await page.locator('[data-testid="login-form"]').isVisible()) {
          // Mock authentication for testing
          await page.evaluate(() => {
            localStorage.setItem('authenticated', 'true');
            localStorage.setItem('user', JSON.stringify({
              id: 'test-user-1',
              name: 'Test User',
              email: 'test@example.com'
            }));
          });
          await page.reload();
          await page.waitForLoadState('networkidle');
        }
      } catch (error) {
        // If login form check fails, continue anyway
        console.log('Login form check failed, continuing...');
      }
      
      await use(page);
    },
    { auto: true },
  ],

  testData: [
    async ({}, use) => {
      // Load test data from JSON files
      const testDataPath = path.join(__dirname, '../data');
      const testData: Record<string, any> = {};
      
      // Load connection test data
      const connectionsDataPath = path.join(testDataPath, 'connections.json');
      if (fs.existsSync(connectionsDataPath)) {
        testData.connections = JSON.parse(fs.readFileSync(connectionsDataPath, 'utf8'));
      }
      
      // Load query test data
      const queriesDataPath = path.join(testDataPath, 'queries.json');
      if (fs.existsSync(queriesDataPath)) {
        testData.queries = JSON.parse(fs.readFileSync(queriesDataPath, 'utf8'));
      }
      
      // Load schema test data
      const schemaDataPath = path.join(testDataPath, 'schema.json');
      if (fs.existsSync(schemaDataPath)) {
        testData.schema = JSON.parse(fs.readFileSync(schemaDataPath, 'utf8'));
      }
      
      await use(testData);
    },
    { auto: true },
  ],
});

export { expect };
