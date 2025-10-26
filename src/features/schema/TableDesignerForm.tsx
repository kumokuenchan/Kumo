import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTableMutation, useCompleteTableSchema } from '../../hooks/useSchema';
import { schemaApi } from '../../api/schema';
import {
  ALL_MYSQL_DATA_TYPES,
  MYSQL_ENGINES,
  MYSQL_CHARSETS,
  COMMON_COLLATIONS,
  FOREIGN_KEY_ACTIONS,
  INDEX_TYPES,
  getDefaultLength,
  supportsLength,
  supportsUnsigned,
  supportsAutoIncrement,
} from './mysqlConstants';

interface ColumnDefinition {
  id: string;
  name: string;
  type: string;
  length: string;
  nullable: boolean;
  defaultValue: string;
  autoIncrement: boolean;
  unsigned: boolean;
  zerofill: boolean;
  virtual: boolean;
  virtualExpression: string;
  comment: string;
}

interface IndexDefinition {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

interface ForeignKeyDefinition {
  id: string;
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
  onUpdate: string;
}

interface TriggerDefinition {
  id: string;
  name: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

interface TableDesignerFormProps {
  connectionId: string;
  database: string;
  selectedTable?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type TabType = 'columns' | 'indexes' | 'foreignKeys' | 'triggers' | 'properties' | 'comment' | 'sqlPreview';

export default function TableDesignerForm({
  connectionId,
  database,
  selectedTable,
  onSuccess,
  onCancel,
}: TableDesignerFormProps) {
  const isEditMode = Boolean(selectedTable);
  const queryClient = useQueryClient();

  // Load existing table schema if in edit mode
  const { data: existingSchema } = useCompleteTableSchema(
    isEditMode ? connectionId : null,
    isEditMode ? database : null,
    selectedTable || null
  );
  const [activeTab, setActiveTab] = useState<TabType>('columns');
  const [originalColumns, setOriginalColumns] = useState<ColumnDefinition[]>([]);
  const [originalIndexes, setOriginalIndexes] = useState<IndexDefinition[]>([]);
  const [originalForeignKeys, setOriginalForeignKeys] = useState<ForeignKeyDefinition[]>([]);
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    {
      id: '1',
      name: 'id',
      type: 'INT',
      length: '11',
      nullable: false,
      defaultValue: '',
      autoIncrement: true,
      unsigned: true,
      zerofill: false,
      virtual: false,
      virtualExpression: '',
      comment: '',
    },
  ]);
  const [primaryKey, setPrimaryKey] = useState<string[]>(['id']);
  const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDefinition[]>([]);
  const [triggers, setTriggers] = useState<TriggerDefinition[]>([]);
  const [engine, setEngine] = useState('InnoDB');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_general_ci');
  const [tableComment, setTableComment] = useState('');
  const [error, setError] = useState('');

  const createTableMutation = useCreateTableMutation(connectionId, database);

  // Load existing schema data when in edit mode
  useEffect(() => {
    if (isEditMode && existingSchema && selectedTable) {
      setTableName(selectedTable);

      // Convert columns to form format
      const loadedColumns = existingSchema.columns.map((col, index) => {
        // Parse type and length from column type (e.g., "VARCHAR(255)" -> type: "VARCHAR", length: "255")
        const typeMatch = col.type.match(/^(\w+)(?:\((.+?)\))?/);
        const baseType = typeMatch?.[1] || col.type;
        const length = typeMatch?.[2] || '';

        return {
          id: String(index + 1),
          name: col.name,
          type: baseType.toUpperCase(),
          length: length,
          nullable: col.nullable,
          defaultValue: col.default || '',
          autoIncrement: col.extra.toLowerCase().includes('auto_increment'),
          unsigned: col.type.toLowerCase().includes('unsigned'),
          zerofill: col.type.toLowerCase().includes('zerofill'),
          virtual: col.extra.toLowerCase().includes('virtual') || col.extra.toLowerCase().includes('generated'),
          virtualExpression: '',
          comment: col.comment || '',
        };
      });
      setColumns(loadedColumns);
      setOriginalColumns(loadedColumns); // Store original for comparison

      // Set primary key
      const pkColumns = existingSchema.columns
        .filter((col) => col.key === 'PRI')
        .map((col) => col.name);
      setPrimaryKey(pkColumns);

      // Convert indexes to form format
      const loadedIndexes = existingSchema.indexes
        .filter((idx) => idx.name !== 'PRIMARY') // Exclude primary key from indexes list
        .map((idx, index) => ({
          id: String(index + 1),
          name: idx.name,
          columns: idx.columns,
          unique: idx.unique,
          type: idx.type,
        }));
      setIndexes(loadedIndexes);
      setOriginalIndexes(loadedIndexes); // Store original for comparison

      // Convert foreign keys to form format
      const loadedForeignKeys = existingSchema.foreignKeys.map((fk, index) => ({
        id: String(index + 1),
        name: fk.name,
        columns: [fk.column],
        referencedTable: fk.referencedTable,
        referencedColumns: [fk.referencedColumn],
        onDelete: fk.onDelete,
        onUpdate: fk.onUpdate,
      }));
      setForeignKeys(loadedForeignKeys);
      setOriginalForeignKeys(loadedForeignKeys); // Store original for comparison

      // Set table properties from stats
      if (existingSchema.stats) {
        setEngine(existingSchema.stats.engine || 'InnoDB');
        setCollation(existingSchema.stats.collation || 'utf8mb4_general_ci');
        setTableComment(existingSchema.stats.comment || '');

        // Extract charset from collation
        const charsetMatch = existingSchema.stats.collation?.match(/^(\w+?)_/);
        if (charsetMatch) {
          setCharset(charsetMatch[1]);
        }
      }
    }
  }, [isEditMode, existingSchema, selectedTable]);

