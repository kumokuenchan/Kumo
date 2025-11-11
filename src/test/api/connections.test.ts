import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectionsApi } from '../../api/connections';
import { api } from '../../api/client';
import type { MySQLConnection, ConnectionTestResult } from '../types/connection';

// Mock the API client
vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('connectionsApi', () => {
  const mockApi = vi.mocked(api);
  const connectionId = 'test-connection-id';
  const mockConnection: MySQLConnection = {
    id: connectionId,
    name: 'Test MySQL Connection',
    host: 'localhost',
    port: 3306,
    username: 'testuser',
    password: 'encrypted_password',
    database: 'testdb',
    ssl: false,
    timeout: 30000,
    maxConnections: 10,
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all connections', async () => {
      const mockResponse = {
        connections: [mockConnection, { ...mockConnection, id: 'conn-2', name: 'Another Connection' }],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await connectionsApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/connections');
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty connections list', async () => {
      mockApi.get.mockResolvedValue({ connections: [] });

      const result = await connectionsApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/connections');
      expect(result).toEqual({ connections: [] });
    });
  });

  describe('getById', () => {
    it('should fetch single connection by ID', async () => {
      const mockResponse = { connection: mockConnection };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await connectionsApi.getById(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/connections/${connectionId}`);
      expect(result).toEqual({ connection: mockConnection });
    });

    it('should handle non-existent connection', async () => {
      mockApi.get.mockRejectedValue(new Error('Connection not found'));

      await expect(connectionsApi.getById('non-existent'))
        .rejects.toThrow('Connection not found');
    });
  });

  describe('create', () => {
    it('should create new connection', async () => {
      const newConnectionData = {
        name: 'New Test Connection',
        host: '192.168.1.100',
        port: 3306,
        username: 'newuser',
        password: 'newpassword',
        database: 'newdb',
        ssl: true,
        timeout: 45000,
        maxConnections: 20,
      };

      const createdConnection = {
        ...newConnectionData,
        id: 'new-connection-id',
        createdAt: '2024-01-02T00:00:00Z',
      };

      mockApi.post.mockResolvedValue({ connection: createdConnection });

      const result = await connectionsApi.create(newConnectionData);

      expect(mockApi.post).toHaveBeenCalledWith('/connections', newConnectionData);
      expect(result).toEqual({ connection: createdConnection });
      expect(result.connection.id).toBe('new-connection-id');
      expect(result.connection.createdAt).toBe('2024-01-02T00:00:00Z');
    });
  });

  describe('update', () => {
    it('should update existing connection', async () => {
      const updateData = {
        name: 'Updated Test Connection',
        host: 'updated.host.com',
        port: 3307,
      };

      const updatedConnection = {
        ...mockConnection,
        ...updateData,
      };

      mockApi.put.mockResolvedValue({ connection: updatedConnection });

      const result = await connectionsApi.update(connectionId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/connections/${connectionId}`, updateData);
      expect(result.connection.name).toBe('Updated Test Connection');
      expect(result.connection.host).toBe('updated.host.com');
      expect(result.connection.port).toBe(3307);
    });

    it('should handle partial updates', async () => {
      const updateData = { name: 'Name Only Update' };
      const updatedConnection = { ...mockConnection, ...updateData };

      mockApi.put.mockResolvedValue({ connection: updatedConnection });

      const result = await connectionsApi.update(connectionId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/connections/${connectionId}`, updateData);
      expect(result.connection.name).toBe('Name Only Update');
      expect(result.connection.host).toBe(mockConnection.host); // Unchanged
    });
  });

  describe('delete', () => {
    it('should delete connection', async () => {
      const mockResponse = { message: 'Connection deleted successfully' };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await connectionsApi.delete(connectionId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/connections/${connectionId}`);
      expect(result.message).toBe('Connection deleted successfully');
    });
  });

  describe('test', () => {
    it('should test connection with password', async () => {
      const mockTestResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        serverVersion: '8.0.35',
        responseTime: 45,
        error: undefined,
      };

      mockApi.post.mockResolvedValue(mockTestResult);

      const result = await connectionsApi.test(connectionId, 'testpassword');

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/test`, {
        password: 'testpassword',
      });
      expect(result.success).toBe(true);
      expect(result.serverVersion).toBe('8.0.35');
      expect(result.responseTime).toBe(45);
    });

    it('should test connection without password', async () => {
      const mockTestResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        serverVersion: '5.7.42',
        responseTime: 32,
      };

      mockApi.post.mockResolvedValue(mockTestResult);

      const result = await connectionsApi.test(connectionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/test`, {
        password: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should handle connection test failure', async () => {
      const mockTestResult: ConnectionTestResult = {
        success: false,
        message: 'Connection failed',
        error: 'ECONNREFUSED',
        responseTime: 5000,
      };

      mockApi.post.mockResolvedValue(mockTestResult);

      const result = await connectionsApi.test(connectionId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });
  });

  describe('testNew', () => {
    it('should test unsaved connection', async () => {
      const newConnectionData = {
        name: 'Unsaved Connection',
        host: 'unsaved.host.com',
        port: 3306,
        username: 'unsaved',
        password: 'password',
        database: 'unsaved_db',
        ssl: false,
        timeout: 30000,
        maxConnections: 10,
      };

      const mockTestResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        serverVersion: '8.0.30',
        responseTime: 67,
      };

      mockApi.post.mockResolvedValue(mockTestResult);

      const result = await connectionsApi.testNew(newConnectionData);

      expect(mockApi.post).toHaveBeenCalledWith('/connections/new/test', newConnectionData);
      expect(result.success).toBe(true);
      expect(result.serverVersion).toBe('8.0.30');
    });
  });

  describe('connect', () => {
    it('should connect to database', async () => {
      const mockResponse = {
        message: 'Connected successfully',
        connectionId: 'active-conn-id',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.connect(connectionId, 'password');

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/connect`, {
        password: 'password',
      });
      expect(result.message).toBe('Connected successfully');
      expect(result.connectionId).toBe('active-conn-id');
    });

    it('should connect without password', async () => {
      const mockResponse = {
        message: 'Connected successfully',
        connectionId: 'active-conn-id',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.connect(connectionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/connect`, {
        password: undefined,
      });
      expect(result.connectionId).toBe('active-conn-id');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      const mockResponse = {
        message: 'Disconnected successfully',
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.disconnect(connectionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/disconnect`);
      expect(result.message).toBe('Disconnected successfully');
    });
  });

  describe('getStats', () => {
    it('should get connection statistics', async () => {
      const mockStats = {
        totalQueries: 150,
        activeConnections: 5,
        totalExecutionTime: 12500,
        averageResponseTime: 83.3,
        lastActivity: '2024-01-01T12:30:00Z',
      };

      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await connectionsApi.getStats(connectionId);

      expect(mockApi.get).toHaveBeenCalledWith(`/connections/${connectionId}/stats`);
      expect(result).toEqual({ stats: mockStats });
    });
  });

  describe('ping', () => {
    it('should send ping with password', async () => {
      const mockResponse = { ok: true };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.ping(connectionId, 'pingpassword');

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/ping`, {
        password: 'pingpassword',
      });
      expect(result.ok).toBe(true);
    });

    it('should send ping without password', async () => {
      const mockResponse = { ok: true };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.ping(connectionId);

      expect(mockApi.post).toHaveBeenCalledWith(`/connections/${connectionId}/ping`, {
        password: undefined,
      });
      expect(result.ok).toBe(true);
    });

    it('should handle ping failure', async () => {
      const mockResponse = { ok: false };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await connectionsApi.ping(connectionId);

      expect(result.ok).toBe(false);
    });
  });
});