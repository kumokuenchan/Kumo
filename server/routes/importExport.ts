import express from 'express';
import multer from 'multer';
import { importExportService } from '../services/ImportExportService.js';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

/**
 * Import CSV data into table
 * POST /api/import-export/:connectionId/databases/:database/tables/:table/import/csv
 */
router.post(
  '/:connectionId/databases/:database/tables/:table/import/csv',
  upload.single('file'),
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const csvData = file.buffer.toString('utf-8');
      const options = {
        delimiter: req.body.delimiter,
        hasHeaders: req.body.hasHeaders !== 'false',
        truncateFirst: req.body.truncateFirst === 'true',
      };

      const result = await importExportService.importCSV(
        connectionId,
        database,
        table,
        csvData,
        options
      );

      res.json(result);
    } catch (error: any) {
      console.error('CSV import error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Import JSON data into table
 * POST /api/import-export/:connectionId/databases/:database/tables/:table/import/json
 */
router.post(
  '/:connectionId/databases/:database/tables/:table/import/json',
  upload.single('file'),
  async (req, res) => {
    try {
      const { connectionId, database, table } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const jsonData = file.buffer.toString('utf-8');
      const options = {
        truncateFirst: req.body.truncateFirst === 'true',
      };

      const result = await importExportService.importJSON(
        connectionId,
        database,
        table,
        jsonData,
        options
      );

      res.json(result);
    } catch (error: any) {
      console.error('JSON import error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Export table data to CSV
 * GET /api/import-export/:connectionId/databases/:database/tables/:table/export/csv
 */
router.get('/:connectionId/databases/:database/tables/:table/export/csv', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const options = {
      delimiter: (req.query.delimiter as string) || ',',
      includeHeaders: req.query.includeHeaders !== 'false',
      whereClause: req.query.whereClause as string,
      selectedColumns: req.query.selectedColumns
        ? JSON.parse(req.query.selectedColumns as string)
        : undefined,
    };

    const csvData = await importExportService.exportCSV(connectionId, database, table, options);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${table}.csv"`);
    res.send(csvData);
  } catch (error: any) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export table data to JSON
 * GET /api/import-export/:connectionId/databases/:database/tables/:table/export/json
 */
router.get('/:connectionId/databases/:database/tables/:table/export/json', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const options = {
      whereClause: req.query.whereClause as string,
      selectedColumns: req.query.selectedColumns
        ? JSON.parse(req.query.selectedColumns as string)
        : undefined,
      pretty: req.query.pretty === 'true',
    };

    const jsonData = await importExportService.exportJSON(connectionId, database, table, options);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${table}.json"`);
    res.send(jsonData);
  } catch (error: any) {
    console.error('JSON export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export table data to Excel
 * GET /api/import-export/:connectionId/databases/:database/tables/:table/export/excel
 */
router.get('/:connectionId/databases/:database/tables/:table/export/excel', async (req, res) => {
  try {
    const { connectionId, database, table } = req.params;
    const options = {
      whereClause: req.query.whereClause as string,
      selectedColumns: req.query.selectedColumns
        ? JSON.parse(req.query.selectedColumns as string)
        : undefined,
    };

    const excelBuffer = await importExportService.exportExcel(
      connectionId,
      database,
      table,
      options
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${table}.xlsx"`);
    res.send(excelBuffer);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get import job progress
 * GET /api/import-export/jobs/:jobId/progress
 */
router.get('/jobs/:jobId/progress', async (req, res) => {
  try {
    const { jobId } = req.params;
    const progress = importExportService.getImportProgress(jobId);

    if (!progress) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(progress);
  } catch (error: any) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel import job
 * POST /api/import-export/jobs/:jobId/cancel
 */
router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = importExportService.cancelImport(jobId);

    if (!cancelled) {
      return res.status(400).json({ error: 'Job not found or cannot be cancelled' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel import error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export database as SQL dump
 * GET /api/import-export/:connectionId/databases/:database/export/sql
 */
router.get('/:connectionId/databases/:database/export/sql', async (req, res) => {
  try {
    const { connectionId, database } = req.params;
    const options = {
      tables: req.query.tables ? JSON.parse(req.query.tables as string) : undefined,
      includeData: req.query.includeData !== 'false',
      includeDropTable: req.query.includeDropTable === 'true',
    };

    const sqlDump = await importExportService.exportSQLDump(connectionId, database, options);

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${database}_dump.sql"`);
    res.send(sqlDump);
  } catch (error: any) {
    console.error('SQL dump export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Import SQL dump
 * POST /api/import-export/:connectionId/import/sql
 */
router.post(
  '/:connectionId/import/sql',
  upload.single('file'),
  async (req, res) => {
    try {
      const { connectionId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const sqlContent = file.buffer.toString('utf-8');
      const options = {
        continueOnError: req.body.continueOnError === 'true',
      };

      const result = await importExportService.importSQLDump(connectionId, sqlContent, options);

      res.json(result);
    } catch (error: any) {
      console.error('SQL import error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
