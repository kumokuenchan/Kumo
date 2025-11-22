import { useState, useEffect } from 'react';
import {
  X, Plus, Save, Trash2, Copy, Check, Monitor, Settings,
  Smartphone, Tablet, Globe
} from 'lucide-react';
import { type TestConfig, defaultTestConfig } from '../../services/playwrightStorage';

interface ConfigProfile {
  id: string;
  name: string;
  config: TestConfig;
  isDefault?: boolean;
}

interface ConfigProfilesProps {
  currentConfig: TestConfig;
  onApply: (config: TestConfig) => void;
  onClose: () => void;
}

// Preset device configurations
const devicePresets: { name: string; icon: any; config: Partial<TestConfig> }[] = [
  {
    name: 'Desktop',
    icon: Monitor,
    config: { viewport: { width: 1920, height: 1080 } }
  },
  {
    name: 'Laptop',
    icon: Monitor,
    config: { viewport: { width: 1366, height: 768 } }
  },
  {
    name: 'Tablet',
    icon: Tablet,
    config: { viewport: { width: 768, height: 1024 } }
  },
  {
    name: 'Mobile',
    icon: Smartphone,
    config: { viewport: { width: 375, height: 667 } }
  }
];

export default function ConfigProfiles({ currentConfig, onApply, onClose }: ConfigProfilesProps) {
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<TestConfig>(currentConfig);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNewProfile, setShowNewProfile] = useState(false);

  // Load profiles from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('playwright:configProfiles');
      if (stored) {
        setProfiles(JSON.parse(stored));
      } else {
        // Create default profiles
        const defaults: ConfigProfile[] = [
          {
            id: 'default',
            name: 'Default',
            config: defaultTestConfig,
            isDefault: true
          },
          {
            id: 'mobile',
            name: 'Mobile Testing',
            config: {
              ...defaultTestConfig,
              viewport: { width: 375, height: 667 },
              browser: 'webkit'
            }
          },
          {
            id: 'ci',
            name: 'CI/CD',
            config: {
              ...defaultTestConfig,
              headless: true,
              retries: 2,
              timeout: 60000
            }
          }
        ];
        setProfiles(defaults);
        localStorage.setItem('playwright:configProfiles', JSON.stringify(defaults));
      }
    } catch {
      setProfiles([]);
    }
  }, []);

  // Save profiles
  const saveProfiles = (newProfiles: ConfigProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('playwright:configProfiles', JSON.stringify(newProfiles));
  };

  // Select profile
  const selectProfile = (profile: ConfigProfile) => {
    setSelectedProfile(profile.id);
    setEditingConfig(profile.config);
  };

  // Create new profile
  const createProfile = () => {
    if (!newProfileName.trim()) return;

    const newProfile: ConfigProfile = {
      id: crypto.randomUUID(),
      name: newProfileName,
      config: editingConfig
    };

    saveProfiles([...profiles, newProfile]);
    setNewProfileName('');
    setShowNewProfile(false);
    setSelectedProfile(newProfile.id);
  };

  // Delete profile
  const deleteProfile = (id: string) => {
    if (!confirm('Delete this profile?')) return;
    saveProfiles(profiles.filter(p => p.id !== id));
    if (selectedProfile === id) {
      setSelectedProfile(null);
    }
  };

  // Duplicate profile
  const duplicateProfile = (profile: ConfigProfile) => {
    const newProfile: ConfigProfile = {
      id: crypto.randomUUID(),
      name: `${profile.name} (Copy)`,
      config: { ...profile.config }
    };
    saveProfiles([...profiles, newProfile]);
  };

  // Apply device preset
  const applyPreset = (preset: typeof devicePresets[0]) => {
    setEditingConfig(prev => ({
      ...prev,
      ...preset.config
    }));
  };

  // Apply current config
  const applyConfig = () => {
    onApply(editingConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-3xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configuration Profiles
              </h2>
              <p className="text-xs text-gray-500">
                Save and load test configurations
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
          {/* Profiles List */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700">
              <button
                onClick={() => setShowNewProfile(true)}
                className="w-full px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Profile
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => selectProfile(profile)}
                  className={`p-3 rounded-lg cursor-pointer group mb-1 ${
                    selectedProfile === profile.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile.name}
                    </span>
                    {!profile.isDefault && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateProfile(profile); }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {profile.config.browser} • {profile.config.viewport.width}x{profile.config.viewport.height}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Config Editor */}
          <div className="flex-1 overflow-auto p-4">
            {/* Device Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Device Presets
              </label>
              <div className="flex gap-2">
                {devicePresets.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex-1 p-3 text-center bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <preset.icon className="w-5 h-5 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Browser */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Browser
              </label>
              <div className="flex gap-2">
                {(['chromium', 'firefox', 'webkit'] as const).map(browser => (
                  <button
                    key={browser}
                    onClick={() => setEditingConfig(prev => ({ ...prev, browser }))}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg ${
                      editingConfig.browser === browser
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {browser.charAt(0).toUpperCase() + browser.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Viewport Size
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editingConfig.viewport.width}
                  onChange={(e) => setEditingConfig(prev => ({
                    ...prev,
                    viewport: { ...prev.viewport, width: parseInt(e.target.value) || 1280 }
                  }))}
                  className="w-24 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  placeholder="Width"
                />
                <span className="self-center text-gray-500">×</span>
                <input
                  type="number"
                  value={editingConfig.viewport.height}
                  onChange={(e) => setEditingConfig(prev => ({
                    ...prev,
                    viewport: { ...prev.viewport, height: parseInt(e.target.value) || 720 }
                  }))}
                  className="w-24 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                  placeholder="Height"
                />
              </div>
            </div>

            {/* Headless */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingConfig.headless}
                  onChange={(e) => setEditingConfig(prev => ({ ...prev, headless: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Headless Mode</span>
              </label>
            </div>

            {/* Timeout */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={editingConfig.timeout}
                onChange={(e) => setEditingConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                className="w-32 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              />
            </div>

            {/* Retries */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retries
              </label>
              <input
                type="number"
                value={editingConfig.retries}
                onChange={(e) => setEditingConfig(prev => ({ ...prev, retries: parseInt(e.target.value) || 0 }))}
                className="w-20 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                min="0"
                max="5"
              />
            </div>

            {/* Slow Mo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slow Motion (ms)
              </label>
              <input
                type="number"
                value={editingConfig.slowMo || 0}
                onChange={(e) => setEditingConfig(prev => ({ ...prev, slowMo: parseInt(e.target.value) || 0 }))}
                className="w-24 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">Slow down operations for debugging</p>
            </div>

            {/* Base URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL
              </label>
              <input
                type="url"
                value={editingConfig.baseUrl || ''}
                onChange={(e) => setEditingConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
            >
              Cancel
            </button>
            <div className="flex-1" />
            <button
              onClick={applyConfig}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Configuration
            </button>
          </div>
        </div>

        {/* New Profile Modal */}
        {showNewProfile && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 w-80">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Save as New Profile
              </h3>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name"
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewProfile(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createProfile}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
