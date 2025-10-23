import { useState, useEffect } from 'react';
import { useCreateTableMutation, useCompleteTableSchema } from '../../hooks/useSchema';
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

interface TableDesignerModalProps {
  connectionId: string;
  database: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editMode?: {
    table: string;
  };
}

type TabType = 'columns' | 'indexes' | 'foreignKeys' | 'properties';

export default function TableDesignerModal({
  connectionId,
  database,
  isOpen,
  onClose,
  onSuccess,
  editMode,
}: TableDesignerModalProps) {
  const isEditMode = Boolean(editMode);

  // Load existing table schema if in edit mode
  const { data: existingSchema } = useCompleteTableSchema(
    isEditMode ? connectionId : null,
    isEditMode ? database : null,
    editMode?.table || null
  );
  const [activeTab, setActiveTab] = useState<TabType>('columns');
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
      comment: '',
    },
  ]);
  const [primaryKey, setPrimaryKey] = useState<string[]>(['id']);
  const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDefinition[]>([]);
  const [engine, setEngine] = useState('InnoDB');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_general_ci');
  const [tableComment, setTableComment] = useState('');
  const [error, setError] = useState('');

  const createTableMutation = useCreateTableMutation(connectionId, database);

  // Load existing schema data when in edit mode
  useEffect(() => {
    if (isEditMode && existingSchema && editMode) {
      setTableName(editMode.table);

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
          comment: col.comment || '',
        };
      });
      setColumns(loadedColumns);

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
  }, [isEditMode, existingSchema, editMode]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setTableName('');
      setColumns([
        {
          id: '1',
          name: 'id',
          type: 'INT',
          length: '11',
          nullable: false,
          defaultValue: '',
          autoIncrement: true,
          unsigned: true,
          comment: '',
        },
      ]);
      setPrimaryKey(['id']);
      setIndexes([]);
      setForeignKeys([]);
      setEngine('InnoDB');
      setCharset('utf8mb4');
      setCollation('utf8mb4_general_ci');
      setTableComment('');
      setError('');
      setActiveTab('columns');
    }
  }, [isOpen]);

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

  const togglePrimaryKey = (columnName: string) => {
    if (primaryKey.includes(columnName)) {
      setPrimaryKey(primaryKey.filter((pk) => pk !== columnName));
    } else {
      setPrimaryKey([...primaryKey, columnName]);
    }
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

    // Build table definition
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
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    }
  };

  if (!isOpen) return null;

  // Show loading state while fetching schema in edit mode
  if (isEditMode && !existingSchema) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-700">Loading table schema...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? `Edit Table: ${editMode?.table}` : 'Create New Table'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Table Name */}
        <div className="px-6 py-4 border-b border-gray-200">
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
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'columns'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Columns ({columns.length})
            </button>
            <button
              onClick={() => setActiveTab('indexes')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'indexes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Indexes ({indexes.length})
            </button>
            <button
              onClick={() => setActiveTab('foreignKeys')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'foreignKeys'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Foreign Keys ({foreignKeys.length})
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'properties'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Properties
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {activeTab === 'columns' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Columns</h3>
                <button
                  onClick={addColumn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add Column
                </button>
              </div>
              <div className="space-y-4">
                {columns.map((col) => (
                  <div key={col.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-1 flex items-center">
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
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Column name"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={col.type}
                          onChange={(e) => updateColumn(col.id, { type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Length"
                          disabled={!supportsLength(col.type)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={col.defaultValue}
                          onChange={(e) => updateColumn(col.id, { defaultValue: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                            className="w-5 h-5"
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
                    <div className="mt-3 grid grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={col.unsigned}
                          onChange={(e) => updateColumn(col.id, { unsigned: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                          disabled={!supportsUnsigned(col.type)}
                        />
                        <label className="ml-2 text-sm text-gray-700">Unsigned</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={col.autoIncrement}
                          onChange={(e) => updateColumn(col.id, { autoIncrement: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                          disabled={!supportsAutoIncrement(col.type)}
                        />
                        <label className="ml-2 text-sm text-gray-700">Auto Increment</label>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={col.comment}
                          onChange={(e) => updateColumn(col.id, { comment: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          placeholder="Comment"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'indexes' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Indexes</h3>
                <button
                  onClick={addIndex}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add Index
                </button>
              </div>
              <div className="space-y-4">
                {indexes.map((idx) => (
                  <div key={idx.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 mb-1">Index Name</label>
                        <input
                          type="text"
                          value={idx.name}
                          onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          <label className="ml-2 text-sm text-gray-700">Unique</label>
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end justify-center">
                        <button
                          onClick={() => removeIndex(idx.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove Index"
                        >
                          <svg
                            className="w-5 h-5"
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
                <h3 className="text-lg font-medium text-gray-900">Foreign Keys</h3>
                <button
                  onClick={addForeignKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add Foreign Key
                </button>
              </div>
              <div className="space-y-4">
                {foreignKeys.map((fk) => (
                  <div key={fk.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 mb-1">FK Name</label>
                        <input
                          type="text"
                          value={fk.name}
                          onChange={(e) => updateForeignKey(fk.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="column"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">On Delete</label>
                        <select
                          value={fk.onDelete}
                          onChange={(e) => updateForeignKey(fk.id, { onDelete: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                            className="w-5 h-5"
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
            <div className="space-y-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                <textarea
                  value={tableComment}
                  onChange={(e) => setTableComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Table description..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {isEditMode && (
              <p className="text-sm text-amber-600">
                Note: Edit mode is currently view-only. Add/modify/drop operations will be available soon.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {isEditMode ? 'Close' : 'Cancel'}
            </button>
            {!isEditMode && (
              <button
                onClick={handleSubmit}
                disabled={createTableMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {createTableMutation.isPending ? 'Creating...' : 'Create Table'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
