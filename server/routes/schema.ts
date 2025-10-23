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

// POST create a new table
router.post('/:connectionId/databases/:database/tables', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const tableDefinition = req.body;
    await schemaService.createTable(connectionId, database, tableDefinition);
    res.json({ success: true, message: 'Table created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create table', message: error.message });
  }
});

// POST add a column to a table
router.post('/:connectionId/databases/:database/tables/:table/columns', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const columnDefinition = req.body;
    await schemaService.addColumn(connectionId, database, table, columnDefinition);
    res.json({ success: true, message: 'Column added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add column', message: error.message });
  }
});

// PUT modify a column
router.put(
  '/:connectionId/databases/:database/tables/:table/columns/:columnName',
  async (req, res) => {
    try {
      const { connectionId, database, table, columnName } = req.params;
      const columnDefinition = req.body;
      await schemaService.modifyColumn(connectionId, database, table, columnName, columnDefinition);
      res.json({ success: true, message: 'Column modified successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to modify column', message: error.message });
    }
  },
);

// DELETE drop a column
router.delete(
  '/:connectionId/databases/:database/tables/:table/columns/:columnName',
  async (req, res) => {
    try {
      const { connectionId, database, table, columnName } = req.params;
      await schemaService.dropColumn(connectionId, database, table, columnName);
      res.json({ success: true, message: 'Column dropped successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to drop column', message: error.message });
    }
  },
);

// POST create an index
router.post('/:connectionId/databases/:database/tables/:table/indexes', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const indexDefinition = req.body;
    await schemaService.createIndex(connectionId, database, table, indexDefinition);
    res.json({ success: true, message: 'Index created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create index', message: error.message });
  }
});

// DELETE drop an index
router.delete(
  '/:connectionId/databases/:database/tables/:table/indexes/:indexName',
  async (req, res) => {
    try {
      const { connectionId, database, table, indexName } = req.params;
      await schemaService.dropIndex(connectionId, database, table, indexName);
      res.json({ success: true, message: 'Index dropped successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to drop index', message: error.message });
    }
  },
);

// POST add a foreign key
router.post('/:connectionId/databases/:database/tables/:table/foreign-keys', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const foreignKeyDefinition = req.body;
    await schemaService.addForeignKey(connectionId, database, table, foreignKeyDefinition);
    res.json({ success: true, message: 'Foreign key added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add foreign key', message: error.message });
  }
});

// DELETE drop a foreign key
router.delete(
  '/:connectionId/databases/:database/tables/:table/foreign-keys/:foreignKeyName',
  async (req, res) => {
    try {
      const { connectionId, database, table, foreignKeyName } = req.params;
      await schemaService.dropForeignKey(connectionId, database, table, foreignKeyName);
      res.json({ success: true, message: 'Foreign key dropped successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to drop foreign key', message: error.message });
    }
  },
);

// DELETE drop a table
router.delete('/:connectionId/databases/:database/tables/:table', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const { checkDependencies } = req.query;
    const result = await schemaService.dropTable(
      connectionId,
      database,
      table,
      checkDependencies !== 'false',
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to drop table', message: error.message });
  }
});

// GET table dependencies
router.get(
  '/:connectionId/databases/:database/tables/:table/dependencies',
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const dependencies = await schemaService.getTableDependencies(connectionId, database, table);
      res.json({ dependencies });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: 'Failed to fetch table dependencies', message: error.message });
    }
  },
);

// GET export table schema
router.get(
  '/:connectionId/databases/:database/tables/:table/export',
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const schema = await schemaService.exportTableSchema(connectionId, database, table);
      res.json({ schema });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to export table schema', message: error.message });
    }
  },
);

// GET export database schema
router.get('/:connectionId/databases/:database/export', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const { includeData } = req.query;
    const schema = await schemaService.exportDatabaseSchema(
      connectionId,
      database,
      includeData === 'true',
    );
    res.json({ schema });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export database schema', message: error.message });
  }
});

// PUT modify table properties
router.put('/:connectionId/databases/:database/tables/:table/properties', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const properties = req.body;
    await schemaService.modifyTableProperties(connectionId, database, table, properties);
    res.json({ success: true, message: 'Table properties updated successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to update table properties', message: error.message });
  }
});

export default router;
