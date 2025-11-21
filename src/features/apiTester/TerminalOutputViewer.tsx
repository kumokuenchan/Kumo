import { useState, useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import { Monitor, RefreshCw } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { TERMINAL_THEMES } from '../terminal/components/TerminalThemeSelector';

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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kumodb_terminal_theme') || 'github-dark';
  });

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

    // Get theme
    const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

    const term = new XTerm({
      cursorBlink: false,
      disableStdin: true, // Read-only mode
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      theme: selectedTheme,
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
  }, [theme]);

  // Listen for theme changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kumodb_terminal_theme' && e.newValue) {
        setTheme(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: selectedTheme.background }}>
      {/* Apple-style Glass Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-xl"
        style={{
          backgroundColor: `${selectedTheme.background}cc`,
          borderColor: `${selectedTheme.foreground}15`
        }}
      >
        <div className="flex items-center gap-3">
          {/* Terminal Selector */}
          <div className="relative">
            <select
              value={terminalId || ''}
              onChange={(e) => onTerminalChange(e.target.value || null)}
              className="appearance-none text-sm font-medium pl-3 pr-8 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              style={{
                backgroundColor: `${selectedTheme.foreground}10`,
                color: selectedTheme.foreground,
                borderColor: 'transparent'
              }}
            >
              <option value="">Select Terminal</option>
              {terminals.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
            <div
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: `${selectedTheme.foreground}60` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Connection Status */}
          {terminalId && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-gray-500'
                }`}
              />
              <span
                className="text-xs font-medium"
                style={{ color: `${selectedTheme.foreground}70` }}
              >
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={clearTerminal}
          className="p-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            color: `${selectedTheme.foreground}60`,
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${selectedTheme.foreground}10`;
            e.currentTarget.style.color = selectedTheme.foreground;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = `${selectedTheme.foreground}60`;
          }}
          title="Clear output"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-hidden relative">
        {terminalId ? (
          <div ref={terminalRef} className="h-full w-full p-2" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${selectedTheme.foreground}08` }}
              >
                <Monitor
                  className="w-8 h-8"
                  style={{ color: `${selectedTheme.foreground}30` }}
                />
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: `${selectedTheme.foreground}50` }}
              >
                No Terminal Selected
              </p>
              <p
                className="text-xs"
                style={{ color: `${selectedTheme.foreground}30` }}
              >
                Choose a terminal to view its output
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
