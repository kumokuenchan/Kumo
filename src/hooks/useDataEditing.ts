import { useMutation } from '@tanstack/react-query';
import { dataEditingApi } from '../api/dataEditing';

export function useUpdateRow() {
  return useMutation({
    mutationFn: ({
      connectionId,
      database,
      table,
      key,
      changes,
    }: {
      connectionId: string;
      database: string;
      table: string;
      key: Record<string, any>;
      changes: Record<string, any>;
    }) => dataEditingApi.updateRow(connectionId, database, table, key, changes),
  });
}

