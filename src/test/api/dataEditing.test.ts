import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataEditingApi } from '../../api/dataEditing';
import api from '../../api/index';

// Mock the API module
vi.mock('../../api/index', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('dataEditingApi', () => {
  const mockApi = vi.mocked(api);
  const connectionId = 'test-connection';
  const database = 'testdb';
  const table = 'users';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRow', () => {
    it('should update a single row successfully', async () => {
      const key = { id: 1 };
      const changes = { name: 'John Updated', email: 'john.updated@example.com' };
      
      const mockResponse = {
        success: true,
        row: { id: 1, name: 'John Updated', email: 'john.updated@example.com' },
        affectedRows: 1,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.updateRow(connectionId, database, table, key, changes);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/update-row`,
        { database, table, key, changes }
      );
      expect(result.success).toBe(true);
      expect(result.row.name).toBe('John Updated');
      expect(result.affectedRows).toBe(1);
    });

    it('should handle update failure', async () => {
      const key = { id: 999 };
      const changes = { name: 'Non-existent' };
      
      const mockResponse = {
        success: false,
        row: null,
        affectedRows: 0,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.updateRow(connectionId, database, table, key, changes);

      expect(result.success).toBe(false);
      expect(result.affectedRows).toBe(0);
    });
  });

  describe('insertRow', () => {
    it('should insert a new row successfully', async () => {
      const values = { name: 'Jane Doe', email: 'jane@example.com', age: 25 };
      
      const mockResponse = {
        success: true,
        row: { id: 2, name: 'Jane Doe', email: 'jane@example.com', age: 25 },
        insertId: 2,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.insertRow(connectionId, database, table, values);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/insert-row`,
        { database, table, values }
      );
      expect(result.success).toBe(true);
      expect(result.row.name).toBe('Jane Doe');
      expect(result.insertId).toBe(2);
    });

    it('should handle insert failure due to constraint violation', async () => {
      const values = { name: 'Duplicate', email: 'existing@example.com' };
      
      const mockResponse = {
        success: false,
        row: null,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.insertRow(connectionId, database, table, values);

      expect(result.success).toBe(false);
      expect(result.insertId).toBeUndefined();
    });

    it('should insert row without auto-increment ID', async () => {
      const values = { name: 'Test User', status: 'active' };
      
      const mockResponse = {
        success: true,
        row: { name: 'Test User', status: 'active' },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.insertRow(connectionId, database, table, values);

      expect(result.insertId).toBeUndefined();
      expect(result.row.status).toBe('active');
    });
  });

  describe('deleteRow', () => {
    it('should delete a row successfully', async () => {
      const key = { id: 1 };
      
      const mockResponse = {
        success: true,
        affectedRows: 1,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.deleteRow(connectionId, database, table, key);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/delete-row`,
        { database, table, key }
      );
      expect(result.success).toBe(true);
      expect(result.affectedRows).toBe(1);
    });

    it('should handle delete of non-existent row', async () => {
      const key = { id: 999 };
      
      const mockResponse = {
        success: true,
        affectedRows: 0,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.deleteRow(connectionId, database, table, key);

      expect(result.success).toBe(true);
      expect(result.affectedRows).toBe(0);
    });

    it('should delete row with composite key', async () => {
      const key = { userId: 1, roleId: 2 };
      
      const mockResponse = {
        success: true,
        affectedRows: 1,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.deleteRow(connectionId, database, 'user_roles', key);

      expect(result.affectedRows).toBe(1);
    });
  });

  describe('batchUpdate', () => {
    it('should perform batch update successfully', async () => {
      const updates = [
        { key: { id: 1 }, changes: { name: 'Updated 1' } },
        { key: { id: 2 }, changes: { name: 'Updated 2' } },
        { key: { id: 3 }, changes: { name: 'Updated 3' } },
      ];
      
      const mockResponse = {
        success: true,
        results: [
          { success: true, row: { id: 1, name: 'Updated 1' } },
          { success: true, row: { id: 2, name: 'Updated 2' } },
          { success: true, row: { id: 3, name: 'Updated 3' } },
        ],
        totalUpdated: 3,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.batchUpdate(connectionId, database, table, updates, false);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/batch-update`,
        { database, table, updates, atomic: false }
      );
      expect(result.success).toBe(true);
      expect(result.totalUpdated).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should perform atomic batch update', async () => {
      const updates = [
        { key: { id: 1 }, changes: { status: 'active' } },
        { key: { id: 2 }, changes: { status: 'inactive' } },
      ];
      
      const mockResponse = {
        success: true,
        results: [
          { success: true, row: { id: 1, status: 'active' } },
          { success: true, row: { id: 2, status: 'inactive' } },
        ],
        totalUpdated: 2,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.batchUpdate(connectionId, database, table, updates, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/batch-update`,
        { database, table, updates, atomic: true }
      );
    });

    it('should handle partial batch update failure', async () => {
      const updates = [
        { key: { id: 1 }, changes: { name: 'Valid Update' } },
        { key: { id: 999 }, changes: { name: 'Invalid Update' } },
      ];
      
      const mockResponse = {
        success: true,
        results: [
          { success: true, row: { id: 1, name: 'Valid Update' } },
          { success: false, error: 'Row not found' },
        ],
        totalUpdated: 1,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.batchUpdate(connectionId, database, table, updates);

      expect(result.success).toBe(true);
      expect(result.totalUpdated).toBe(1);
      expect(result.results[1].success).toBe(false);
    });

    it('should handle completely failed batch update', async () => {
      const updates = [
        { key: { id: 999 }, changes: { name: 'Update 1' } },
        { key: { id: 998 }, changes: { name: 'Update 2' } },
      ];
      
      const mockResponse = {
        success: false,
        results: [
          { success: false, error: 'Row not found' },
          { success: false, error: 'Row not found' },
        ],
        totalUpdated: 0,
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.batchUpdate(connectionId, database, table, updates);

      expect(result.success).toBe(false);
      expect(result.totalUpdated).toBe(0);
    });
  });

  describe('fkLookup', () => {
    it('should lookup foreign key values', async () => {
      const column = 'category_id';
      const q = 'electronics';
      const limit = 20;
      const offset = 0;
      
      const mockResponse = {
        success: true,
        options: [
          { value: 1, label: 'Electronics' },
          { value: 2, label: 'Consumer Electronics' },
        ],
        total: 2,
        meta: { table: 'categories', column: 'category_id' },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.fkLookup(connectionId, database, table, column, q, limit, offset);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/fk-lookup?database=${database}&table=${table}&column=${column}&limit=${limit}&offset=${offset}&q=${q}`
      );
      expect(result.success).toBe(true);
      expect(result.options).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should lookup without search query', async () => {
      const column = 'status';
      const limit = 10;
      const offset = 5;
      
      const mockResponse = {
        success: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
        total: 2,
        meta: { table: 'statuses', column: 'status' },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.fkLookup(connectionId, database, table, column, undefined, limit, offset);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/data-editing/${connectionId}/fk-lookup?database=${database}&table=${table}&column=${column}&limit=${limit}&offset=${offset}`
      );
    });

    it('should handle empty lookup results', async () => {
      const column = 'nonexistent_column';
      
      const mockResponse = {
        success: true,
        options: [],
        total: 0,
        meta: { table: 'unknown', column: 'nonexistent_column' },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.fkLookup(connectionId, database, table, column);

      expect(result.options).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should lookup with default pagination', async () => {
      const column = 'user_id';
      
      const mockResponse = {
        success: true,
        options: [{ value: 1, label: 'User 1' }],
        total: 1,
        meta: { table: 'users', column: 'user_id' },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await dataEditingApi.fkLookup(connectionId, database, table, column);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(`limit=50`)
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(`offset=0`)
      );
    });
  });
});