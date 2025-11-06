import { useState } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import { generateCode, codeLanguages, type CodeLanguage } from '../../utils/codeGenerator';
import type { ApiRequest } from '../../api/apiTester';

interface CodeGeneratorProps {
  request: ApiRequest;
  onClose: () => void;
}

export default function CodeGenerator({ request, onClose }: CodeGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('javascript-fetch');
  const [copied, setCopied] = useState(false);

  let code: string;
  try {
    code = generateCode(request, selectedLanguage);
    // Ensure code is never empty
    if (!code || code.trim() === '') {
      code = '// No code generated\n// Please ensure your request has a valid URL';
    }
  } catch (error) {
    code = `// Error generating code\n// ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  const handleCopy = () => {
    if (code && code.trim()) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Group languages by category
  const categories = Array.from(new Set(codeLanguages.map(l => l.category)));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Code Generation
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
          {/* Language Selector */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-3">
              {categories.map(category => (
                <div key={category} className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {codeLanguages
                      .filter(l => l.category === category)
                      .map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => setSelectedLanguage(lang.id)}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                            selectedLanguage === lang.id
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Display */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-slate-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {codeLanguages.find(l => l.id === selectedLanguage)?.name}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {code && code.trim() ? (
                <pre className="bg-gray-900 dark:bg-black text-gray-100 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm font-mono whitespace-pre-wrap">{code}</code>
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Code2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No code generated</p>
                    <p className="text-xs mt-1">Please ensure your request has a valid URL</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Select a language to generate code for your API request
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
