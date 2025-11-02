import { schemaApi } from '../api/schema';

export interface SchemaContext {
  database: string;
  tables: TableInfo[];
  relationships: RelationshipInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface RelationshipInfo {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

/**
 * Extract complete schema context for AI model
 */
export async function extractSchemaContext(
  connectionId: string,
  currentDatabase: string | null
): Promise<SchemaContext | null> {
  if (!connectionId || !currentDatabase) {
    return null;
  }

  try {
    // Get all tables in current database
    const tables = await schemaApi.getTables(connectionId, currentDatabase);

    // Get detailed info for each table
    const tableInfoPromises = tables.map(async (table) => {
      const [columns, foreignKeysData] = await Promise.all([
        schemaApi.getColumns(connectionId, currentDatabase, table.name),
        schemaApi.getForeignKeys(connectionId, currentDatabase, table.name),
      ]);

      // Extract primary keys
      const primaryKeys = columns
        .filter((col) => col.key === 'PRI')
        .map((col) => col.name);

      // Map columns with additional metadata
      const columnInfo: ColumnInfo[] = columns.map((col) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable,
        isPrimaryKey: col.key === 'PRI',
        isForeignKey: col.key === 'MUL' || col.key === 'FOR',
      }));

      // Extract foreign keys
      const foreignKeys: ForeignKeyInfo[] = foreignKeysData.map((fk) => ({
        column: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn,
      }));

      return {
        name: table.name,
        columns: columnInfo,
        primaryKeys,
        foreignKeys,
      };
    });

    const tableInfos = await Promise.all(tableInfoPromises);

    // Extract relationships from foreign keys
    const relationships: RelationshipInfo[] = [];
    for (const table of tableInfos) {
      for (const fk of table.foreignKeys) {
        relationships.push({
          fromTable: table.name,
          fromColumn: fk.column,
          toTable: fk.referencedTable,
          toColumn: fk.referencedColumn,
        });
      }
    }

    return {
      database: currentDatabase,
      tables: tableInfos,
      relationships,
    };
  } catch (error) {
    console.error('Failed to extract schema context:', error);
    return null;
  }
}

/**
 * Convert schema context to a string format for AI model
 */
export function formatSchemaForPrompt(schema: SchemaContext): string {
  let prompt = `Database: ${schema.database}\n\n`;

  prompt += 'Tables:\n';
  for (const table of schema.tables) {
    prompt += `\n${table.name}:\n`;

    for (const col of table.columns) {
      const attrs = [];
      if (col.isPrimaryKey) attrs.push('PRIMARY KEY');
      if (col.isForeignKey) attrs.push('FOREIGN KEY');
      if (!col.nullable) attrs.push('NOT NULL');

      const attrStr = attrs.length > 0 ? ` (${attrs.join(', ')})` : '';
      prompt += `  - ${col.name}: ${col.type}${attrStr}\n`;
    }

    // Add foreign key relationships
    if (table.foreignKeys.length > 0) {
      prompt += '  Foreign Keys:\n';
      for (const fk of table.foreignKeys) {
        prompt += `    - ${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}\n`;
      }
    }
  }

  if (schema.relationships.length > 0) {
    prompt += '\nRelationships:\n';
    for (const rel of schema.relationships) {
      prompt += `  - ${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}\n`;
    }
  }

  return prompt;
}

/**
 * Find relevant tables based on user query
 */
export function findRelevantTables(
  schema: SchemaContext,
  userQuery: string
): string[] {
  const queryLower = userQuery.toLowerCase();
  const relevantTables = new Set<string>();

  // Check for explicit table name mentions
  for (const table of schema.tables) {
    const tableLower = table.name.toLowerCase();

    // Direct table name match
    if (queryLower.includes(tableLower)) {
      relevantTables.add(table.name);
    }

    // Check for singular/plural variations
    const singular = tableLower.endsWith('s') ? tableLower.slice(0, -1) : tableLower;
    const plural = tableLower.endsWith('s') ? tableLower : tableLower + 's';

    if (queryLower.includes(singular) || queryLower.includes(plural)) {
      relevantTables.add(table.name);
    }

    // Check for column name mentions
    for (const col of table.columns) {
      if (queryLower.includes(col.name.toLowerCase())) {
        relevantTables.add(table.name);
      }
    }
  }

  // Add related tables via foreign keys
  const initialTables = Array.from(relevantTables);
  for (const tableName of initialTables) {
    const table = schema.tables.find(t => t.name === tableName);
    if (table) {
      for (const fk of table.foreignKeys) {
        relevantTables.add(fk.referencedTable);
      }
    }
  }

  return Array.from(relevantTables);
}
