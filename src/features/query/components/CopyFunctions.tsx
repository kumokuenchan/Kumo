import { useCallback } from 'react';
import { QueryResult } from '../../../api/query';
import { formatDatetimeToMySQL } from './DateTimeDisplay';

interface CopyFunctionsProps {
  result: QueryResult;
  rows: any[];
  rowSelection: Record<string, boolean>;
  selectedTimezone?: string;
  stableSourceSql?: string;
  contextMenuCellValueRef: React.MutableRefObject<any>;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function useCopyFunctions({
  result,
  rows,
  rowSelection,
  selectedTimezone,
  stableSourceSql,
  contextMenuCellValueRef,
  setToast,
}: CopyFunctionsProps) {
  // Generate raw MySQL CLI-style output
  const generateRawQueryResult = useCallback(async () => {
    if (result.type !== 'select' || !result.fields || !rows) return;

    // Calculate column widths (max of header length and data length)
    const columnWidths: Record<string, number> = {};
    result.fields.forEach((field) => {
      columnWidths[field.name] = field.name.length;
    });

    rows.forEach((row) => {
      result.fields!.forEach((field) => {
        const value = row[field.name];
        const strValue = value === null ? 'NULL' : formatDatetimeToMySQL(value, selectedTimezone);
        columnWidths[field.name] = Math.max(columnWidths[field.name], strValue.length);
      });
    });

    // Build the border line
    const buildBorderLine = () => {
      const parts = result.fields!.map((field) => '-'.repeat(columnWidths[field.name] + 2));
      return '+' + parts.join('+') + '+';
    };

    // Build header row
    const buildHeaderRow = () => {
      const parts = result.fields!.map((field) => {
        const padding = columnWidths[field.name] - field.name.length;
        return ' ' + field.name + ' '.repeat(padding) + ' ';
      });
      return '|' + parts.join('|') + '|';
    };

    // Format value for MySQL output
    const formatValueForMySQL = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      return formatDatetimeToMySQL(value, selectedTimezone);
    };

    // Build data row
    const buildDataRow = (row: any) => {
      const parts = result.fields!.map((field) => {
        const value = row[field.name];
        const strValue = formatValueForMySQL(value);
        const padding = columnWidths[field.name] - strValue.length;
        return ' ' + strValue + ' '.repeat(padding) + ' ';
      });
      return '|' + parts.join('|') + '|';
    };

    // Reconstruct the SQL query and remove comments
    let sqlQuery = stableSourceSql || 'SELECT ...';
    // Remove single-line comments (-- ...)
    sqlQuery = sqlQuery.replace(/--.*$/gm, '');
    // Remove multi-line comments (/* ... */)
    sqlQuery = sqlQuery.replace(/\/\*[\s\S]*?\*\//g, '');
    // Clean up extra whitespace and newlines
    sqlQuery = sqlQuery.replace(/\s+/g, ' ').trim();

    // Build the complete output
    const lines: string[] = [];
    lines.push(`mysql> ${sqlQuery};`);
    lines.push(buildBorderLine());
    lines.push(buildHeaderRow());
    lines.push(buildBorderLine());
    rows.forEach((row) => {
      lines.push(buildDataRow(row));
    });
    lines.push(buildBorderLine());
    lines.push(
      `${rows.length} row${rows.length === 1 ? '' : 's'} in set (${(result.executionTime / 1000).toFixed(2)} sec)`,
    );
    lines.push('');

    const output = lines.join('\n');

    await navigator.clipboard.writeText(output);
    setToast({
      message: `Copied raw query result to clipboard`,
      type: 'success',
    });
  }, [result, rows, stableSourceSql, selectedTimezone, setToast]);

  // Copy cell value
  const copyCellValue = useCallback(async () => {
    const cellValue = contextMenuCellValueRef.current;
    if (cellValue === null || cellValue === undefined) {
      await navigator.clipboard.writeText('NULL');
    } else {
      await navigator.clipboard.writeText(formatDatetimeToMySQL(cellValue, selectedTimezone));
    }
    setToast({
      message: `Copied cell value to clipboard`,
      type: 'success',
    });
  }, [contextMenuCellValueRef, selectedTimezone, setToast]);

  // Copy column names
  const copyColumnNames = useCallback(async () => {
    if (!result.fields) return;
    const columnNames = result.fields.map((f) => f.name).join(', ');
    await navigator.clipboard.writeText(columnNames);
    setToast({
      message: `Copied ${result.fields.length} column names to clipboard`,
      type: 'success',
    });
  }, [result.fields, setToast]);

  // Copy as JSON
  const copyAsJSON = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const dataToExport =
      selectedIndices.length > 0 ? selectedIndices.map((idx) => rows[idx]).filter(Boolean) : rows;

    // Format datetime values in each row
    const formattedData = dataToExport.map((row) => {
      const formattedRow: any = {};
      Object.keys(row).forEach((key) => {
        formattedRow[key] = formatDatetimeToMySQL(row[key], selectedTimezone);
      });
      return formattedRow;
    });

    const json = JSON.stringify(formattedData, null, 2);
    await navigator.clipboard.writeText(json);
    setToast({
      message: `Copied ${dataToExport.length} ${dataToExport.length === 1 ? 'row' : 'rows'} as JSON to clipboard`,
      type: 'success',
    });
  }, [rowSelection, rows, selectedTimezone, setToast]);

  // Copy as TSV
  const copyAsTSV = useCallback(async () => {
    if (!result.fields) return;

    const selectedIndices = Object.keys(rowSelection).map(Number);
    const dataToExport =
      selectedIndices.length > 0 ? selectedIndices.map((idx) => rows[idx]).filter(Boolean) : rows;

    // Header row
    const header = result.fields.map((f) => f.name).join('\t');

    // Data rows
    const dataRows = dataToExport.map((row) => {
      return result
        .fields!.map((field) => {
          const value = row[field.name];
          if (value === null || value === undefined) return 'NULL';
          // Format datetime values
          return formatDatetimeToMySQL(value, selectedTimezone);
          return String(value);
        })
        .join('\t');
    });

    const tsv = [header, ...dataRows].join('\n');
    await navigator.clipboard.writeText(tsv);
    setToast({
      message: `Copied ${dataToExport.length} ${dataToExport.length === 1 ? 'row' : 'rows'} as TSV to clipboard`,
      type: 'success',
    });
  }, [result.fields, rowSelection, rows, selectedTimezone, setToast]);

  return {
    generateRawQueryResult,
    copyCellValue,
    copyColumnNames,
    copyAsJSON,
    copyAsTSV,
  };
}