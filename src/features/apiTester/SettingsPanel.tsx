import { useState, useRef } from 'react';
import {
  X, Globe, Webhook, Download, Upload, Plus, Trash2, Edit2, Check,
  AlertCircle, CheckCircle2, Settings, ChevronDown, ChevronRight
} from 'lucide-react';
import {
  apiTesterStorage,
  type EnvironmentPreset,
  type WebhookConfig,
  type ExportedCollection
} from '../../services/apiTesterStorage';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<'environments' | 'webhooks' | 'export'>('environments');

  // Environments state
  const [environments, setEnvironments] = useState<EnvironmentPreset[]>(apiTesterStorage.getEnvironments());
  const [activeEnvId, setActiveEnvId] = useState<string | null>(apiTesterStorage.getActiveEnvironmentId());
  const [editingEnv, setEditingEnv] = useState<EnvironmentPreset | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvUrl, setNewEnvUrl] = useState('');
  const [newEnvVars, setNewEnvVars] = useState<Array<{ key: string; value: string }>>([]);

  // Webhook state
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>(() => {
    return apiTesterStorage.getWebhookConfig() || {
      enabled: false,
      url: '',
      events: ['testFailed', 'scheduledRunComplete'],
      includeDetails: true,
      headers: {}
    };
  });
  const [webhookTestStatus, setWebhookTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Export/Import state
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Environment functions
  const refreshEnvironments = () => {
    setEnvironments(apiTesterStorage.getEnvironments());
    setActiveEnvId(apiTesterStorage.getActiveEnvironmentId());
  };

  const addEnvironment = () => {
    if (!newEnvName.trim()) return;

    const variables: Record<string, string> = {};
    newEnvVars.forEach(v => {
      if (v.key.trim()) variables[v.key.trim()] = v.value;
    });

    apiTesterStorage.saveEnvironment({
      name: newEnvName.trim(),
      baseUrl: newEnvUrl.trim(),
      variables
    });

    setNewEnvName('');
    setNewEnvUrl('');
    setNewEnvVars([]);
    refreshEnvironments();
  };

  const deleteEnvironment = (id: string) => {
    apiTesterStorage.deleteEnvironment(id);
    refreshEnvironments();
  };

  const setActiveEnvironment = (id: string | null) => {
    apiTesterStorage.setActiveEnvironmentId(id);
    setActiveEnvId(id);
  };

  const updateEnvironment = () => {
    if (!editingEnv) return;

    const variables: Record<string, string> = {};
    newEnvVars.forEach(v => {
      if (v.key.trim()) variables[v.key.trim()] = v.value;
    });

    apiTesterStorage.updateEnvironment(editingEnv.id, {
      name: newEnvName.trim(),
      baseUrl: newEnvUrl.trim(),
      variables
    });

    setEditingEnv(null);
    setNewEnvName('');
    setNewEnvUrl('');
    setNewEnvVars([]);
    refreshEnvironments();
  };

  const startEditEnvironment = (env: EnvironmentPreset) => {
    setEditingEnv(env);
    setNewEnvName(env.name);
    setNewEnvUrl(env.baseUrl);
    setNewEnvVars(Object.entries(env.variables).map(([key, value]) => ({ key, value })));
  };

  const addVariable = () => {
    setNewEnvVars(prev => [...prev, { key: '', value: '' }]);
  };

  const removeVariable = (index: number) => {
    setNewEnvVars(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: 'key' | 'value', value: string) => {
    setNewEnvVars(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  // Webhook functions
  const saveWebhook = () => {
    apiTesterStorage.saveWebhookConfig(webhookConfig);
  };

  const testWebhook = async () => {
    setWebhookTestStatus('testing');
    try {
      const success = await apiTesterStorage.sendWebhookNotification('scheduledRunComplete', {
        summary: { total: 1, passed: 1, failed: 0, skipped: 0 },
        message: 'Test notification from KumoDB API Tester'
      });
      setWebhookTestStatus(success ? 'success' : 'error');
    } catch {
      setWebhookTestStatus('error');
    }
    setTimeout(() => setWebhookTestStatus('idle'), 3000);
  };

  const toggleWebhookEvent = (event: WebhookConfig['events'][number]) => {
    setWebhookConfig(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  // Export/Import functions
  const exportCollection = () => {
    const data = apiTesterStorage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kumodb-api-tests-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportedCollection;

        if (!data.version || !data.tests) {
          setImportStatus({ type: 'error', message: 'Invalid collection file format' });
          return;
        }

        const result = apiTesterStorage.importCollection(data, { merge: true });
        setImportStatus({
          type: 'success',
          message: `Imported ${result.tests} tests, ${result.suites} suites, ${result.environments} environments`
        });
        refreshEnvironments();
      } catch (error) {
        setImportStatus({ type: 'error', message: 'Failed to parse import file' });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-gray-500 to-slate-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Environments, Webhooks, Export/Import
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSection('environments')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'environments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Environments
            </span>
          </button>
          <button
            onClick={() => setActiveSection('webhooks')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'webhooks'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Webhook className="w-4 h-4" />
              Webhooks
            </span>
          </button>
          <button
            onClick={() => setActiveSection('export')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'export'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              Export/Import
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Environments Section */}
          {activeSection === 'environments' && (
            <div className="space-y-4">
              {/* Add/Edit Environment Form */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {editingEnv ? 'Edit Environment' : 'Add Environment'}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        placeholder="e.g., Production"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={newEnvUrl}
                        onChange={(e) => setNewEnvUrl(e.target.value)}
                        placeholder="e.g., https://api.example.com"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Variables</label>
                      <button
                        onClick={addVariable}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Variable
                      </button>
                    </div>
                    {newEnvVars.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500">No variables defined</p>
                    ) : (
                      <div className="space-y-2">
                        {newEnvVars.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={v.key}
                              onChange={(e) => updateVariable(idx, 'key', e.target.value)}
                              placeholder="Key"
                              className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded"
                            />
                            <input
                              type="text"
                              value={v.value}
                              onChange={(e) => updateVariable(idx, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded"
                            />
                            <button
                              onClick={() => removeVariable(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {editingEnv ? (
                      <>
                        <button
                          onClick={updateEnvironment}
                          disabled={!newEnvName.trim()}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg"
                        >
                          Update Environment
                        </button>
                        <button
                          onClick={() => {
                            setEditingEnv(null);
                            setNewEnvName('');
                            setNewEnvUrl('');
                            setNewEnvVars([]);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={addEnvironment}
                        disabled={!newEnvName.trim()}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-lg"
                      >
                        Add Environment
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Environment List */}
              {environments.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">No environments configured</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {environments.map(env => (
                    <div
                      key={env.id}
                      className={`p-3 rounded-lg border ${
                        activeEnvId === env.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="activeEnv"
                            checked={activeEnvId === env.id}
                            onChange={() => setActiveEnvironment(env.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {env.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {env.baseUrl || 'No base URL'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditEnvironment(env)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => deleteEnvironment(env.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {Object.keys(env.variables).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(env.variables).map(([key, value]) => {
                              // Handle both string values and object values (legacy format)
                              const displayValue = typeof value === 'object' && value !== null
                                ? (value as any).value || JSON.stringify(value)
                                : String(value);
                              return (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded"
                                >
                                  {key}={displayValue}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {activeEnvId && (
                    <button
                      onClick={() => setActiveEnvironment(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Clear active environment
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Webhooks Section */}
          {activeSection === 'webhooks' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg space-y-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Webhook Notifications
                  </label>
                  <button
                    onClick={() => setWebhookConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      webhookConfig.enabled
                        ? 'bg-purple-500'
                        : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${
                      webhookConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={webhookConfig.url}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                  />
                </div>

                {/* Events */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Trigger Events
                  </label>
                  <div className="space-y-2">
                    {([
                      { id: 'testFailed', label: 'Test Failed' },
                      { id: 'suiteFailed', label: 'Suite Failed' },
                      { id: 'scheduledRunComplete', label: 'Scheduled Run Complete' }
                    ] as const).map(({ id, label }) => (
                      <label key={id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={webhookConfig.events.includes(id)}
                          onChange={() => toggleWebhookEvent(id)}
                          className="rounded border-gray-300 dark:border-slate-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Include details */}
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={webhookConfig.includeDetails}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, includeDetails: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-slate-600"
                  />
                  Include detailed results in notification
                </label>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveWebhook}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={testWebhook}
                    disabled={!webhookConfig.url || webhookTestStatus === 'testing'}
                    className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1 ${
                      webhookTestStatus === 'success'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : webhookTestStatus === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {webhookTestStatus === 'testing' && 'Testing...'}
                    {webhookTestStatus === 'success' && <><CheckCircle2 className="w-4 h-4" /> Sent!</>}
                    {webhookTestStatus === 'error' && <><AlertCircle className="w-4 h-4" /> Failed</>}
                    {webhookTestStatus === 'idle' && 'Test Webhook'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export/Import Section */}
          {activeSection === 'export' && (
            <div className="space-y-4">
              {/* Export */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Collection
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Export all tests, suites, and environments as a JSON file for backup or sharing.
                </p>
                <button
                  onClick={exportCollection}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export All
                </button>
              </div>

              {/* Import */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import Collection
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Import tests, suites, and environments from a JSON file. Existing items with the same ID will be skipped.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import from File
                </button>

                {importStatus && (
                  <div className={`mt-3 p-2 rounded text-sm ${
                    importStatus.type === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {importStatus.message}
                  </div>
                )}
              </div>

              {/* Current Stats */}
              <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Data
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {apiTesterStorage.getTests().length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Tests</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {apiTesterStorage.getSuites().length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Suites</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {environments.length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Environments</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
