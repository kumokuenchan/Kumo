import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('MongoDB Integration', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-mongodb"]');
  });

  test('should display MongoDB interface', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="mongodb-manager"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="connection-list"]')).toBeVisible();
  });

  test('should connect to MongoDB', async ({ authenticatedPage }) => {
    // Click connect button
    await authenticatedPage.click('[data-testid="connect-mongodb"]');
    
    // Should show connection form
    await expect(authenticatedPage.locator('[data-testid="connection-form"]')).toBeVisible();
    
    // Fill connection details
    await authenticatedPage.fill('[data-testid="mongodb-host"]', 'localhost');
    await authenticatedPage.fill('[data-testid="mongodb-port"]', '27017');
    await authenticatedPage.fill('[data-testid="mongodb-database"]', 'testdb');
    await authenticatedPage.fill('[data-testid="mongodb-username"]', 'testuser');
    await authenticatedPage.fill('[data-testid="mongodb-password"]', 'testpass');
    
    // Test connection
    await authenticatedPage.click('[data-testid="test-connection"]');
    await expect(authenticatedPage.locator('[data-testid="test-result"]')).toBeVisible();
    
    // Save connection
    await authenticatedPage.click('[data-testid="save-connection"]');
  });

  test('should list databases', async ({ authenticatedPage }) => {
    // Assume connection is established
    await authenticatedPage.click('[data-testid="refresh-databases"]');
    
    // Should show database list
    await expect(authenticatedPage.locator('[data-testid="databases-list"]')).toBeVisible();
    
    // Should show database items
    const databaseItems = authenticatedPage.locator('[data-testid^="database-"]');
    const dbCount = await databaseItems.count();
    expect(dbCount).toBeGreaterThan(0);
  });

  test('should list collections', async ({ authenticatedPage }) => {
    // Click on a database
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    // Should show collections list
    await expect(authenticatedPage.locator('[data-testid="collections-list"]')).toBeVisible();
    
    // Should show collection items
    const collectionItems = authenticatedPage.locator('[data-testid^="collection-"]');
    const collectionCount = await collectionItems.count();
    expect(collectionCount).toBeGreaterThan(0);
  });

  test('should view collection documents', async ({ authenticatedPage }) => {
    // Expand database and collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Should show documents list
    await expect(authenticatedPage.locator('[data-testid="documents-list"]')).toBeVisible();
    
    // Should show document items
    const documentItems = authenticatedPage.locator('[data-testid^="document-"]');
    const documentCount = await documentItems.count();
    expect(documentCount).toBeGreaterThan(0);
  });

  test('should create new collection', async ({ authenticatedPage }) => {
    // Right-click on database
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click({ button: 'right' });
    
    // Click "Create Collection" option
    await authenticatedPage.click('[data-testid="context-menu-create-collection"]');
    
    // Should show create collection dialog
    await expect(authenticatedPage.locator('[data-testid="create-collection-dialog"]')).toBeVisible();
    
    // Enter collection name
    await authenticatedPage.fill('[data-testid="collection-name"]', 'new_collection');
    
    // Create
    await authenticatedPage.click('[data-testid="create-collection"]');
    
    // Should close dialog and show new collection
    await expect(authenticatedPage.locator('[data-testid="create-collection-dialog"]')).toBeHidden();
    await expect(authenticatedPage.locator('[data-testid="collection-new_collection"]')).toBeVisible();
  });

  test('should insert document', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click insert document button
    await authenticatedPage.click('[data-testid="insert-document"]');
    
    // Should show document editor
    await expect(authenticatedPage.locator('[data-testid="document-editor"]')).toBeVisible();
    
    // Enter JSON document
    const document = JSON.stringify({
      name: 'Test Document',
      value: 123,
      tags: ['test', 'mongodb']
    }, null, 2);
    
    await authenticatedPage.fill('[data-testid="document-json"]', document);
    
    // Insert
    await authenticatedPage.click('[data-testid="insert-document-confirm"]');
  });

  test('should update document', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Right-click on a document
    const documentItem = authenticatedPage.locator('[data-testid^="document-"]').first();
    await documentItem.click({ button: 'right' });
    
    // Click "Edit" option
    await authenticatedPage.click('[data-testid="context-menu-edit-document"]');
    
    // Should show document editor with existing data
    await expect(authenticatedPage.locator('[data-testid="document-editor"]')).toBeVisible();
    
    // Modify document
    await authenticatedPage.fill('[data-testid="document-json"]', 'updated document content');
    
    // Save
    await authenticatedPage.click('[data-testid="update-document"]');
  });

  test('should delete document', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Right-click on a document
    const documentItem = authenticatedPage.locator('[data-testid^="document-"]').first();
    await documentItem.click({ button: 'right' });
    
    // Click "Delete" option
    await authenticatedPage.click('[data-testid="context-menu-delete-document"]');
    
    // Should show confirmation
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    
    // Confirm deletion
    await authenticatedPage.click('[data-testid="confirm-delete"]');
  });

  test('should execute MongoDB query', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Open query editor
    await authenticatedPage.click('[data-testid="mongo-query-editor"]');
    
    // Enter MongoDB query
    await authenticatedPage.fill('[data-testid="query-input"]', 'db.users.find({})');
    
    // Execute
    await authenticatedPage.click('[data-testid="execute-query"]');
    
    // Should show results
    await expect(authenticatedPage.locator('[data-testid="query-results"]')).toBeVisible();
  });

  test('should aggregate data', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Open aggregation builder
    await authenticatedPage.click('[data-testid="aggregation-builder"]');
    
    // Should show aggregation pipeline
    await expect(authenticatedPage.locator('[data-testid="pipeline-editor"]')).toBeVisible();
    
    // Add aggregation stages
    await authenticatedPage.click('[data-testid="add-stage"]');
    await authenticatedPage.selectOption('[data-testid="stage-type-0"]', '$match');
    await authenticatedPage.fill('[data-testid="stage-config-0"]', '{}');
    
    await authenticatedPage.click('[data-testid="add-stage"]');
    await authenticatedPage.selectOption('[data-testid="stage-type-1"]', '$group');
    await authenticatedPage.fill('[data-testid="stage-config-1"]', '{}');
    
    // Run aggregation
    await authenticatedPage.click('[data-testid="run-aggregation"]');
    
    // Should show results
    await expect(authenticatedPage.locator('[data-testid="aggregation-results"]')).toBeVisible();
  });

  test('should create index', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click indexes tab
    await authenticatedPage.click('[data-testid="indexes-tab"]');
    
    // Create new index
    await authenticatedPage.click('[data-testid="create-index"]');
    
    // Should show index dialog
    await expect(authenticatedPage.locator('[data-testid="create-index-dialog"]')).toBeVisible();
    
    // Enter index definition
    await authenticatedPage.fill('[data-testid="index-keys"]', '{"name": 1, "email": 1}');
    await authenticatedPage.check('[data-testid="index-unique"]');
    
    // Create
    await authenticatedPage.click('[data-testid="create-index-confirm"]');
  });

  test('should show collection statistics', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click statistics tab
    await authenticatedPage.click('[data-testid="stats-tab"]');
    
    // Should show collection statistics
    await expect(authenticatedPage.locator('[data-testid="collection-stats"]')).toBeVisible();
    
    // Should show metrics
    const statsContent = await authenticatedPage.locator('[data-testid="collection-stats"]').textContent();
    expect(statsContent).toMatch(/count|size|avgObjSize/);
  });

  test('should validate documents', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click validation tab
    await authenticatedPage.click('[data-testid="validation-tab"]');
    
    // Should show validation rules
    await expect(authenticatedPage.locator('[data-testid="validation-rules"]')).toBeVisible();
    
    // Add validation rule
    await authenticatedPage.fill('[data-testid="validation-schema"]', JSON.stringify({
      $jsonSchema: {
        required: ["name", "email"]
      }
    }));
    
    // Save validation
    await authenticatedPage.click('[data-testid="save-validation"]');
  });

  test('should export collection data', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click export
    await authenticatedPage.click('[data-testid="export-collection"]');
    
    // Should show export options
    await expect(authenticatedPage.locator('[data-testid="export-options"]')).toBeVisible();
    
    // Test different formats
    await authenticatedPage.click('[data-testid="export-json"]');
    await authenticatedPage.click('[data-testid="export-csv"]');
  });

  test('should import collection data', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click import
    await authenticatedPage.click('[data-testid="import-collection"]');
    
    // Should show import dialog
    await expect(authenticatedPage.locator('[data-testid="import-dialog"]')).toBeVisible();
  });

  test('should drop collection', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    const collectionName = await collectionItem.textContent();
    
    // Right-click on collection
    await collectionItem.click({ button: 'right' });
    
    // Click "Drop Collection" option
    await authenticatedPage.click('[data-testid="context-menu-drop-collection"]');
    
    // Should show confirmation
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toContainText('Are you sure');
    await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toContainText(collectionName || '');
    
    // Confirm
    await authenticatedPage.click('[data-testid="confirm-delete"]');
  });

  test('should run explain plan', async ({ authenticatedPage }) => {
    // Expand to collection
    const databaseItem = authenticatedPage.locator('[data-testid^="database-"]').first();
    await databaseItem.click();
    
    const collectionItem = authenticatedPage.locator('[data-testid^="collection-"]').first();
    await collectionItem.click();
    
    // Click explain
    await authenticatedPage.click('[data-testid="explain-query"]');
    
    // Should show explain dialog
    await expect(authenticatedPage.locator('[data-testid="explain-dialog"]')).toBeVisible();
  });

  test('should show query profiler', async ({ authenticatedPage }) => {
    // Click profiler tab
    await authenticatedPage.click('[data-testid="profiler-tab"]');
    
    // Should show profiler data
    await expect(authenticatedPage.locator('[data-testid="profiler-data"]')).toBeVisible();
  });

  test('should handle replica sets', async ({ authenticatedPage }) => {
    // Click connect button
    await authenticatedPage.click('[data-testid="connect-mongodb"]');
    
    // Select replica set option
    await authenticatedPage.check('[data-testid="replica-set"]');
    
    // Should show replica set configuration
    await expect(authenticatedPage.locator('[data-testid="replica-config"]')).toBeVisible();
    
    // Add replica set members
    await authenticatedPage.click('[data-testid="add-member"]');
    await authenticatedPage.fill('[data-testid="member-host-0"]', 'rs1.example.com:27017');
  });

  test('should handle sharded clusters', async ({ authenticatedPage }) => {
    // Click connect button
    await authenticatedPage.click('[data-testid="connect-mongodb"]');
    
    // Select sharded cluster option
    await authenticatedPage.check('[data-testid="sharded-cluster"]');
    
    // Should show sharding configuration
    await expect(authenticatedPage.locator('[data-testid="shard-config"]')).toBeVisible();
  });

  test('should manage users and roles', async ({ authenticatedPage }) => {
    // Click users tab
    await authenticatedPage.click('[data-testid="users-tab"]');
    
    // Should show users list
    await expect(authenticatedPage.locator('[data-testid="users-list"]')).toBeVisible();
    
    // Create user
    await authenticatedPage.click('[data-testid="create-user"]');
    await expect(authenticatedPage.locator('[data-testid="create-user-dialog"]')).toBeVisible();
  });

  test('should view logs', async ({ authenticatedPage }) => {
    // Click logs tab
    await authenticatedPage.click('[data-testid="logs-tab"]');
    
    // Should show logs
    await expect(authenticatedPage.locator('[data-testid="logs-viewer"]')).toBeVisible();
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="mongodb-manager"]')).toHaveAttribute('aria-label');
    await expect(authenticatedPage.locator('[data-testid="connection-list"]')).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    // Should move through tree elements
  });
});
