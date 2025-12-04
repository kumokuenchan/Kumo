import { useMemo, useState, useEffect } from 'react';
import { useConnection } from '../../../hooks/useConnections';
import { useTables } from '../../../hooks/useSchema';
import { useTableColumns } from '../../../hooks/useDataViewer';
import { parseSimpleFrom } from './QueryUtils';

interface DatabaseResolutionProps {
  connectionId?: string;
  stableSourceSql?: string;
  index: number;
}

export function useDatabaseResolution({ connectionId, stableSourceSql, index }: DatabaseResolutionProps) {
  const target = useMemo(() => parseSimpleFrom(stableSourceSql), [stableSourceSql, index]);
  const targetDb = target?.database || null;
  const targetTable = target?.table || null;

  // Allow user override for table when SQL isn't fully qualified
  const [overrideDb, setOverrideDb] = useState<string | null>(null);
  const [overrideTable, setOverrideTable] = useState<string | null>(null);
  useEffect(() => {
    // Reset overrides when target changes
    setOverrideDb(null);
    setOverrideTable(null);
  }, [targetDb, targetTable]);

  // Default DB comes from the connection when not specified in SQL
  const { data: currentConnection } = useConnection(connectionId || null);
  const connectionDefaultDb = currentConnection?.database || null;
  const effectiveDb = targetDb || connectionDefaultDb || overrideDb || null;
  const effectiveTable = overrideTable || targetTable;

  const { data: tbls } = useTables(connectionId || null, effectiveDb || null);
  const { data: columnsInfo } = useTableColumns(
    connectionId || null,
    effectiveDb || null,
    effectiveTable || null,
  );
  const columnsMeta = columnsInfo?.columns || [];
  const pkColumns = useMemo(
    () => columnsMeta.filter((c: any) => c.key === 'PRI').map((c: any) => c.name),
    [columnsMeta],
  );

  return {
    targetDb,
    targetTable,
    overrideDb,
    setOverrideDb,
    overrideTable,
    setOverrideTable,
    effectiveDb,
    effectiveTable,
    columnsMeta,
    pkColumns,
  };
}