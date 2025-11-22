import { useState, useEffect, useRef } from 'react';
import {
  X, Circle, Square, Play, Pause, Trash2, Save, Monitor,
  MousePointer, Type, CheckSquare, Navigation, Clock, Eye
} from 'lucide-react';
import { type TestStep } from '../../services/playwrightStorage';

interface TestRecorderProps {
  onSave: (steps: TestStep[]) => void;
  onClose: () => void;
}

interface RecordedAction {
  id: string;
  timestamp: number;
  action: string;
  selector?: string;
  selectorType?: string;
  value?: string;
  url?: string;
  key?: string;
}

export default function TestRecorder({ onSave, onClose }: TestRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [targetUrl, setTargetUrl] = useState('https://');
  const [isLaunching, setIsLaunching] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Poll for recorded actions
  useEffect(() => {
    if (isRecording && sessionId && !isPaused) {
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const response = await fetch(`/api/playwright/recorder/${sessionId}/actions`);
          if (response.ok) {
            const data = await response.json();
            if (data.actions && data.actions.length > recordedActions.length) {
              setRecordedActions(data.actions);
            }
          }
        } catch (error) {
          console.error('Failed to poll actions:', error);
        }
      }, 500);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isRecording, sessionId, isPaused, recordedActions.length]);

  // Start recording
  const startRecording = async () => {
    if (!targetUrl || targetUrl === 'https://') {
      alert('Please enter a valid URL');
      return;
    }

    setIsLaunching(true);

    try {
      const response = await fetch('/api/playwright/recorder/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to start recorder');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setIsRecording(true);
      setRecordedActions([]);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Make sure the server is running.');
    } finally {
      setIsLaunching(false);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/playwright/recorder/${sessionId}/stop`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Failed to stop recorder:', error);
      }
    }

    setIsRecording(false);
    setSessionId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Delete action
  const deleteAction = (id: string) => {
    setRecordedActions(prev => prev.filter(a => a.id !== id));
  };

  // Clear all actions
  const clearActions = () => {
    if (confirm('Clear all recorded actions?')) {
      setRecordedActions([]);
    }
  };

  // Convert to test steps and save
  const saveAsSteps = () => {
    const steps: TestStep[] = recordedActions.map(action => ({
      id: crypto.randomUUID(),
      action: action.action as any,
      selector: action.selector,
      selectorType: action.selectorType as any,
      value: action.value,
      url: action.url,
      key: action.key,
      enabled: true
    }));

    onSave(steps);
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'navigate': return <Navigation className="w-4 h-4" />;
      case 'click': return <MousePointer className="w-4 h-4" />;
      case 'fill': return <Type className="w-4 h-4" />;
      case 'check':
      case 'uncheck': return <CheckSquare className="w-4 h-4" />;
      case 'wait': return <Clock className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
              <Circle className={`w-5 h-5 ${isRecording ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Recorder
              </h2>
              <p className="text-xs text-gray-500">
                {isRecording ? 'Recording actions...' : 'Record browser interactions'}
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

        {/* URL Input */}
        {!isRecording && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded-lg"
              />
              <button
                onClick={startRecording}
                disabled={isLaunching}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-lg flex items-center gap-2"
              >
                {isLaunching ? (
                  <>
                    <Monitor className="w-4 h-4 animate-pulse" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4" />
                    Start Recording
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              A browser window will open. Interact with the page and actions will be recorded.
            </p>
          </div>
        )}

        {/* Recording Controls */}
        {isRecording && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                  <Circle className="w-3 h-3 animate-pulse" />
                  Recording
                </span>
                <span className="text-sm text-gray-500">
                  {recordedActions.length} action{recordedActions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePause}
                  className={`p-2 rounded-lg ${isPaused ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'}`}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={stopRecording}
                  className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                  title="Stop"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recorded Actions List */}
        <div className="flex-1 overflow-auto p-4">
          {recordedActions.length === 0 ? (
            <div className="text-center py-8">
              <MousePointer className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRecording ? 'Interact with the browser to record actions' : 'No actions recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recordedActions.map((action, index) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg group"
                >
                  <span className="w-6 text-xs text-gray-400 text-right">{index + 1}</span>
                  <div className="p-1.5 bg-white dark:bg-slate-800 rounded">
                    {getActionIcon(action.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {action.action}
                      </span>
                      {action.url && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
                          {action.url}
                        </span>
                      )}
                    </div>
                    {action.selector && (
                      <p className="text-xs text-gray-500 truncate font-mono">
                        {action.selector}
                      </p>
                    )}
                    {action.value && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        "{action.value}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAction(action.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <div className="flex gap-2">
            {recordedActions.length > 0 && (
              <>
                <button
                  onClick={clearActions}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
                <div className="flex-1" />
                <button
                  onClick={saveAsSteps}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save {recordedActions.length} Steps
                </button>
              </>
            )}
            {recordedActions.length === 0 && (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
