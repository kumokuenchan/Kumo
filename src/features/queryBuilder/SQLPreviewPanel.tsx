import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { QueryValidationResult } from '../../types/queryBuilder';

interface SQLPreviewPanelProps {
  sql: string;
  validation?: QueryValidationResult;
  onExecute?: () => void;
  onEditSQL?: () => void;
  isGenerating?: boolean;
}

export default function SQLPreviewPanel({
  sql,
  validation,
  onExecute,
  onEditSQL,
  isGenerating = false,
}: SQLPreviewPanelProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Auto-format SQL when it changes
    if (editorRef.current && sql) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, [sql]);

  const hasErrors = validation && validation.errors.length > 0;
  const hasWarnings = validation && validation.warnings.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">SQL Preview</h3>
          {isGenerating && (
            <span className="text-xs text-blue-600 animate-pulse">Generating...</span>
          )}
        </div>
        <div className="flex gap-2">
          {onEditSQL && (
            <button
              onClick={onEditSQL}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Edit SQL
            </button>
          )}
          {onExecute && (
            <button
              onClick={onExecute}
              disabled={hasErrors || !sql}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Execute Query
            </button>
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {validation && (hasErrors || hasWarnings) && (
        <div className="px-4 py-2 space-y-1 bg-white border-b">
          {hasErrors && (
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-600 flex items-start gap-1">
                  <span className="font-bold">✗</span>
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}
          {hasWarnings && (
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-xs text-yellow-600 flex items-start gap-1">
                  <span className="font-bold">⚠</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SQL Editor */}
      <div className="flex-1 min-h-0">
        {sql ? (
          <Editor
            height="100%"
            language="sql"
            value={sql}
            theme="vs-light"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              wordWrap: 'on',
            }}
            onMount={(editor) => {
              editorRef.current = editor;
              // Format on mount
              setTimeout(() => {
                editor.getAction('editor.action.formatDocument')?.run();
              }, 100);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No SQL Generated</p>
              <p className="text-sm">
                Add tables and select columns to generate a query
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
