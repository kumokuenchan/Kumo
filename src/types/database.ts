export interface Database {
  name: string;
  charset: string;
  collation: string;
}

export interface Table {
  name: string;
  engine: string;
  rows: number;
  dataLength: number;
  autoIncrement?: number;
  collation: string;
  comment?: string;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default?: string;
  extra: string;
  comment?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ForeignKey {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affectedRows?: number;
  insertId?: number;
  warningCount?: number;
}

export interface QueryExecution {
  query: string;
  duration: number;
  timestamp: string;
  result?: QueryResult;
  error?: string;
}
