import { useState } from 'react';
import {
  Play, Plus, Trash2, GripVertical, Settings, Code, Eye,
  ChevronDown, ChevronRight, Globe, MousePointer, Type, List,
  CheckSquare, Square, Clock, Camera, AlertCircle, Copy, Circle,
  FileText, Variable
} from 'lucide-react';
import {
  type PlaywrightTest,
  type TestStep,
  type StepAction,
  type SelectorType,
  type TestConfig,
  playwrightStorage
} from '../../services/playwrightStorage';
import TestRecorder from './TestRecorder';
import ConfigProfiles from './ConfigProfiles';
import EnvironmentManager from './EnvironmentManager';

interface TestEditorProps {
  test: PlaywrightTest;
  onUpdate: (updates: Partial<PlaywrightTest>) => void;
  onRun: () => void;
}

// Step action metadata
const stepActions: Array<{
  action: StepAction;
  label: string;
  icon: any;
  category: 'navigation' | 'interaction' | 'assertion' | 'utility';
  description: string;
}> = [
  { action: 'navigate', label: 'Navigate', icon: Globe, category: 'navigation', description: 'Go to a URL' },
  { action: 'click', label: 'Click', icon: MousePointer, category: 'interaction', description: 'Click an element' },
  { action: 'fill', label: 'Fill', icon: Type, category: 'interaction', description: 'Fill input field' },
  { action: 'select', label: 'Select', icon: List, category: 'interaction', description: 'Select dropdown option' },
  { action: 'check', label: 'Check', icon: CheckSquare, category: 'interaction', description: 'Check a checkbox' },
  { action: 'uncheck', label: 'Uncheck', icon: Square, category: 'interaction', description: 'Uncheck a checkbox' },
  { action: 'hover', label: 'Hover', icon: MousePointer, category: 'interaction', description: 'Hover over element' },
  { action: 'press', label: 'Press Key', icon: Type, category: 'interaction', description: 'Press a keyboard key' },
  { action: 'wait', label: 'Wait', icon: Clock, category: 'utility', description: 'Wait for time' },
  { action: 'waitForSelector', label: 'Wait for Element', icon: Clock, category: 'utility', description: 'Wait for element state' },
  { action: 'screenshot', label: 'Screenshot', icon: Camera, category: 'utility', description: 'Take a screenshot' },
  { action: 'assertVisible', label: 'Assert Visible', icon: Eye, category: 'assertion', description: 'Assert element is visible' },
  { action: 'assertHidden', label: 'Assert Hidden', icon: Eye, category: 'assertion', description: 'Assert element is hidden' },
  { action: 'assertText', label: 'Assert Text', icon: Type, category: 'assertion', description: 'Assert element text' },
  { action: 'assertValue', label: 'Assert Value', icon: Type, category: 'assertion', description: 'Assert input value' },
  { action: 'assertUrl', label: 'Assert URL', icon: Globe, category: 'assertion', description: 'Assert page URL' },
  { action: 'assertTitle', label: 'Assert Title', icon: Globe, category: 'assertion', description: 'Assert page title' },
];

