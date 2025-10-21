/**
 * Query Builder AST Types
 * These types represent the structure of a visual query builder
 */

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' | 'CROSS';
export type ComparisonOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';
export type LogicalOperator = 'AND' | 'OR';
export type SortDirection = 'ASC' | 'DESC';
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

/**
 * Represents a table in the query
 */
export interface QueryTable {
  name: string;
  alias?: string;
  database?: string;
}

/**
 * Represents a column selection
 */
export interface QueryColumn {
  table: string; // table name or alias
  column: string; // column name or * for all
  alias?: string;
  aggregateFunction?: AggregateFunction;
}

/**
 * Represents a JOIN operation
 */
export interface QueryJoin {
  type: JoinType;
  table: QueryTable;
  onConditions: QueryCondition[];
}

/**
 * Represents a WHERE/HAVING condition
 */
export interface QueryCondition {
  column: string; // table.column format
  operator: ComparisonOperator;
  value?: any; // Value for comparison (not needed for IS NULL/IS NOT NULL)
  values?: any[]; // Array of values for IN/NOT IN/BETWEEN
  logicalOperator?: LogicalOperator; // How this condition connects to the next one
}

/**
 * Represents an ORDER BY clause
 */
export interface QueryOrderBy {
  column: string; // table.column format
  direction: SortDirection;
}

/**
 * Represents a GROUP BY clause
 */
export interface QueryGroupBy {
  columns: string[]; // Array of table.column format
  having?: QueryCondition[];
}

/**
 * Complete query builder AST
 */
export interface QueryBuilderAST {
  select: QueryColumn[];
  from: QueryTable;
  joins?: QueryJoin[];
  where?: QueryCondition[];
  groupBy?: QueryGroupBy;
  orderBy?: QueryOrderBy[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

/**
 * Validation result
 */
export interface QueryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * SQL generation result
 */
export interface SQLGenerationResult {
  sql: string;
  params?: any[]; // For prepared statements
  validation: QueryValidationResult;
}
