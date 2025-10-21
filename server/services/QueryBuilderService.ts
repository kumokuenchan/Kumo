import {
  QueryBuilderAST,
  QueryTable,
  QueryColumn,
  QueryJoin,
  QueryCondition,
  QueryOrderBy,
  QueryValidationResult,
  SQLGenerationResult,
  ComparisonOperator,
} from '../types/queryBuilder.js';

class QueryBuilderService {
  /**
   * Generate SQL from query builder AST
   */
  generateSQL(ast: QueryBuilderAST): SQLGenerationResult {
    // First validate the AST
    const validation = this.validateQuery(ast);

    if (!validation.valid) {
      return {
        sql: '',
        validation,
      };
    }

    try {
      const sql = this.buildSQLQuery(ast);
      return {
        sql,
        validation,
      };
    } catch (error: any) {
      return {
        sql: '',
        validation: {
          valid: false,
          errors: [error.message || 'Failed to generate SQL'],
          warnings: validation.warnings,
        },
      };
    }
  }

  /**
   * Validate query builder AST
   */
  validateQuery(ast: QueryBuilderAST): QueryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate SELECT clause
    if (!ast.select || ast.select.length === 0) {
      errors.push('SELECT clause is required and must have at least one column');
    }

    // Validate FROM clause
    if (!ast.from || !ast.from.name) {
      errors.push('FROM clause is required and must specify a table');
    }

    // Validate table names
    if (ast.from && !this.isValidIdentifier(ast.from.name)) {
      errors.push(`Invalid table name: ${ast.from.name}`);
    }

    // Validate column selections
    ast.select.forEach((col, index) => {
      if (!col.column) {
        errors.push(`Column at index ${index} is missing column name`);
      }
      if (col.alias && !this.isValidIdentifier(col.alias)) {
        errors.push(`Invalid alias: ${col.alias}`);
      }
    });

    // Validate JOINs
    if (ast.joins) {
      ast.joins.forEach((join, index) => {
        if (!join.table || !join.table.name) {
          errors.push(`JOIN at index ${index} is missing table name`);
        }
        if (!join.onConditions || join.onConditions.length === 0) {
          errors.push(`JOIN at index ${index} is missing ON conditions`);
        }
      });
    }

    // Validate WHERE conditions
    if (ast.where) {
      ast.where.forEach((condition, index) => {
        this.validateCondition(condition, index, 'WHERE', errors);
      });
    }

    // Validate GROUP BY and HAVING
    if (ast.groupBy) {
      if (!ast.groupBy.columns || ast.groupBy.columns.length === 0) {
        errors.push('GROUP BY must specify at least one column');
      }
      if (ast.groupBy.having) {
        ast.groupBy.having.forEach((condition, index) => {
          this.validateCondition(condition, index, 'HAVING', errors);
        });
      }

      // Warning: SELECT columns should be in GROUP BY or use aggregate functions
      ast.select.forEach((col) => {
        if (col.column !== '*' && !col.aggregateFunction) {
          const fullColumn = `${col.table}.${col.column}`;
          if (!ast.groupBy!.columns.includes(fullColumn) && !ast.groupBy!.columns.includes(col.column)) {
            warnings.push(`Column ${fullColumn} should be in GROUP BY clause or use an aggregate function`);
          }
        }
      });
    }

    // Validate LIMIT
    if (ast.limit !== undefined && (ast.limit < 0 || !Number.isInteger(ast.limit))) {
      errors.push('LIMIT must be a non-negative integer');
    }

