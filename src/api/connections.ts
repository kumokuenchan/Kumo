import { api } from './client';
import { MySQLConnection, ConnectionTestResult } from '../types/connection';

export const connectionsApi = {
  // Get all connections
  getAll: () => api.get<{ connections: MySQLConnection[] }>('/connections'),

  // Get single connection
  getById: (id: string) => api.get<{ connection: MySQLConnection }>(`/connections/${id}`),

  // Create new connection
  create: (data: Omit<MySQLConnection, 'id' | 'createdAt'>) =>
    api.post<{ connection: MySQLConnection }>('/connections', data),

  // Update connection
  update: (id: string, data: Partial<MySQLConnection>) =>
    api.put<{ connection: MySQLConnection }>(`/connections/${id}`, data),

  // Delete connection
  delete: (id: string) => api.delete<{ message: string }>(`/connections/${id}`),

  // Test connection
  test: (id: string, password?: string) =>
    api.post<ConnectionTestResult>(`/connections/${id}/test`, { password }),

  // Test unsaved connection
  testNew: (data: Omit<MySQLConnection, 'id' | 'createdAt'>) =>
    api.post<ConnectionTestResult>('/connections/new/test', data),

  // Connect to database
  connect: (id: string, password?: string) =>
    api.post<{ message: string; connectionId: string }>(`/connections/${id}/connect`, {
      password,
    }),

  // Disconnect from database
  disconnect: (id: string) =>
    api.post<{ message: string }>(`/connections/${id}/disconnect`),

  // Get connection statistics
  getStats: (id: string) => api.get<{ stats: any }>(`/connections/${id}/stats`),

  // Keep-alive ping
  ping: (id: string, password?: string) =>
    api.post<{ ok: boolean }>(`/connections/${id}/ping`, { password }),
};
