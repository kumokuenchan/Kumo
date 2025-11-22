import { useState, useEffect } from 'react';
import {
  X, Camera, Image, Check, AlertTriangle, RefreshCw, Trash2,
  ZoomIn, ZoomOut, Layers, Download, Upload, Eye, EyeOff
} from 'lucide-react';

interface Screenshot {
  id: string;
  testId: string;
  stepId: string;
  name: string;
  baseline?: string; // Base64
  current?: string; // Base64
  diff?: string; // Base64
  diffPercent?: number;
  createdAt: number;
}

interface VisualRegressionProps {
  testId: string;
  onClose: () => void;
}

export default function VisualRegression({ testId, onClose }: VisualRegressionProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'diff'>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [threshold, setThreshold] = useState(0.1); // 0.1% difference threshold

  // Load screenshots from storage
  useEffect(() => {
    loadScreenshots();
  }, [testId]);

  const loadScreenshots = () => {
    try {
      const stored = localStorage.getItem(`playwright:screenshots:${testId}`);
      if (stored) {
        setScreenshots(JSON.parse(stored));
      }
    } catch {
      setScreenshots([]);
    }
  };

  const saveScreenshots = (newScreenshots: Screenshot[]) => {
    setScreenshots(newScreenshots);
    localStorage.setItem(`playwright:screenshots:${testId}`, JSON.stringify(newScreenshots));
  };

  // Set current as baseline
  const setAsBaseline = (screenshot: Screenshot) => {
    if (!screenshot.current) return;

    const updated = screenshots.map(s =>
      s.id === screenshot.id
        ? { ...s, baseline: s.current, diff: undefined, diffPercent: undefined }
        : s
    );
    saveScreenshots(updated);
    setSelectedScreenshot(updated.find(s => s.id === screenshot.id) || null);
  };

  // Delete screenshot
  const deleteScreenshot = (id: string) => {
    if (!confirm('Delete this screenshot?')) return;
    const updated = screenshots.filter(s => s.id !== id);
    saveScreenshots(updated);
    if (selectedScreenshot?.id === id) {
      setSelectedScreenshot(null);
    }
  };

  // Export baselines
  const exportBaselines = () => {
    const baselines = screenshots.filter(s => s.baseline).map(s => ({
      id: s.id,
      name: s.name,
      baseline: s.baseline
    }));

    const blob = new Blob([JSON.stringify(baselines, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baselines-${testId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import baselines
  const importBaselines = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const imported = JSON.parse(text);

      const updated = screenshots.map(s => {
        const match = imported.find((i: any) => i.id === s.id || i.name === s.name);
        return match ? { ...s, baseline: match.baseline } : s;
      });

      saveScreenshots(updated);
    };
    input.click();
  };

  // Get status color
  const getStatusColor = (screenshot: Screenshot) => {
    if (!screenshot.baseline) return 'gray';
    if (!screenshot.current) return 'gray';
    if (screenshot.diffPercent === undefined) return 'gray';
    if (screenshot.diffPercent <= threshold) return 'green';
    return 'red';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-6xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Layers className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Visual Regression Testing
              </h2>
              <p className="text-xs text-gray-500">
                {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={importBaselines}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              title="Import Baselines"
            >
              <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={exportBaselines}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              title="Export Baselines"
            >
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Screenshots List */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700">
              <div className="text-xs text-gray-500 mb-2">Threshold</div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-600 w-10">{threshold}%</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {screenshots.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs text-gray-500">No screenshots yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add screenshot steps to your test
                  </p>
                </div>
              ) : (
                screenshots.map(screenshot => {
                  const status = getStatusColor(screenshot);
                  return (
                    <div
                      key={screenshot.id}
                      onClick={() => setSelectedScreenshot(screenshot)}
                      className={`p-3 rounded-lg cursor-pointer mb-2 ${
                        selectedScreenshot?.id === screenshot.id
                          ? 'bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {screenshot.name}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          status === 'green' ? 'bg-green-500' :
                          status === 'red' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                      </div>
                      {screenshot.diffPercent !== undefined && (
                        <div className="mt-1 text-xs text-gray-500">
                          {screenshot.diffPercent.toFixed(2)}% diff
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Comparison View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedScreenshot ? (
              <>
                {/* View Controls */}
                <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['side-by-side', 'overlay', 'diff'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-3 py-1.5 text-xs rounded-lg ${
                          viewMode === mode
                            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700'
                            : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </button>
                    ))}
                  </div>

                  {viewMode === 'overlay' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Opacity</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAsBaseline(selectedScreenshot)}
                      disabled={!selectedScreenshot.current}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50"
                    >
                      Set as Baseline
                    </button>
                    <button
                      onClick={() => deleteScreenshot(selectedScreenshot.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Images */}
                <div className="flex-1 overflow-auto p-4">
                  {viewMode === 'side-by-side' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">Baseline</div>
                        {selectedScreenshot.baseline ? (
                          <img
                            src={selectedScreenshot.baseline}
                            alt="Baseline"
                            className="w-full border rounded-lg"
                          />
                        ) : (
                          <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-500">No baseline</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-2">Current</div>
                        {selectedScreenshot.current ? (
                          <img
                            src={selectedScreenshot.current}
                            alt="Current"
                            className="w-full border rounded-lg"
                          />
                        ) : (
                          <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-500">No current</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {viewMode === 'overlay' && (
                    <div className="relative">
                      {selectedScreenshot.baseline && (
                        <img
                          src={selectedScreenshot.baseline}
                          alt="Baseline"
                          className="w-full border rounded-lg"
                        />
                      )}
                      {selectedScreenshot.current && (
                        <img
                          src={selectedScreenshot.current}
                          alt="Current"
                          className="absolute inset-0 w-full border rounded-lg"
                          style={{ opacity: overlayOpacity }}
                        />
                      )}
                    </div>
                  )}

                  {viewMode === 'diff' && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2">Difference</div>
                      {selectedScreenshot.diff ? (
                        <img
                          src={selectedScreenshot.diff}
                          alt="Diff"
                          className="w-full border rounded-lg"
                        />
                      ) : (
                        <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">No diff available</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">Select a screenshot to compare</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
