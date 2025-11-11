import { Page, expect } from '@playwright/test';

export class TestUtils {
  static async waitForAppLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  }

  static async takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  static async fillForm(page: Page, formSelector: string, data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      const fieldSelector = `${formSelector} [name="${field}"]`;
      await page.fill(fieldSelector, value);
    }
  }

  static async clickButton(page: Page, buttonText: string): Promise<void> {
    await page.click(`button:has-text("${buttonText}")`);
  }

  static async waitForElement(page: Page, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  static async expectElementVisible(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toBeVisible();
  }

  static async expectElementHidden(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toBeHidden();
  }

  static async expectToastMessage(page: Page, message: string): Promise<void> {
    await expect(page.locator(`[data-testid="toast"]`, {
      hasText: message
    })).toBeVisible();
  }

  static async fillModalForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      const fieldSelector = `[data-testid="modal"] [name="${field}"]`;
      await page.fill(fieldSelector, value);
    }
  }

  static async expectModalVisible(page: Page): Promise<void> {
    await expect(page.locator('[data-testid="modal"]')).toBeVisible();
  }

  static async closeModal(page: Page): Promise<void> {
    await page.click('[data-testid="modal-close"]');
  }

  static async selectOption(page: Page, selectSelector: string, value: string): Promise<void> {
    await page.selectOption(selectSelector, value);
  }

  static async uploadFile(page: Page, fileInputSelector: string, filePath: string): Promise<void> {
    await page.setInputFiles(fileInputSelector, filePath);
  }

  static async dragAndDrop(page: Page, sourceSelector: string, targetSelector: string): Promise<void> {
    await page.dragAndDrop(sourceSelector, targetSelector);
  }

  static async executeSQL(page: Page, sql: string): Promise<void> {
    await page.fill('[data-testid="sql-editor"]', sql);
    await page.click('[data-testid="execute-sql"]');
  }

  static async expectDataInTable(page: Page, tableSelector: string, expectedData: string[]): Promise<void> {
    const table = page.locator(tableSelector);
    for (const data of expectedData) {
      await expect(table).toContainText(data);
    }
  }

  static async expectConnectionStatus(page: Page, connectionName: string, status: 'connected' | 'disconnected' | 'error'): Promise<void> {
    const statusSelector = `[data-testid="connection-${connectionName}"] [data-testid="connection-status"]`;
    await expect(page.locator(statusSelector)).toHaveAttribute('data-status', status);
  }

  static async addMockData(page: Page, tableName: string, count: number): Promise<void> {
    await page.click('[data-testid="generate-test-data"]');
    await page.selectOption('[data-testid="table-select"]', tableName);
    await page.fill('[data-testid="row-count"]', count.toString());
    await page.click('[data-testid="generate-button"]');
  }

  static async waitForQueryResult(page: Page, timeout = 10000): Promise<void> {
    await expect(page.locator('[data-testid="query-results"]')).toBeVisible({ timeout });
  }

  static async expectQueryError(page: Page, errorMessage: string): Promise<void> {
    await expect(page.locator('[data-testid="query-error"]')).toContainText(errorMessage);
  }

  static async createConnection(page: Page, connectionData: any): Promise<void> {
    await page.click('[data-testid="add-connection"]');
    await this.fillModalForm(page, {
      name: connectionData.name,
      host: connectionData.host,
      port: connectionData.port.toString(),
      database: connectionData.database,
      username: connectionData.username,
      password: connectionData.password,
    });
    
    if (connectionData.sshTunnel?.enabled) {
      await page.check('[name="sshTunnel.enabled"]');
      await this.fillModalForm(page, {
        'sshTunnel.host': connectionData.sshTunnel.host,
        'sshTunnel.port': connectionData.sshTunnel.port.toString(),
        'sshTunnel.username': connectionData.sshTunnel.username,
      });
    }
    
    await page.click('[data-testid="save-connection"]');
  }

  static async testConnection(page: Page, connectionName: string): Promise<void> {
    await page.click(`[data-testid="connection-${connectionName}"] [data-testid="test-connection"]`);
    await this.waitForElement(page, '[data-testid="test-result"]');
  }

  static async connectToDatabase(page: Page, connectionName: string, password?: string): Promise<void> {
    await page.click(`[data-testid="connection-${connectionName}"] [data-testid="connect"]`);
    if (password) {
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="password-submit"]');
    }
    await this.waitForElement(page, '[data-testid="database-connected"]');
  }

  static async executeNaturalLanguageQuery(page: Page, query: string): Promise<void> {
    await page.fill('[data-testid="natural-language-input"]', query);
    await page.click('[data-testid="generate-sql"]');
    await this.waitForElement(page, '[data-testid="generated-sql"]');
  }

  static async expectSchemaInTree(page: Page, databaseName: string, tableNames: string[]): Promise<void> {
    const databaseTree = page.locator(`[data-testid="schema-tree"] [data-testid="database-${databaseName}"]`);
    await expect(databaseTree).toBeVisible();
    
    for (const tableName of tableNames) {
      await expect(databaseTree).toContainText(tableName);
    }
  }

  static async toggleSchemaNode(page: Page, nodePath: string): Promise<void> {
    await page.click(`[data-testid="schema-node-${nodePath.replace('.', '-')}"]`);
  }

  static async expectTableStructure(page: Page, tableName: string, columns: string[]): Promise<void> {
    const tableStructure = page.locator(`[data-testid="table-structure-${tableName}"]`);
    await expect(tableStructure).toBeVisible();
    
    for (const column of columns) {
      await expect(tableStructure).toContainText(column);
    }
  }
}
