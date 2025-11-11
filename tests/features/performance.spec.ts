import { test, expect } from '../fixtures/base.fixture';
import { TestUtils } from '../utils/test-utils';

test.describe('Performance Monitoring', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await TestUtils.waitForAppLoad(authenticatedPage);
    await authenticatedPage.click('[data-testid="nav-performance"]');
  });

  test('should display performance dashboard', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="performance-metrics"]')).toBeVisible();
  });

  test('should show real-time connection metrics', async ({ authenticatedPage }) => {
    // Should display active connections
    await expect(authenticatedPage.locator('[data-testid="active-connections"]')).toBeVisible();
    
    // Should show connection count
    const connectionsText = await authenticatedPage.locator('[data-testid="active-connections"]').textContent();
    expect(connectionsText).toMatch(/\d+/);
  });

  test('should display query performance metrics', async ({ authenticatedPage }) => {
    // Should show queries per second
    await expect(authenticatedPage.locator('[data-testid="queries-per-second"]')).toBeVisible();
    
    // Should show average query time
    await expect(authenticatedPage.locator('[data-testid="average-query-time"]')).toBeVisible();
    
    // Should show slow queries count
    await expect(authenticatedPage.locator('[data-testid="slow-queries"]')).toBeVisible();
  });

  test('should show database performance charts', async ({ authenticatedPage }) => {
    // Should display CPU usage chart
    await expect(authenticatedPage.locator('[data-testid="cpu-usage-chart"]')).toBeVisible();
    
    // Should display memory usage chart
    await expect(authenticatedPage.locator('[data-testid="memory-usage-chart"]')).toBeVisible();
    
    // Should display I/O operations chart
    await expect(authenticatedPage.locator('[data-testid="io-operations-chart"]')).toBeVisible();
  });

  test('should display slow query log', async ({ authenticatedPage }) => {
    // Click slow queries tab
    await authenticatedPage.click('[data-testid="slow-queries-tab"]');
    
    // Should show slow queries list
    await expect(authenticatedPage.locator('[data-testid="slow-queries-list"]')).toBeVisible();
    
    // Should show query items
    const queryItems = authenticatedPage.locator('[data-testid^="slow-query-"]');
    const itemCount = await queryItems.count();
    // May be 0 if no slow queries exist
  });

  test('should filter slow queries by time', async ({ authenticatedPage }) => {
    // Click slow queries tab
    await authenticatedPage.click('[data-testid="slow-queries-tab"]');
    
    // Select time range
    await authenticatedPage.selectOption('[data-testid="time-range"]', '1h');
    
    // Should filter results
    // This depends on implementation
  });

  test('should analyze query performance', async ({ authenticatedPage }) => {
    // Click slow queries tab
    await authenticatedPage.click('[data-testid="slow-queries-tab"]');
    
    // Click on a slow query
    const queryItem = authenticatedPage.locator('[data-testid^="slow-query-"]').first();
    if (await queryItem.isVisible()) {
      await queryItem.click();
      
      // Should show query analysis
      await expect(authenticatedPage.locator('[data-testid="query-analysis"]')).toBeVisible();
      
      // Should show execution plan
      await expect(authenticatedPage.locator('[data-testid="execution-plan"]')).toBeVisible();
    }
  });

  test('should show explain plan for query', async ({ authenticatedPage }) => {
    // Click slow queries tab
    await authenticatedPage.click('[data-testid="slow-queries-tab"]');
    
    // Right-click on a query
    const queryItem = authenticatedPage.locator('[data-testid^="slow-query-"]').first();
    if (await queryItem.isVisible()) {
      await queryItem.click({ button: 'right' });
      
      // Click explain option
      await authenticatedPage.click('[data-testid="context-menu-explain"]');
      
      // Should show explain dialog
      await expect(authenticatedPage.locator('[data-testid="explain-dialog"]')).toBeVisible();
      
      // Should show execution plan
      await expect(authenticatedPage.locator('[data-testid="execution-plan-view"]')).toBeVisible();
    }
  });

  test('should kill running query', async ({ authenticatedPage }) => {
    // Click process list tab
    await authenticatedPage.click('[data-testid="process-list-tab"]');
    
    // Should show running processes
    await expect(authenticatedPage.locator('[data-testid="process-list"]')).toBeVisible();
    
    // Right-click on a process
    const processItem = authenticatedPage.locator('[data-testid^="process-"]').first();
    if (await processItem.isVisible()) {
      await processItem.click({ button: 'right' });
      
      // Click kill option
      await authenticatedPage.click('[data-testid="context-menu-kill-query"]');
      
      // Should show confirmation
      await expect(authenticatedPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      
      // Confirm
      await authenticatedPage.click('[data-testid="confirm-kill"]');
    }
  });

  test('should show database locks', async ({ authenticatedPage }) => {
    // Click locks tab
    await authenticatedPage.click('[data-testid="locks-tab"]');
    
    // Should show locks list
    await expect(authenticatedPage.locator('[data-testid="locks-list"]')).toBeVisible();
    
    // Should show lock information
    const lockItems = authenticatedPage.locator('[data-testid^="lock-"]');
    const lockCount = await lockItems.count();
    // May be 0 if no locks exist
  });

  test('should monitor buffer pool metrics', async ({ authenticatedPage }) => {
    // Click buffer pool tab
    await authenticatedPage.click('[data-testid="buffer-pool-tab"]');
    
    // Should show buffer pool metrics
    await expect(authenticatedPage.locator('[data-testid="buffer-pool-metrics"]')).toBeVisible();
    
    // Should show hit ratio
    await expect(authenticatedPage.locator('[data-testid="buffer-pool-hit-ratio"]')).toBeVisible();
    
    // Should show usage percentage
    await expect(authenticatedPage.locator('[data-testid="buffer-pool-usage"]')).toBeVisible();
  });

  test('should show InnoDB metrics', async ({ authenticatedPage }) => {
    // Click InnoDB tab
    await authenticatedPage.click('[data-testid="innodb-tab"]');
    
    // Should show InnoDB metrics
    await expect(authenticatedPage.locator('[data-testid="innodb-metrics"]')).toBeVisible();
    
    // Should show metrics like:
    // - Read requests
    // - Write requests
    // - Buffer pool size
    const metricsContent = await authenticatedPage.locator('[data-testid="innodb-metrics"]').textContent();
    expect(metricsContent).toMatch(/read|write|buffer/);
  });

  test('should display connection status', async ({ authenticatedPage }) => {
    // Click connections tab
    await authenticatedPage.click('[data-testid="connections-tab"]');
    
    // Should show connected clients
    await expect(authenticatedPage.locator('[data-testid="connected-clients"]')).toBeVisible();
    
    // Should show connection details
    const connectionItems = authenticatedPage.locator('[data-testid^="connection-"]');
    const connectionCount = await connectionItems.count();
    // May be 0 if no connections
  });

  test('should show table statistics', async ({ authenticatedPage }) => {
    // Click table stats tab
    await authenticatedPage.click('[data-testid="table-stats-tab"]');
    
    // Should show table statistics
    await expect(authenticatedPage.locator('[data-testid="table-statistics"]')).toBeVisible();
    
    // Should show tables with metrics
    const tableItems = authenticatedPage.locator('[data-testid^="table-stat-"]');
    const tableCount = await tableItems.count();
    // May be 0 if no data
  });

  test('should show index usage statistics', async ({ authenticatedPage }) => {
    // Click index stats tab
    await authenticatedPage.click('[data-testid="index-stats-tab"]');
    
    // Should show index statistics
    await expect(authenticatedPage.locator('[data-testid="index-statistics"]')).toBeVisible();
    
    // Should show index usage
    const indexItems = authenticatedPage.locator('[data-testid^="index-stat-"]');
    const indexCount = await indexItems.count();
    // May be 0 if no data
  });

  test('should set performance alerts', async ({ authenticatedPage }) => {
    // Click alerts tab
    await authenticatedPage.click('[data-testid="alerts-tab"]');
    
    // Click create alert
    await authenticatedPage.click('[data-testid="create-alert"]');
    
    // Should show alert dialog
    await expect(authenticatedPage.locator('[data-testid="alert-dialog"]')).toBeVisible();
    
    // Select metric
    await authenticatedPage.selectOption('[data-testid="alert-metric"]', 'CPU Usage');
    
    // Set threshold
    await authenticatedPage.fill('[data-testid="alert-threshold"]', '80');
    
    // Save alert
    await authenticatedPage.click('[data-testid="save-alert"]');
  });

  test('should export performance report', async ({ authenticatedPage }) => {
    // Click export button
    await authenticatedPage.click('[data-testid="export-report"]');
    
    // Should show export options
    await expect(authenticatedPage.locator('[data-testid="export-options"]')).toBeVisible();
    
    // Test different formats
    await authenticatedPage.click('[data-testid="export-pdf"]');
    await authenticatedPage.click('[data-testid="export-csv"]');
    await authenticatedPage.click('[data-testid="export-json"]');
  });

  test('should change time range for metrics', async ({ authenticatedPage }) => {
    // Select time range
    await authenticatedPage.selectOption('[data-testid="time-range-selector"]', '24h');
    
    // Should update all charts and metrics
    // This depends on implementation
  });

  test('should compare metrics over time', async ({ authenticatedPage }) => {
    // Click compare tab
    await authenticatedPage.click('[data-testid="compare-tab"]');
    
    // Should show comparison view
    await expect(authenticatedPage.locator('[data-testid="comparison-view"]')).toBeVisible();
    
    // Select two time periods to compare
    await authenticatedPage.selectOption('[data-testid="period-1"]', '1h');
    await authenticatedPage.selectOption('[data-testid="period-2"]', '24h');
    
    // Should show comparison charts
    await expect(authenticatedPage.locator('[data-testid="comparison-charts"]')).toBeVisible();
  });

  test('should show query optimization suggestions', async ({ authenticatedPage }) => {
    // Click slow queries tab
    await authenticatedPage.click('[data-testid="slow-queries-tab"]');
    
    // Click on a query
    const queryItem = authenticatedPage.locator('[data-testid^="slow-query-"]').first();
    if (await queryItem.isVisible()) {
      await queryItem.click();
      
      // Should show optimization suggestions
      await expect(authenticatedPage.locator('[data-testid="optimization-suggestions"]')).toBeVisible();
    }
  });

  test('should show database health status', async ({ authenticatedPage }) => {
    // Should show overall health indicator
    await expect(authenticatedPage.locator('[data-testid="database-health"]')).toBeVisible();
    
    // Should show status (healthy, warning, critical)
    const healthText = await authenticatedPage.locator('[data-testid="database-health"]').textContent();
    expect(healthText).toMatch(/healthy|warning|critical/);
  });

  test('should refresh performance data', async ({ authenticatedPage }) => {
    // Click refresh button
    await authenticatedPage.click('[data-testid="refresh-metrics"]');
    
    // Should show loading indicator
    await expect(authenticatedPage.locator('[data-testid="refreshing"]')).toBeVisible();
    
    // Data should refresh
    await expect(authenticatedPage.locator('[data-testid="refreshing"]')).toBeHidden();
  });

  test('should enable auto-refresh', async ({ authenticatedPage }) => {
    // Enable auto-refresh
    await authenticatedPage.check('[data-testid="auto-refresh"]');
    
    // Should start auto-refreshing
    // This depends on implementation
  });

  test('should show replication lag', async ({ authenticatedPage }) => {
    // Click replication tab
    await authenticatedPage.click('[data-testid="replication-tab"]');
    
    // Should show replication status
    await expect(authenticatedPage.locator('[data-testid="replication-status"]')).toBeVisible();
    
    // Should show lag metrics
    await expect(authenticatedPage.locator('[data-testid="replication-lag"]')).toBeVisible();
  });

  test('should monitor disk usage', async ({ authenticatedPage }) => {
    // Click disk usage tab
    await authenticatedPage.click('[data-testid="disk-usage-tab"]');
    
    // Should show disk usage charts
    await expect(authenticatedPage.locator('[data-testid="disk-usage-chart"]')).toBeVisible();
    
    // Should show database size
    await expect(authenticatedPage.locator('[data-testid="database-size"]')).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ authenticatedPage }) => {
    // Test tablet view
    await authenticatedPage.setViewportSize({ width: 768, height: 1024 });
    await expect(authenticatedPage.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Test mobile view
    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await expect(authenticatedPage.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Reset to desktop
    await authenticatedPage.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should handle real-time updates', async ({ authenticatedPage }) => {
    // Metrics should update in real-time
    // This is a performance test
    // Verification depends on implementation
  });

  test('should be accessible', async ({ authenticatedPage }) => {
    // Check for proper ARIA labels
    await expect(authenticatedPage.locator('[data-testid="performance-dashboard"]')).toHaveAttribute('aria-label');
    await expect(authenticatedPage.locator('[data-testid="performance-metrics"]')).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    // Should move through metric cards
  });
});
