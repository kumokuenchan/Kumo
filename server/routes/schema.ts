import { Router } from 'express';
import { schemaService } from '../services/SchemaService.js';

const router = Router();

// GET databases for a connection
router.get('/:connectionId/databases', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const databases = await schemaService.getDatabases(connectionId);
    res.json({ databases });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch databases', message: error.message });
  }
});

// GET tables in a database
router.get('/:connectionId/databases/:database/tables', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const tables = await schemaService.getTables(connectionId, database);
    res.json({ tables });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tables', message: error.message });
  }
});

// GET columns for a table
router.get('/:connectionId/databases/:database/tables/:table/columns', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const columns = await schemaService.getColumns(connectionId, database, table);
    res.json({ columns });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch columns', message: error.message });
  }
});

// GET indexes for a table
router.get('/:connectionId/databases/:database/tables/:table/indexes', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const indexes = await schemaService.getIndexes(connectionId, database, table);
    res.json({ indexes });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch indexes', message: error.message });
  }
});

// GET foreign keys for a table
router.get(
  '/:connectionId/databases/:database/tables/:table/foreign-keys',
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const foreignKeys = await schemaService.getForeignKeys(connectionId, database, table);
      res.json({ foreignKeys });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: 'Failed to fetch foreign keys', message: error.message });
    }
  },
);

// GET triggers for a database or table
router.get('/:connectionId/databases/:database/triggers', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const { table } = req.query;
    const triggers = await schemaService.getTriggers(
      connectionId,
      database,
      table as string | undefined,
    );
    res.json({ triggers });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch triggers', message: error.message });
  }
});

// GET stored procedures and functions
router.get('/:connectionId/databases/:database/routines', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const routines = await schemaService.getRoutines(connectionId, database);
    res.json({ routines });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch routines', message: error.message });
  }
});

// GET views in a database
router.get('/:connectionId/databases/:database/views', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const views = await schemaService.getViews(connectionId, database);
    res.json({ views });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch views', message: error.message });
  }
});

// GET table statistics
router.get('/:connectionId/databases/:database/tables/:table/stats', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const stats = await schemaService.getTableStats(connectionId, database, table);
    res.json({ stats });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch table statistics', message: error.message });
  }
});

// GET CREATE TABLE statement
router.get(
  '/:connectionId/databases/:database/tables/:table/create-statement',
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const createStatement = await schemaService.getCreateTable(
        connectionId,
        database,
        table,
      );
      res.json({ createStatement });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: 'Failed to fetch CREATE TABLE statement', message: error.message });
    }
  },
);

// GET complete table schema (columns + indexes + foreign keys + stats)
router.get('/:connectionId/databases/:database/tables/:table/schema', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const schema = await schemaService.getCompleteTableSchema(
      connectionId,
      database,
      table,
    );
    res.json(schema);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch table schema', message: error.message });
  }
});

export default router;
