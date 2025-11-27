import { useCallback } from 'react';
import { formatDatetimeToMySQL } from './DateTimeDisplay';

interface QueryGeneratorProps {
  rows: any[];
  result: any;
  effectiveDb: string | null;
  effectiveTable: string | null;
  pkColumns: string[];
  rowSelection: Record<string, boolean>;
  selectedTimezone?: string;
  onToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

export const useQueryGenerator = ({
  rows,
  result,
  effectiveDb,
  effectiveTable,
  pkColumns,
  rowSelection,
  selectedTimezone,
  onToast,
}: QueryGeneratorProps) => {
  // Generate UPDATE query for selected rows
  const generateUpdateQuery = useCallback(
    (targetColumn: string) => {
      const selectedIndices = Object.keys(rowSelection).map(Number);
      if (selectedIndices.length === 0) return;

      const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
      if (!effectiveTable || selectedRowData.length === 0) return;

      if (!targetColumn) return;

      const queries: string[] = [];

      selectedRowData.forEach((row) => {
        const tableName = effectiveDb
          ? `\`${effectiveDb}\`.\`${effectiveTable}\``
          : `\`${effectiveTable}\``;

        // Build SET clause (only the target column)
        const colValue = row[targetColumn];
        const formattedColValue =
          colValue === null || colValue === undefined
            ? 'NULL'
            : typeof colValue === 'string'
              ? `'${formatDatetimeToMySQL(colValue, selectedTimezone).replace(/'/g, "''")}'`
              : formatDatetimeToMySQL(colValue, selectedTimezone);
        const setClause = `\`${targetColumn}\` = ${formattedColValue}`;

        // Build WHERE clause (using PKs or all columns if no PK)
        let whereClause = '';
        if (pkColumns.length > 0) {
          whereClause = pkColumns
            .map((pk) => {
              const pkValue = row[pk];
              const formattedPkValue =
                pkValue === null || pkValue === undefined
                  ? 'NULL'
                  : typeof pkValue === 'string'
                    ? `'${formatDatetimeToMySQL(pkValue, selectedTimezone).replace(/'/g, "''")}'`
                    : formatDatetimeToMySQL(pkValue, selectedTimezone);
              return `\`${pk}\` = ${formattedPkValue}`;
            })
            .join(' AND ');
        } else {
          // No PK, use all columns
          whereClause =
            result.fields
              ?.map((f: any) => {
                const fieldValue = row[f.name];
                const formattedFieldValue =
                  fieldValue === null || fieldValue === undefined
                    ? 'NULL'
                    : typeof fieldValue === 'string'
                      ? `'${formatDatetimeToMySQL(fieldValue, selectedTimezone).replace(/'/g, "''")}'`
                      : formatDatetimeToMySQL(fieldValue, selectedTimezone);
                return `\`\`${f.name}\` = ${formattedFieldValue}`;
              })
              .join(' AND ') || '';

        }

        queries.push(`UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`);
      });

      const finalQuery = queries.join('\n');

      // Copy to clipboard synchronously
      navigator.clipboard
        .writeText(finalQuery)
        .then(() => {
          onToast({
            message: `Copied ${queries.length} UPDATE ${queries.length === 1 ? 'query' : 'queries'} for column '${targetColumn}' to clipboard`,
            type: 'success',
          });
        })
        .catch(() => {
          onToast({
            message: `Failed to copy to clipboard`,
            type: 'error',
          });
        });
    },
    [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields, selectedTimezone, onToast],
  );

  // Generate CREATE TABLE AS

  const generateCreateTableAs = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const sourceTable = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    // Build WHERE clause based on PKs
    let whereClause = '';
    if (pkColumns.length === 1) {
      const pkName = pkColumns[0];
      const pkValues = selectedRowData.map((row) => {
        const pkValue = row[pkName];
        return pkValue === null || pkValue === undefined
          ? 'NULL'
          : typeof pkValue === 'string'
            ? `'${pkValue.replace(/'/g, "''")}'`
            : pkValue;
      });
      whereClause = `WHERE \`${pkName}\` IN (${pkValues.join(', ')})`;
    } else if (pkColumns.length > 0) {
      // Composite primary key
      const conditions = selectedRowData.map((row) => {
        const pkConditions = pkColumns
          .map((pk) => {
            const pkValue = row[pk];
            const formattedValue =
              pkValue === null || pkValue === undefined
                ? 'NULL'
                : typeof pkValue === 'string'
                  ? `'${pkValue.replace(/'/g, "''")}'`
                  : pkValue;
            return `\`${pk}\` = ${formattedValue}`;
          })
          .join(' AND ');
        return `(${pkConditions})`;
      });
      whereClause = `WHERE ${conditions.join(' OR ')}`;
    } else {
      // No PK - use all columns
      const conditions = selectedRowData.map((row) => {
        const allConditions =
          result.fields
            ?.map((f: any) => {
              const value = row[f.name];
              const formattedValue =
                value === null || value === undefined
                  ? 'NULL'
                  : typeof value === 'string'
                    ? `'${value.replace(/'/g, "''")}'`
                    : value;
              return `\`${f.name}\` = ${formattedValue}`;
            })
            .join(' AND ') || '';

        return `(${allConditions})`;
      });
      whereClause = `WHERE ${conditions.join(' OR ')}`;
    }

    const createTableQuery = `CREATE TABLE new_table AS\nSELECT * FROM ${sourceTable}\n${whereClause};`;

    await navigator.clipboard.writeText(createTableQuery);
    onToast({
      message: `Copied CREATE TABLE AS query to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields, onToast]);

  // Generate INSERT query for selected rows
  const generateInsertQuery = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const tableName = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    // Get all column names from the first row
    const columnNames = result.fields?.map((f: any) => f.name) || [];
    const columnsClause = columnNames.map((col: any) => `\`${col}`).join(', ');


    // Build VALUES clauses for each row
    const valuesClauses = selectedRowData.map((row) => {
      const values = columnNames.map((col) => {
        const value = row[col];
        if (value === null || value === undefined) {
          return 'NULL';
        } else if (typeof value === 'string') {
          return `'${formatDatetimeToMySQL(value, selectedTimezone).replace(/'/g, "''")}'`;
        } else {
          return formatDatetimeToMySQL(value, selectedTimezone);
        }
      });
      return `(${values.join(', ')})`;
    });

    // Generate single INSERT with multiple VALUES
    const insertQuery = `INSERT INTO ${tableName} (${columnsClause}) VALUES\n${valuesClauses.join(',\n')};`;

    await navigator.clipboard.writeText(insertQuery);
    onToast({
      message: `Copied INSERT query for ${selectedRowData.length} ${selectedRowData.length === 1 ? 'row' : 'rows'} to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, result.fields, onToast]);

  // Generate DELETE query for selected rows
  const generateDeleteQuery = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedRowData = selectedIndices.map((idx) => rows[idx]).filter(Boolean);
    if (!effectiveTable || selectedRowData.length === 0) return;

    const tableName = effectiveDb
      ? `\`${effectiveDb}\`.\`${effectiveTable}\``
      : `\`${effectiveTable}\``;

    let deleteQuery = '';

    // If we have a single primary key, use IN clause
    if (pkColumns.length === 1) {
      const pkName = pkColumns[0];
      const pkValues = selectedRowData.map((row) => {
        const pkValue = row[pkName];
        return pkValue === null || pkValue === undefined
          ? 'NULL'
          : typeof pkValue === 'string'
            ? `'${pkValue.replace(/'/g, "''")}'`
            : pkValue;
      });
      deleteQuery = `DELETE FROM ${tableName} WHERE \`${pkName}\` IN (${pkValues.join(', ')})`;
    }
    // If we have multiple primary keys, use OR conditions
    else if (pkColumns.length > 1) {
      const conditions = selectedRowData.map((row) => {
        const pkConditions = pkColumns
          .map((pk) => {
            const pkValue = row[pk];
            const formattedValue =
              pkValue === null || pkValue === undefined
                ? 'NULL'
                : typeof pkValue === 'string'
                  ? `'${pkValue.replace(/'/g, "''")}'`
                  : pkValue;
            return `\`${pk}\` = ${formattedValue}`;
          })
          .join(' AND ');
        return `(${pkConditions})`;
      });
      deleteQuery = `DELETE FROM ${tableName} WHERE ${conditions.join(' OR ')}`;
    }
    // No PKs - use all columns
    else {
      const conditions = selectedRowData.map((row) => {
        const allConditions =
          result.fields
            ?.map((f: any) => {
              const value = row[f.name];
              const formattedValue =
                value === null || value === undefined
                  ? 'NULL'
                  : typeof value === 'string'
                    ? `'${value.replace(/'/g, "''")}'`
                    : value;
              return `\`\`${f.name}\` = ${formattedValue}`;
            })
            .join(' AND ') || '';

        return `(${allConditions})`;
      });
      deleteQuery = `DELETE FROM ${tableName} WHERE ${conditions.join(' OR ')}`;
    }

    await navigator.clipboard.writeText(deleteQuery);
    onToast({
      message: `Copied DELETE query for ${selectedRowData.length} ${selectedRowData.length === 1 ? 'row' : 'rows'} to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, effectiveTable, effectiveDb, pkColumns, result.fields, onToast]);

  return {
    generateUpdateQuery,
    generateCreateTableAs,
    generateInsertQuery,
    generateDeleteQuery,
  };
};