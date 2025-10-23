import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  schemaApi,
  Database,
  Table,
  Column,
  Index,
  ForeignKey,
  Trigger,
  Routine,
  TableStats,
  CompleteTableSchema,
} from '../api/schema';

/**
 * Hook to fetch list of databases for a connection
 */
export function useDatabases(connectionId: string | null): UseQueryResult<Database[], Error> {
  return useQuery({
    queryKey: ['databases', connectionId],
    queryFn: () => schemaApi.getDatabases(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch tables in a database
 */
export function useTables(
  connectionId: string | null,
  database: string | null
): UseQueryResult<Table[], Error> {
  return useQuery({
    queryKey: ['tables', connectionId, database],
    queryFn: () => schemaApi.getTables(connectionId!, database!),
    enabled: !!connectionId && !!database,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch columns for a table
 */
export function useColumns(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<Column[], Error> {
  return useQuery({
    queryKey: ['columns', connectionId, database, table],
    queryFn: () => schemaApi.getColumns(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch indexes for a table
 */
export function useIndexes(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<Index[], Error> {
  return useQuery({
    queryKey: ['indexes', connectionId, database, table],
    queryFn: () => schemaApi.getIndexes(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch foreign keys for a table
 */
export function useForeignKeys(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<ForeignKey[], Error> {
  return useQuery({
    queryKey: ['foreignKeys', connectionId, database, table],
    queryFn: () => schemaApi.getForeignKeys(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch triggers for a database or table
 */
export function useTriggers(
  connectionId: string | null,
  database: string | null,
  table?: string
): UseQueryResult<Trigger[], Error> {
  return useQuery({
    queryKey: ['triggers', connectionId, database, table],
    queryFn: () => schemaApi.getTriggers(connectionId!, database!, table),
    enabled: !!connectionId && !!database,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch stored procedures and functions
 */
export function useRoutines(
  connectionId: string | null,
  database: string | null
): UseQueryResult<Routine[], Error> {
  return useQuery({
    queryKey: ['routines', connectionId, database],
    queryFn: () => schemaApi.getRoutines(connectionId!, database!),
    enabled: !!connectionId && !!database,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch views in a database
 */
export function useViews(
  connectionId: string | null,
  database: string | null
): UseQueryResult<Table[], Error> {
  return useQuery({
    queryKey: ['views', connectionId, database],
    queryFn: () => schemaApi.getViews(connectionId!, database!),
    enabled: !!connectionId && !!database,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch table statistics
 */
export function useTableStats(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<TableStats, Error> {
  return useQuery({
    queryKey: ['tableStats', connectionId, database, table],
    queryFn: () => schemaApi.getTableStats(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch CREATE TABLE statement
 */
export function useCreateTable(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<string, Error> {
  return useQuery({
    queryKey: ['createTable', connectionId, database, table],
    queryFn: () => schemaApi.getCreateTable(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch complete table schema (columns, indexes, foreign keys, stats)
 */
export function useCompleteTableSchema(
  connectionId: string | null,
  database: string | null,
  table: string | null
): UseQueryResult<CompleteTableSchema, Error> {
  return useQuery({
    queryKey: ['completeTableSchema', connectionId, database, table],
    queryFn: () => schemaApi.getCompleteTableSchema(connectionId!, database!, table!),
    enabled: !!connectionId && !!database && !!table,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new table (mutation)
 */
export function useCreateTableMutation(connectionId: string, database: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tableDefinition: Parameters<typeof schemaApi.createTable>[2]) =>
      schemaApi.createTable(connectionId, database, tableDefinition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', connectionId, database] });
    },
  });
}

/**
 * Hook to add a column to a table
 */
export function useAddColumn(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnDefinition: Parameters<typeof schemaApi.addColumn>[3]) =>
      schemaApi.addColumn(connectionId, database, table, columnDefinition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to modify a column
 */
export function useModifyColumn(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      oldColumnName,
      columnDefinition,
    }: {
      oldColumnName: string;
      columnDefinition: Parameters<typeof schemaApi.modifyColumn>[4];
    }) => schemaApi.modifyColumn(connectionId, database, table, oldColumnName, columnDefinition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to drop a column
 */
export function useDropColumn(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columnName: string) =>
      schemaApi.dropColumn(connectionId, database, table, columnName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to create an index
 */
export function useCreateIndex(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indexDefinition: Parameters<typeof schemaApi.createIndex>[3]) =>
      schemaApi.createIndex(connectionId, database, table, indexDefinition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to drop an index
 */
export function useDropIndex(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (indexName: string) =>
      schemaApi.dropIndex(connectionId, database, table, indexName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indexes', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to add a foreign key
 */
export function useAddForeignKey(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foreignKeyDefinition: Parameters<typeof schemaApi.addForeignKey>[3]) =>
      schemaApi.addForeignKey(connectionId, database, table, foreignKeyDefinition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foreignKeys', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to drop a foreign key
 */
export function useDropForeignKey(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foreignKeyName: string) =>
      schemaApi.dropForeignKey(connectionId, database, table, foreignKeyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foreignKeys', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}

/**
 * Hook to drop a table
 */
export function useDropTable(connectionId: string, database: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ table, checkDependencies }: { table: string; checkDependencies?: boolean }) =>
      schemaApi.dropTable(connectionId, database, table, checkDependencies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', connectionId, database] });
    },
  });
}

/**
 * Hook to modify table properties
 */
export function useModifyTableProperties(connectionId: string, database: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (properties: Parameters<typeof schemaApi.modifyTableProperties>[3]) =>
      schemaApi.modifyTableProperties(connectionId, database, table, properties),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', connectionId, database] });
      queryClient.invalidateQueries({ queryKey: ['tableStats', connectionId, database, table] });
      queryClient.invalidateQueries({
        queryKey: ['completeTableSchema', connectionId, database, table],
      });
    },
  });
}
