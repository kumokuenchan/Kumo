import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Save,
  Trash2,
  Play,
  Code,
  FileText,
  GitBranch,
  Database,
  Server,
  Package,
  Terminal as TerminalIcon,
  Settings,
  Plus,
  Replace,
  PlusCircle
} from 'lucide-react';

export interface TerminalPreset {
  name: string;
  command?: string;
  cwd?: string;
}

export interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  layout: '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '4x4';
  viewMode: 'grid' | 'tabs';
  terminals: TerminalPreset[];
  isCustom?: boolean;
}

export type ApplyMode = 'replace' | 'add';

interface WorkspacePresetsProps {
  onClose: () => void;
  onApplyPreset: (preset: WorkspacePreset, mode: ApplyMode) => void;
  currentPresets: WorkspacePreset[];
  onSavePreset: (preset: WorkspacePreset) => void;
  onDeletePreset: (presetId: string) => void;
  currentLayout: string;
  currentViewMode: 'grid' | 'tabs';
  currentTerminals: Array<{ id: string; name: string }>;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  code: <Code className="w-5 h-5" />,
  git: <GitBranch className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
  server: <Server className="w-5 h-5" />,
  package: <Package className="w-5 h-5" />,
  terminal: <TerminalIcon className="w-5 h-5" />,
  file: <FileText className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
};

export default function WorkspacePresets({
  onClose,
  onApplyPreset,
  currentPresets,
  onSavePreset,
  onDeletePreset,
  currentLayout,
  currentViewMode,
  currentTerminals,
}: WorkspacePresetsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('terminal');

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveCurrentWorkspace = () => {
    if (!newPresetName.trim()) return;

    const newPreset: WorkspacePreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      description: newPresetDescription || 'Custom workspace preset',
      icon: newPresetIcon,
      layout: currentLayout as any,
      viewMode: currentViewMode,
      terminals: currentTerminals.map(term => ({
        name: term.name,
      })),
      isCustom: true,
    };

    onSavePreset(newPreset);
    setShowSaveDialog(false);
    setNewPresetName('');
    setNewPresetDescription('');
    setNewPresetIcon('terminal');
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-[500px]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <h3 className="font-semibold">Workspace Presets</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {/* Save Current Workspace */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {!showSaveDialog ? (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Save Current Workspace as Preset
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name (e.g., My Development Setup)"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  autoFocus
                />
                <input
                  type="text"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />

                {/* Icon Selector */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(PRESET_ICONS).map((iconKey) => (
                      <button
                        key={iconKey}
                        onClick={() => setNewPresetIcon(iconKey)}
                        className={`p-2 rounded-lg transition-colors ${
                          newPresetIcon === iconKey
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {PRESET_ICONS[iconKey]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCurrentWorkspace}
                    disabled={!newPresetName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    Save Preset
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewPresetName('');
                      setNewPresetDescription('');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Presets List */}
          <div className="p-4 space-y-2">
            {currentPresets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No presets available</p>
                <p className="text-xs mt-1">Save your current workspace to create one!</p>
              </div>
            ) : (
              currentPresets.map((preset) => (
                <motion.div
                  key={preset.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group relative flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                    {PRESET_ICONS[preset.icon] || PRESET_ICONS.terminal}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {preset.name}
                      </h4>
                      {preset.isCustom && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <TerminalIcon className="w-3 h-3" />
                        {preset.terminals.length} terminal{preset.terminals.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        {preset.layout} {preset.viewMode}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onApplyPreset(preset, 'replace')}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      title="Replace current workspace"
                    >
                      <Replace className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onApplyPreset(preset, 'add')}
                      className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      title="Add to current workspace"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                    {preset.isCustom && (
                      <button
                        onClick={() => onDeletePreset(preset.id)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        title="Delete preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Presets save your terminal layout, view mode, and terminal configurations for quick access.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Replace className="w-3 h-3 text-blue-500" />
                <span>Replace: Close all terminals and load preset</span>
              </div>
              <div className="flex items-center gap-1">
                <PlusCircle className="w-3 h-3 text-green-500" />
                <span>Add: Keep current terminals and add preset</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
