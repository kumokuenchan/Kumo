import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { connectionPoolManager } from './ConnectionPoolManager.js';

interface ImportProgress {
  total: number;
  processed: number;
  errors: number;
  status: 'processing' | 'completed' | 'error' | 'cancelled';
  errorMessages: Array<{ row: number; message: string }>;
}

class ImportExportService {
  private importJobs = new Map<string, ImportProgress>();

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(sample: string): string {
    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map((delim) => ({
      delimiter: delim,
      count: (sample.match(new RegExp(`\\${delim}`, 'g')) || []).length,
    }));

    // Return delimiter with highest count
    counts.sort((a, b) => b.count - a.count);
    return counts[0].count > 0 ? counts[0].delimiter : ',';
  }

  /**
   * Parse CSV data
   */
  async parseCSV(
    data: string,
    delimiter?: string
  ): Promise<{
    headers: string[];
    rows: any[][];
    detectedDelimiter: string;
  }> {
    const detectedDelimiter = delimiter || this.detectDelimiter(data.substring(0, 1000));

    return new Promise((resolve, reject) => {
      const rows: any[][] = [];
      let headers: string[] = [];

      const parser = parse({
        delimiter: detectedDelimiter,
        columns: false,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('data', (row) => {
        if (rows.length === 0) {
          headers = row;
        }
        rows.push(row);
      });

      parser.on('end', () => {
        resolve({
          headers: rows[0] || [],
          rows: rows.slice(1),
          detectedDelimiter,
        });
      });

      parser.on('error', (error) => {
        reject(error);
      });

      parser.write(data);
      parser.end();
    });
  }

  /**
   * Import CSV data into table
   */
  async importCSV(
    connectionId: string,
    database: string,
    table: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeaders?: boolean;
      columnMapping?: Record<string, string>;
      truncateFirst?: boolean;
    } = {}
  ): Promise<{ jobId: string }> {
    const jobId = `import_${Date.now()}`;

    // Start import in background
    this.runCSVImport(connectionId, database, table, csvData, options, jobId).catch((error) => {
      console.error('CSV import error:', error);
      const job = this.importJobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.errorMessages.push({ row: 0, message: error.message });
      }
    });

    return { jobId };
  }

  private async runCSVImport(
    connectionId: string,
    database: string,
    table: string,
    csvData: string,
    options: {
      delimiter?: string;
      hasHeaders?: boolean;
      columnMapping?: Record<string, string>;
      truncateFirst?: boolean;
    },
    jobId: string
  ): Promise<void> {
    const { headers, rows, detectedDelimiter } = await this.parseCSV(
      csvData,
      options.delimiter
    );

    // Initialize job progress
    this.importJobs.set(jobId, {
      total: rows.length,
      processed: 0,
      errors: 0,
      status: 'processing',
      errorMessages: [],
    });

    const job = this.importJobs.get(jobId)!;

    // Use database
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    // Truncate if requested
    if (options.truncateFirst) {
      await connectionPoolManager.executeQuery(connectionId, `TRUNCATE TABLE \`${table}\``);
    }

    // Get column names (either from CSV headers or from mapping)
    const columns = options.hasHeaders !== false ? headers : Object.keys(options.columnMapping || {});

    // Import rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      if (job.status === 'cancelled') {
        break;
      }

      const batch = rows.slice(i, i + batchSize);

      try {
        // Build INSERT query
        const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const values = batch.flat();

        const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES ${placeholders}`;

        await connectionPoolManager.executeQuery(connectionId, sql, values);
        job.processed += batch.length;
      } catch (error: any) {
        job.errors += batch.length;
        job.errorMessages.push({
          row: i + 1,
          message: error.message,
        });
      }
    }

    job.status = job.errors > 0 ? 'error' : 'completed';
  }

  /**
   * Get import job progress
   */
  getImportProgress(jobId: string): ImportProgress | null {
    return this.importJobs.get(jobId) || null;
  }

  /**
   * Cancel import job
   */
  cancelImport(jobId: string): boolean {
    const job = this.importJobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Export table data to CSV
   */
  async exportCSV(
    connectionId: string,
    database: string,
    table: string,
    options: {
      delimiter?: string;
      includeHeaders?: boolean;
      whereClause?: string;
      selectedColumns?: string[];
    } = {}
  ): Promise<string> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const columns = options.selectedColumns || ['*'];
    const columnList = columns.join(', ');

    let sql = `SELECT ${columnList} FROM \`${table}\``;
    if (options.whereClause) {
      sql += ` WHERE ${options.whereClause}`;
    }

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql);

