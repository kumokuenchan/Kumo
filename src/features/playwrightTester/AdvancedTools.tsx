import { useState } from 'react';
import { 
  Play, Download, Globe, FileText, BarChart3, Monitor, 
  MapPin, Database, Code, Wifi, Image, Settings, Loader2,
  File, Activity, Smartphone, Tablet
} from 'lucide-react';
import api from '../../api';

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  path?: string;
}

export default function AdvancedTools() {
  const [activeTab, setActiveTab] = useState<'har' | 'pdf' | 'performance' | 'device' | 'geolocation' | 'extract' | 'html' | 'websocket'>('har');
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ToolResult | null>(null);
  
  // HAR options
  const [harWaitTime, setHarWaitTime] = useState(3000);
  const [harIncludeContent, setHarIncludeContent] = useState(false);
  
  // PDF options
  const [pdfFormat, setPdfFormat] = useState<'A4' | 'Letter'>('A4');
  const [pdfPrintBackground, setPdfPrintBackground] = useState(true);
  
  // Performance options
  const [perfWaitTime, setPerfWaitTime] = useState(3000);
  const [perfIncludeLighthouse, setPerfIncludeLighthouse] = useState(false);
  
  // Device options
  const [deviceType, setDeviceType] = useState<'Desktop' | 'Mobile' | 'Tablet'>('Desktop');
  const [customViewport, setCustomViewport] = useState({ width: 1920, height: 1080 });
  
  // Geolocation options
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [accuracy, setAccuracy] = useState(100);
  
  // Extract options
  const [includeJsonLd, setIncludeJsonLd] = useState(true);
  const [includeMicrodata, setIncludeMicrodata] = useState(true);
  const [includeRdfa, setIncludeRdfa] = useState(true);
  const [includeMeta, setIncludeMeta] = useState(true);
  
  // HTML options
  const [includeStyles, setIncludeStyles] = useState(true);
  const [includeScripts, setIncludeScripts] = useState(false);
  const [cleanHtml, setCleanHtml] = useState(true);
  
  // WebSocket options
  const [wsMessages, setWsMessages] = useState(['Hello WebSocket', 'Test message']);
  const [wsWaitForResponses, setWsWaitForResponses] = useState(true);

  const runTool = async () => {
    if (!url) return;
    
    setIsRunning(true);
    setResults(null);
    
    try {
      let endpoint = '';
      let payload: any = { url };
      
      switch (activeTab) {
        case 'har':
          endpoint = '/playwright/har';
          payload.options = {
            waitTime: harWaitTime,
            includeContent: harIncludeContent
          };
          break;
          
        case 'pdf':
          endpoint = '/playwright/pdf';
          payload.options = {
            format: pdfFormat,
            printBackground: pdfPrintBackground
          };
          break;
          
        case 'performance':
          endpoint = '/playwright/performance';
          payload.options = {
            waitTime: perfWaitTime,
            includeLighthouse: perfIncludeLighthouse
          };
          break;
          
        case 'device':
          endpoint = '/playwright/device-test';
          payload.device = deviceType;
          if (deviceType === 'Custom') {
            payload.config = { viewport: customViewport };
          }
          break;
          
        case 'geolocation':
          endpoint = '/playwright/geolocation';
          payload.coordinates = { latitude, longitude, accuracy };
          break;
          
        case 'extract':
          endpoint = '/playwright/extract-data';
          payload.options = {
            includeJsonLd,
            includeMicrodata,
            includeRdfa,
            includeMeta
          };
          break;
          
        case 'html':
          endpoint = '/playwright/extract-html';
          payload.options = {
            includeStyles,
            includeScripts,
            cleanHtml
          };
          break;
          
        case 'websocket':
          endpoint = '/playwright/websocket-test';
          payload.options = {
            messages: wsMessages,
            waitForResponses: wsWaitForResponses
          };
          break;
      }
      
      const response = await api.post<ToolResult>(endpoint, payload);
      setResults(response);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const downloadResult = () => {
    if (!results?.data) return;
    
    const dataStr = JSON.stringify(results.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'har', name: 'HAR Export', icon: Activity },
    { id: 'pdf', name: 'PDF Generation', icon: FileText },
    { id: 'performance', name: 'Performance', icon: BarChart3 },
    { id: 'device', name: 'Device Test', icon: Monitor },
    { id: 'geolocation', name: 'Geolocation', icon: MapPin },
    { id: 'extract', name: 'Extract Data', icon: Database },
    { id: 'html', name: 'HTML Export', icon: Code },
    { id: 'websocket', name: 'WebSocket', icon: Wifi }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Advanced Playwright Tools
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced testing and analysis tools
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        {/* URL Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Tool-specific Options */}
        <div className="mb-6">
          {activeTab === 'har' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wait Time (ms)
                </label>
                <input
                  type="number"
                  value={harWaitTime}
                  onChange={(e) => setHarWaitTime(parseInt(e.target.value) || 3000)}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={harIncludeContent}
                  onChange={(e) => setHarIncludeContent(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include response content
                </span>
              </label>
            </div>
          )}

          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Format
                </label>
                <div className="flex gap-2">
                  {(['A4', 'Letter'] as const).map(format => (
                    <button
                      key={format}
                      onClick={() => setPdfFormat(format)}
                      className={`px-4 py-2 rounded-lg ${
                        pdfFormat === format
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pdfPrintBackground}
                  onChange={(e) => setPdfPrintBackground(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Print background graphics
                </span>
              </label>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wait Time (ms)
                </label>
                <input
                  type="number"
                  value={perfWaitTime}
                  onChange={(e) => setPerfWaitTime(parseInt(e.target.value) || 3000)}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={perfIncludeLighthouse}
                  onChange={(e) => setPerfIncludeLighthouse(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include Lighthouse metrics
                </span>
              </label>
            </div>
          )}

          {activeTab === 'device' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Device Type
                </label>
                <div className="flex gap-2">
                  {(['Desktop', 'Mobile', 'Tablet'] as const).map(device => (
                    <button
                      key={device}
                      onClick={() => setDeviceType(device)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        deviceType === device
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {device === 'Desktop' && <Monitor className="w-4 h-4" />}
                      {device === 'Mobile' && <Smartphone className="w-4 h-4" />}
                      {device === 'Tablet' && <Tablet className="w-4 h-4" />}
                      {device}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'geolocation' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  step="0.0001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  step="0.0001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Accuracy (m)
                </label>
                <input
                  type="number"
                  value={accuracy}
                  onChange={(e) => setAccuracy(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
            </div>
          )}

          {activeTab === 'extract' && (
            <div className="space-y-2">
              {[
                { key: 'includeJsonLd', label: 'JSON-LD structured data', state: includeJsonLd, setState: setIncludeJsonLd },
                { key: 'includeMicrodata', label: 'Microdata', state: includeMicrodata, setState: setIncludeMicrodata },
                { key: 'includeRdfa', label: 'RDFa', state: includeRdfa, setState: setIncludeRdfa },
                { key: 'includeMeta', label: 'Meta tags', state: includeMeta, setState: setIncludeMeta }
              ].map(({ key, label, state, setState }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state}
                    onChange={(e) => setState(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'html' && (
            <div className="space-y-4">
              {[
                { key: 'includeStyles', label: 'Include CSS styles', state: includeStyles, setState: setIncludeStyles },
                { key: 'includeScripts', label: 'Include JavaScript', state: includeScripts, setState: setIncludeScripts },
                { key: 'cleanHtml', label: 'Clean HTML (remove comments/scripts)', state: cleanHtml, setState: setCleanHtml }
              ].map(({ key, label, state, setState }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={state}
                    onChange={(e) => setState(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'websocket' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Messages
                </label>
                <textarea
                  value={wsMessages.join('\n')}
                  onChange={(e) => setWsMessages(e.target.value.split('\n').filter(m => m.trim()))}
                  placeholder="Enter test messages (one per line)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  rows={4}
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wsWaitForResponses}
                  onChange={(e) => setWsWaitForResponses(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Wait for responses
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={runTool}
            disabled={!url || isRunning}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Tool
              </>
            )}
          </button>

          {results?.data && (
            <button
              onClick={downloadResult}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Results
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Results
            </h3>
            
            {results.success ? (
              <div className="space-y-4">
                {results.path && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <File className="w-4 h-4" />
                    Saved to: {results.path}
                  </div>
                )}
                
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 max-h-96 overflow-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(results.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-red-600 dark:text-red-400">
                Error: {results.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}