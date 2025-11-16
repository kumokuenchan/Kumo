import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalComponentProps {
  onCommandSubmit?: (command: string) => void;
  initialOutput?: string;
}

interface TerminalSession {
  sessionId: string;
  isActive: boolean;
  lastActivity: string;
}

export default function TerminalComponent({
  onCommandSubmit,
  initialOutput
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Function to create a new terminal session
  const createSession = async () => {
    try {
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

    // Display initial output if provided
    if (initialOutput) {
      terminalInstance.current.writeln(initialOutput);
    }

    // Display prompt
    terminalInstance.current.write('$ ');

    // Track the current command being typed
    let currentCommand = '';

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
        }

        // Clear command buffer and display new prompt
        currentCommand = '';
        terminalInstance.current.write('$ ');
      } else if (data === '\u007F' || data === '\u0008') { // Backspace (both codes)
        // Only allow backspace if we have characters to delete
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          terminalInstance.current.write('\b \b');
        }
      } else if (printable) {
        currentCommand += data;
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

    // Create a session when component mounts
    createSession().then((id) => {
      if (!id) {
        terminalInstance.current?.writeln('Error: Failed to create terminal session');
      }
    }).catch((error) => {
      terminalInstance.current?.writeln(`Error: ${error.message}`);
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      terminalInstance.current?.dispose();

      // Close the session when component unmounts
      if (sessionIdRef.current) {
        fetch(`/api/terminal/session/${sessionIdRef.current}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    };
  }, [initialOutput]);

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