    // Validate OFFSET
    if (ast.offset !== undefined && (ast.offset < 0 || !Number.isInteger(ast.offset))) {
      errors.push('OFFSET must be a non-negative integer');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build the complete SQL query from AST
   */
  private buildSQLQuery(ast: QueryBuilderAST): string {
    const parts: string[] = [];

    // SELECT clause
    parts.push(this.buildSelectClause(ast.select, ast.distinct));

    // FROM clause
    parts.push(this.buildFromClause(ast.from));

    // JOINs
    if (ast.joins && ast.joins.length > 0) {
      parts.push(this.buildJoinClauses(ast.joins));
    }

    // WHERE clause
    if (ast.where && ast.where.length > 0) {
      parts.push(this.buildWhereClause(ast.where));
    }

    // GROUP BY clause
    if (ast.groupBy) {
      parts.push(this.buildGroupByClause(ast.groupBy));
    }

    // ORDER BY clause
    if (ast.orderBy && ast.orderBy.length > 0) {
      parts.push(this.buildOrderByClause(ast.orderBy));
    }

    // LIMIT clause
    if (ast.limit !== undefined) {
      parts.push(`LIMIT ${ast.limit}`);
    }

    // OFFSET clause
    if (ast.offset !== undefined) {
      parts.push(`OFFSET ${ast.offset}`);
    }

    return parts.join('\n');
  }

  /**
   * Build SELECT clause
   */
  private buildSelectClause(columns: QueryColumn[], distinct: boolean = false): string {
    const distinctKeyword = distinct ? 'DISTINCT ' : '';
    const columnParts = columns.map((col) => {
      let columnStr = '';

      if (col.aggregateFunction) {
        columnStr = `${col.aggregateFunction}(${col.table}.${this.escapeIdentifier(col.column)})`;
      } else if (col.column === '*') {
        columnStr = col.table ? `${this.escapeIdentifier(col.table)}.*` : '*';
      } else {
        columnStr = `${this.escapeIdentifier(col.table)}.${this.escapeIdentifier(col.column)}`;
      }

      if (col.alias) {
        columnStr += ` AS ${this.escapeIdentifier(col.alias)}`;
      }

      return columnStr;
    });

    return `SELECT ${distinctKeyword}${columnParts.join(', ')}`;
  }

  /**
   * Build FROM clause
   */
  private buildFromClause(table: QueryTable): string {
    let fromStr = 'FROM ';

    if (table.database) {
      fromStr += `${this.escapeIdentifier(table.database)}.`;
    }

    fromStr += this.escapeIdentifier(table.name);

    if (table.alias) {
      fromStr += ` AS ${this.escapeIdentifier(table.alias)}`;
    }

    return fromStr;
  }

  /**
   * Build JOIN clauses
   */
  private buildJoinClauses(joins: QueryJoin[]): string {
    return joins.map((join) => {
      let joinStr = `${join.type} JOIN `;

      if (join.table.database) {
        joinStr += `${this.escapeIdentifier(join.table.database)}.`;
      }

      joinStr += this.escapeIdentifier(join.table.name);

      if (join.table.alias) {
        joinStr += ` AS ${this.escapeIdentifier(join.table.alias)}`;
      }

      joinStr += ' ON ';
      joinStr += this.buildConditions(join.onConditions);

      return joinStr;
    }).join('\n');
  }

  /**
   * Build WHERE clause
   */
  private buildWhereClause(conditions: QueryCondition[]): string {
    return `WHERE ${this.buildConditions(conditions)}`;
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(groupBy: { columns: string[]; having?: QueryCondition[] }): string {
    let groupByStr = `GROUP BY ${groupBy.columns.map(col => this.escapeColumnRef(col)).join(', ')}`;

    if (groupBy.having && groupBy.having.length > 0) {
      groupByStr += `\nHAVING ${this.buildConditions(groupBy.having)}`;
    }

    return groupByStr;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(orderBy: QueryOrderBy[]): string {
    const orderParts = orderBy.map((order) => {
      return `${this.escapeColumnRef(order.column)} ${order.direction}`;
    });

    return `ORDER BY ${orderParts.join(', ')}`;
  }

  /**
   * Build conditions (for WHERE, HAVING, ON)
   */
  private buildConditions(conditions: QueryCondition[]): string {
    const parts: string[] = [];

    conditions.forEach((condition, index) => {
      const columnRef = this.escapeColumnRef(condition.column);
      let conditionStr = '';

      switch (condition.operator) {
        case 'IS NULL':
          conditionStr = `${columnRef} IS NULL`;
          break;
        case 'IS NOT NULL':
          conditionStr = `${columnRef} IS NOT NULL`;
          break;
        case 'IN':
        case 'NOT IN':
          if (condition.values && condition.values.length > 0) {
            const valueStr = condition.values.map(v => this.escapeValue(v)).join(', ');
            conditionStr = `${columnRef} ${condition.operator} (${valueStr})`;
          }
          break;
        case 'BETWEEN':
          if (condition.values && condition.values.length === 2) {
            conditionStr = `${columnRef} BETWEEN ${this.escapeValue(condition.values[0])} AND ${this.escapeValue(condition.values[1])}`;
          }
          break;
        default:
          // =, !=, <, >, <=, >=, LIKE
          conditionStr = `${columnRef} ${condition.operator} ${this.escapeValue(condition.value)}`;
      }

      parts.push(conditionStr);

      // Add logical operator if not the last condition
      if (index < conditions.length - 1 && condition.logicalOperator) {
        parts.push(condition.logicalOperator);
      }
    });

    return parts.join(' ');
  }

  /**
   * Validate a single condition
   */
  private validateCondition(
    condition: QueryCondition,
    index: number,
    clauseType: string,
    errors: string[]
  ): void {
    if (!condition.column) {
      errors.push(`${clauseType} condition at index ${index} is missing column`);
    }

    if (!condition.operator) {
      errors.push(`${clauseType} condition at index ${index} is missing operator`);
    }

    // Check value requirements based on operator
    if (['=', '!=', '<', '>', '<=', '>=', 'LIKE'].includes(condition.operator)) {
      if (condition.value === undefined) {
        errors.push(`${clauseType} condition at index ${index} with operator ${condition.operator} requires a value`);
      }
    }

    if (['IN', 'NOT IN'].includes(condition.operator)) {
      if (!condition.values || condition.values.length === 0) {
        errors.push(`${clauseType} condition at index ${index} with operator ${condition.operator} requires values array`);
      }
    }

    if (condition.operator === 'BETWEEN') {
      if (!condition.values || condition.values.length !== 2) {
        errors.push(`${clauseType} condition at index ${index} with BETWEEN operator requires exactly 2 values`);
      }
    }
  }

  /**
   * Escape column reference (table.column)
   */
  private escapeColumnRef(columnRef: string): string {
    const parts = columnRef.split('.');
    return parts.map(part => this.escapeIdentifier(part)).join('.');
  }

  /**
   * Escape identifier (table/column name)
   */
  private escapeIdentifier(identifier: string): string {
    // Use backticks for MySQL
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Escape value for SQL
   */
  private escapeValue(value: any): string {
    if (value === null) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      // Escape single quotes
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    if (value instanceof Date) {
      return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }

    // Default: convert to string
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Check if identifier is valid
   */
  private isValidIdentifier(identifier: string): boolean {
    // MySQL identifier rules: 1-64 chars, can contain letters, digits, $, _
    const validPattern = /^[a-zA-Z0-9$_]{1,64}$/;
    return validPattern.test(identifier);
  }
}

// Export singleton instance
export const queryBuilderService = new QueryBuilderService();
