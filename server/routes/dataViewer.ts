import { Router } from 'express';
import { dataViewerService } from '../services/DataViewerService.js';
import type { DataViewerQuery } from '../types/dataViewer.js';

const router = Router();

/**
 * POST /api/data-viewer/:connectionId/data
 * Get table data with pagination, filtering, and sorting
 */
router.post('/:connectionId/data', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const query: DataViewerQuery = req.body;

    if (!query.database || !query.table) {
      return res.status(400).json({
        error: 'Database and table are required',
      });
    }

    const result = await dataViewerService.getTableData(connectionId, query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message,
    });
  }
});

/**
 * GET /api/data-viewer/:connectionId/columns
 * Get column information for a table
 */
router.get('/:connectionId/columns', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { database, table } = req.query;

    if (!database || !table) {
      return res.status(400).json({
        error: 'Database and table query parameters are required',
      });
    }

    const columns = await dataViewerService.getColumnInfo(
      connectionId,
      database as string,
      table as string
    );

    res.json({
      success: true,
      columns,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch column information',
      message: error.message,
    });
  }
});

/**
 * GET /api/data-viewer/:connectionId/stats
 * Get table statistics
 */
router.get('/:connectionId/stats', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { database, table } = req.query;

    if (!database || !table) {
      return res.status(400).json({
        error: 'Database and table query parameters are required',
      });
    }

    const stats = await dataViewerService.getTableStats(
      connectionId,
      database as string,
      table as string
    );

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/data-viewer/:connectionId/distinct-values
 * Get distinct values for a column
 */
router.get('/:connectionId/distinct-values', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { database, table, column, limit } = req.query;

    if (!database || !table || !column) {
      return res.status(400).json({
        error: 'Database, table, and column query parameters are required',
      });
    }

    const limitNum = limit ? parseInt(limit as string) : 100;

    const result = await dataViewerService.getDistinctValues(
      connectionId,
      database as string,
      table as string,
      column as string,
      limitNum
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distinct values',
      message: error.message,
    });
  }
});

/**
 * POST /api/data-viewer/:connectionId/export
 * Export table data in various formats (CSV, JSON)
 */
router.post('/:connectionId/export', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { format = 'csv', ...query }: DataViewerQuery & { format?: string } = req.body;

    if (!query.database || !query.table) {
      return res.status(400).json({
        error: 'Database and table are required',
      });
    }

    // Get all data without pagination for export
    const fullQuery: DataViewerQuery = {
      ...query,
      page: 1,
      pageSize: 10000, // Limit to prevent memory issues
    };

    const result = await dataViewerService.getTableData(connectionId, fullQuery);

    if (format === 'csv') {
      // Convert to CSV
      const headers = result.columns.map((col) => col.name).join(',');
      const rows = result.rows
        .map((row) =>
          result.columns
            .map((col) => {
              const value = row[col.name];
              if (value === null || value === undefined) return '';
              // Escape quotes and wrap in quotes if contains comma
              const strValue = String(value);
              if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                return `"${strValue.replace(/"/g, '""')}"`;
              }
              return strValue;
            })
            .join(',')
        )
        .join('\n');

      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${query.table}_export.csv"`
      );
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${query.table}_export.json"`
      );
      res.json(result.rows);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Use "csv" or "json"',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: error.message,
    });
  }
});

export default router;
