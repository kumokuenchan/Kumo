import { useState } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { environmentStorage } from '../../services/environmentStorage';
import type { ApiResponse } from '../../api/apiTester';

interface ExtractionRule {
  variableName: string;
  jsonPath: string;
}

interface VariableExtractorProps {
  response: ApiResponse;
  onClose: () => void;
}

export default function VariableExtractor({ response, onClose }: VariableExtractorProps) {
  const [rules, setRules] = useState<ExtractionRule[]>([
    { variableName: '', jsonPath: '' }
  ]);
  const [extractedVars, setExtractedVars] = useState<Array<{ name: string; value: string }>>([]);

  const addRule = () => {
    setRules([...rules, { variableName: '', jsonPath: '' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof ExtractionRule, value: string) => {
    const updated = [...rules];
    updated[index][field] = value;
    setRules(updated);
  };

  const extractVariables = () => {
    const extracted: Array<{ name: string; value: string }> = [];

    rules.forEach(rule => {
      if (!rule.variableName || !rule.jsonPath) return;

      const value = environmentStorage.extractFromResponse(response.data, rule.jsonPath);
      if (value !== null) {
        extracted.push({ name: rule.variableName, value });
      }
    });

    setExtractedVars(extracted);
  };

  const saveToEnvironment = () => {
    extractedVars.forEach(({ name, value }) => {
      environmentStorage.setVariable(name, value);
    });

    onClose();
  };

  // Common extraction patterns
  const commonPatterns = [
    { label: 'Top-level property', example: 'token' },
    { label: 'Nested property', example: 'data.user.id' },
    { label: 'Array item', example: 'items[0].id' },
    { label: 'Nested array', example: 'data.users[0].name' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Extract Variables from Response
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Extract values from this response and save them as environment variables
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Extraction Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Extraction Rules
              </label>
              <button
                onClick={addRule}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Plus className="w-3 h-3" />
                Add Rule
              </button>
            </div>

            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={rule.variableName}
                      onChange={(e) => updateRule(index, 'variableName', e.target.value)}
                      placeholder="Variable name (e.g., authToken)"
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                    />
                    <input
                      type="text"
                      value={rule.jsonPath}
                      onChange={(e) => updateRule(index, 'jsonPath', e.target.value)}
                      placeholder="JSON path (e.g., data.token)"
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => removeRule(index)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Common Patterns Help */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              Common JSON Path Patterns:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {commonPatterns.map((pattern, i) => (
                <div key={i} className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">{pattern.label}:</span>{' '}
                  <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">
                    {pattern.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Button */}
          <div>
            <button
              onClick={extractVariables}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded"
            >
              Preview Extraction
            </button>
          </div>

          {/* Extracted Variables Preview */}
          {extractedVars.length > 0 && (
            <div className="border border-green-200 dark:border-green-700 rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-3 py-2 border-b border-green-200 dark:border-green-700">
                <div className="text-sm font-medium text-green-900 dark:text-green-300">
                  Extracted Variables ({extractedVars.length})
                </div>
              </div>
              <div className="divide-y divide-green-200 dark:divide-green-700">
                {extractedVars.map((v, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {v.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-all">
                          {v.value}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Ready
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Preview */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Response Data (for reference):
            </div>
            <pre className="p-3 bg-gray-900 dark:bg-black text-gray-100 rounded-lg text-xs font-mono overflow-auto max-h-48">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={saveToEnvironment}
            disabled={extractedVars.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded"
          >
            <Save className="w-4 h-4" />
            Save to Environment ({extractedVars.length})
          </button>
        </div>
      </div>
    </div>
  );
}
