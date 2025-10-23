import { apiRequest } from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

export interface ImportProgress {
  total: number;
  processed: number;
  errors: number;
  status: 'processing' | 'completed' | 'error' | 'cancelled';
  errorMessages: Array<{ row: number; message: string }>;
}

export interface ImportJobResponse {
  jobId: string;
}

export interface ImportOptions {
  delimiter?: string;
  hasHeaders?: boolean;
  truncateFirst?: boolean;
}

export interface ExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  whereClause?: string;
  selectedColumns?: string[];
  pretty?: boolean;
}

/**
 * Import CSV file into table
 */
export async function importCSV(
  connectionId: string,
  database: string,
  table: string,
  file: File,
  options: ImportOptions = {}
): Promise<ImportJobResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.delimiter) formData.append('delimiter', options.delimiter);
  formData.append('hasHeaders', String(options.hasHeaders ?? true));
  formData.append('truncateFirst', String(options.truncateFirst ?? false));

  const url = `${API_BASE_URL}/import-export/${connectionId}/databases/${database}/tables/${table}/import/csv`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Import failed' }));
    throw new Error(error.message || 'Import failed');
  }

  return await response.json();
}

/**
 * Import JSON file into table
 */
export async function importJSON(
  connectionId: string,
  database: string,
  table: string,
  file: File,
  options: { truncateFirst?: boolean } = {}
): Promise<ImportJobResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('truncateFirst', String(options.truncateFirst ?? false));

  const url = `${API_BASE_URL}/import-export/${connectionId}/databases/${database}/tables/${table}/import/json`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Import failed' }));
    throw new Error(error.message || 'Import failed');
  }

  return await response.json();
}

/**
 * Export table data to CSV
 */
export async function exportCSV(
  connectionId: string,
  database: string,
  table: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options.delimiter) params.append('delimiter', options.delimiter);
  if (options.includeHeaders !== undefined)
    params.append('includeHeaders', String(options.includeHeaders));
  if (options.whereClause) params.append('whereClause', options.whereClause);
  if (options.selectedColumns)
    params.append('selectedColumns', JSON.stringify(options.selectedColumns));

  const url = `${API_BASE_URL}/import-export/${connectionId}/databases/${database}/tables/${table}/export/csv?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(error.message || 'Export failed');
  }

  return await response.blob();
}

/**
 * Export table data to JSON
 */
export async function exportJSON(
  connectionId: string,
  database: string,
  table: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options.whereClause) params.append('whereClause', options.whereClause);
  if (options.selectedColumns)
    params.append('selectedColumns', JSON.stringify(options.selectedColumns));
  if (options.pretty !== undefined) params.append('pretty', String(options.pretty));

  const url = `${API_BASE_URL}/import-export/${connectionId}/databases/${database}/tables/${table}/export/json?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(error.message || 'Export failed');
  }

  return await response.blob();
}

/**
 * Export table data to Excel
 */
export async function exportExcel(
  connectionId: string,
  database: string,
  table: string,
  options: ExportOptions = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options.whereClause) params.append('whereClause', options.whereClause);
  if (options.selectedColumns)
    params.append('selectedColumns', JSON.stringify(options.selectedColumns));

  const url = `${API_BASE_URL}/import-export/${connectionId}/databases/${database}/tables/${table}/export/excel?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(error.message || 'Export failed');
  }

  return await response.blob();
}

/**
 * Get import job progress
 */
export async function getImportProgress(jobId: string): Promise<ImportProgress> {
  return await apiRequest<ImportProgress>(`/import-export/jobs/${jobId}/progress`, {
    method: 'GET',
  });
}

/**
 * Cancel import job
 */
export async function cancelImport(jobId: string): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>(`/import-export/jobs/${jobId}/cancel`, {
    method: 'POST',
  });
}
