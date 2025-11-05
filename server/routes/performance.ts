import { Router } from 'express';
import { performanceService } from '../services/PerformanceService.js';

const router = Router();

/**
 * GET /api/performance/:connectionId/metrics
 * Get database performance metrics
 */
router.get('/:connectionId/metrics', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const metrics = await performanceService.getDatabaseMetrics(connectionId);
    res.json({ success: true, metrics });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch metrics',
    });
  }
});

/**
 * GET /api/performance/:connectionId/connections
 * Get active database connections
 */
router.get('/:connectionId/connections', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connections = await performanceService.getActiveConnections(connectionId);
    res.json({ success: true, connections });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch connections',
    });
  }
});

/**
 * POST /api/performance/:connectionId/kill/:processId
 * Kill a specific query/connection
 */
router.post('/:connectionId/kill/:processId', async (req, res) => {
  try {
    const { connectionId, processId } = req.params;
    await performanceService.killQuery(connectionId, parseInt(processId));
    res.json({ success: true, message: `Process ${processId} killed successfully` });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to kill query',
    });
  }
});

/**
 * GET /api/performance/:connectionId/slow-queries
 * Get slow query log
 */
router.get('/:connectionId/slow-queries', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const slowQueries = await performanceService.getSlowQueries(connectionId, limit);
    res.json({ success: true, slowQueries });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch slow queries',
    });
  }
});

/**
 * GET /api/performance/:connectionId/index-usage
 * Get index usage statistics
 */
router.get('/:connectionId/index-usage', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const database = req.query.database as string | undefined;
    const indexStats = await performanceService.getIndexUsageStats(connectionId, database);
    res.json({ success: true, indexStats });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch index usage stats',
    });
  }
});

/**
 * GET /api/performance/:connectionId/query-stats
 * Get query execution statistics
 */
router.get('/:connectionId/query-stats', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const queryStats = await performanceService.getQueryStats(connectionId, limit);
    res.json({ success: true, queryStats });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch query stats',
    });
  }
});

/**
 * GET /api/performance/:connectionId/table-stats/:database
 * Get table statistics for a database
 */
router.get('/:connectionId/table-stats/:database', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const tableStats = await performanceService.getTableStats(connectionId, database);
    res.json({ success: true, tableStats });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch table stats',
    });
  }
});

export default router;
