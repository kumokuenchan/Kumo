import { Router } from 'express';
import { queryService } from '../services/QueryService.js';
import { queryHistoryStorage } from '../services/QueryHistoryStorage.js';
import { savedQueriesStorage } from '../services/SavedQueriesStorage.js';

const router = Router();

/**
 * POST /api/query/:connectionId/execute
 * Execute a single SQL query
 */
router.post('/:connectionId/execute', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { sql, params } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const result = await queryService.executeQuery(connectionId, sql, params);

    // Save to history
    await queryHistoryStorage.add({
      connectionId,
      sql,
      executionTime: result.executionTime,
      success: true,
      rowCount: result.rowCount,
    });

    res.json({
      success: true,
      result,
      stats: queryService.getQueryStats(result),
    });
  } catch (error: any) {
    // Save failed query to history
    await queryHistoryStorage.add({
      connectionId: req.params.connectionId,
      sql: req.body.sql,
      executionTime: error.executionTime || 0,
      success: false,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Query execution failed',
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });
  }
});

/**
 * POST /api/query/:connectionId/execute-multiple
 * Execute multiple SQL statements
 */
router.post('/:connectionId/execute-multiple', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const result = await queryService.executeMultipleStatements(connectionId, sql);

    // Save to history
    await queryHistoryStorage.add({
      connectionId,
      sql,
      executionTime: result.totalTime,
      success: result.success,
      error: result.error,
      rowCount: result.results.reduce((sum, r) => sum + r.rowCount, 0),
    });

    res.json(result);
  } catch (error: any) {
    // Save failed query to history
    await queryHistoryStorage.add({
      connectionId: req.params.connectionId,
      sql: req.body.sql,
      executionTime: 0,
      success: false,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Query execution failed',
    });
  }
});

/**
 * POST /api/query/:connectionId/execute-paginated
 * Execute query with pagination
 */
router.post('/:connectionId/execute-paginated', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { sql, page = 1, pageSize = 100 } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const result = await queryService.executeQueryWithPagination(
      connectionId,
      sql,
      page,
      pageSize
    );

    // Save to history
    await queryHistoryStorage.add({
      connectionId,
      sql,
      executionTime: result.executionTime,
      success: true,
      rowCount: result.totalRows,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Query execution failed',
    });
  }
});

/**
 * POST /api/query/:connectionId/cancel
 * Cancel a running query
 */
router.post('/:connectionId/cancel', async (req, res) => {
  try {
    const { connectionId } = req.params;

    const cancelled = await queryService.cancelQuery(connectionId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Query cancelled successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No active query found to cancel',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel query',
    });
  }
});

/**
 * GET /api/query/history
 * Get all query history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = await queryHistoryStorage.getAll(Number(limit));
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch query history',
      message: error.message,
    });
  }
});

/**
 * GET /api/query/:connectionId/history
 * Get query history for a specific connection
 */
router.get('/:connectionId/history', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await queryHistoryStorage.getByConnection(
      connectionId,
      Number(limit),
      Number(offset)
    );

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch query history',
      message: error.message,
    });
  }
});

/**
 * GET /api/query/history/search
 * Search query history
 */
router.get('/history/search', async (req, res) => {
  try {
    const { q, connectionId, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const history = await queryHistoryStorage.search(
      String(q),
      connectionId ? String(connectionId) : undefined,
      Number(limit)
    );

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to search query history',
      message: error.message,
    });
  }
});

/**
 * GET /api/query/history/:id
 * Get a specific query by ID
 */
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await queryHistoryStorage.getById(id);

    if (!entry) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({ entry });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch query',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/query/history/:id
 * Delete a query from history
 */
router.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await queryHistoryStorage.delete(id);

    if (deleted) {
      res.json({ success: true, message: 'Query deleted from history' });
    } else {
      res.status(404).json({ error: 'Query not found' });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete query',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/query/:connectionId/history
 * Clear history for a connection
 */
router.delete('/:connectionId/history', async (req, res) => {
  try {
    const { connectionId } = req.params;
    await queryHistoryStorage.clearConnection(connectionId);
    res.json({
      success: true,
      message: 'Query history cleared for connection',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to clear query history',
      message: error.message,
    });
  }
});

/**
 * GET /api/query/:connectionId/stats
 * Get query statistics for a connection
 */
router.get('/:connectionId/stats', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const stats = await queryHistoryStorage.getStats(connectionId);
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch query statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/query/stats
 * Get overall query statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await queryHistoryStorage.getStats();
    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch query statistics',
      message: error.message,
    });
  }
});

export default router;

/** Saved Queries Endpoints **/
// GET /api/query/:connectionId/saved
router.get('/:connectionId/saved', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { q, limit } = req.query as any;
    const list = await savedQueriesStorage.list(connectionId, q ? String(q) : undefined, limit ? Number(limit) : 200);
    res.json({ saved: list });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load saved queries', message: error?.message });
  }
});

// POST /api/query/:connectionId/saved
router.post('/:connectionId/saved', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { name, sql, database, tags, folder, overwrite } = req.body || {};
    if (!name || !sql) {
      return res.status(400).json({ error: 'name and sql are required' });
    }
    if (overwrite) {
      const existing = await savedQueriesStorage.findByName(connectionId, String(name));
      if (existing) {
        const updated = await savedQueriesStorage.update(existing.id, { sql: String(sql), database: database ? String(database) : undefined, tags: Array.isArray(tags) ? tags : undefined, folder: folder ? String(folder) : undefined });
        return res.json({ success: true, entry: updated });
      }
    }
    const entry = await savedQueriesStorage.add(connectionId, String(name), String(sql), database ? String(database) : undefined, Array.isArray(tags) ? tags : undefined, folder ? String(folder) : undefined);
    res.json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save query', message: error?.message });
  }
});

// PUT /api/query/saved/:id
router.put('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const patch = req.body || {};
    const updated = await savedQueriesStorage.update(id, patch);
    if (!updated) return res.status(404).json({ error: 'Saved query not found' });
    res.json({ success: true, entry: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update saved query', message: error?.message });
  }
});

// DELETE /api/query/saved/:id
router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const ok = await savedQueriesStorage.remove(id);
    if (!ok) return res.status(404).json({ error: 'Saved query not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete saved query', message: error?.message });
  }
});

// Export saved queries for a connection
router.get('/:connectionId/saved/export', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const list = await savedQueriesStorage.exportAll(connectionId);
    const json = JSON.stringify({ connectionId, items: list }, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="saved-queries-${connectionId}.json"`);
    res.send(json);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export saved queries', message: error?.message });
  }
});

// Import saved queries for a connection
router.post('/:connectionId/saved/import', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { items, overwrite } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    const result = await savedQueriesStorage.importMany(connectionId, items, !!overwrite);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to import saved queries', message: error?.message });
  }
});
