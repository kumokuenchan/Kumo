import React, { useState, useEffect } from 'react';
import { Server, Plus, Edit2, Trash2, X, Key, User, Globe, Hash } from 'lucide-react';

interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  keyPath?: string;
  tags?: string[];
  createdAt: number;
}

interface SSHConnectionManagerProps {
  onConnect: (connection: SSHConnection) => void;
  onClose?: () => void;
}

export default function SSHConnectionManager({ onConnect, onClose }: SSHConnectionManagerProps) {
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    authMethod: 'password' as 'password' | 'key',
    keyPath: '',
    tags: ''
  });

  // Load connections from localStorage
  useEffect(() => {
    const loadConnections = () => {
      try {
        const saved = localStorage.getItem('ssh_connections');
        if (saved) {
          setConnections(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Failed to load SSH connections:', error);
      }
    };
    loadConnections();
  }, []);

  // Save connections to localStorage
  const saveConnections = (conns: SSHConnection[]) => {
    try {
      localStorage.setItem('ssh_connections', JSON.stringify(conns));
      setConnections(conns);
    } catch (error) {
      console.error('Failed to save SSH connections:', error);
    }
  };

  // Add new connection
  const addConnection = () => {
    if (!formData.name.trim() || !formData.host.trim() || !formData.username.trim()) {
      alert('Please fill in required fields: Name, Host, and Username');
      return;
    }

    const newConnection: SSHConnection = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      host: formData.host.trim(),
      port: formData.port,
      username: formData.username.trim(),
      authMethod: formData.authMethod,
      keyPath: formData.keyPath.trim() || undefined,
      tags: formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()) : [],
      createdAt: Date.now()
    };

    const updated = [...connections, newConnection];
    saveConnections(updated);
    resetForm();
    setIsAddingConnection(false);
  };

  // Update connection
  const updateConnection = (id: string) => {
    if (!formData.name.trim() || !formData.host.trim() || !formData.username.trim()) {
      alert('Please fill in required fields: Name, Host, and Username');
      return;
    }

    const updated = connections.map(conn =>
      conn.id === id
        ? {
            ...conn,
            name: formData.name.trim(),
            host: formData.host.trim(),
            port: formData.port,
            username: formData.username.trim(),
            authMethod: formData.authMethod,
            keyPath: formData.keyPath.trim() || undefined,
            tags: formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()) : []
          }
        : conn
    );

    saveConnections(updated);
    resetForm();
    setEditingConnectionId(null);
  };

  // Delete connection
  const deleteConnection = (id: string) => {
    if (!confirm('Are you sure you want to delete this SSH connection?')) {
      return;
    }

    const updated = connections.filter(conn => conn.id !== id);
    saveConnections(updated);
  };

  // Start editing
  const startEditing = (connection: SSHConnection) => {
    setFormData({
      name: connection.name,
      host: connection.host,
      port: connection.port,
      username: connection.username,
      authMethod: connection.authMethod,
      keyPath: connection.keyPath || '',
      tags: connection.tags?.join(', ') || ''
    });
    setEditingConnectionId(connection.id);
    setIsAddingConnection(false);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      authMethod: 'password',
      keyPath: '',
      tags: ''
    });
  };

  // Filter connections
  const filteredConnections = connections.filter(conn => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conn.name.toLowerCase().includes(query) ||
      conn.host.toLowerCase().includes(query) ||
      conn.username.toLowerCase().includes(query) ||
      conn.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="w-[600px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-200">SSH Connections</h3>
            <span className="text-xs text-gray-500">({connections.length} saved)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAddingConnection(!isAddingConnection);
                setEditingConnectionId(null);
                resetForm();
              }}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Add new SSH connection"
            >
              <Plus className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search connections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Add/Edit Form */}
      {(isAddingConnection || editingConnectionId) && (
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <h4 className="text-sm font-medium text-gray-200 mb-3">
            {editingConnectionId ? 'Edit Connection' : 'New Connection'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Server"
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Host *</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="192.168.1.100 or example.com"
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="root or ubuntu"
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Auth Method</label>
              <select
                value={formData.authMethod}
                onChange={(e) => setFormData({ ...formData, authMethod: e.target.value as 'password' | 'key' })}
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="password">Password</option>
                <option value="key">SSH Key</option>
              </select>
            </div>
            {formData.authMethod === 'key' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Key Path</label>
                <input
                  type="text"
                  value={formData.keyPath}
                  onChange={(e) => setFormData({ ...formData, keyPath: e.target.value })}
                  placeholder="~/.ssh/id_rsa"
                  className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="production, aws, web-server"
                className="w-full px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => editingConnectionId ? updateConnection(editingConnectionId) : addConnection()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              {editingConnectionId ? 'Update' : 'Add Connection'}
            </button>
            <button
              onClick={() => {
                setIsAddingConnection(false);
                setEditingConnectionId(null);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConnections.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            <Server className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="mb-1">No SSH connections found</p>
            <p className="text-xs text-gray-500">Click + to add your first SSH connection</p>
          </div>
        ) : (
          filteredConnections.map((connection) => (
            <div
              key={connection.id}
              className="p-4 border-b border-gray-700 last:border-0 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-gray-200">{connection.name}</span>
                    {connection.tags && connection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {connection.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-gray-900 text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>{connection.host}:{connection.port}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{connection.username}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      <span>{connection.authMethod === 'key' ? 'SSH Key' : 'Password'}</span>
                    </div>
                    {connection.keyPath && (
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        <span className="truncate">{connection.keyPath}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => onConnect(connection)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="Connect"
                  >
                    <Server className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEditing(connection)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteConnection(connection.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
