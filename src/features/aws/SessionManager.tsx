import { useState, useRef, useEffect } from 'react';
import { Terminal, RefreshCw, Play, Square, Save, Clock, FileText, Download, Copy } from 'lucide-react';
import Toast, { ToastContainer, ToastType } from '../../components/Toast';
import JsonView from '@uiw/react-json-view';

interface Instance {
  instanceId: string;
  instanceName?: string;
  platform: string;
  status: string;
  privateIpAddress?: string;
  publicIpAddress?: string;
  launchTime: string;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: Date;
  output?: string;
}

interface SessionLog {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export default function SessionManager() {
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Instances and sessions
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [sessionOutput, setSessionOutput] = useState<string[]>([]);
  
  // Command and history
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [activeView, setActiveView] = useState<'terminal' | 'history' | 'logs'>('terminal');
  
  // Terminal ref for scrolling
  const terminalRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Scroll to bottom of terminal when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [sessionOutput]);

  const fetchInstances = async () => {
    if (!accessKey || !secretKey) {
      showToast('Please provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ssm/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch instances');
      }

      const data = await response.json();
      setInstances(data.instances || []);
      showToast(`Found ${data.instances?.length || 0} instances`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch instances', 'error');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!selectedInstance || !accessKey || !secretKey) {
      showToast('Please select an instance and provide AWS credentials', 'error');
      return;
    }

    setLoading(true);
    setSessionStatus('connecting');
    addSessionLog('Connecting to session...', 'info');
    
    try {
      const response = await fetch('/api/aws/ssm/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId: selectedInstance.instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start session');
      }

      const data = await response.json();
      addSessionLog('Session started successfully', 'info');
      setSessionStatus('connected');
      setSessionOutput(['Session established with ' + selectedInstance.instanceId]);
    } catch (error: any) {
      addSessionLog(`Failed to start session: ${error.message}`, 'error');
      setSessionStatus('error');
      showToast(error.message || 'Failed to start session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async () => {
    if (!selectedInstance || !accessKey || !secretKey) {
      showToast('Session not active', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/aws/ssm/terminate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId: selectedInstance.instanceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to terminate session');
      }

      const data = await response.json();
      addSessionLog('Session terminated', 'info');
      setSessionStatus('disconnected');
      setSessionOutput(prev => [...prev, 'Session terminated']);
    } catch (error: any) {
      addSessionLog(`Failed to terminate session: ${error.message}`, 'error');
      showToast(error.message || 'Failed to terminate session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendCommand = async () => {
    if (!selectedInstance || !command.trim() || sessionStatus !== 'connected') {
      showToast('Session not active or no command entered', 'error');
      return;
    }

    // Add command to output
    const commandWithPrompt = `$ ${command}`;
    setSessionOutput(prev => [...prev, commandWithPrompt]);
    
    // Add to history
    const historyItem: CommandHistoryItem = {
      id: Date.now().toString(),
      command,
      timestamp: new Date(),
    };
    setCommandHistory(prev => [historyItem, ...prev].slice(0, 100)); // Keep last 100 commands
    
    try {
      const response = await fetch('/api/aws/ssm/send-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          instanceId: selectedInstance.instanceId,
          command,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute command');
      }

      const data = await response.json();
      
      // Add command output to terminal
      const outputLines = Array.isArray(data.output) ? data.output : [data.output];
      setSessionOutput(prev => [...prev, ...outputLines]);
      
      // Update history with output
      setCommandHistory(prev => 
        prev.map(item => 
          item.id === historyItem.id ? { ...item, output: outputLines.join('\n') } : item
        )
      );
      
      addSessionLog(`Command executed: ${command}`, 'info');
    } catch (error: any) {
      const errorOutput = `Error: ${error.message}`;
      setSessionOutput(prev => [...prev, errorOutput]);
      showToast(error.message || 'Failed to execute command', 'error');
    }
    
    setCommand('');
  };

  const addSessionLog = (message: string, type: 'info' | 'warning' | 'error') => {
    const log: SessionLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      type,
    };
    setSessionLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const executeHistoryCommand = (command: string) => {
    setCommand(command);
  };

  const exportCommandHistory = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      instanceId: selectedInstance?.instanceId,
      commandHistory: commandHistory.map(item => ({
        command: item.command,
        timestamp: item.timestamp.toISOString(),
        output: item.output
      }))
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `session-command-history-${selectedInstance?.instanceId || 'all'}-${new Date().toISOString().slice(0, 19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Command history exported successfully', 'success');
  };

  const exportSessionLogs = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      instanceId: selectedInstance?.instanceId,
      sessionLogs: sessionLogs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        type: log.type
      }))
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `session-logs-${selectedInstance?.instanceId || 'all'}-${new Date().toISOString().slice(0, 19)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Session logs exported successfully', 'success');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  };

  const handleInstanceSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    setSessionStatus('disconnected');
    setSessionOutput([]);
  };

  return (
    <>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="h-full flex">
        {/* Sidebar - AWS Credentials and Instance List */}
        <div className="w-80 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-east-2">US East (Ohio)</option>
                  <option value="us-west-1">US West (N. California)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">EU (Ireland)</option>
                  <option value="eu-central-1">EU (Frankfurt)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Access Key ID</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Secret Access Key</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2 py-1.5 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <button
              onClick={fetchInstances}
              disabled={loading}
              className="w-full px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Instances'}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {instances.length === 0 ? (
              <div className="text-xs text-gray-500 text-center mt-4">
                {loading ? 'Loading instances...' : 'No instances found'}
              </div>
            ) : (
              <div className="space-y-1">
                {instances.map((instance) => (
                  <div
                    key={instance.instanceId}
                    className={`bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-2 text-xs cursor-pointer ${
                      selectedInstance?.instanceId === instance.instanceId
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => handleInstanceSelect(instance)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          {instance.instanceName || instance.instanceId}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {instance.instanceId} | {instance.platform}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Status: {instance.status} | IP: {instance.privateIpAddress || 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedInstance ? (
            <>
              {/* Session Header */}
              <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Terminal className="w-5 h-5" />
                      Session Manager: {selectedInstance.instanceName || selectedInstance.instanceId}
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Instance: {selectedInstance.instanceId}</span>
                      <span>Platform: {selectedInstance.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        sessionStatus === 'connected' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        sessionStatus === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        sessionStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-400'
                      }`}>
                        {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Controls */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={startSession}
                    disabled={loading || sessionStatus === 'connected' || sessionStatus === 'connecting'}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                      sessionStatus === 'connected' || sessionStatus === 'connecting'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    Start Session
                  </button>
                  <button
                    onClick={terminateSession}
                    disabled={loading || sessionStatus !== 'connected'}
                    className={`px-3 py-1.5 text-xs rounded flex items-center gap-2 ${
                      sessionStatus !== 'connected'
                        ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <Square className="w-3 h-3" />
                    Terminate Session
                  </button>
                </div>

                {/* View Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('terminal')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'terminal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Terminal
                  </button>
                  <button
                    onClick={() => setActiveView('history')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'history'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Command History
                  </button>
                  <button
                    onClick={() => setActiveView('logs')}
                    className={`px-3 py-1.5 text-xs rounded ${
                      activeView === 'logs'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Session Logs
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-auto p-4">
                {activeView === 'terminal' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 mb-3">
                      <div 
                        ref={terminalRef}
                        className="bg-black text-green-400 font-mono text-sm p-4 rounded h-96 overflow-auto"
                      >
                        {sessionOutput.length === 0 ? (
                          <div className="text-gray-500 italic">
                            Session output will appear here. Connect to an instance to begin.
                          </div>
                        ) : (
                          sessionOutput.map((line, index) => (
                            <div key={index} className="whitespace-pre-wrap break-words">{line}</div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
                        placeholder="Enter command..."
                        disabled={sessionStatus !== 'connected'}
                        className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-50"
                      />
                      <button
                        onClick={sendCommand}
                        disabled={sessionStatus !== 'connected' || !command.trim()}
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Execute
                      </button>
                    </div>
                  </div>
                )}

                {activeView === 'history' && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Command History ({commandHistory.length})
                      </h3>
                      <button
                        onClick={exportCommandHistory}
                        disabled={commandHistory.length === 0}
                        className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                    
                    {commandHistory.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No command history available. Execute commands in the terminal to see history here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {commandHistory.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-mono text-sm flex items-center gap-2">
                                  <span className="text-gray-500">$</span>
                                  <span className="font-medium">{item.command}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Executed: {item.timestamp.toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => executeHistoryCommand(item.command)}
                                className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                              >
                                Reuse
                              </button>
                            </div>
                            {item.output && (
                              <div className="mt-2">
                                <div className="text-xs font-semibold mb-1">Output:</div>
                                <div className="bg-gray-900 text-green-400 font-mono text-xs p-3 rounded overflow-auto max-h-32">
                                  {item.output}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeView === 'logs' && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Session Logs ({sessionLogs.length})
                      </h3>
                      <button
                        onClick={exportSessionLogs}
                        disabled={sessionLogs.length === 0}
                        className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                    
                    {sessionLogs.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No session logs available. Start a session to see logs here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`bg-white dark:bg-slate-800 rounded-lg border p-4 ${
                              log.type === 'error' ? 'border-red-300 dark:border-red-700' :
                              log.type === 'warning' ? 'border-yellow-300 dark:border-yellow-700' :
                              'border-gray-300 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-xs rounded ${
                                    log.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                    log.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {log.type.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {log.timestamp.toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm">{log.message}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an instance from the sidebar to start a session
            </div>
          )}
        </div>
      </div>
    </>
  );
}
