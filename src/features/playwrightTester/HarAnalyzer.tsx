import { useState, useEffect } from 'react';
import { 
  Upload, Download, Activity, AlertTriangle, CheckCircle, 
  TrendingUp, Clock, Database, Shield, FileText, BarChart3,
  Filter, Search, Calendar, Zap, Globe, Wifi, HardDrive
} from 'lucide-react';
import api from '../../api';

interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    queryString: Array<{ name: string; value: string }>;
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    cookies: Array<{ name: string; value: string }>;
    content: {
      size: number;
      mimeType: string;
      compression?: number;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: {};
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
  pageref: string;
}

interface HARAnalysis {
  summary: {
    totalRequests: number;
    totalSize: number;
    totalTime: number;
    averageTime: number;
    slowestRequest: HAREntry;
    largestRequest: HAREntry;
    failedRequests: HAREntry[];
  };
  performance: {
    firstPaint: number;
    firstContentfulPaint: number;
    domContentLoaded: number;
    loadComplete: number;
  };
  issues: Array<{
    type: 'performance' | 'security' | 'cache' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    entry?: HAREntry;
  }>;
  breakdown: {
    byType: Record<string, { count: number; size: number; time: number }>;
    byStatus: Record<string, number>;
    byDomain: Record<string, { count: number; size: number }>;
  };
  cache: {
    cacheable: number;
    cached: number;
    notCacheable: number;
  };
}

