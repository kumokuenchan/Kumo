import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface TerminalComponentProps {
  onCommandSubmit?: (command: string) => void;
  initialOutput?: string;
  terminalId?: string;
  theme?: string;
}

// Terminal color themes
const TERMINAL_THEMES = {
  'github-dark': {
    background: '#0d1117',
    foreground: '#e6edf3',
    cursor: '#58a6ff',
    selection: '#388bfd33',
    black: '#484f58',
    red: '#ff7b72',
    green: '#3fb950',
    yellow: '#d29922',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39c5cf',
    white: '#b1bac4',
    brightBlack: '#6e7681',
    brightRed: '#ffa198',
    brightGreen: '#56d364',
    brightYellow: '#e3b341',
    brightBlue: '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#56d4dd',
    brightWhite: '#f0f6fc',
  },
  'dracula': {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
  'monokai': {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    selection: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  'nord': {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    selection: '#434c5e',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
  },
  'one-dark': {
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    selection: '#3e4451',
    black: '#282c34',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
};

interface TerminalSession {
  sessionId: string;
  isActive: boolean;
  lastActivity: string;
}

export default function TerminalComponent({
  onCommandSubmit,
  initialOutput,
  terminalId,
  theme = 'github-dark'
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const currentCommandRef = useRef<string>('');

  // Function to send raw input to the PTY
  const sendInputToPTY = async (input: string) => {
    if (!sessionIdRef.current) {
      return;
    }

    try {
      await fetch(`/api/terminal/session/${sessionIdRef.current}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: input }),
      });
    } catch (error) {
      // Ignore errors
    }
  };

  // Save terminal buffer to localStorage
  const saveTerminalBuffer = () => {
    if (!terminalInstance.current || !terminalId) return;

    try {
      const buffer = terminalInstance.current.buffer.active;
      const scrollback = terminalInstance.current.buffer.normal;
      const lines: string[] = [];

      // Read scrollback buffer first
      for (let i = 0; i < scrollback.length; i++) {
        const line = scrollback.getLine(i);
        if (line) {
          const text = line.translateToString(false); // Don't trim whitespace
          lines.push(text);
        }
      }

      // Read active buffer
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          const text = line.translateToString(false); // Don't trim whitespace
          lines.push(text);
        }
      }

      // Filter out completely empty lines at the end
      while (lines.length > 0 && !lines[lines.length - 1].trim()) {
        lines.pop();
      }

      // Don't save if buffer is empty - this prevents overwriting good data on unmount
      if (lines.length === 0) {
        return;
      }

      // Save to localStorage
      const storageKey = `terminal_buffer_${terminalId}`;
      const data = {
        lines,
        currentCommand: currentCommandRef.current,
        cursorY: buffer.cursorY,
        timestamp: Date.now()
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save terminal buffer:', error);
    }
  };

  // Restore terminal buffer from localStorage
  const restoreTerminalBuffer = () => {
    if (!terminalInstance.current || !terminalId) return false;

    try {
      const storageKey = `terminal_buffer_${terminalId}`;
      const saved = localStorage.getItem(storageKey);

      if (!saved) {
        return false;
      }

      const { lines, currentCommand } = JSON.parse(saved);

      if (!lines || lines.length === 0) {
        return false;
      }

      // Clear terminal first
      terminalInstance.current.clear();

      // Write saved lines back
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Use write with \r\n to preserve exact formatting
        if (i < lines.length - 1) {
          terminalInstance.current.write(line + '\r\n');
        } else {
          // Last line - don't add newline
          terminalInstance.current.write(line);
        }
      }

      // Note: We restore the visual display, but the PTY state is fresh
      // The PTY will provide its own prompt when ready

      return true;
    } catch (error) {
      console.error('Failed to restore terminal buffer:', error);
    }

    return false;
  };

  // Function to create a new terminal session or restore existing one
  const createOrRestoreSession = async () => {
    try {
      // Try to restore session from localStorage if terminalId is provided
      if (terminalId) {
        const storageKey = `terminal_session_${terminalId}`;
        const savedSessionId = localStorage.getItem(storageKey);

        if (savedSessionId) {
          // Try to verify the session still exists on the backend
          try {
            const response = await fetch(`/api/terminal/session/${savedSessionId}`);
            if (response.ok) {
              // Session still exists, restore it
              sessionIdRef.current = savedSessionId;
              setSessionId(savedSessionId);
              setIsConnected(true);
              return savedSessionId;
            }
          } catch (error) {
            // Session doesn't exist anymore, create a new one
            localStorage.removeItem(storageKey);
          }
        }
      }

      // Create new session
      const response = await fetch('/api/terminal/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create terminal session: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      setIsConnected(true);

      // Save session ID to localStorage if terminalId is provided
      if (terminalId) {
        const storageKey = `terminal_session_${terminalId}`;
        localStorage.setItem(storageKey, data.sessionId);
      }

      return data.sessionId;
    } catch (error) {
      setIsConnected(false);
      return null;
    }
  };

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('terminal:output', (data: { sessionId: string; output: string }) => {
      if (data.sessionId === sessionIdRef.current && terminalInstance.current) {
        // Write output directly to terminal
        terminalInstance.current.write(data.output);
      }
    });

    socket.on('terminal:exit', (data: { sessionId: string; exitCode: number }) => {
      if (data.sessionId === sessionIdRef.current) {
        console.log(`Terminal session ${data.sessionId} exited with code ${data.exitCode}`);
      }
    });

    return socket;
  };

  // Function to get autocomplete suggestions
  const getCompletions = async (partial: string): Promise<string[]> => {
    if (!sessionIdRef.current) {
      return [];
    }

    try {
      const response = await fetch(`/api/terminal/session/${sessionIdRef.current}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partial }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.completions || [];
    } catch (error) {
      return [];
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Get the selected theme
    const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

    // Create terminal instance
    terminalInstance.current = new XTerm({
      cursorBlink: true,
      theme: selectedTheme,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      rows: 20,
      cols: 80,
    });

    // Load fit addon
    fitAddon.current = new FitAddon();
    terminalInstance.current.loadAddon(fitAddon.current);

    // Open terminal in container
    terminalInstance.current.open(terminalRef.current);

    // Fit terminal to container
    if (fitAddon.current) {
      fitAddon.current.fit();
    }

    // Try to restore buffer from previous session
    const wasRestored = restoreTerminalBuffer();

    // If not restored and initial output provided, show it
    if (!wasRestored && initialOutput) {
      terminalInstance.current.writeln(initialOutput);
    }

    // PTY will provide its own prompt, so we don't write one manually

    // Track the current command being typed (for tab completion only)
    let currentCommand = currentCommandRef.current || '';

    // Handle data input
    terminalInstance.current.onData(async (data) => {
      if (!terminalInstance.current) return;

      // For tab key, handle autocomplete locally
      if (data === '\t') {
        const completions = await getCompletions(currentCommand);

        if (completions.length === 0) {
          // No completions, do nothing
          return;
        } else if (completions.length === 1) {
          // Single completion - auto-fill it
          const parts = currentCommand.split(/\s+/);
          const lastPart = parts[parts.length - 1] || '';

          // Find the common prefix to replace
          let prefix = lastPart;
          if (lastPart.includes('/')) {
            const lastSlash = lastPart.lastIndexOf('/');
            prefix = lastPart.substring(lastSlash + 1);
          }

          // Send backspaces to delete the prefix
          for (let i = 0; i < prefix.length; i++) {
            sendInputToPTY('\x7f'); // Send backspace to PTY
          }

          // Send the completion to PTY
          const completion = completions[0];
          sendInputToPTY(completion);

          // Update current command
          if (parts.length > 1) {
            parts[parts.length - 1] = lastPart.substring(0, lastPart.length - prefix.length) + completion;
            currentCommand = parts.join(' ');
          } else {
            currentCommand = currentCommand.substring(0, currentCommand.length - prefix.length) + completion;
          }
          currentCommandRef.current = currentCommand;
        }
        return;
      }

      // For Enter key, reset command buffer
      if (data === '\r') {
        if (currentCommand.trim() && onCommandSubmit) {
          onCommandSubmit(currentCommand.trim());
        }
        currentCommand = '';
        currentCommandRef.current = '';

        // Send to PTY
        sendInputToPTY(data);

        // Save buffer after command
        setTimeout(() => saveTerminalBuffer(), 500);
        return;
      }

      // For backspace, update command buffer
      if (data === '\u007F' || data === '\u0008') {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          currentCommandRef.current = currentCommand;
        }
        sendInputToPTY(data);
        return;
      }

      // For printable characters, track in command buffer and send to PTY
      const printable = !data.charCodeAt(0) || data.charCodeAt(0) > 31;
      if (printable) {
        currentCommand += data;
        currentCommandRef.current = currentCommand;
      }

      // Send all input to PTY
      sendInputToPTY(data);
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Save buffer when page visibility changes (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveTerminalBuffer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic save every 30 seconds
    const saveInterval = setInterval(() => {
      saveTerminalBuffer();
    }, 30000);

    // Initialize WebSocket
    const socket = initializeWebSocket();

    // Create or restore session when component mounts
    createOrRestoreSession().then((id) => {
      if (!id) {
        terminalInstance.current?.writeln('Error: Failed to create or restore terminal session');
      } else {
        // Join the terminal room for this session
        socket.emit('terminal:join', id);
      }
    }).catch((error) => {
      terminalInstance.current?.writeln(`Error: ${error.message}`);
    });

    // Cleanup
    return () => {
      // Don't save on unmount - the buffer is often cleared by this point
      // We rely on periodic saves and visibility change saves instead
      clearInterval(saveInterval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Leave the terminal room
      if (sessionIdRef.current && socketRef.current) {
        socketRef.current.emit('terminal:leave', sessionIdRef.current);
      }

      terminalInstance.current?.dispose();

      // Don't delete the session on unmount - keep it alive for later restoration
      // Sessions will only be deleted when explicitly closed via removeTerminal()

      // Disconnect socket when component unmounts completely
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initialOutput, terminalId]);

  // Update theme when it changes
  useEffect(() => {
    if (terminalInstance.current) {
      const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];
      terminalInstance.current.options.theme = selectedTheme;
    }
  }, [theme]);

  // Method to write output to terminal
  const writeOutput = (output: string) => {
    if (terminalInstance.current) {
      const cleanOutput = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = cleanOutput.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1 && lines[i] === '') {
          continue;
        }
        terminalInstance.current.write(lines[i] + '\r\n');
      }
      // PTY will provide prompt
    }
  };

  // Method to clear terminal
  const clearTerminal = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      // Send Ctrl+L to PTY to clear and get a fresh prompt
      if (sessionIdRef.current) {
        sendInputToPTY('\x0c'); // Ctrl+L
      }
    }
  };

  const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: selectedTheme.background }}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800" style={{ backgroundColor: selectedTheme.background }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-xs text-gray-400 ml-2">Terminal</span>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={clearTerminal}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear terminal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Terminal body */}
      <div ref={terminalRef} className="p-4" />
    </div>
  );
}