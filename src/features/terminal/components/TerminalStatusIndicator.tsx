import React, { useState, useEffect } from 'react';

interface TerminalStatusIndicatorProps {
  sessionId?: string;
  isActive: boolean;
  lastActivity?: Date;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export default function TerminalStatusIndicator({
  sessionId,
  isActive,
  lastActivity,
  connectionStatus = 'connected'
}: TerminalStatusIndicatorProps) {
  const [pid, setPid] = useState<number | null>(null);

  // Fetch PID when session ID changes
  useEffect(() => {
    if (!sessionId) {
      setPid(null);
      return;
    }

    const fetchPid = async () => {
      try {
        const response = await fetch(`/api/terminal/session/${sessionId}/info`);
        if (response.ok) {
          const data = await response.json();
          setPid(data.pid);
        }
      } catch (error) {
        console.error('Failed to fetch session info:', error);
      }
    };

    fetchPid();
  }, [sessionId]);
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return isActive ? 'Active' : 'Inactive';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className={`font-medium ${connectionStatus === 'connected' ? 'text-green-400' : connectionStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
          {getStatusText()}
        </span>
      </div>
      {pid !== null && (
        <div className="text-gray-500 font-mono" title={`Process ID: ${pid}`}>
          PID: {pid}
        </div>
      )}
      {lastActivity && (
        <div className="text-gray-500" title={lastActivity.toString()}>
          {lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}