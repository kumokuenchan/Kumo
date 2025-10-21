import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataViewerApi } from '../api/dataViewer';
import type {
  DataViewerQuery,
  GetTableDataResponse,
  GetColumnsResponse,
  GetStatsResponse,
  GetDistinctValuesResponse,
} from '../types/dataViewer';

/**
 * Hook to fetch table data with pagination, filtering, and sorting
 */
export function useTableData(
  connectionId: string | null,
  query: DataViewerQuery,
  enabled: boolean = true
) {
  return useQuery<GetTableDataResponse>({
    queryKey: ['tableData', connectionId, query],
    queryFn: () => dataViewerApi.getTableData(connectionId!, query),
    enabled: enabled && !!connectionId && !!query.database && !!query.table,
  });
}

/**
 * Hook to fetch column information
 */
export function useTableColumns(
  connectionId: string | null,
  database: string | null,
  table: string | null
) {
  return useQuery<GetColumnsResponse>({
    queryKey: ['tableColumns', connectionId, database, table],
    queryFn: () =>
      dataViewerApi.getColumns(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
  });
}

/**
 * Hook to fetch table statistics
 */
export function useTableStats(
  connectionId: string | null,
  database: string | null,
  table: string | null
) {
  return useQuery<GetStatsResponse>({
    queryKey: ['tableStats', connectionId, database, table],
    queryFn: () =>
      dataViewerApi.getStats(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
  });
}

/**
 * Hook to fetch distinct values for a column
 */
export function useDistinctValues(
  connectionId: string | null,
  database: string | null,
  table: string | null,
  column: string | null,
  limit: number = 100
) {
  return useQuery<GetDistinctValuesResponse>({
    queryKey: ['distinctValues', connectionId, database, table, column, limit],
    queryFn: () =>
      dataViewerApi.getDistinctValues(
        connectionId!,
        database!,
        table!,
        column!,
        limit
      ),
    enabled: !!connectionId && !!database && !!table && !!column,
  });
}

/**
 * Hook to export table data
 */
export function useExportData() {
  return useMutation<
    Blob,
    Error,
    { connectionId: string; query: DataViewerQuery & { format: 'csv' | 'json' } }
  >({
    mutationFn: ({ connectionId, query }) =>
      dataViewerApi.exportData(connectionId, query),
    onSuccess: (blob, variables) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = variables.query.format === 'csv' ? 'csv' : 'json';
      a.download = `${variables.query.table}_export.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to refresh table data
 */
export function useRefreshTableData() {
  const queryClient = useQueryClient();

  return (connectionId: string, database: string, table: string) => {
    // Invalidate all queries related to this table
    queryClient.invalidateQueries({
      queryKey: ['tableData', connectionId],
    });
    queryClient.invalidateQueries({
      queryKey: ['tableStats', connectionId, database, table],
    });
  };
}