  const addColumn = () => {
    const newId = String(Date.now());
    setColumns([
      ...columns,
      {
        id: newId,
        name: '',
        type: 'VARCHAR',
        length: '255',
        nullable: true,
        defaultValue: '',
        autoIncrement: false,
        unsigned: false,
        zerofill: false,
        virtual: false,
        virtualExpression: '',
        comment: '',
      },
    ]);
  };

  const removeColumn = (id: string) => {
    const column = columns.find((c) => c.id === id);
    if (column) {
      // Remove from primary key if present
      setPrimaryKey(primaryKey.filter((pk) => pk !== column.name));
      // Remove from indexes
      setIndexes(indexes.filter((idx) => !idx.columns.includes(column.name)));
      // Remove from foreign keys
      setForeignKeys(foreignKeys.filter((fk) => !fk.columns.includes(column.name)));
    }
    setColumns(columns.filter((c) => c.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<ColumnDefinition>) => {
    setColumns(
      columns.map((col) => {
        if (col.id === id) {
          const newCol = { ...col, ...updates };

          // Auto-update length when type changes
          if (updates.type && updates.type !== col.type) {
            const defaultLen = getDefaultLength(updates.type);
            if (defaultLen) {
              newCol.length = defaultLen;
            }

            // Reset incompatible attributes
            if (!supportsUnsigned(updates.type)) {
              newCol.unsigned = false;
            }
            if (!supportsAutoIncrement(updates.type)) {
              newCol.autoIncrement = false;
            }
          }

          return newCol;
        }
        return col;
      })
    );
  };

  const addIndex = () => {
    const newId = String(Date.now());
    setIndexes([
      ...indexes,
      {
        id: newId,
        name: '',
        columns: [],
        unique: false,
        type: 'BTREE',
      },
    ]);
  };

  const removeIndex = (id: string) => {
    setIndexes(indexes.filter((idx) => idx.id !== id));
  };

  const updateIndex = (id: string, updates: Partial<IndexDefinition>) => {
    setIndexes(indexes.map((idx) => (idx.id === id ? { ...idx, ...updates } : idx)));
  };

  const addForeignKey = () => {
    const newId = String(Date.now());
    setForeignKeys([
      ...foreignKeys,
      {
        id: newId,
        name: '',
        columns: [],
        referencedTable: '',
        referencedColumns: [],
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      },
    ]);
  };

  const removeForeignKey = (id: string) => {
    setForeignKeys(foreignKeys.filter((fk) => fk.id !== id));
  };

  const updateForeignKey = (id: string, updates: Partial<ForeignKeyDefinition>) => {
    setForeignKeys(foreignKeys.map((fk) => (fk.id === id ? { ...fk, ...updates } : fk)));
  };

  const addTrigger = () => {
    const newId = String(Date.now());
    setTriggers([
      ...triggers,
      {
        id: newId,
        name: '',
        timing: 'BEFORE',
        event: 'INSERT',
        body: '',
      },
    ]);
  };

  const removeTrigger = (id: string) => {
    setTriggers(triggers.filter((t) => t.id !== id));
  };

  const updateTrigger = (id: string, updates: Partial<TriggerDefinition>) => {
    setTriggers(triggers.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const moveColumnUp = (id: string) => {
    const index = columns.findIndex((c) => c.id === id);
    if (index > 0) {
      const newColumns = [...columns];
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
      setColumns(newColumns);
    }
  };

  const moveColumnDown = (id: string) => {
    const index = columns.findIndex((c) => c.id === id);
    if (index < columns.length - 1) {
      const newColumns = [...columns];
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
      setColumns(newColumns);
    }
  };

  const togglePrimaryKey = (columnName: string) => {
    if (primaryKey.includes(columnName)) {
      setPrimaryKey(primaryKey.filter((pk) => pk !== columnName));
    } else {
      setPrimaryKey([...primaryKey, columnName]);
    }
  };

  // Generate SQL preview
  const generateSQLPreview = (): string => {
    if (!tableName.trim()) return '-- Please enter a table name';
    if (columns.length === 0) return '-- Please add at least one column';

    let sql = `CREATE TABLE \`${tableName}\` (\n`;

    // Add column definitions
    const columnDefs = columns.map((col) => {
      if (!col.name.trim()) return null;

      let def = `  \`${col.name}\` ${col.type}`;

      if (supportsLength(col.type) && col.length) {
        def += `(${col.length})`;
      }

      if (col.unsigned) def += ' UNSIGNED';
      if (col.zerofill) def += ' ZEROFILL';
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';

      if (col.virtual && col.virtualExpression) {
        def += ` GENERATED ALWAYS AS (${col.virtualExpression}) VIRTUAL`;
      } else if (col.defaultValue) {
        def += ` DEFAULT '${col.defaultValue}'`;
      }

      if (col.comment) {
        def += ` COMMENT '${col.comment.replace(/'/g, "\\'")}'`;
      }

      return def;
    }).filter(Boolean);

    sql += columnDefs.join(',\n');

    // Add primary key
    if (primaryKey.length > 0) {
      sql += `,\n  PRIMARY KEY (\`${primaryKey.join('`, `')}\`)`;
    }

    // Add indexes
    indexes.forEach((idx) => {
      if (idx.columns.length > 0) {
        const idxName = idx.name || `idx_${idx.columns.join('_')}`;
        if (idx.unique) {
          sql += `,\n  UNIQUE KEY \`${idxName}\` (\`${idx.columns.join('`, `')}\`)`;
        } else {
          sql += `,\n  KEY \`${idxName}\` (\`${idx.columns.join('`, `')}\`)`;
        }
      }
    });

    // Add foreign keys
    foreignKeys.forEach((fk) => {
      if (fk.columns.length > 0 && fk.referencedTable && fk.referencedColumns.length > 0) {
        const fkName = fk.name || `fk_${fk.columns.join('_')}`;
        sql += `,\n  CONSTRAINT \`${fkName}\` FOREIGN KEY (\`${fk.columns.join('`, `')}\`)`;
        sql += ` REFERENCES \`${fk.referencedTable}\` (\`${fk.referencedColumns.join('`, `')}\`)`;
        sql += ` ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`;
      }
    });

    sql += '\n)';

    // Add table options
    sql += ` ENGINE=${engine}`;
    sql += ` DEFAULT CHARSET=${charset}`;
    sql += ` COLLATE=${collation}`;
    if (tableComment) {
      sql += ` COMMENT='${tableComment.replace(/'/g, "\\'")}'`;
    }
    sql += ';';

    // Add triggers
    triggers.forEach((trigger) => {
      if (trigger.name && trigger.body) {
        sql += `\n\nCREATE TRIGGER \`${trigger.name}\`\n`;
        sql += `${trigger.timing} ${trigger.event} ON \`${tableName}\`\n`;
        sql += `FOR EACH ROW\n`;
        sql += trigger.body;
        sql += ';';
      }
    });

    return sql;
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }

    if (columns.length === 0) {
      setError('At least one column is required');
      return;
    }

    for (const col of columns) {
      if (!col.name.trim()) {
        setError('All columns must have a name');
        return;
      }
    }

    if (isEditMode) {
      // Handle edit mode with ALTER TABLE statements
      try {
        // 1. Handle columns - find added, modified, and removed
        const originalColNames = new Set(originalColumns.map(c => c.name));
        const currentColNames = new Set(columns.map(c => c.name));

        // Add new columns
        for (const col of columns) {
          if (!originalColNames.has(col.name) && col.name.trim()) {
            let fullType = col.type;
            if (supportsLength(col.type) && col.length) {
              fullType += `(${col.length})`;
            }

            await schemaApi.addColumn(connectionId, database, tableName, {
              name: col.name,
              type: fullType,
              nullable: col.nullable,
              defaultValue: col.defaultValue || null,
              autoIncrement: col.autoIncrement,
              unsigned: col.unsigned,
              comment: col.comment,
            });
          }
        }

        // Modify changed columns
        for (const col of columns) {
          const originalCol = originalColumns.find(c => c.name === col.name);
          if (originalCol && col.name.trim()) {
            // Check if column has changed
            const hasChanged =
              originalCol.type !== col.type ||
              originalCol.length !== col.length ||
              originalCol.nullable !== col.nullable ||
              originalCol.defaultValue !== col.defaultValue ||
              originalCol.autoIncrement !== col.autoIncrement ||
              originalCol.unsigned !== col.unsigned ||
              originalCol.zerofill !== col.zerofill ||
              originalCol.comment !== col.comment;

            if (hasChanged) {
              let fullType = col.type;
              if (supportsLength(col.type) && col.length) {
                fullType += `(${col.length})`;
              }

              console.log('Modifying column:', col.name, 'from', originalCol, 'to', col, 'fullType:', fullType);

              await schemaApi.modifyColumn(connectionId, database, tableName, col.name, {
                name: col.name,
                type: fullType,
                nullable: col.nullable,
                defaultValue: col.defaultValue || null,
                autoIncrement: col.autoIncrement,
                unsigned: col.unsigned,
                comment: col.comment,
              });
            }
          }
        }

        // Drop removed columns
        for (const originalCol of originalColumns) {
          if (!currentColNames.has(originalCol.name)) {
            await schemaApi.dropColumn(connectionId, database, tableName, originalCol.name);
          }
        }

        // 2. Handle indexes
        const originalIdxNames = new Set(originalIndexes.map(idx => idx.name));
        const currentIdxNames = new Set(indexes.map(idx => idx.name || `idx_${idx.columns.join('_')}`));

        // Drop removed indexes
        for (const originalIdx of originalIndexes) {
          if (!currentIdxNames.has(originalIdx.name)) {
            await schemaApi.dropIndex(connectionId, database, tableName, originalIdx.name);
          }
        }

        // Add new indexes
        for (const idx of indexes) {
          const idxName = idx.name || `idx_${idx.columns.join('_')}`;
          if (!originalIdxNames.has(idxName) && idx.columns.length > 0) {
            await schemaApi.createIndex(connectionId, database, tableName, {
              name: idxName,
              columns: idx.columns,
              unique: idx.unique,
              type: idx.type,
            });
          }
        }

        // 3. Handle foreign keys
        const originalFkNames = new Set(originalForeignKeys.map(fk => fk.name));
        const currentFkNames = new Set(foreignKeys.map(fk => fk.name || `fk_${fk.columns.join('_')}`));

        // Drop removed foreign keys
        for (const originalFk of originalForeignKeys) {
          if (!currentFkNames.has(originalFk.name)) {
            await schemaApi.dropForeignKey(connectionId, database, tableName, originalFk.name);
          }
        }

        // Add new foreign keys
        for (const fk of foreignKeys) {
          const fkName = fk.name || `fk_${fk.columns.join('_')}`;
          if (!originalFkNames.has(fkName) && fk.columns.length > 0 && fk.referencedTable) {
            await schemaApi.addForeignKey(connectionId, database, tableName, {
              name: fkName,
              columns: fk.columns,
              referencedTable: fk.referencedTable,
              referencedColumns: fk.referencedColumns,
              onDelete: fk.onDelete,
              onUpdate: fk.onUpdate,
            });
          }
        }

        // 4. Handle table properties (engine, charset, collation, comment)
        await schemaApi.modifyTableProperties(connectionId, database, tableName, {
          engine,
          charset,
          collation,
          comment: tableComment,
        });

        console.log('Table updated successfully');

        // Invalidate cache to refresh the schema
        await queryClient.invalidateQueries({ queryKey: ['databases', connectionId] });
        await queryClient.invalidateQueries({ queryKey: ['tables', connectionId, database] });
        await queryClient.invalidateQueries({ queryKey: ['completeTableSchema', connectionId, database, tableName] });
        await queryClient.invalidateQueries({ queryKey: ['columns', connectionId, database, tableName] });
        await queryClient.invalidateQueries({ queryKey: ['indexes', connectionId, database, tableName] });
        await queryClient.invalidateQueries({ queryKey: ['foreignKeys', connectionId, database, tableName] });

        onSuccess?.();
      } catch (err: any) {
        console.error('Error updating table:', err);
        setError(err.message || 'Failed to update table');
      }
    } else {
      // Create mode - use original logic
      const tableDefinition = {
        name: tableName,
        columns: columns.map((col) => {
          let fullType = col.type;
          if (supportsLength(col.type) && col.length) {
            fullType += `(${col.length})`;
          }

          return {
            name: col.name,
            type: fullType,
            nullable: col.nullable,
            defaultValue: col.defaultValue || null,
            autoIncrement: col.autoIncrement,
            unsigned: col.unsigned,
            comment: col.comment,
          };
        }),
        primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
        indexes: indexes.length > 0 ? indexes.map((idx) => ({
          name: idx.name || `idx_${idx.columns.join('_')}`,
          columns: idx.columns,
          unique: idx.unique,
          type: idx.type,
        })) : undefined,
        foreignKeys: foreignKeys.length > 0 ? foreignKeys.map((fk) => ({
          name: fk.name || `fk_${fk.columns.join('_')}`,
          columns: fk.columns,
          referencedTable: fk.referencedTable,
          referencedColumns: fk.referencedColumns,
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        })) : undefined,
        engine,
        charset,
        collation,
        comment: tableComment,
      };

      try {
        await createTableMutation.mutateAsync(tableDefinition);
        onSuccess?.();
      } catch (err: any) {
        setError(err.message || 'Failed to create table');
      }
    }
  };

  // Show loading state while fetching schema in edit mode
  if (isEditMode && !existingSchema) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-700">Loading table schema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Table Name */}
      <div className="px-4 py-3 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Table Name</label>
        <input
          type="text"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="my_table"
          disabled={isEditMode}
          title={isEditMode ? 'Table name cannot be changed in edit mode' : ''}
        />
        {isEditMode && (
          <p className="text-xs text-gray-500 mt-1">
            Note: Table name cannot be changed. Use ALTER TABLE RENAME to rename.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'columns'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Columns ({columns.length})
          </button>
          <button
            onClick={() => setActiveTab('indexes')}
            className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'indexes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Indexes ({indexes.length})
          </button>
          <button
            onClick={() => setActiveTab('foreignKeys')}
            className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'foreignKeys'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Foreign Keys ({foreignKeys.length})
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'properties'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('sqlPreview')}
            className={`px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'sqlPreview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            SQL Preview
          </button>
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {activeTab === 'columns' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Columns</h3>
              <button
                onClick={addColumn}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Column
              </button>
            </div>
            <div className="space-y-3">
              {columns.map((col, index) => (
                <div key={col.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-1 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={primaryKey.includes(col.name)}
                          onChange={() => togglePrimaryKey(col.name)}
                          className="w-4 h-4 text-blue-600"
                          title="Primary Key"
                          disabled={!col.name}
                        />
                        <label className="ml-1 text-xs text-gray-600">PK</label>
                      </div>
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveColumnUp(col.id)}
                          disabled={index === 0}
                          className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveColumnDown(col.id)}
                          disabled={index === columns.length - 1}
                          className="text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Column name"
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(col.id, { type: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {ALL_MYSQL_DATA_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={col.length}
                        onChange={(e) => updateColumn(col.id, { length: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Length"
                        disabled={!supportsLength(col.type)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={col.defaultValue}
                        onChange={(e) => updateColumn(col.id, { defaultValue: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="Default"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={col.nullable}
                        onChange={(e) => updateColumn(col.id, { nullable: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                        title="Nullable"
                      />
                      <label className="ml-1 text-xs text-gray-600">NULL</label>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => removeColumn(col.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove Column"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={col.unsigned}
                        onChange={(e) => updateColumn(col.id, { unsigned: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                        disabled={!supportsUnsigned(col.type)}
                      />
                      <label className="ml-2 text-xs text-gray-700">Unsigned</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={col.zerofill}
                        onChange={(e) => updateColumn(col.id, { zerofill: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                        disabled={!supportsUnsigned(col.type)}
                      />
                      <label className="ml-2 text-xs text-gray-700">Zerofill</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={col.autoIncrement}
                        onChange={(e) => updateColumn(col.id, { autoIncrement: e.target.checked })}
                        className="w-4 h-4 text-blue-600"
                        disabled={!supportsAutoIncrement(col.type)}
                      />
                      <label className="ml-2 text-xs text-gray-700">Auto Increment</label>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Comment</label>
                    <input
                      type="text"
                      value={col.comment}
                      onChange={(e) => updateColumn(col.id, { comment: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="Comment"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'indexes' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Indexes</h3>
              <button
                onClick={addIndex}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Index
              </button>
            </div>
            <div className="space-y-3">
              {indexes.map((idx) => (
                <div key={idx.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">Index Name</label>
                      <input
                        type="text"
                        value={idx.name}
                        onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="index_name"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-600 mb-1">Columns</label>
                      <select
                        multiple
                        value={idx.columns}
                        onChange={(e) =>
                          updateIndex(idx.id, {
                            columns: Array.from(e.target.selectedOptions, (opt) => opt.value),
                          })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        size={3}
                      >
                        {columns.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Type</label>
                      <select
                        value={idx.type}
                        onChange={(e) => updateIndex(idx.id, { type: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {INDEX_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-end justify-center">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={idx.unique}
                          onChange={(e) => updateIndex(idx.id, { unique: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label className="ml-2 text-xs text-gray-700">Unique</label>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end justify-center">
                      <button
                        onClick={() => removeIndex(idx.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove Index"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'foreignKeys' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Foreign Keys</h3>
              <button
                onClick={addForeignKey}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Foreign Key
              </button>
            </div>
            <div className="space-y-3">
              {foreignKeys.map((fk) => (
                <div key={fk.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">FK Name</label>
                      <input
                        type="text"
                        value={fk.name}
                        onChange={(e) => updateForeignKey(fk.id, { name: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="fk_name"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Column</label>
                      <select
                        multiple
                        value={fk.columns}
                        onChange={(e) =>
                          updateForeignKey(fk.id, {
                            columns: Array.from(e.target.selectedOptions, (opt) => opt.value),
                          })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        size={3}
                      >
                        {columns.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Ref. Table</label>
                      <input
                        type="text"
                        value={fk.referencedTable}
                        onChange={(e) => updateForeignKey(fk.id, { referencedTable: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="table_name"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Ref. Column</label>
                      <input
                        type="text"
                        value={fk.referencedColumns.join(',')}
                        onChange={(e) =>
                          updateForeignKey(fk.id, {
                            referencedColumns: e.target.value.split(',').map((s) => s.trim()),
                          })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="column"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-600 mb-1">On Delete</label>
                      <select
                        value={fk.onDelete}
                        onChange={(e) => updateForeignKey(fk.id, { onDelete: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {FOREIGN_KEY_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-600 mb-1">On Update</label>
                      <select
                        value={fk.onUpdate}
                        onChange={(e) => updateForeignKey(fk.id, { onUpdate: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {FOREIGN_KEY_ACTIONS.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 flex items-end justify-center">
                      <button
                        onClick={() => removeForeignKey(fk.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove FK"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {MYSQL_ENGINES.map((eng) => (
                  <option key={eng} value={eng}>
                    {eng}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Character Set</label>
              <select
                value={charset}
                onChange={(e) => setCharset(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {MYSQL_CHARSETS.map((cs) => (
                  <option key={cs} value={cs}>
                    {cs}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Collation</label>
              <select
                value={collation}
                onChange={(e) => setCollation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {COMMON_COLLATIONS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Table Comment</label>
              <textarea
                value={tableComment}
                onChange={(e) => setTableComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={6}
                placeholder="Enter a description for this table..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Characters: {tableComment.length}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'sqlPreview' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">SQL Preview</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateSQLPreview());
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Copy SQL
              </button>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 text-xs font-mono">
              {generateSQLPreview()}
            </pre>
          </div>
        )}
      </div>

      {/* Footer - Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex-1">
          {error && <p className="text-red-600 text-xs">{error}</p>}
          {isEditMode && !error && (
            <p className="text-xs text-blue-600">
              Changes will be applied using ALTER TABLE statements without data loss.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={createTableMutation.isPending}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {createTableMutation.isPending
              ? (isEditMode ? 'Saving...' : 'Creating...')
              : (isEditMode ? 'Save Changes' : 'Create Table')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