export default function HarAnalyzer() {
  const [harFile, setHarFile] = useState<File | null>(null);
  const [harData, setHarData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<HARAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [filterType, setFilterType] = useState<'all' | 'performance' | 'security' | 'cache' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Accept JSON files and files with .har extension
      const isValidType = file.type === 'application/json' || 
                         file.name.toLowerCase().endsWith('.har') ||
                         file.name.toLowerCase().endsWith('.json');
      
      if (isValidType) {
        setHarFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            setHarData(data);
            analyzeHAR(data);
          } catch (error) {
            console.error('Invalid HAR file:', error);
            // Show error to user
            setResults({
              success: false,
              error: 'Invalid HAR file format. Please ensure the file is a valid HAR or JSON file.'
            });
          }
        };
        reader.readAsText(file);
      } else {
        setResults({
          success: false,
          error: 'Please select a valid HAR file (.har or .json)'
        });
      }
    }
  };

  const analyzeHAR = (har: any) => {
    setIsAnalyzing(true);
    
    try {
      const entries = har.log?.entries || [];
      
      // Calculate summary
      const totalRequests = entries.length;
      const totalSize = entries.reduce((sum: number, entry: HAREntry) => 
        sum + (entry.response?.content?.size || 0), 0);
      const totalTime = entries.reduce((sum: number, entry: HAREntry) => 
        sum + (entry.time || 0), 0);
      const averageTime = totalTime / totalRequests;
      
      const slowestRequest = entries.reduce((slowest: HAREntry, entry: HAREntry) => 
        (entry.time || 0) > (slowest.time || 0) ? entry : slowest, entries[0]);
      const largestRequest = entries.reduce((largest: HAREntry, entry: HAREntry) => 
        (entry.response?.content?.size || 0) > (largest.response?.content?.size || 0) ? entry : largest, entries[0]);
      const failedRequests = entries.filter((entry: HAREntry) => 
        entry.response?.status >= 400);

      // Breakdown by type
      const byType: Record<string, { count: number; size: number; time: number }> = {};
      const byStatus: Record<string, number> = {};
      const byDomain: Record<string, { count: number; size: number }> = {};
      
      entries.forEach((entry: HAREntry) => {
        const type = getResourceType(entry);
        const domain = new URL(entry.request.url).hostname;
        const status = entry.response.status.toString();
        
        if (!byType[type]) byType[type] = { count: 0, size: 0, time: 0 };
        byType[type].count++;
        byType[type].size += entry.response?.content?.size || 0;
        byType[type].time += entry.time || 0;
        
        byStatus[status] = (byStatus[status] || 0) + 1;
        
        if (!byDomain[domain]) byDomain[domain] = { count: 0, size: 0 };
        byDomain[domain].count++;
        byDomain[domain].size += entry.response?.content?.size || 0;
      });

      // Analyze caching
      let cacheable = 0, cached = 0, notCacheable = 0;
      entries.forEach((entry: HAREntry) => {
        const cacheControl = entry.response.headers.find(h => 
          h.name.toLowerCase() === 'cache-control'
        );
        
        if (cacheControl) {
          const value = cacheControl.value.toLowerCase();
          if (value.includes('no-cache') || value.includes('no-store')) {
            notCacheable++;
          } else {
            cacheable++;
            if (entry.response.status === 304) cached++;
          }
        } else {
          cacheable++;
        }
      });

      // Find issues
      const issues: any[] = [];
      
      entries.forEach((entry: HAREntry) => {
        // Performance issues
        if (entry.time > 2000) {
          issues.push({
            type: 'performance',
            severity: entry.time > 5000 ? 'critical' : 'high',
            message: `Slow request: ${(entry.time / 1000).toFixed(2)}s`,
            entry
          });
        }
        
        // Security issues
        if (entry.request.url.startsWith('http://')) {
          issues.push({
            type: 'security',
            severity: 'high',
            message: 'Insecure HTTP request',
            entry
          });
        }
        
        if (entry.request.url.includes('password') || entry.request.url.includes('token')) {
          issues.push({
            type: 'security',
            severity: 'critical',
            message: 'Sensitive data in URL',
            entry
          });
        }
        
        // Error issues
        if (entry.response.status >= 400) {
          issues.push({
            type: 'error',
            severity: entry.response.status >= 500 ? 'critical' : 'medium',
            message: `HTTP ${entry.response.status} ${entry.response.statusText}`,
            entry
          });
        }
        
        // Large file issues
        const size = entry.response?.content?.size || 0;
        if (size > 1024 * 1024) { // > 1MB
          issues.push({
            type: 'performance',
            severity: 'medium',
            message: `Large file: ${(size / 1024 / 1024).toFixed(2)}MB`,
            entry
          });
        }
      });

      // Add general performance issues
      if (totalSize > 5 * 1024 * 1024) { // > 5MB
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: `Total page size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`
        });
      }

      if (totalRequests > 100) {
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: `High request count: ${totalRequests}`
        });
      }

      const analysisResult: HARAnalysis = {
        summary: {
          totalRequests,
          totalSize,
          totalTime,
          averageTime,
          slowestRequest,
          largestRequest,
          failedRequests
        },
        performance: {
          firstPaint: 0, // Would need navigation timing
          firstContentfulPaint: 0,
          domContentLoaded: 0,
          loadComplete: 0
        },
        issues,
        breakdown: {
          byType,
          byStatus,
          byDomain
        },
        cache: {
          cacheable,
          cached,
          notCacheable
        }
      };

      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Analysis failed:', error);
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze HAR file'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getResourceType = (entry: HAREntry): string => {
    const mimeType = entry.response?.content?.mimeType || '';
    const url = entry.request.url.toLowerCase();
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/css')) return 'stylesheet';
    if (mimeType.includes('javascript')) return 'script';
    if (mimeType.startsWith('text/html')) return 'document';
    if (mimeType.includes('json')) return 'api';
    if (mimeType.includes('font')) return 'font';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    
    return 'other';
  };

  const downloadReport = () => {
    if (!analysis) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      url: harData?.log?.entries[0]?.request?.url || 'Unknown',
      analysis
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `har-analysis-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredIssues = analysis?.issues.filter(issue => 
    filterType === 'all' || issue.type === filterType
  ).filter(issue =>
    searchTerm === '' || 
    issue.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.entry?.request.url.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'performance': return TrendingUp;
      case 'security': return Shield;
      case 'cache': return Database;
      case 'error': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          HAR Analyzer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze HTTP Archive files for performance and security insights
        </p>
      </div>

      {/* File Upload */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <input
            type="file"
            accept=".json,.har"
            onChange={handleFileUpload}
            className="hidden"
            id="har-upload"
          />
          <label
            htmlFor="har-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Upload HAR File
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Select a HAR file to analyze
          </p>
        </div>
      </div>

      {analysis && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Requests</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.summary.totalRequests}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Total Size</span>
                <HardDrive className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(analysis.summary.totalSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Avg Time</span>
                <Clock className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.summary.averageTime.toFixed(0)}ms
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Issues</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analysis.issues.length}
              </div>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* By Type */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">By Type</h3>
              <div className="space-y-2">
                {Object.entries(analysis.breakdown.byType).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {type}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {data.count} ({(data.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Status */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">By Status</h3>
              <div className="space-y-2">
                {Object.entries(analysis.breakdown.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {status}
                    </span>
                    <span className={`text-sm font-medium ${
                      status.startsWith('2') ? 'text-green-600' : 
                      status.startsWith('3') ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cache Analysis */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cache Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cacheable</span>
                  <span className="text-sm font-medium text-blue-600">
                    {analysis.cache.cacheable}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cached</span>
                  <span className="text-sm font-medium text-green-600">
                    {analysis.cache.cached}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Not Cacheable</span>
                  <span className="text-sm font-medium text-red-600">
                    {analysis.cache.notCacheable}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Issues & Recommendations
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="performance">Performance</option>
                  <option value="security">Security</option>
                  <option value="cache">Cache</option>
                  <option value="error">Errors</option>
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="pl-8 pr-2 text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {filteredIssues.map((issue, index) => {
                const Icon = getIssueIcon(issue.type);
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedIssue(issue)}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${getSeverityColor(issue.severity)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(issue.severity)} bg-opacity-10`}>
                          {issue.type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(issue.severity)} bg-opacity-10`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {issue.message}
                      </p>
                      {issue.entry && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {issue.entry.request.url}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredIssues.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-gray-500">No issues found!</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>

          {/* Issue Detail Modal */}
          {selectedIssue && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Issue Details
                  </h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="ml-2 text-sm font-medium">{selectedIssue.type}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Severity:</span>
                    <span className={`ml-2 text-sm font-medium ${getSeverityColor(selectedIssue.severity)}`}>
                      {selectedIssue.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Message:</span>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedIssue.message}
                    </p>
                  </div>
                  {selectedIssue.entry && (
                    <div>
                      <span className="text-sm text-gray-500">Request URL:</span>
                      <p className="mt-1 text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                        {selectedIssue.entry.request.url}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Method:</span>
                          <span className="ml-2">{selectedIssue.entry.request.method}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-2 ${
                            selectedIssue.entry.response.status >= 400 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {selectedIssue.entry.response.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="ml-2">{selectedIssue.entry.time}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Size:</span>
                          <span className="ml-2">
                            {((selectedIssue.entry.response.content?.size || 0) / 1024).toFixed(2)}KB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}