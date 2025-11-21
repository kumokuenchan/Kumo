import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import { Monitor, RefreshCw } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface Terminal {
  id: string;
  name: string;
}

interface TerminalOutputViewerProps {
  terminalId: string | null;
  terminals: Terminal[];
  onTerminalChange: (terminalId: string | null) => void;
}

export default function TerminalOutputViewer({
  terminalId,
  terminals,
  onTerminalChange,
}: TerminalOutputViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isXtermReady, setIsXtermReady] = useState(false);

  // Get session ID from localStorage when terminal changes
  useEffect(() => {
    if (terminalId) {
      const storedSessionId = localStorage.getItem(`terminal_session_${terminalId}`);
      setSessionId(storedSessionId);
    } else {
      setSessionId(null);
    }
  }, [terminalId]);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      disableStdin: true, // Read-only mode
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#1e293b',
        foreground: '#e2e8f0',
        cursor: '#e2e8f0',
        selectionBackground: '#334155',
      },
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsXtermReady(true);

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setIsXtermReady(false);
    };
  }, []);

  // Load existing buffer from localStorage when terminal changes
  useEffect(() => {
    if (!terminalId || !xtermRef.current || !isXtermReady) return;

    try {
      const bufferKey = `terminal_buffer_${terminalId}`;
      const stored = localStorage.getItem(bufferKey);
      if (stored) {
        const data = JSON.parse(stored);

        // Handle both old format (lines array) and new format (content string)
        let content = '';
        if (data.content) {
          content = data.content;
        } else if (data.lines && Array.isArray(data.lines)) {
          content = data.lines.join('\r\n');
        }

        if (content && content.trim().length > 0) {
          xtermRef.current.clear();
          xtermRef.current.write(content);
        }
      }
    } catch (e) {
      console.error('Failed to load terminal buffer:', e);
    }
  }, [terminalId, isXtermReady]);

  // Connect to WebSocket and subscribe to terminal output
  useEffect(() => {
    if (!sessionId || !xtermRef.current) {
      setIsConnected(false);
      return;
    }

    // Connect to socket
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join the terminal session
      socket.emit('terminal:join', sessionId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      xtermRef.current?.writeln(`\r\n\x1b[31m● Disconnected\x1b[0m`);
    });

    // Listen for terminal output
    socket.on('terminal:output', (data: { sessionId: string; output: string }) => {
      if (data.sessionId === sessionId && xtermRef.current) {
        xtermRef.current.write(data.output);
      }
    });

    // Listen for terminal exit
    socket.on('terminal:exit', (data: { sessionId: string; exitCode: number }) => {
      if (data.sessionId === sessionId && xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[33m● Process exited with code ${data.exitCode}\x1b[0m`);
      }
    });

    return () => {
      if (socket) {
        socket.emit('terminal:leave', sessionId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [sessionId]);

  // Fit terminal when container size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        setTimeout(() => fitAddonRef.current?.fit(), 0);
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-400" />
          <select
            value={terminalId || ''}
            onChange={(e) => onTerminalChange(e.target.value || null)}
            className="text-sm bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select Terminal</option>
            {terminals.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={clearTerminal}
          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
          title="Clear output"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-hidden">
        {terminalId ? (
          <div ref={terminalRef} className="h-full w-full" />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a terminal to view output</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
