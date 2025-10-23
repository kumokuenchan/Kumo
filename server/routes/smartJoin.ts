import { Router } from 'express';
import { smartJoinService, SmartJoinRequest } from '../services/SmartJoinService.js';

const router = Router();

/**
 * Auto-detect foreign key relationships between tables
 * POST /api/smart-join/:connectionId/databases/:database/detect-relationships
 */
router.post('/:connectionId/databases/:database/detect-relationships', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const { tables } = req.body;

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return res.status(400).json({ error: 'Tables array is required' });
    }

    const links = await smartJoinService.detectRelationships(connectionId, database, tables);

    res.json({ links });
  } catch (error: any) {
    console.error('Detect relationships error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate SQL for smart join (preview)
 * POST /api/smart-join/:connectionId/generate-sql
 */
router.post('/:connectionId/generate-sql', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const request: SmartJoinRequest = req.body;

    const sql = smartJoinService.generateJoinSQL(request);

    res.json({ sql });
  } catch (error: any) {
    console.error('Generate SQL error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute smart join query
 * POST /api/smart-join/:connectionId/execute
 */
router.post('/:connectionId/execute', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const request: SmartJoinRequest = req.body;

    const result = await smartJoinService.executeSmartJoin(connectionId, request);

    res.json(result);
  } catch (error: any) {
    console.error('Execute smart join error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
