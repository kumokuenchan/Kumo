import { apiRequest } from './client';

export interface TableLink {
  from: string; // "table.column"
  to: string; // "table.column"
  type?: 'INNER' | 'LEFT' | 'RIGHT';
}

export interface SmartJoinFilter {
  column: string; // "table.column"
  operator: string;
  value: any;
}

export interface SmartJoinRequest {
  database: string;
  tables: string[];
  links: TableLink[];
  filters?: SmartJoinFilter[];
  limit?: number;
  offset?: number;
}

export interface SmartJoinResult {
  sql: string;
  rows: any[];
  totalRows: number;
}

/**
 * Auto-detect foreign key relationships between tables
 */
export async function detectRelationships(
  connectionId: string,
  database: string,
  tables: string[]
): Promise<{ links: TableLink[] }> {
  return await apiRequest<{ links: TableLink[] }>(
    `/smart-join/${connectionId}/databases/${database}/detect-relationships`,
    {
      method: 'POST',
      body: JSON.stringify({ tables }),
    }
  );
}

/**
 * Generate SQL for smart join (preview)
 */
export async function generateSmartJoinSQL(
  connectionId: string,
  request: SmartJoinRequest
): Promise<{ sql: string }> {
  return await apiRequest<{ sql: string }>(`/smart-join/${connectionId}/generate-sql`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Execute smart join query
 */
export async function executeSmartJoin(
  connectionId: string,
  request: SmartJoinRequest
): Promise<SmartJoinResult> {
  return await apiRequest<SmartJoinResult>(`/smart-join/${connectionId}/execute`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
