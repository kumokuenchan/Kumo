import ExcelJS from 'exceljs';
import { QueryResult } from '../../../api/query';
import { formatDatetimeToMySQL } from './DateTimeDisplay';

interface ExportFunctionsProps {
  result: QueryResult;
  rows: any[];
  selectedTimezone?: string;
}

export function useExportFunctions({ result, rows, selectedTimezone }: ExportFunctionsProps) {
  // Export to CSV
  const exportToCSV = () => {
    if (result.type !== 'select' || !rows || !result.fields) return;

    const headers = result.fields.map((f) => f.name).join(',');
    const csvRows = rows
      .map((row) =>
        result
          .fields!.map((field) => {
            const value = row[field.name];
            if (value === null) return 'NULL';

            // Format datetime values for CSV export
            const formattedValue = formatDatetimeToMySQL(value, selectedTimezone);

            if (typeof formattedValue === 'string')
              return `"${formattedValue.replace(/"/g, '""')}"`;
            return formattedValue;
          })
          .join(','),
      )
      .join('\n');

    const csv = `${headers}\n${csvRows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJSON = () => {
    if (result.type !== 'select' || !rows) return;

    // Format datetime values in each row
    const formattedRows = rows.map((row) => {
      const formattedRow: any = {};
      Object.keys(row).forEach((key) => {
        formattedRow[key] = formatDatetimeToMySQL(row[key], selectedTimezone);
      });
      return formattedRow;
    });

    const json = JSON.stringify(formattedRows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel
  const exportToExcel = async () => {
    if (result.type !== 'select' || !rows || !result.fields) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Query Results');

      // Add headers
      const headers = result.fields.map((f) => f.name);
      worksheet.addRow(headers);

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Add data rows
      rows.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header];
          // Format datetime values
          const formattedValue = formatDatetimeToMySQL(value, selectedTimezone);
          // Convert null to empty string
          if (formattedValue === 'NULL') {
            return '';
          }
          return formattedValue;
        });
        worksheet.addRow(values);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_result_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to export to Excel');
    }
  };

  return {
    exportToCSV,
    exportToJSON,
    exportToExcel,
  };
}