export default function TestEditor({ test, onUpdate, onRun }: TestEditorProps) {
  const [activeTab, setActiveTab] = useState<'steps' | 'config' | 'code'>('steps');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(test.name);

  // Phase 2 modals
  const [showRecorder, setShowRecorder] = useState(false);
  const [showConfigProfiles, setShowConfigProfiles] = useState(false);
  const [showEnvironments, setShowEnvironments] = useState(false);

  // Handle recorded steps
  const handleRecordedSteps = (steps: TestStep[]) => {
    onUpdate({ steps: [...test.steps, ...steps] });
    setShowRecorder(false);
  };

  // Apply config from profile
  const handleApplyConfig = (config: TestConfig) => {
    onUpdate({ config });
  };

  // Toggle step expanded
  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  // Add new step
  const addStep = (action: StepAction) => {
    const newStep: TestStep = {
      id: crypto.randomUUID(),
      action,
      enabled: true
    };

    // Set defaults based on action
    switch (action) {
      case 'navigate':
        newStep.url = 'https://';
        break;
      case 'wait':
        newStep.timeout = 1000;
        break;
      case 'waitForSelector':
        newStep.state = 'visible';
        newStep.timeout = 30000;
        break;
      case 'assertText':
      case 'assertUrl':
        newStep.matchType = 'exact';
        break;
    }

    onUpdate({ steps: [...test.steps, newStep] });
    setExpandedSteps(prev => new Set(prev).add(newStep.id));
    setShowAddStep(false);
  };

  // Update step
  const updateStep = (stepId: string, updates: Partial<TestStep>) => {
    onUpdate({
      steps: test.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    });
  };

  // Delete step
  const deleteStep = (stepId: string) => {
    onUpdate({
      steps: test.steps.filter(s => s.id !== stepId)
    });
  };

  // Duplicate step
  const duplicateStep = (stepId: string) => {
    const step = test.steps.find(s => s.id === stepId);
    if (!step) return;

    const index = test.steps.findIndex(s => s.id === stepId);
    const newStep = { ...step, id: crypto.randomUUID() };
    const newSteps = [...test.steps];
    newSteps.splice(index + 1, 0, newStep);
    onUpdate({ steps: newSteps });
  };

  // Move step
  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = test.steps.findIndex(s => s.id === stepId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === test.steps.length - 1) return;

    const newSteps = [...test.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    onUpdate({ steps: newSteps });
  };

  // Update config
  const updateConfig = (updates: Partial<TestConfig>) => {
    onUpdate({ config: { ...test.config, ...updates } });
  };

  // Save name
  const saveName = () => {
    if (tempName.trim()) {
      onUpdate({ name: tempName.trim() });
    }
    setEditingName(false);
  };

  // Get step icon
  const getStepIcon = (action: StepAction) => {
    const meta = stepActions.find(s => s.action === action);
    return meta?.icon || AlertCircle;
  };

  // Get step label
  const getStepLabel = (action: StepAction) => {
    return stepActions.find(s => s.action === action)?.label || action;
  };

  // Generate code
  const generatedCode = playwrightStorage.generateTestCode(test);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {editingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="text-lg font-semibold bg-transparent border-b border-green-500 outline-none text-gray-900 dark:text-white"
                autoFocus
              />
            ) : (
              <h2
                onClick={() => { setEditingName(true); setTempName(test.name); }}
                className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-green-600"
              >
                {test.name}
              </h2>
            )}
            <span className="text-sm text-gray-500">
              {test.steps.length} steps
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecorder(true)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
              title="Record Actions"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowEnvironments(true)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"
              title="Environments"
            >
              <Variable className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfigProfiles(true)}
              className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400"
              title="Config Profiles"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onRun}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run Test
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('steps')}
            className={`text-sm font-medium pb-2 border-b-2 ${
              activeTab === 'steps'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Steps
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`text-sm font-medium pb-2 border-b-2 ${
              activeTab === 'config'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Config
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`text-sm font-medium pb-2 border-b-2 ${
              activeTab === 'code'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Steps Tab */}
        {activeTab === 'steps' && (
          <div className="p-4">
            {test.steps.length === 0 ? (
              <div className="text-center py-8">
                <MousePointer className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  No steps yet. Add your first step to start building the test.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {test.steps.map((step, index) => {
                  const StepIcon = getStepIcon(step.action);
                  const isExpanded = expandedSteps.has(step.id);

                  return (
                    <div
                      key={step.id}
                      className={`border rounded-lg ${
                        step.enabled === false
                          ? 'opacity-50 bg-gray-50 dark:bg-slate-900'
                          : 'bg-white dark:bg-slate-800'
                      } ${
                        isExpanded
                          ? 'border-green-200 dark:border-green-800'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Step Header */}
                      <div
                        className="flex items-center gap-2 p-3 cursor-pointer"
                        onClick={() => toggleStepExpanded(step.id)}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                        <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                        <StepIcon className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                          {getStepLabel(step.action)}
                          {step.description && (
                            <span className="ml-2 font-normal text-gray-500">
                              - {step.description}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateStep(step.id); }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Step Details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-100 dark:border-slate-700 pt-3 space-y-3">
                          {/* Description */}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <input
                              type="text"
                              value={step.description || ''}
                              onChange={(e) => updateStep(step.id, { description: e.target.value })}
                              placeholder="Optional description"
                              className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                            />
                          </div>

                          {/* Action-specific fields */}
                          {step.action === 'navigate' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">URL</label>
                              <input
                                type="url"
                                value={step.url || ''}
                                onChange={(e) => updateStep(step.id, { url: e.target.value })}
                                placeholder="https://example.com"
                                className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none font-mono"
                              />
                            </div>
                          )}

                          {['click', 'fill', 'select', 'check', 'uncheck', 'hover', 'press', 'waitForSelector', 'assertVisible', 'assertHidden', 'assertText', 'assertValue'].includes(step.action) && (
                            <>
                              <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-3">
                                  <label className="block text-xs text-gray-500 mb-1">Selector</label>
                                  <input
                                    type="text"
                                    value={step.selector || ''}
                                    onChange={(e) => updateStep(step.id, { selector: e.target.value })}
                                    placeholder="#id, .class, or text"
                                    className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                                  <select
                                    value={step.selectorType || 'css'}
                                    onChange={(e) => updateStep(step.id, { selectorType: e.target.value as SelectorType })}
                                    className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                                  >
                                    <option value="css">CSS</option>
                                    <option value="xpath">XPath</option>
                                    <option value="text">Text</option>
                                    <option value="testId">Test ID</option>
                                    <option value="role">Role</option>
                                    <option value="label">Label</option>
                                  </select>
                                </div>
                              </div>
                            </>
                          )}

                          {['fill', 'select'].includes(step.action) && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Value</label>
                              <input
                                type="text"
                                value={step.value || ''}
                                onChange={(e) => updateStep(step.id, { value: e.target.value })}
                                placeholder="Enter value"
                                className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                              />
                            </div>
                          )}

                          {step.action === 'press' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Key</label>
                              <input
                                type="text"
                                value={step.key || ''}
                                onChange={(e) => updateStep(step.id, { key: e.target.value })}
                                placeholder="Enter, Tab, Escape..."
                                className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                              />
                            </div>
                          )}

                          {['wait', 'waitForSelector'].includes(step.action) && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Timeout (ms)</label>
                              <input
                                type="number"
                                value={step.timeout || 1000}
                                onChange={(e) => updateStep(step.id, { timeout: parseInt(e.target.value) })}
                                className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                              />
                            </div>
                          )}

                          {step.action === 'waitForSelector' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">State</label>
                              <select
                                value={step.state || 'visible'}
                                onChange={(e) => updateStep(step.id, { state: e.target.value as any })}
                                className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                              >
                                <option value="visible">Visible</option>
                                <option value="hidden">Hidden</option>
                                <option value="attached">Attached</option>
                                <option value="detached">Detached</option>
                              </select>
                            </div>
                          )}

                          {['assertText', 'assertValue', 'assertUrl', 'assertTitle'].includes(step.action) && (
                            <>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Expected</label>
                                <input
                                  type="text"
                                  value={step.expected || ''}
                                  onChange={(e) => updateStep(step.id, { expected: e.target.value })}
                                  placeholder="Expected value"
                                  className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Match Type</label>
                                <select
                                  value={step.matchType || 'exact'}
                                  onChange={(e) => updateStep(step.id, { matchType: e.target.value as any })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 rounded border-none"
                                >
                                  <option value="exact">Exact Match</option>
                                  <option value="contains">Contains</option>
                                  <option value="regex">Regex</option>
                                </select>
                              </div>
                            </>
                          )}

                          {step.action === 'screenshot' && (
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={step.fullPage || false}
                                onChange={(e) => updateStep(step.id, { fullPage: e.target.checked })}
                                className="rounded"
                              />
                              Full page screenshot
                            </label>
                          )}

                          {/* Enable/Disable */}
                          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={step.enabled !== false}
                              onChange={(e) => updateStep(step.id, { enabled: e.target.checked })}
                              className="rounded"
                            />
                            Enabled
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Step Button */}
            <div className="mt-4">
              {showAddStep ? (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Add Step</h4>
                    <button
                      onClick={() => setShowAddStep(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {stepActions.map(({ action, label, icon: Icon, category }) => (
                      <button
                        key={action}
                        onClick={() => addStep(action)}
                        className={`p-2 text-left rounded-lg border hover:border-green-300 dark:hover:border-green-700 transition-colors ${
                          category === 'navigation' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900' :
                          category === 'interaction' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900' :
                          category === 'assertion' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900' :
                          'bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1 text-gray-600 dark:text-gray-300" />
                        <div className="text-xs font-medium text-gray-900 dark:text-white">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddStep(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              )}
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Browser</label>
                <select
                  value={test.config.browser}
                  onChange={(e) => updateConfig({ browser: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                >
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit (Safari)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                <select
                  value={test.config.headless ? 'headless' : 'headed'}
                  onChange={(e) => updateConfig({ headless: e.target.value === 'headless' })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                >
                  <option value="headless">Headless</option>
                  <option value="headed">Headed (Visible)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Viewport Width</label>
                <input
                  type="number"
                  value={test.config.viewport.width}
                  onChange={(e) => updateConfig({ viewport: { ...test.config.viewport, width: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Viewport Height</label>
                <input
                  type="number"
                  value={test.config.viewport.height}
                  onChange={(e) => updateConfig({ viewport: { ...test.config.viewport, height: parseInt(e.target.value) } })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL</label>
              <input
                type="url"
                value={test.config.baseUrl || ''}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={test.config.timeout}
                  onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Retries</label>
                <input
                  type="number"
                  value={test.config.retries}
                  onChange={(e) => updateConfig({ retries: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <input
                type="text"
                value={test.tags.join(', ')}
                onChange={(e) => onUpdate({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="smoke, regression, login"
                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg border-none"
              />
            </div>
          </div>
        )}

        {/* Code Tab */}
        {activeTab === 'code' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Generated Playwright Code</span>
              <button
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                className="text-xs text-green-600 hover:text-green-700"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
              {generatedCode}
            </pre>
          </div>
        )}
      </div>

      {/* Phase 2 Modals */}
      {showRecorder && (
        <TestRecorder
          onSave={handleRecordedSteps}
          onClose={() => setShowRecorder(false)}
        />
      )}

      {showConfigProfiles && (
        <ConfigProfiles
          currentConfig={test.config}
          onApply={handleApplyConfig}
          onClose={() => setShowConfigProfiles(false)}
        />
      )}

      {showEnvironments && (
        <EnvironmentManager
          onClose={() => setShowEnvironments(false)}
        />
      )}
    </div>
  );
}