    return new Promise((resolve, reject) => {
      const delimiter = options.delimiter || ',';
      const output: string[] = [];

      const stringifier = stringify({
        delimiter,
        header: options.includeHeaders !== false,
      });

      stringifier.on('readable', () => {
        let row;
        while ((row = stringifier.read()) !== null) {
          output.push(row);
        }
      });

      stringifier.on('error', reject);
      stringifier.on('finish', () => {
        resolve(output.join(''));
      });

      // Write rows
      rows.forEach((row: any) => stringifier.write(row));
      stringifier.end();
    });
  }

  /**
   * Export table data to JSON
   */
  async exportJSON(
    connectionId: string,
    database: string,
    table: string,
    options: {
      whereClause?: string;
      selectedColumns?: string[];
      pretty?: boolean;
    } = {}
  ): Promise<string> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const columns = options.selectedColumns || ['*'];
    const columnList = columns.join(', ');

    let sql = `SELECT ${columnList} FROM \`${table}\``;
    if (options.whereClause) {
      sql += ` WHERE ${options.whereClause}`;
    }

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql);

    return options.pretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
  }

  /**
   * Export table data to Excel
   */
  async exportExcel(
    connectionId: string,
    database: string,
    table: string,
    options: {
      whereClause?: string;
      selectedColumns?: string[];
    } = {}
  ): Promise<Buffer> {
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    const columns = options.selectedColumns || ['*'];
    const columnList = columns.join(', ');

    let sql = `SELECT ${columnList} FROM \`${table}\``;
    if (options.whereClause) {
      sql += ` WHERE ${options.whereClause}`;
    }

    const { rows } = await connectionPoolManager.executeQuery(connectionId, sql);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(table);

    if (rows.length > 0) {
      // Add headers
      const headers = Object.keys(rows[0]);
      worksheet.addRow(headers);

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      rows.forEach((row: any) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Convert dates to proper format
          if (value instanceof Date) {
            return value;
          }
          // Convert null to empty string
          if (value === null) {
            return '';
          }
          return value;
        });
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });
    }

    // Write to buffer
    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  /**
   * Import JSON data into table
   */
  async importJSON(
    connectionId: string,
    database: string,
    table: string,
    jsonData: string,
    options: {
      truncateFirst?: boolean;
    } = {}
  ): Promise<{ jobId: string }> {
    const jobId = `import_json_${Date.now()}`;

    // Start import in background
    this.runJSONImport(connectionId, database, table, jsonData, options, jobId).catch((error) => {
      console.error('JSON import error:', error);
      const job = this.importJobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.errorMessages.push({ row: 0, message: error.message });
      }
    });

    return { jobId };
  }

  private async runJSONImport(
    connectionId: string,
    database: string,
    table: string,
    jsonData: string,
    options: {
      truncateFirst?: boolean;
    },
    jobId: string
  ): Promise<void> {
    const data = JSON.parse(jsonData);
    const rows = Array.isArray(data) ? data : [data];

    // Initialize job progress
    this.importJobs.set(jobId, {
      total: rows.length,
      processed: 0,
      errors: 0,
      status: 'processing',
      errorMessages: [],
    });

    const job = this.importJobs.get(jobId)!;

    // Use database
    await connectionPoolManager.executeQuery(connectionId, `USE \`${database}\``);

    // Truncate if requested
    if (options.truncateFirst) {
      await connectionPoolManager.executeQuery(connectionId, `TRUNCATE TABLE \`${table}\``);
    }

    // Get columns from first row
    const columns = Object.keys(rows[0] || {});

    // Import rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      if (job.status === 'cancelled') {
        break;
      }

      const batch = rows.slice(i, i + batchSize);

      try {
        const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const values = batch.flatMap((row) => columns.map((col) => row[col] ?? null));

        const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES ${placeholders}`;

        await connectionPoolManager.executeQuery(connectionId, sql, values);
        job.processed += batch.length;
      } catch (error: any) {
        job.errors += batch.length;
        job.errorMessages.push({
          row: i + 1,
          message: error.message,
        });
      }
    }

    job.status = job.errors > 0 ? 'error' : 'completed';
  }
}

// Export singleton instance
export const importExportService = new ImportExportService();
