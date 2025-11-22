import { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Save, Globe, Wifi, WifiOff, Clock,
  AlertTriangle, Check, Copy, ChevronDown, ChevronRight
} from 'lucide-react';

interface MockRule {
  id: string;
  enabled: boolean;
  name: string;
  urlPattern: string;
  method?: string;
  response: {
    status: number;
    headers?: Record<string, string>;
    body: string;
    delay?: number;
  };
}

interface NetworkProfile {
  id: string;
  name: string;
  latency: number; // ms
  downloadSpeed: number; // kbps
  uploadSpeed: number; // kbps
}

interface NetworkMockingProps {
  testId: string;
  onSave: (mocks: MockRule[]) => void;
  onClose: () => void;
}

const presetProfiles: NetworkProfile[] = [
  { id: 'fast3g', name: 'Fast 3G', latency: 150, downloadSpeed: 1500, uploadSpeed: 750 },
  { id: 'slow3g', name: 'Slow 3G', latency: 400, downloadSpeed: 500, uploadSpeed: 250 },
  { id: 'offline', name: 'Offline', latency: 0, downloadSpeed: 0, uploadSpeed: 0 },
  { id: '2g', name: '2G', latency: 800, downloadSpeed: 280, uploadSpeed: 140 },
];

export default function NetworkMocking({ testId, onSave, onClose }: NetworkMockingProps) {
  const [mocks, setMocks] = useState<MockRule[]>([]);
  const [selectedMock, setSelectedMock] = useState<MockRule | null>(null);
  const [networkProfile, setNetworkProfile] = useState<string>('none');
  const [customLatency, setCustomLatency] = useState(0);

  // Load mocks from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`playwright:mocks:${testId}`);
      if (stored) {
        setMocks(JSON.parse(stored));
      }
    } catch {
      setMocks([]);
    }
  }, [testId]);

  // Save mocks
  const saveMocks = (newMocks: MockRule[]) => {
    setMocks(newMocks);
    localStorage.setItem(`playwright:mocks:${testId}`, JSON.stringify(newMocks));
  };

  // Add new mock
  const addMock = () => {
    const newMock: MockRule = {
      id: crypto.randomUUID(),
      enabled: true,
      name: 'New Mock',
      urlPattern: '**/api/*',
      method: 'GET',
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '{"message": "Mocked response"}',
        delay: 0
      }
    };
    saveMocks([...mocks, newMock]);
    setSelectedMock(newMock);
  };

  // Delete mock
  const deleteMock = (id: string) => {
    saveMocks(mocks.filter(m => m.id !== id));
    if (selectedMock?.id === id) {
      setSelectedMock(null);
    }
  };

  // Toggle mock enabled
  const toggleMock = (id: string) => {
    saveMocks(mocks.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };

  // Update mock
  const updateMock = (id: string, updates: Partial<MockRule>) => {
    const updated = mocks.map(m =>
      m.id === id ? { ...m, ...updates } : m
    );
    saveMocks(updated);
    if (selectedMock?.id === id) {
      setSelectedMock(updated.find(m => m.id === id) || null);
    }
  };

  // Duplicate mock
  const duplicateMock = (mock: MockRule) => {
    const newMock: MockRule = {
      ...mock,
      id: crypto.randomUUID(),
      name: `${mock.name} (Copy)`
    };
    saveMocks([...mocks, newMock]);
  };

  // Handle save
  const handleSave = () => {
    onSave(mocks);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Network Mocking
              </h2>
              <p className="text-xs text-gray-500">
                Mock API responses and simulate network conditions
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

        {/* Network Conditions */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Network Conditions
          </div>
          <div className="flex items-center gap-2">
            {presetProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => setNetworkProfile(profile.id)}
                className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${
                  networkProfile === profile.id
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700'
                    : 'bg-white dark:bg-slate-800 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {profile.id === 'offline' ? (
                  <WifiOff className="w-3 h-3" />
                ) : (
                  <Wifi className="w-3 h-3" />
                )}
                {profile.name}
              </button>
            ))}
            <button
              onClick={() => setNetworkProfile('none')}
              className={`px-3 py-1.5 text-xs rounded-lg ${
                networkProfile === 'none'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700'
                  : 'bg-white dark:bg-slate-800 text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              No Throttling
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Mocks List */}
          <div className="w-72 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700">
              <button
                onClick={addMock}
                className="w-full px-3 py-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Mock Rule
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {mocks.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs text-gray-500">No mock rules</p>
                </div>
              ) : (
                mocks.map(mock => (
                  <div
                    key={mock.id}
                    onClick={() => setSelectedMock(mock)}
                    className={`p-3 rounded-lg cursor-pointer mb-2 ${
                      selectedMock?.id === mock.id
                        ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMock(mock.id); }}
                          className={`w-4 h-4 rounded ${
                            mock.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          {mock.enabled && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <span className={`text-sm font-medium ${
                          mock.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                        }`}>
                          {mock.name}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {mock.method} {mock.urlPattern}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mock Editor */}
          <div className="flex-1 overflow-auto p-4">
            {selectedMock ? (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedMock.name}
                    onChange={(e) => updateMock(selectedMock.id, { name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  />
                </div>

                {/* URL Pattern */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL Pattern
                  </label>
                  <input
                    type="text"
                    value={selectedMock.urlPattern}
                    onChange={(e) => updateMock(selectedMock.id, { urlPattern: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg font-mono"
                    placeholder="**/api/users/*"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use ** for any path, * for single segment
                  </p>
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Method
                  </label>
                  <select
                    value={selectedMock.method || 'GET'}
                    onChange={(e) => updateMock(selectedMock.id, { method: e.target.value })}
                    className="w-32 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                {/* Response Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response Status
                  </label>
                  <input
                    type="number"
                    value={selectedMock.response.status}
                    onChange={(e) => updateMock(selectedMock.id, {
                      response: { ...selectedMock.response, status: parseInt(e.target.value) || 200 }
                    })}
                    className="w-24 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  />
                </div>

                {/* Response Delay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={selectedMock.response.delay || 0}
                    onChange={(e) => updateMock(selectedMock.id, {
                      response: { ...selectedMock.response, delay: parseInt(e.target.value) || 0 }
                    })}
                    className="w-24 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                    min="0"
                  />
                </div>

                {/* Response Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Response Body
                  </label>
                  <textarea
                    value={selectedMock.response.body}
                    onChange={(e) => updateMock(selectedMock.id, {
                      response: { ...selectedMock.response, body: e.target.value }
                    })}
                    className="w-full h-40 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg font-mono"
                    placeholder='{"message": "Mock response"}'
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => duplicateMock(selectedMock)}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => deleteMock(selectedMock.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">Select a mock rule to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Mocks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
