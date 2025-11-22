import { useState } from 'react';
import {
  X, Accessibility, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Eye, Type, MousePointer, Keyboard, Volume2
} from 'lucide-react';

interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

interface A11yResult {
  url: string;
  timestamp: number;
  violations: A11yViolation[];
  passes: number;
  incomplete: number;
}

interface AccessibilityTestingProps {
  testId: string;
  onClose: () => void;
  onAddAssertion: (rule: string) => void;
}

// WCAG Rules for assertions
const wcagRules = [
  { id: 'color-contrast', name: 'Color Contrast', icon: Eye, description: 'Text must have sufficient contrast' },
  { id: 'image-alt', name: 'Image Alt Text', icon: Type, description: 'Images must have alt text' },
  { id: 'label', name: 'Form Labels', icon: Type, description: 'Form inputs must have labels' },
  { id: 'link-name', name: 'Link Names', icon: MousePointer, description: 'Links must have discernible text' },
  { id: 'button-name', name: 'Button Names', icon: MousePointer, description: 'Buttons must have discernible text' },
  { id: 'keyboard', name: 'Keyboard Access', icon: Keyboard, description: 'Interactive elements must be keyboard accessible' },
  { id: 'focus-visible', name: 'Focus Visible', icon: Eye, description: 'Focus must be visible' },
  { id: 'aria-roles', name: 'ARIA Roles', icon: Accessibility, description: 'ARIA roles must be valid' },
  { id: 'heading-order', name: 'Heading Order', icon: Type, description: 'Headings must be in logical order' },
  { id: 'audio-caption', name: 'Audio Captions', icon: Volume2, description: 'Audio must have captions' },
];

export default function AccessibilityTesting({ testId, onClose, onAddAssertion }: AccessibilityTestingProps) {
  const [results, setResults] = useState<A11yResult | null>(() => {
    try {
      const stored = localStorage.getItem(`playwright:a11y:${testId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedViolation, setSelectedViolation] = useState<A11yViolation | null>(null);
  const [enabledRules, setEnabledRules] = useState<Set<string>>(new Set(['color-contrast', 'image-alt', 'label']));

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'serious': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'minor': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get impact icon
  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
      case 'serious':
        return AlertCircle;
      case 'moderate':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  // Toggle rule
  const toggleRule = (ruleId: string) => {
    setEnabledRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  // Add all enabled rules as assertions
  const addAssertions = () => {
    enabledRules.forEach(rule => {
      onAddAssertion(rule);
    });
    onClose();
  };

  // Group violations by impact
  const groupedViolations = results?.violations.reduce((acc, v) => {
    if (!acc[v.impact]) acc[v.impact] = [];
    acc[v.impact].push(v);
    return acc;
  }, {} as Record<string, A11yViolation[]>) || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <Accessibility className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Accessibility Testing
              </h2>
              <p className="text-xs text-gray-500">
                WCAG 2.1 compliance checks
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
          {/* Rules Selection */}
          <div className="w-72 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                A11y Rules to Check
              </h3>
              <p className="text-xs text-gray-500">
                Select rules to add as assertions
              </p>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2">
              {wcagRules.map(rule => (
                <label
                  key={rule.id}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                    enabledRules.has(rule.id)
                      ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledRules.has(rule.id)}
                    onChange={() => toggleRule(rule.id)}
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <rule.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {rule.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {rule.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={addAssertions}
                disabled={enabledRules.size === 0}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 rounded-lg"
              >
                Add {enabledRules.size} Assertions
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {results ? (
              <>
                {/* Summary */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Scan: {new Date(results.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600">
                        {results.violations.length} violations
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        {results.passes} passed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Violations List */}
                <div className="flex-1 overflow-auto p-4">
                  {results.violations.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p className="text-sm text-gray-600">No accessibility violations found!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(['critical', 'serious', 'moderate', 'minor'] as const).map(impact => {
                        const violations = groupedViolations[impact];
                        if (!violations?.length) return null;

                        return (
                          <div key={impact}>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                              {impact} ({violations.length})
                            </h4>
                            <div className="space-y-2">
                              {violations.map(violation => {
                                const Icon = getImpactIcon(impact);
                                return (
                                  <div
                                    key={violation.id}
                                    onClick={() => setSelectedViolation(
                                      selectedViolation?.id === violation.id ? null : violation
                                    )}
                                    className={`p-3 rounded-lg cursor-pointer ${getImpactColor(impact)}`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">{violation.help}</div>
                                        <div className="text-xs opacity-75 mt-1">
                                          {violation.nodes.length} element{violation.nodes.length !== 1 ? 's' : ''}
                                        </div>

                                        {selectedViolation?.id === violation.id && (
                                          <div className="mt-3 space-y-2">
                                            {violation.nodes.map((node, i) => (
                                              <div
                                                key={i}
                                                className="p-2 bg-white/50 dark:bg-black/20 rounded text-xs"
                                              >
                                                <code className="block mb-1 break-all">
                                                  {node.target.join(' > ')}
                                                </code>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                  {node.failureSummary}
                                                </div>
                                              </div>
                                            ))}
                                            <a
                                              href={violation.helpUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs underline"
                                            >
                                              Learn more →
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Accessibility className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 mb-2">No accessibility scan results</p>
                  <p className="text-xs text-gray-400">
                    Run tests with accessibility assertions to see results
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
