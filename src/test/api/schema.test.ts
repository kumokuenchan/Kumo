import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schemaApi } from '../../api/schema';
import api from '../../api/index';

// Mock the API module
vi.mock('../../api/index', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('schemaApi', () => {
  const mockApi = vi.mocked(api);
  const connectionId = 'test-connection';
  const database = 'testdb';
  const table = 'users';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDatabases', () => {
    it('should fetch all databases successfully', async () => {
      const mockDatabases: Database[] = [
        {
          name: 'testdb',
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
        },
        {
          name: 'information_schema',
          charset: 'utf8',
          collation: 'utf8_general_ci',
        },
      ];

      mockApi.get.mockResolvedValue({ databases: mockDatabases });

      const result = await schemaApi.getDatabases(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/schema/${connectionId}/databases`);
      expect(result).toEqual(mockDatabases);
      expect(result).toHaveLength(2);
    });

    it('should handle empty database list', async () => {
      mockApi.get.mockResolvedValue({ databases: [] });

      const result = await schemaApi.getDatabases(connectionId);

      expect(result).toEqual([]);
    });
  });

  describe('getTables', () => {
    it('should fetch all tables in database', async () => {
      const mockTables: Table[] = [
        {
          name: 'users',
          type: 'BASE TABLE',
          engine: 'InnoDB',
          rows: 1000,
          dataLength: 16384,
          indexLength: 8192,
          autoIncrement: 1001,
          collation: 'utf8mb4_unicode_ci',
          comment: 'User accounts table',
          createTime: new Date('2024-01-01'),
          updateTime: new Date('2024-01-15'),
        },
        {
          name: 'products',
          type: 'VIEW',
          engine: undefined,
        },
      ];

      mockApi.get.mockResolvedValue({ tables: mockTables });

      const result = await schemaApi.getTables(connectionId, database);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables`
      );
      expect(result).toEqual(mockTables);
      expect(result[0].type).toBe('BASE TABLE');
      expect(result[1].type).toBe('VIEW');
    });

    it('should handle special characters in database name', async () => {
      const specialDbName = 'test-db-name';
      mockApi.get.mockResolvedValue({ tables: [] });

      await schemaApi.getTables(connectionId, specialDbName);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(specialDbName)}/tables`
      );
    });
  });

  describe('getColumns', () => {
    it('should fetch table columns', async () => {
      const mockColumns: Column[] = [
        {
          name: 'id',
          type: 'int(11)',
          nullable: false,
          key: 'PRI',
          default: null,
          extra: 'auto_increment',
          comment: 'Primary key',
          characterSet: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
        },
        {
          name: 'name',
          type: 'varchar(255)',
          nullable: false,
          key: '',
          default: null,
          extra: '',
          comment: 'User full name',
          characterSet: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
        },
        {
          name: 'email',
          type: 'varchar(255)',
          nullable: true,
          key: 'UNI',
          default: null,
          extra: '',
          comment: 'User email address',
        },
      ];

      mockApi.get.mockResolvedValue({ columns: mockColumns });

      const result = await schemaApi.getColumns(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns`
      );
      expect(result).toEqual(mockColumns);
      expect(result[0].key).toBe('PRI');
      expect(result[2].key).toBe('UNI');
    });
  });

  describe('getIndexes', () => {
    it('should fetch table indexes', async () => {
      const mockIndexes = [
        {
          name: 'PRIMARY',
          columns: ['id'],
          unique: true,
          type: 'BTREE',
          comment: 'Primary key index',
        },
        {
          name: 'idx_users_email',
          columns: ['email'],
          unique: false,
          type: 'BTREE',
        },
        {
          name: 'idx_users_name',
          columns: ['name', 'status'],
          unique: false,
          type: 'BTREE',
        },
      ];

      mockApi.get.mockResolvedValue({ indexes: mockIndexes });

      const result = await schemaApi.getIndexes(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes`
      );
      expect(result).toEqual(mockIndexes);
      expect(result[0].unique).toBe(true);
      expect(result[1].columns).toEqual(['email']);
    });
  });

  describe('getForeignKeys', () => {
    it('should fetch table foreign keys', async () => {
      const mockForeignKeys = [
        {
          name: 'fk_users_role',
          column: 'role_id',
          referencedTable: 'roles',
          referencedColumn: 'id',
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        {
          name: 'fk_users_department',
          column: 'department_id',
          referencedTable: 'departments',
          referencedColumn: 'id',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
      ];

      mockApi.get.mockResolvedValue({ foreignKeys: mockForeignKeys });

      const result = await schemaApi.getForeignKeys(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys`
      );
      expect(result).toEqual(mockForeignKeys);
      expect(result[0].onDelete).toBe('RESTRICT');
      expect(result[1].onUpdate).toBe('CASCADE');
    });
  });

  describe('getTriggers', () => {
    it('should fetch all triggers in database', async () => {
      const mockTriggers = [
        {
          name: 'update_users_timestamp',
          event: 'UPDATE',
          table: 'users',
          timing: 'BEFORE',
          statement: 'SET NEW.updated_at = CURRENT_TIMESTAMP',
        },
        {
          name: 'log_user_changes',
          event: 'INSERT',
          table: 'users',
          timing: 'AFTER',
          statement: 'INSERT INTO audit_log (action, table_name, data) VALUES (\'INSERT\', \'users\', NEW.*)',
        },
      ];

      mockApi.get.mockResolvedValue({ triggers: mockTriggers });

      const result = await schemaApi.getTriggers(connectionId, database);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/triggers`
      );
      expect(result).toEqual(mockTriggers);
    });

    it('should fetch triggers for specific table', async () => {
      const mockTriggers = [
        {
          name: 'update_users_timestamp',
          event: 'UPDATE',
          table: 'users',
          timing: 'BEFORE',
          statement: 'SET NEW.updated_at = CURRENT_TIMESTAMP',
        },
      ];

      mockApi.get.mockResolvedValue({ triggers: mockTriggers });

      const result = await schemaApi.getTriggers(connectionId, database, 'users');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/triggers?table=${encodeURIComponent('users')}`
      );
    });
  });

  describe('getRoutines', () => {
    it('should fetch stored procedures and functions', async () => {
      const mockRoutines = [
        {
          name: 'get_user_by_id',
          type: 'PROCEDURE' as const,
          comment: 'Get user information by ID',
        },
        {
          name: 'calculate_user_score',
          type: 'FUNCTION' as const,
          returnType: 'INT',
          comment: 'Calculate user engagement score',
        },
      ];

      mockApi.get.mockResolvedValue({ routines: mockRoutines });

      const result = await schemaApi.getRoutines(connectionId, database);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/routines`
      );
      expect(result).toEqual(mockRoutines);
      expect(result[0].type).toBe('PROCEDURE');
      expect(result[1].type).toBe('FUNCTION');
    });
  });

  describe('getViews', () => {
    it('should fetch database views', async () => {
      const mockViews: Table[] = [
        {
          name: 'active_users',
          type: 'VIEW',
          engine: undefined,
          comment: 'View of active users',
        },
        {
          name: 'user_stats',
          type: 'VIEW',
          engine: undefined,
          comment: 'User statistics view',
        },
      ];

      mockApi.get.mockResolvedValue({ views: mockViews });

      const result = await schemaApi.getViews(connectionId, database);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/views`
      );
      expect(result).toEqual(mockViews);
      expect(result[0].type).toBe('VIEW');
    });
  });

  describe('getTableStats', () => {
    it('should fetch table statistics', async () => {
      const mockStats = {
        rowCount: 1000,
        dataSize: 16384,
        indexSize: 8192,
        dataFree: 0,
        autoIncrement: 1001,
        createTime: new Date('2024-01-01T00:00:00Z'),
        updateTime: new Date('2024-01-15T10:30:00Z'),
        checkTime: new Date('2024-01-10T14:20:00Z'),
        collation: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        comment: 'User accounts table',
      };

      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await schemaApi.getTableStats(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/stats`
      );
      expect(result).toEqual(mockStats);
      expect(result.rowCount).toBe(1000);
      expect(result.engine).toBe('InnoDB');
    });
  });

  describe('getCreateTable', () => {
    it('should fetch CREATE TABLE statement', async () => {
      const mockCreateStatement = `CREATE TABLE \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_users_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts table';`;

      mockApi.get.mockResolvedValue({ createStatement: mockCreateStatement });

      const result = await schemaApi.getCreateTable(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/create-statement`
      );
      expect(result).toContain('CREATE TABLE `users`');
      expect(result).toContain('PRIMARY KEY (`id`)');
    });
  });

  describe('getCompleteTableSchema', () => {
    it('should fetch complete table schema', async () => {
      const mockCompleteSchema = {
        columns: [
          {
            name: 'id',
            type: 'int(11)',
            nullable: false,
            key: 'PRI',
            default: null,
            extra: 'auto_increment',
            comment: 'Primary key',
          },
        ],
        indexes: [
          {
            name: 'PRIMARY',
            columns: ['id'],
            unique: true,
            type: 'BTREE',
          },
        ],
        foreignKeys: [],
        stats: {
          rowCount: 100,
          dataSize: 16384,
          indexSize: 8192,
          dataFree: 0,
          autoIncrement: 101,
          createTime: new Date('2024-01-01'),
          updateTime: new Date('2024-01-15'),
          checkTime: new Date('2024-01-10'),
          collation: 'utf8mb4_unicode_ci',
          engine: 'InnoDB',
          comment: 'Test table',
        },
      };

      mockApi.get.mockResolvedValue(mockCompleteSchema);

      const result = await schemaApi.getCompleteTableSchema(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/schema`
      );
      expect(result).toEqual(mockCompleteSchema);
      expect(result.columns).toHaveLength(1);
      expect(result.indexes).toHaveLength(1);
    });
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const tableDefinition = {
        name: 'new_table',
        columns: [
          {
            name: 'id',
            type: 'INT',
            nullable: false,
            autoIncrement: true,
            comment: 'Primary key',
          },
          {
            name: 'name',
            type: 'VARCHAR(255)',
            nullable: false,
            comment: 'Name field',
          },
        ],
        primaryKey: ['id'],
        indexes: [
          {
            name: 'idx_name',
            columns: ['name'],
            unique: false,
          },
        ],
        engine: 'InnoDB',
        charset: 'utf8mb4',
        comment: 'New test table',
      };

      const mockResponse = {
        success: true,
        message: 'Table created successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.createTable(connectionId, database, tableDefinition);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables`,
        tableDefinition
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Table created successfully');
    });
  });

  describe('addColumn', () => {
    it('should add a new column to table', async () => {
      const columnDefinition = {
        name: 'new_column',
        type: 'VARCHAR(100)',
        nullable: true,
        defaultValue: null,
        comment: 'New column added',
        after: 'existing_column',
      };

      const mockResponse = {
        success: true,
        message: 'Column added successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.addColumn(connectionId, database, table, columnDefinition);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns`,
        columnDefinition
      );
      expect(result.success).toBe(true);
    });
  });

  describe('modifyColumn', () => {
    it('should modify an existing column', async () => {
      const oldColumnName = 'old_column';
      const columnDefinition = {
        name: 'new_column_name',
        type: 'INT',
        nullable: false,
        defaultValue: 0,
        comment: 'Modified column',
      };

      const mockResponse = {
        success: true,
        message: 'Column modified successfully',
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await schemaApi.modifyColumn(connectionId, database, table, oldColumnName, columnDefinition);

      expect(mockApi.put).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(oldColumnName)}`,
        columnDefinition
      );
      expect(result.success).toBe(true);
    });
  });

  describe('dropColumn', () => {
    it('should drop a column from table', async () => {
      const columnName = 'column_to_drop';
      const mockResponse = {
        success: true,
        message: 'Column dropped successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.dropColumn(connectionId, database, table, columnName);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(columnName)}`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createIndex', () => {
    it('should create a new index', async () => {
      const indexDefinition = {
        name: 'idx_new_index',
        columns: ['column1', 'column2'],
        unique: false,
        type: 'BTREE',
      };

      const mockResponse = {
        success: true,
        message: 'Index created successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.createIndex(connectionId, database, table, indexDefinition);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes`,
        indexDefinition
      );
      expect(result.success).toBe(true);
    });
  });

  describe('dropIndex', () => {
    it('should drop an index from table', async () => {
      const indexName = 'index_to_drop';
      const mockResponse = {
        success: true,
        message: 'Index dropped successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.dropIndex(connectionId, database, table, indexName);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/indexes/${encodeURIComponent(indexName)}`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('addForeignKey', () => {
    it('should add a foreign key constraint', async () => {
      const foreignKeyDefinition = {
        name: 'fk_new_constraint',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      };

      const mockResponse = {
        success: true,
        message: 'Foreign key added successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.addForeignKey(connectionId, database, table, foreignKeyDefinition);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys`,
        foreignKeyDefinition
      );
      expect(result.success).toBe(true);
    });
  });

  describe('dropForeignKey', () => {
    it('should drop a foreign key constraint', async () => {
      const foreignKeyName = 'fk_constraint_to_drop';
      const mockResponse = {
        success: true,
        message: 'Foreign key dropped successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.dropForeignKey(connectionId, database, table, foreignKeyName);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/foreign-keys/${encodeURIComponent(foreignKeyName)}`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('dropTable', () => {
    it('should drop a table with dependency check', async () => {
      const mockResponse = {
        success: true,
        dependencies: ['view_dependent_on_table'],
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.dropTable(connectionId, database, table, true);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}?checkDependencies=true`
      );
      expect(result.success).toBe(true);
    });

    it('should drop a table without dependency check', async () => {
      const mockResponse = {
        success: true,
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.dropTable(connectionId, database, table, false);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}?checkDependencies=false`
      );
    });
  });

  describe('renameTable', () => {
    it('should rename a table', async () => {
      const newName = 'renamed_table';
      const mockResponse = {
        success: true,
        message: 'Table renamed successfully',
      };

      mockApi.patch.mockResolvedValue(mockResponse);

      const result = await schemaApi.renameTable(connectionId, database, table, newName);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/rename`,
        { newName }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('emptyTable', () => {
    it('should empty table data (DELETE FROM)', async () => {
      const mockResponse = {
        success: true,
        message: 'Table data deleted successfully',
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await schemaApi.emptyTable(connectionId, database, table);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/data`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('truncateTable', () => {
    it('should truncate a table', async () => {
      const mockResponse = {
        success: true,
        message: 'Table truncated successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.truncateTable(connectionId, database, table);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/truncate`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getTableDependencies', () => {
    it('should fetch table dependencies', async () => {
      const mockDependencies = ['view_users_summary', 'trigger_users_log', 'fk_orders_user'];
      
      mockApi.get.mockResolvedValue({ dependencies: mockDependencies });

      const result = await schemaApi.getTableDependencies(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/dependencies`
      );
      expect(result).toEqual(mockDependencies);
    });
  });

  describe('exportTableSchema', () => {
    it('should export table schema', async () => {
      const mockSchema = `CREATE TABLE \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

      mockApi.get.mockResolvedValue({ schema: mockSchema });

      const result = await schemaApi.exportTableSchema(connectionId, database, table);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/export`
      );
      expect(result).toContain('CREATE TABLE `users`');
    });
  });

  describe('exportDatabaseSchema', () => {
    it('should export database schema without data', async () => {
      const mockSchema = '-- Database schema export\nCREATE DATABASE `testdb`;';

      mockApi.get.mockResolvedValue({ schema: mockSchema });

      const result = await schemaApi.exportDatabaseSchema(connectionId, database, false);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/export?includeData=false`
      );
      expect(result).toContain('CREATE DATABASE');
    });

    it('should export database schema with data', async () => {
      const mockSchema = '-- Database schema with data export\nCREATE DATABASE `testdb`;\nINSERT INTO users VALUES (1, "John");';

      mockApi.get.mockResolvedValue({ schema: mockSchema });

      const result = await schemaApi.exportDatabaseSchema(connectionId, database, true);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/export?includeData=true`
      );
    });
  });

  describe('restoreDatabaseSchema', () => {
    it('should restore database from SQL backup', async () => {
      const sqlContent = 'CREATE TABLE test (id INT); INSERT INTO test VALUES (1);';
      const mockResponse = {
        success: true,
        message: 'Database restored successfully',
        errors: [],
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.restoreDatabaseSchema(connectionId, database, sqlContent);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/restore`,
        { sqlContent }
      );
      expect(result.success).toBe(true);
    });

    it('should handle restore with errors', async () => {
      const sqlContent = 'INVALID SQL STATEMENT';
      const mockResponse = {
        success: false,
        message: 'Restore failed',
        errors: ['SQL syntax error at line 1'],
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await schemaApi.restoreDatabaseSchema(connectionId, database, sqlContent);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('modifyTableProperties', () => {
    it('should modify table properties', async () => {
      const properties = {
        engine: 'MyISAM',
        charset: 'utf8',
        collation: 'utf8_general_ci',
        comment: 'Updated table comment',
      };

      const mockResponse = {
        success: true,
        message: 'Table properties updated successfully',
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await schemaApi.modifyTableProperties(connectionId, database, table, properties);

      expect(mockApi.put).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/properties`,
        properties
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getStorageEngines', () => {
    it('should fetch available storage engines', async () => {
      const mockEngines = [
        { name: 'InnoDB', support: 'DEFAULT', comment: 'Supports transactions' },
        { name: 'MyISAM', support: 'YES', comment: 'Fast, non-transactional' },
        { name: 'MEMORY', support: 'YES', comment: 'In-memory storage' },
      ];

      mockApi.get.mockResolvedValue({ engines: mockEngines });

      const result = await schemaApi.getStorageEngines(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/schema/${connectionId}/engines`);
      expect(result).toEqual(mockEngines);
      expect(result[0].support).toBe('DEFAULT');
    });
  });

  describe('getCharsets', () => {
    it('should fetch available character sets', async () => {
      const mockCharsets = [
        { name: 'utf8mb4', description: 'UTF-8 Unicode' },
        { name: 'utf8', description: 'UTF-8 Unicode' },
        { name: 'latin1', description: 'cp1252 West European' },
      ];

      mockApi.get.mockResolvedValue({ charsets: mockCharsets });

      const result = await schemaApi.getCharsets(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/schema/${connectionId}/charsets`);
      expect(result).toEqual(mockCharsets);
    });
  });

  describe('getCollations', () => {
    it('should fetch all collations', async () => {
      const mockCollations = [
        { name: 'utf8mb4_unicode_ci', charset: 'utf8mb4' },
        { name: 'utf8mb4_general_ci', charset: 'utf8mb4' },
        { name: 'utf8_unicode_ci', charset: 'utf8' },
      ];

      mockApi.get.mockResolvedValue({ collations: mockCollations });

      const result = await schemaApi.getCollations(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/schema/${connectionId}/collations`);
    });

    it('should fetch collations for specific charset', async () => {
      const mockCollations = [
        { name: 'utf8mb4_unicode_ci', charset: 'utf8mb4' },
        { name: 'utf8mb4_general_ci', charset: 'utf8mb4' },
      ];

      mockApi.get.mockResolvedValue({ collations: mockCollations });

      const result = await schemaApi.getCollations(connectionId, 'utf8mb4');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/collations?charset=${encodeURIComponent('utf8mb4')}`
      );
    });
  });

  describe('getERDiagram', () => {
    it('should fetch ER diagram data', async () => {
      const mockERDiagram: ERDiagramData = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'int', isPrimaryKey: true, isForeignKey: false, nullable: false },
              { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
              { name: 'role_id', type: 'int', isPrimaryKey: false, isForeignKey: true, nullable: false },
            ],
          },
          {
            name: 'roles',
            columns: [
              { name: 'id', type: 'int', isPrimaryKey: true, isForeignKey: false, nullable: false },
              { name: 'name', type: 'varchar', isPrimaryKey: false, isForeignKey: false, nullable: false },
            ],
          },
        ],
        relationships: [
          {
            id: 'rel1',
            name: 'fk_users_role',
            sourceTable: 'users',
            targetTable: 'roles',
            sourceColumn: 'role_id',
            targetColumn: 'id',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockERDiagram);

      const result = await schemaApi.getERDiagram(connectionId, database);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/schema/${connectionId}/databases/${encodeURIComponent(database)}/er-diagram`
      );
      expect(result).toEqual(mockERDiagram);
      expect(result.tables).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
    });
  });
});