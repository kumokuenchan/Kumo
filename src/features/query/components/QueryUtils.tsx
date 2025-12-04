import { getTimezoneName } from '../../../utils/timezones';

// Get current time in selected timezone
export const getCurrentTimeInTimezone = (timezone?: string): string => {
  if (!timezone || timezone === 'UTC') {
    return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }

  if (timezone === 'default') {
    // For default, use local browser time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  const now = new Date();
  const match = timezone.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const [sign, tzHours, tzMinutes] = match.slice(1);
  const offsetInMinutes = parseInt(tzHours) * 60 + parseInt(tzMinutes);

  // Get the current UTC time in milliseconds
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;

  // Apply the timezone offset
  const targetTime = new Date(
    utcTime + (sign === '+' ? offsetInMinutes : -offsetInMinutes) * 60000,
  );

  // Format the date
  const year = targetTime.getFullYear();
  const month = String(targetTime.getMonth() + 1).padStart(2, '0');
  const day = String(targetTime.getDate()).padStart(2, '0');
  const hours = String(targetTime.getHours()).padStart(2, '0');
  const minutes = String(targetTime.getMinutes()).padStart(2, '0');
  const seconds = String(targetTime.getSeconds()).padStart(2, '0');

  // Get timezone name (e.g., "CST/SGT" from "GMT+08:00 (CST/SGT)")
  const tzName = getTimezoneName(timezone);

  // Format: "2025-12-04 21:43:55 (CST/SGT) (+08:00)"
  const tzNamePart = tzName ? `(${tzName}) ` : '';
  const tzOffsetPart = `(${timezone})`;

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${tzNamePart}${tzOffsetPart}`;
};

// Extract table names from SQL query including JOINed tables
export function extractTableNames(sql: string): string[] {
  if (!sql) return [];

  const tables = new Set<string>();

  // Match FROM clause - handles `database`.`table` or just `table`
  const fromMatch = sql.match(
    /FROM\s+(?:`?([a-zA-Z0-9_]+)`?\.)?`?([a-zA-Z0-9_]+)`?(?:\s+(?:AS\s+)?`?([a-zA-Z0-9_]+)`?)?/i,
  );
  if (fromMatch) {
    // If database.table format, use database.table, otherwise just table
    const tableName = fromMatch[1] ? `${fromMatch[1]}.${fromMatch[2]}` : fromMatch[2];
    tables.add(tableName);
  }

  // Match all JOIN clauses (INNER JOIN, LEFT JOIN, RIGHT JOIN, etc.)
  // Handles `database`.`table` or just `table`
  const joinRegex =
    /(?:INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN|JOIN)\s+(?:`?([a-zA-Z0-9_]+)`?\.)?`?([a-zA-Z0-9_]+)`?/gi;
  let joinMatch;
  while ((joinMatch = joinRegex.exec(sql)) !== null) {
    // If database.table format, use database.table, otherwise just table
    const tableName = joinMatch[1] ? `${joinMatch[1]}.${joinMatch[2]}` : joinMatch[2];
    tables.add(tableName);
  }

  return Array.from(tables);
}

// Try to extract a simple target table from the SQL
export const parseSimpleFrom = (
  sql?: string,
): { database: string | null; table: string | null } | null => {
  if (!sql) return null;
  const s0 = sql.replace(/\/\*[^]*?\*\//g, '').replace(/--.*$/gm, '');
  const s = s0.toLowerCase();
  if (/(\bjoin\b|\bunion\b|\bwith\b)/.test(s)) return null;
  if (/from\s*\(/.test(s)) return null; // subquery
  const m = /from\s+((`[^`]+`|\w+)\.)?(`[^`]+`|\w+)/i.exec(s0);
  if (!m) return null;
  const dbRaw = m[2];
  const tblRaw = m[3];
  const unquote = (x?: string | null) => (x ? x.replace(/^`|`$/g, '') : x);
  return { database: unquote(dbRaw) || null, table: unquote(tblRaw) || null };
};