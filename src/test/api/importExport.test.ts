import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  importCSV,
  importJSON,
  exportCSV,
  exportJSON,
  exportExcel,
  getImportProgress,
  cancelImport,
  exportSQL,
  importSQL,
  type ImportOptions,
  type ExportOptions,
} from '../../api/importExport';
import { apiRequest } from '../../api/client';

// Mock the apiRequest function
vi.mock('../../api/client', () => ({
  apiRequest: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('importExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importCSV', () => {
    it('should import CSV file with default options', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';
      const file = new File(['id,name,email\n1,John,john@example.com'], 'users.csv', { type: 'text/csv' });

      const mockResponse = { jobId: 'job-123' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importCSV(connectionId, database, table, file);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/import/csv`,
        {
          method: 'POST',
          body: expect.any(FormData),
        }
      );

      // Check that FormData contains the file and default options
      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('hasHeaders')).toBe('true');
      expect(formData.get('truncateFirst')).toBe('false');

      expect(result).toEqual(mockResponse);
    });

    it('should import CSV with custom options', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';
      const file = new File(['name,price\nWidget,9.99'], 'products.csv', { type: 'text/csv' });

      const options: ImportOptions = {
        delimiter: ';',
        hasHeaders: false,
        truncateFirst: true,
      };

      const mockResponse = { jobId: 'job-456' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importCSV(connectionId, database, table, file, options);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/import-export/${connectionId}/databases/${database}/tables/${table}/import/csv`),
        {
          method: 'POST',
          body: expect.any(FormData),
        }
      );

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('delimiter')).toBe(';');
      expect(formData.get('hasHeaders')).toBe('false');
      expect(formData.get('truncateFirst')).toBe('true');

      expect(result).toEqual(mockResponse);
    });

    it('should throw error for failed import', async () => {
      const connectionId = 'conn-789';
      const database = 'testdb';
      const table = 'users';
      const file = new File(['id,name'], 'users.csv', { type: 'text/csv' });

      const errorResponse = { message: 'Invalid CSV format' };
      const mockFetchResponse = new Response(JSON.stringify(errorResponse), { status: 400 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      await expect(importCSV(connectionId, database, table, file)).rejects.toThrow('Invalid CSV format');
    });
  });

  describe('importJSON', () => {
    it('should import JSON file with default options', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';
      const file = new File([JSON.stringify([{ id: 1, name: 'John' }])], 'users.json', { type: 'application/json' });

      const mockResponse = { jobId: 'job-789' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importJSON(connectionId, database, table, file);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/import/json`,
        {
          method: 'POST',
          body: expect.any(FormData),
        }
      );

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('truncateFirst')).toBe('false');

      expect(result).toEqual(mockResponse);
    });

    it('should import JSON with truncate option', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';
      const file = new File([JSON.stringify([{ name: 'Widget' }])], 'products.json', { type: 'application/json' });

      const options = { truncateFirst: true };

      const mockResponse = { jobId: 'job-999' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importJSON(connectionId, database, table, file, options);

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('truncateFirst')).toBe('true');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportCSV', () => {
    it('should export table to CSV with default options', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';

      const mockBlob = new Blob(['id,name,email\n1,John,john@example.com'], { type: 'text/csv' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportCSV(connectionId, database, table);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/csv?`
      );

      expect(result).toEqual(mockBlob);
    });

    it('should export CSV with custom options', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';

      const options: ExportOptions = {
        delimiter: ';',
        includeHeaders: false,
        whereClause: 'price > 10',
        selectedColumns: ['name', 'price'],
      };

      const mockBlob = new Blob(['Widget;12.99\nGadget;15.99'], { type: 'text/csv' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportCSV(connectionId, database, table, options);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/csv?delimiter=%3B&includeHeaders=false&whereClause=price+%3E+10&selectedColumns=%5B%22name%22%2C%22price%22%5D`
      );

      expect(result).toEqual(mockBlob);
    });

    it('should throw error for failed export', async () => {
      const connectionId = 'conn-789';
      const database = 'testdb';
      const table = 'users';

      const errorResponse = { message: 'Table not found' };
      const mockResponse = new Response(JSON.stringify(errorResponse), { status: 404 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(exportCSV(connectionId, database, table)).rejects.toThrow('Table not found');
    });
  });

  describe('exportJSON', () => {
    it('should export table to JSON with default options', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';

      const mockBlob = new Blob([JSON.stringify([{ id: 1, name: 'John' }])], { type: 'application/json' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportJSON(connectionId, database, table);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/json?`
      );

      expect(result).toEqual(mockBlob);
    });

    it('should export JSON with custom options', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';

      const options: ExportOptions = {
        whereClause: 'active = true',
        selectedColumns: ['name', 'price'],
        pretty: true,
      };

      const mockBlob = new Blob([JSON.stringify([{ name: 'Widget', price: 9.99 }], null, 2)], { type: 'application/json' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportJSON(connectionId, database, table, options);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/json?whereClause=active+%3D+true&selectedColumns=%5B%22name%22%2C%22price%22%5D&pretty=true`
      );

      expect(result).toEqual(mockBlob);
    });
  });

  describe('exportExcel', () => {
    it('should export table to Excel format', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';

      const mockBlob = new Buffer('mock excel data');
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportExcel(connectionId, database, table);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/excel?`
      );

      expect(result).toEqual(mockBlob);
    });

    it('should export Excel with selected columns and where clause', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';
      const table = 'products';

      const options: ExportOptions = {
        whereClause: 'category = "electronics"',
        selectedColumns: ['name', 'price'],
      };

      const mockBlob = new Buffer('mock excel data');
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportExcel(connectionId, database, table, options);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/tables/${table}/export/excel?whereClause=category+%3D+%22electronics%22&selectedColumns=%5B%22name%22%2C%22price%22%5D`
      );

      expect(result).toEqual(mockBlob);
    });
  });

  describe('getImportProgress', () => {
    it('should get import job progress', async () => {
      const jobId = 'job-123';
      const mockProgress = {
        total: 1000,
        processed: 500,
        errors: 2,
        status: 'processing' as const,
        errorMessages: [
          { row: 25, message: 'Invalid email format' },
          { row: 47, message: 'Duplicate key' },
        ],
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockProgress);

      const result = await getImportProgress(jobId);

      expect(apiRequest).toHaveBeenCalledWith(`/import-export/jobs/${jobId}/progress`, {
        method: 'GET',
      });

      expect(result).toEqual(mockProgress);
    });

    it('should handle completed import job', async () => {
      const jobId = 'job-456';
      const mockProgress = {
        total: 100,
        processed: 100,
        errors: 0,
        status: 'completed' as const,
        errorMessages: [],
      };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockProgress);

      const result = await getImportProgress(jobId);

      expect(result).toEqual(mockProgress);
    });
  });

  describe('cancelImport', () => {
    it('should cancel import job', async () => {
      const jobId = 'job-123';
      const mockResponse = { success: true };

      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockResolvedValue(mockResponse);

      const result = await cancelImport(jobId);

      expect(apiRequest).toHaveBeenCalledWith(`/import-export/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportSQL', () => {
    it('should export database to SQL with default options', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';

      const mockBlob = new Blob(['CREATE TABLE users...', 'INSERT INTO users...'], { type: 'application/sql' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportSQL(connectionId, database);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/export/sql?`
      );

      expect(result).toEqual(mockBlob);
    });

    it('should export SQL with custom options', async () => {
      const connectionId = 'conn-456';
      const database = 'testdb';

      const options = {
        tables: ['users', 'products'],
        includeData: true,
        includeDropTable: false,
      };

      const mockBlob = new Blob(['CREATE TABLE users...'], { type: 'application/sql' });
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      const result = await exportSQL(connectionId, database, options);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/databases/${database}/export/sql?tables=%5B%22users%22%2C%22products%22%5D&includeData=true&includeDropTable=false`
      );

      expect(result).toEqual(mockBlob);
    });
  });

  describe('importSQL', () => {
    it('should import SQL dump file with default options', async () => {
      const connectionId = 'conn-123';
      const file = new File(['CREATE TABLE users...'], 'dump.sql', { type: 'application/sql' });

      const mockResponse = { jobId: 'job-789' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importSQL(connectionId, file);

      expect(fetch).toHaveBeenCalledWith(
        `/api/import-export/${connectionId}/import/sql`,
        {
          method: 'POST',
          body: expect.any(FormData),
        }
      );

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('continueOnError')).toBe('false');

      expect(result).toEqual(mockResponse);
    });

    it('should import SQL with continue on error option', async () => {
      const connectionId = 'conn-456';
      const file = new File(['CREATE TABLE users...'], 'dump.sql', { type: 'application/sql' });

      const options = { continueOnError: true };

      const mockResponse = { jobId: 'job-999' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      const result = await importSQL(connectionId, file, options);

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('continueOnError')).toBe('true');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors in import responses', async () => {
      const connectionId = 'conn-123';
      const database = 'testdb';
      const table = 'users';
      const file = new File(['id,name'], 'users.csv', { type: 'text/csv' });

      const mockResponse = new Response('Not a valid JSON', { status: 400 });
      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await expect(importCSV(connectionId, database, table, file)).rejects.toThrow('Import failed');
    });

    it('should handle network failures', async () => {
      (apiRequest as vi.MockedFunction<typeof apiRequest>).mockRejectedValue(new Error('Network Error'));

      await expect(getImportProgress('job-123')).rejects.toThrow('Network Error');
    });
  });

  describe('Type Safety', () => {
    it('should preserve ImportOptions types', async () => {
      const options: ImportOptions = {
        delimiter: 'string',
        hasHeaders: true,
        truncateFirst: false,
      };

      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const mockResponse = { jobId: 'job-123' };
      const mockFetchResponse = new Response(JSON.stringify(mockResponse), { status: 200 });

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockFetchResponse);

      await importCSV('conn-123', 'testdb', 'users', file, options);

      const formData = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as FormData;
      expect(formData.get('delimiter')).toBe('string');
      expect(formData.get('hasHeaders')).toBe('true');
      expect(formData.get('truncateFirst')).toBe('false');
    });

    it('should preserve ExportOptions types', async () => {
      const options: ExportOptions = {
        delimiter: 'string',
        includeHeaders: true,
        whereClause: 'string',
        selectedColumns: ['string'],
        pretty: true,
      };

      const mockBlob = new Blob(['test']);
      const mockResponse = new Response(mockBlob);
      mockResponse.blob = vi.fn().mockResolvedValue(mockBlob);

      (fetch as vi.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse);

      await exportCSV('conn-123', 'testdb', 'users', options);

      // The URL should contain all the parameters
      const url = (fetch as vi.MockedFunction<typeof fetch>).mock.calls[0][0] as string;
      expect(url).toContain('delimiter=string');
      expect(url).toContain('includeHeaders=true');
      expect(url).toContain('whereClause=string');
      expect(url).toContain('selectedColumns=');
    });
  });
});