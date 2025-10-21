import { Router } from 'express';
import { dataEditingService } from '../services/DataEditingService.js';

const router = Router();

// POST /api/data-editing/:connectionId/update-row
// Body: { database: string, table: string, key: Record<string, any>, changes: Record<string, any> }
router.post('/:connectionId/update-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, key, changes } = req.body || {};

    if (!database || !table || !key || !changes) {
      return res.status(400).json({
        success: false,
        error: 'database, table, key, and changes are required',
      });
    }

    const result = await dataEditingService.updateRow(connectionId, database, table, key, changes);
    res.json({ success: true, row: result.row, affectedRows: result.affectedRows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update row' });
  }
});

// POST /api/data-editing/:connectionId/insert-row
// Body: { database: string, table: string, values: Record<string, any> }
router.post('/:connectionId/insert-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, values } = req.body || {};

    if (!database || !table || !values) {
      return res.status(400).json({ success: false, error: 'database, table, and values are required' });
    }

    const result = await dataEditingService.insertRow(connectionId, database, table, values);
    res.json({ success: true, row: result.row, insertId: result.insertId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to insert row' });
  }
});

// POST /api/data-editing/:connectionId/delete-row
// Body: { database: string, table: string, key: Record<string, any> }
router.post('/:connectionId/delete-row', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, key } = req.body || {};

    if (!database || !table || !key) {
      return res.status(400).json({ success: false, error: 'database, table, and key are required' });
    }

    const result = await dataEditingService.deleteRow(connectionId, database, table, key);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error: any) {
    const status = error?.errno === 1451 ? 409 : 500; // FK constraint -> 409 Conflict
    res.status(status).json({ success: false, error: error.message || 'Failed to delete row' });
  }
});

// POST /api/data-editing/:connectionId/batch-update
// Body: { database: string, table: string, updates: Array<{key, changes}>, atomic?: boolean }
router.post('/:connectionId/batch-update', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, updates, atomic } = req.body || {};

    if (!database || !table || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'database, table, and updates are required' });
    }

    const result = await dataEditingService.batchUpdate(connectionId, database, table, updates, !!atomic);
    res.json({ success: true, results: result.results, totalUpdated: result.totalUpdated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to batch update rows' });
  }
});

// GET /api/data-editing/:connectionId/fk-lookup?database=&table=&column=&q=&limit=&offset=
router.get('/:connectionId/fk-lookup', async (req, res) => {
  try {
    const { connectionId } = req.params as { connectionId: string };
    const { database, table, column, q } = req.query as any;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    if (!database || !table || !column) {
      return res.status(400).json({ success: false, error: 'database, table, and column are required' });
    }

    const result = await dataEditingService.fkLookup(
      connectionId,
      String(database),
      String(table),
      String(column),
      q ? String(q) : undefined,
      limit,
      offset
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to lookup foreign key values' });
  }
});

export default router;
