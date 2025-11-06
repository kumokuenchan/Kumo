import { useState, useEffect } from 'react';
import { Globe, Plus, X, Edit2, Trash2, Copy, Check } from 'lucide-react';
import { environmentStorage, type Environment, type EnvironmentVariable } from '../../services/environmentStorage';

interface EnvironmentManagerProps {
  onClose: () => void;
}

export default function EnvironmentManager({ onClose }: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null);
  const [editingEnvName, setEditingEnvName] = useState('');
  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = () => {
    const envs = environmentStorage.getEnvironments();
    const activeId = environmentStorage.getActiveEnvironmentId();
    setEnvironments(envs);
    setActiveEnvId(activeId);

    if (envs.length > 0 && !selectedEnv) {
      setSelectedEnv(activeId ? envs.find(e => e.id === activeId) || envs[0] : envs[0]);
    }
  };

  const handleCreateEnvironment = () => {
    if (!newEnvName.trim()) return;

    const newEnv = environmentStorage.createEnvironment(newEnvName.trim(), [
      { key: 'baseUrl', value: 'https://api.example.com', enabled: true, description: 'Base API URL' },
    ]);

    setShowNewEnv(false);
    setNewEnvName('');
    loadEnvironments();
    setSelectedEnv(newEnv);
  };

  const handleDeleteEnvironment = (id: string) => {
    if (!confirm('Delete this environment?')) return;

    environmentStorage.deleteEnvironment(id);
    loadEnvironments();

    if (selectedEnv?.id === id) {
      const remaining = environments.filter(e => e.id !== id);
      setSelectedEnv(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleDuplicateEnvironment = (id: string) => {
    const duplicated = environmentStorage.duplicateEnvironment(id);
    if (duplicated) {
      loadEnvironments();
      setSelectedEnv(duplicated);
    }
  };

  const handleSetActive = (id: string) => {
    environmentStorage.setActiveEnvironment(id);
    setActiveEnvId(id);
  };

  const handleRenameEnvironment = (id: string) => {
    if (!editingEnvName.trim()) return;

    environmentStorage.updateEnvironment(id, { name: editingEnvName.trim() });
    setEditingEnvId(null);
    setEditingEnvName('');
    loadEnvironments();
  };

  const handleAddVariable = () => {
    if (!selectedEnv) return;

    const updatedVars = [
      ...selectedEnv.variables,
      { key: '', value: '', enabled: true, description: '' },
    ];

    environmentStorage.updateEnvironment(selectedEnv.id, { variables: updatedVars });
    loadEnvironments();
    setSelectedEnv({ ...selectedEnv, variables: updatedVars });
  };

  const handleUpdateVariable = (index: number, updates: Partial<EnvironmentVariable>) => {
    if (!selectedEnv) return;

    const updatedVars = [...selectedEnv.variables];
    updatedVars[index] = { ...updatedVars[index], ...updates };

    environmentStorage.updateEnvironment(selectedEnv.id, { variables: updatedVars });
    setSelectedEnv({ ...selectedEnv, variables: updatedVars });
  };

  const handleDeleteVariable = (index: number) => {
    if (!selectedEnv) return;

    const updatedVars = selectedEnv.variables.filter((_, i) => i !== index);

    environmentStorage.updateEnvironment(selectedEnv.id, { variables: updatedVars });
    loadEnvironments();
    setSelectedEnv({ ...selectedEnv, variables: updatedVars });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Environment Manager
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Environments List */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-3">
              <button
                onClick={() => setShowNewEnv(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                <Plus className="w-4 h-4" />
                New Environment
              </button>

              {showNewEnv && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <input
                    type="text"
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="Environment name"
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 mb-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateEnvironment();
                      if (e.key === 'Escape') setShowNewEnv(false);
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreateEnvironment}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewEnv(false)}
                      className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 p-2">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`group p-2 rounded cursor-pointer transition-colors ${
                    selectedEnv?.id === env.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedEnv(env)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {editingEnvId === env.id ? (
                        <input
                          type="text"
                          value={editingEnvName}
                          onChange={(e) => setEditingEnvName(e.target.value)}
                          onBlur={() => handleRenameEnvironment(env.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameEnvironment(env.id);
                            if (e.key === 'Escape') setEditingEnvId(null);
                          }}
                          className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {activeEnvId === env.id && (
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {env.name}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {env.variables.length} variables
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEnvId(env.id);
                          setEditingEnvName(env.name);
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateEnvironment(env.id);
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      {environments.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnvironment(env.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {activeEnvId !== env.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetActive(env.id);
                      }}
                      className="mt-2 w-full px-2 py-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      Set as Active
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Variables Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEnv ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedEnv.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Use variables in requests with <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded">{'{{variableName}}'}</code>
                      </p>
                    </div>
                    <button
                      onClick={handleAddVariable}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      Add Variable
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedEnv.variables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <Globe className="w-12 h-12 mb-3 text-gray-400" />
                      <p className="text-sm">No variables yet</p>
                      <p className="text-xs mt-1">Click "Add Variable" to create one</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEnv.variables.map((variable, index) => (
                        <div
                          key={index}
                          className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={variable.enabled}
                              onChange={(e) =>
                                handleUpdateVariable(index, { enabled: e.target.checked })
                              }
                              className="mt-2"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={variable.key}
                                  onChange={(e) =>
                                    handleUpdateVariable(index, { key: e.target.value })
                                  }
                                  placeholder="Variable name"
                                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-mono"
                                />
                                <input
                                  type="text"
                                  value={variable.value}
                                  onChange={(e) =>
                                    handleUpdateVariable(index, { value: e.target.value })
                                  }
                                  placeholder="Value"
                                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                                />
                              </div>
                              <input
                                type="text"
                                value={variable.description || ''}
                                onChange={(e) =>
                                  handleUpdateVariable(index, { description: e.target.value })
                                }
                                placeholder="Description (optional)"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm text-gray-600 dark:text-gray-400"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteVariable(index)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <Globe className="w-16 h-16 mb-4 text-gray-400" />
                <p className="text-sm">No environment selected</p>
                <p className="text-xs mt-1">Create or select an environment to manage variables</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {activeEnvId && (
              <span>
                Active: <span className="font-semibold text-gray-900 dark:text-white">
                  {environments.find(e => e.id === activeEnvId)?.name}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
