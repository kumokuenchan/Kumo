import React, { useState, useEffect, useCallback } from 'react';
import { Activity, X, Search, RefreshCw, AlertTriangle, Cpu, HardDrive } from 'lucide-react';
import { API_BASE_URL } from '../../../api/client';

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
  user?: string;
}

interface ProcessMonitorProps {
  onClose?: () => void;
}

export default function ProcessMonitor({ onClose }: ProcessMonitorProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name' | 'pid'>('cpu');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load processes from backend
  const loadProcesses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/terminal/processes`);

      if (!response.ok) {
        throw new Error(`Failed to load processes: ${response.statusText}`);
      }

      const data = await response.json();
      setProcesses(data.processes || []);
    } catch (error: any) {
      console.error('Failed to load processes:', error);
      setError(error.message || 'Failed to load processes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Kill a process
  const killProcess = async (pid: number) => {
    if (!confirm(`Are you sure you want to kill process ${pid}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/terminal/processes/${pid}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to kill process');
      }

      // Reload processes
      await loadProcesses();
    } catch (error: any) {
      console.error('Failed to kill process:', error);
      alert(`Failed to kill process: ${error.message}`);
    }
  };

  // Initial load
  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadProcesses();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadProcesses]);

  // Filter and sort processes
  const filteredProcesses = processes
    .filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.command.toLowerCase().includes(query) ||
        p.pid.toString().includes(query) ||
        p.user?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'cpu':
          comparison = a.cpu - b.cpu;
          break;
        case 'memory':
          comparison = a.memory - b.memory;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'pid':
          comparison = a.pid - b.pid;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Format memory to MB
  const formatMemory = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  // Toggle sort
  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Calculate total resource usage
  const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
  const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);

  return (
    <div className="w-[600px] bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-medium text-gray-200">Process Monitor</h3>
            <span className="text-xs text-gray-500">({processes.length} processes)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded transition-colors ${
                autoRefresh
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={loadProcesses}
              disabled={isLoading}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Resource Summary */}
        <div className="flex gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span className="text-gray-400">CPU:</span>
            <span className="text-gray-200 font-medium">{totalCpu.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-3 h-3 text-purple-400" />
            <span className="text-gray-400">Memory:</span>
            <span className="text-gray-200 font-medium">{formatMemory(totalMemory)}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-700 rounded flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="px-3 py-2 bg-gray-750 border-b border-gray-700 text-xs font-medium text-gray-400">
        <div className="grid grid-cols-12 gap-2">
          <button
            onClick={() => toggleSort('pid')}
            className="col-span-1 text-left hover:text-gray-200 transition-colors"
          >
            PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('name')}
            className="col-span-4 text-left hover:text-gray-200 transition-colors"
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('cpu')}
            className="col-span-2 text-right hover:text-gray-200 transition-colors"
          >
            CPU {sortBy === 'cpu' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('memory')}
            className="col-span-2 text-right hover:text-gray-200 transition-colors"
          >
            Memory {sortBy === 'memory' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <div className="col-span-2 text-left">User</div>
          <div className="col-span-1 text-center">Action</div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && processes.length === 0 ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-400">Loading processes...</p>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p>No processes found</p>
          </div>
        ) : (
          filteredProcesses.map((process) => (
            <div
              key={process.pid}
              className="px-3 py-2 border-b border-gray-700 last:border-0 hover:bg-gray-750 transition-colors"
            >
              <div className="grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-1 text-gray-300 font-mono">{process.pid}</div>
                <div className="col-span-4 text-gray-200 truncate" title={process.command}>
                  {process.name}
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      process.cpu > 50
                        ? 'bg-red-900/30 text-red-300'
                        : process.cpu > 20
                        ? 'bg-yellow-900/30 text-yellow-300'
                        : 'text-gray-300'
                    }`}
                  >
                    {process.cpu.toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right text-gray-300">
                  {formatMemory(process.memory)}
                </div>
                <div className="col-span-2 text-gray-400 truncate text-left" title={process.user}>
                  {process.user || '-'}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => killProcess(process.pid)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                    title="Kill process"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
