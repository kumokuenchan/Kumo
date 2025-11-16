import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
  onCommandSubmit?: (command: string) => void;
  initialOutput?: string;
  terminalId?: string;
}

interface TerminalSession {
  sessionId: string;
  isActive: boolean;
  lastActivity: string;
}

export default function TerminalComponent({
  onCommandSubmit,
  initialOutput,
  terminalId
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const currentCommandRef = useRef<string>('');

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

      // If there's a current command being typed, add it
      if (currentCommand) {
        if (!lines[lines.length - 1]?.includes('$ ')) {
          terminalInstance.current.write('\r\n$ ');
        }
        terminalInstance.current.write(currentCommand);
        currentCommandRef.current = currentCommand;
      } else {
        // Just add the prompt if no command in progress
        if (!lines[lines.length - 1]?.includes('$ ')) {
          terminalInstance.current.write('\r\n$ ');
        }
      }

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

  // Function to send command to the backend
  const sendCommandToBackend = async (command: string) => {
    if (!sessionIdRef.current) {
      return 'Error: No active terminal session. Please refresh the page.';
    }

    try {
      const response = await fetch(`/api/terminal/session/${sessionIdRef.current}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return `Error: ${response.status} - ${errorText}`;
      }

      const data = await response.json();
      return data.output || '';
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
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

    // Create terminal instance
    terminalInstance.current = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#161b22',
        foreground: '#e6edf3',
        cursor: '#58a6ff',
        selection: '#388bfd33',
      },
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

    // If not restored, show initial setup
    if (!wasRestored) {
      // Display initial output if provided
      if (initialOutput) {
        terminalInstance.current.writeln(initialOutput);
      }

      // Display prompt
      terminalInstance.current.write('$ ');
    }

    // Track the current command being typed
    let currentCommand = currentCommandRef.current || '';

    // Handle data input
    terminalInstance.current.onData(async (data) => {
      if (!terminalInstance.current) return;

      const printable = !data.charCodeAt(0) || data.charCodeAt(0) > 31;

      if (data === '\t') { // Tab key - autocomplete
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

          // Clear the current partial match
          for (let i = 0; i < prefix.length; i++) {
            terminalInstance.current.write('\b \b');
          }

          // Write the completion
          const completion = completions[0];
          terminalInstance.current.write(completion);

          // Update current command
          if (parts.length > 1) {
            parts[parts.length - 1] = lastPart.substring(0, lastPart.length - prefix.length) + completion;
            currentCommand = parts.join(' ');
          } else {
            currentCommand = currentCommand.substring(0, currentCommand.length - prefix.length) + completion;
          }
          currentCommandRef.current = currentCommand;
        } else {
          // Multiple completions - show them
          terminalInstance.current.write('\r\n');

          // Display completions in columns
          const maxWidth = Math.max(...completions.map(c => c.length));
          const termWidth = terminalInstance.current.cols;
          const colWidth = maxWidth + 2;
          const numCols = Math.max(1, Math.floor(termWidth / colWidth));

          for (let i = 0; i < completions.length; i += numCols) {
            const row = completions.slice(i, i + numCols);
            const rowText = row.map(c => c.padEnd(colWidth)).join('');
            terminalInstance.current.write(rowText + '\r\n');
          }

          // Redisplay prompt and current command
          terminalInstance.current.write('$ ' + currentCommand);
        }
      } else if (data === '\r') { // Enter key
        // Add new line
        terminalInstance.current.write('\r\n');

        // Process command if not empty
        if (currentCommand.trim()) {
          if (onCommandSubmit) {
            onCommandSubmit(currentCommand.trim());
          }

          // Send command to backend and handle response
          const output = await sendCommandToBackend(currentCommand.trim());
          if (output) {
            // Clean the output and split by newlines
            const cleanOutput = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const lines = cleanOutput.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (i === lines.length - 1 && lines[i] === '') {
                // Skip trailing empty line
                continue;
              }
              terminalInstance.current.write(lines[i] + '\r\n');
            }
          }

          // Save buffer after command execution
          saveTerminalBuffer();
        }

        // Clear command buffer and display new prompt
        currentCommand = '';
        currentCommandRef.current = '';
        terminalInstance.current.write('$ ');
      } else if (data === '\u007F' || data === '\u0008') { // Backspace (both codes)
        // Only allow backspace if we have characters to delete
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          currentCommandRef.current = currentCommand;
          terminalInstance.current.write('\b \b');
        }
      } else if (printable) {
        currentCommand += data;
        currentCommandRef.current = currentCommand;
        terminalInstance.current.write(data);
      }
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

    // Create or restore session when component mounts
    createOrRestoreSession().then((id) => {
      if (!id) {
        terminalInstance.current?.writeln('Error: Failed to create or restore terminal session');
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
      terminalInstance.current?.dispose();

      // Don't delete the session on unmount - keep it alive for later restoration
      // Sessions will only be deleted when explicitly closed via removeTerminal()
    };
  }, [initialOutput, terminalId]);

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
      terminalInstance.current.write('$ ');
    }
  };

  // Method to clear terminal
  const clearTerminal = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      terminalInstance.current.write('$ ');
    }
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-800">
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