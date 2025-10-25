import { useState } from 'react';
import { MySQLConnection } from '../../types/connection';
import { useCreateConnection, useTestConnection, useUpdateConnection } from '../../hooks/useConnections';

interface ConnectionFormProps {
  connection?: MySQLConnection;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ConnectionForm({ connection, onSuccess, onCancel }: ConnectionFormProps) {
  const isEditing = !!connection;

  const [formData, setFormData] = useState({
    name: connection?.name || '',
    host: connection?.host || 'localhost',
    port: connection?.port?.toString() || '3306',
    database: connection?.database || '',
    username: connection?.username || '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    serverVersion?: string;
  } | null>(null);

  const createMutation = useCreateConnection();
  const updateMutation = useUpdateConnection();
  const testMutation = useTestConnection();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    // Clear test result when form changes
    setTestResult(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Connection name is required';
    }

    if (!formData.host.trim()) {
      newErrors.host = 'Host is required';
    }

    const port = parseInt(formData.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required for new connections';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) {
      return;
    }

    setTestResult(null);

    try {
      const testData = {
        ...formData,
        port: parseInt(formData.port),
      };

      const result = await testMutation.mutateAsync(testData as any);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const connectionData = {
        name: formData.name,
        host: formData.host,
        port: parseInt(formData.port),
        database: formData.database,
        username: formData.username,
        password: formData.password || undefined,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: connection.id,
          data: connectionData,
        });
      } else {
        await createMutation.mutateAsync(connectionData as any);
      }

      onSuccess?.();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save connection' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Connection Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Connection Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded text-sm ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="My MySQL Server"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Host and Port */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Host *</label>
          <input
            type="text"
            name="host"
            value={formData.host}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded text-sm ${
              errors.host ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="localhost"
          />
          {errors.host && <p className="text-red-500 text-xs mt-1">{errors.host}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Port *</label>
          <input
            type="number"
            name="port"
            value={formData.port}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded text-sm ${
              errors.port ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="3306"
          />
          {errors.port && <p className="text-red-500 text-xs mt-1">{errors.port}</p>}
        </div>
      </div>

      {/* Database */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
        <input
          type="text"
          name="database"
          value={formData.database}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="mydb"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded text-sm ${
            errors.username ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="root"
        />
        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password {!isEditing && '*'}
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded text-sm ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={isEditing ? 'Leave blank to keep current password' : ''}
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`p-3 rounded text-sm ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="font-medium">{testResult.message}</p>
          {testResult.serverVersion && (
            <p className="text-xs mt-1">Server version: {testResult.serverVersion}</p>
          )}
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 rounded text-sm bg-red-50 text-red-800">
          <p>{errors.submit}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testMutation.isPending}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : isEditing
              ? 'Update'
              : 'Create'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
