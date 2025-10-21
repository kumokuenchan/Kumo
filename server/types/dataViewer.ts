/**
 * Data Viewer Types
 * Types for viewing and browsing table data
 */

export type SortDirection = 'ASC' | 'DESC';

export interface FilterCondition {
  column: string;
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'IS NULL' | 'IS NOT NULL' | 'IN';
  value?: any;
  values?: any[]; // For IN operator
}

export interface SortOption {
  column: string;
  direction: SortDirection;
}

export interface DataViewerQuery {
  database: string;
  table: string;
  page?: number;
  pageSize?: number;
  filters?: FilterCondition[];
  sort?: SortOption[];
  search?: string; // Global search across all text columns
}

export interface TableDataRow {
  [key: string]: any;
}

export interface TableDataResult {
  rows: TableDataRow[];
  columns: ColumnInfo[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key?: string;
  default?: string | null;
}

export interface TableStats {
  totalRows: number;
  totalSize: number; // in bytes
  avgRowLength: number;
  autoIncrement?: number;
  created: Date | null;
  updated: Date | null;
}

export interface DistinctValuesResult {
  column: string;
  values: any[];
  totalCount: number;
  truncated: boolean; // true if result was limited
}
