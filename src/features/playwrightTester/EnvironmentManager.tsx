import { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Copy, Check, Globe, Variable, Edit2
} from 'lucide-react';
import { playwrightStorage, type PlaywrightEnvironment } from '../../services/playwrightStorage';

interface EnvironmentManagerProps {
  onClose: () => void;
}

export default function EnvironmentManager({ onClose }: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<PlaywrightEnvironment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<PlaywrightEnvironment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editing state
  const [editName, setEditName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editVariables, setEditVariables] = useState<Array<{ key: string; value: string }>>([]);

  // Load environments
  useEffect(() => {
    refreshEnvironments();
  }, []);

  const refreshEnvironments = () => {
    setEnvironments(playwrightStorage.getEnvironments());
    setActiveEnvId(playwrightStorage.getActiveEnvironmentId());
  };

  // Select environment
  const selectEnvironment = (env: PlaywrightEnvironment) => {
    setSelectedEnv(env);
    setEditName(env.name);
    setEditBaseUrl(env.baseUrl);
    setEditVariables(Object.entries(env.variables).map(([key, value]) => ({ key, value })));
    setIsEditing(false);
  };

  // Create new environment
  const createEnvironment = () => {
    const newEnv = playwrightStorage.saveEnvironment({
      name: 'New Environment',
      baseUrl: 'https://',
      variables: {}
    });
    refreshEnvironments();
    selectEnvironment(newEnv);
    setIsEditing(true);
  };

  // Save environment
  const saveEnvironment = () => {
    if (!selectedEnv) return;

    const variables: Record<string, string> = {};
    editVariables.forEach(v => {
      if (v.key.trim()) {
        variables[v.key.trim()] = v.value;
      }
    });

    // Update in storage (need to implement update method)
    const envs = playwrightStorage.getEnvironments();
    const index = envs.findIndex(e => e.id === selectedEnv.id);
    if (index !== -1) {
      envs[index] = {
        ...envs[index],
        name: editName,
        baseUrl: editBaseUrl,
        variables
      };
      localStorage.setItem('playwright:environments', JSON.stringify(envs));
    }

    refreshEnvironments();
    setIsEditing(false);
  };

  // Delete environment
  const deleteEnvironment = (id: string) => {
    if (!confirm('Delete this environment?')) return;
    playwrightStorage.deleteEnvironment(id);
    if (selectedEnv?.id === id) {
      setSelectedEnv(null);
    }
    refreshEnvironments();
  };

  // Duplicate environment
  const duplicateEnvironment = (env: PlaywrightEnvironment) => {
    const newEnv = playwrightStorage.saveEnvironment({
      name: `${env.name} (Copy)`,
      baseUrl: env.baseUrl,
      variables: { ...env.variables }
    });
    refreshEnvironments();
    selectEnvironment(newEnv);
  };

  // Set active environment
  const setActiveEnvironment = (id: string | null) => {
    playwrightStorage.setActiveEnvironmentId(id);
    setActiveEnvId(id);
  };

  // Add variable
  const addVariable = () => {
    setEditVariables(prev => [...prev, { key: '', value: '' }]);
  };

  // Remove variable
  const removeVariable = (index: number) => {
    setEditVariables(prev => prev.filter((_, i) => i !== index));
  };

  // Update variable
  const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
    setEditVariables(prev => prev.map((v, i) =>
      i === index ? { ...v, [field]: value } : v
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Environments
              </h2>
              <p className="text-xs text-gray-500">
                Manage test environments and variables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Environments List */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700">
              <button
                onClick={createEnvironment}
                className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Environment
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {/* No active environment option */}
              <div
                onClick={() => setActiveEnvironment(null)}
                className={`p-3 rounded-lg cursor-pointer mb-1 ${
                  !activeEnvId
                    ? 'bg-gray-100 dark:bg-slate-700'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!activeEnvId && <Check className="w-4 h-4 text-blue-500" />}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    No Environment
                  </span>
                </div>
              </div>

              {environments.map(env => (
                <div
                  key={env.id}
                  onClick={() => selectEnvironment(env)}
                  className={`p-3 rounded-lg cursor-pointer group mb-1 ${
                    selectedEnv?.id === env.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activeEnvId === env.id && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {env.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); duplicateEnvironment(env); }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {env.baseUrl}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environment Editor */}
          <div className="flex-1 overflow-auto p-4">
            {selectedEnv ? (
              <>
                {/* Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg disabled:opacity-50"
                  />
                </div>

                {/* Base URL */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Base URL
                  </label>
                  <input
                    type="url"
                    value={editBaseUrl}
                    onChange={(e) => setEditBaseUrl(e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg disabled:opacity-50"
                  />
                </div>

                {/* Variables */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Variables
                    </label>
                    {isEditing && (
                      <button
                        onClick={addVariable}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Variable
                      </button>
                    )}
                  </div>

                  {editVariables.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No variables defined
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {editVariables.map((variable, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={variable.key}
                            onChange={(e) => updateVariable(index, 'key', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Key"
                            className="w-32 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg disabled:opacity-50 font-mono"
                          />
                          <span className="text-gray-400">=</span>
                          <input
                            type="text"
                            value={variable.value}
                            onChange={(e) => updateVariable(index, 'value', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg disabled:opacity-50"
                          />
                          {isEditing && (
                            <button
                              onClick={() => removeVariable(index)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Use variables in tests with {'{{variableName}}'} syntax
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          selectEnvironment(selectedEnv);
                          setIsEditing(false);
                        }}
                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEnvironment}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setActiveEnvironment(selectedEnv.id)}
                        disabled={activeEnvId === selectedEnv.id}
                        className="px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Set Active
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Variable className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select an environment to view details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {activeEnvId ? (
                <>Active: <strong>{environments.find(e => e.id === activeEnvId)?.name}</strong></>
              ) : (
                'No active environment'
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
