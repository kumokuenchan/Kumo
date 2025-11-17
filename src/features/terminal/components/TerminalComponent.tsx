import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import TerminalHeader from './TerminalHeader';
import { TERMINAL_THEMES } from './TerminalThemeSelector';
import LinkDetector from './LinkDetector';
import { colorizeLine } from '../utils/logColorizer';

interface TerminalComponentProps {
  onCommandSubmit?: (command: string) => void;
  initialOutput?: string;
  terminalId?: string;
  theme?: string;
  onWorkingDirectoryChange?: (cwd: string) => void;
  initialCommand?: string;
}

interface TerminalSession {
  sessionId: string;
  isActive: boolean;
  lastActivity: string;
}

export default function TerminalComponent({
  onCommandSubmit,
  initialOutput,
  terminalId,
  theme = 'github-dark',
  onWorkingDirectoryChange,
  initialCommand
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [currentDirectory, setCurrentDirectory] = useState<string>('');
  const [showQuickCommands, setShowQuickCommands] = useState<boolean>(false);
  const [logColorizationEnabled, setLogColorizationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(`terminal_log_colorization_${terminalId || 'default'}`);
    return saved !== null ? saved === 'true' : true; // Enabled by default
  });
  const [sessionExited, setSessionExited] = useState<boolean>(false);
  const logColorizationEnabledRef = useRef<boolean>(logColorizationEnabled);
  const currentCommandRef = useRef<string>('');

  // Keep ref in sync with state
  useEffect(() => {
    logColorizationEnabledRef.current = logColorizationEnabled;
  }, [logColorizationEnabled]);

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

  // Function to get current working directory from the actual PTY session
  const getCurrentWorkingDirectory = async (): Promise<string | null> => {
    if (!sessionIdRef.current) {
      return null;
    }

    try {
      const response = await fetch(`/api/terminal/session/${sessionIdRef.current}/cwd`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.cwd) {
        return data.cwd;
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
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
        // Apply log colorization if enabled
        let output = data.output;
        if (logColorizationEnabledRef.current) {
          // Split by lines and colorize each line individually
          const lines = output.split(/(\r?\n)/);
          output = lines.map((line, idx) => {
            // Keep newline characters as-is
            if (line === '\n' || line === '\r\n' || line === '\r') {
              return line;
            }
            // Only colorize lines that don't already have ANSI codes
            if (!line.includes('\x1b[')) {
              return colorizeLine(line, { enabled: true });
            }
            return line;
          }).join('');
        }

        // Write output to terminal
        terminalInstance.current.write(output);

        // Update directory after command output completes
        // Detect command completion by looking for newline followed by prompt patterns
        if (data.output.includes('\n') || data.output.includes('\r')) {
          // Debounce the directory update to avoid too many calls
          setTimeout(async () => {
            const cwd = await getCurrentWorkingDirectory();
            if (cwd && cwd !== currentDirectory) {
              setCurrentDirectory(cwd);
              if (onWorkingDirectoryChange) {
                onWorkingDirectoryChange(cwd);
              }
            }
          }, 200);
        }
      }
    });

    socket.on('terminal:exit', (data: { sessionId: string; exitCode: number }) => {
      if (data.sessionId === sessionIdRef.current) {
        console.log(`Terminal session ${data.sessionId} exited with code ${data.exitCode}`);
        setSessionExited(true);
        setIsConnected(false);
      }
    });

    return socket;
  };

  // Function to restart the terminal session
  const restartSession = async () => {
    try {
      // Close the old session if it exists
      if (sessionIdRef.current) {
        try {
          await fetch(`/api/terminal/session/${sessionIdRef.current}`, {
            method: 'DELETE',
          });
        } catch (error) {
          // Ignore errors when closing old session
        }
      }

      // Clear the saved session ID from localStorage
      if (terminalId) {
        const storageKey = `terminal_session_${terminalId}`;
        localStorage.removeItem(storageKey);
      }

      // Clear the terminal display
      if (terminalInstance.current) {
        terminalInstance.current.clear();
        terminalInstance.current.reset();
      }

      // Reset state
      setSessionExited(false);
      sessionIdRef.current = null;
      setSessionId(null);

      // Create a new session
      const newSessionId = await createOrRestoreSession();

      if (newSessionId && socketRef.current) {
        // Join the terminal room for the new session
        socketRef.current.emit('terminal:join', newSessionId);

        // Write a welcome message
        if (terminalInstance.current) {
          terminalInstance.current.writeln('\r\n[Terminal restarted]\r\n');
        }
      }
    } catch (error) {
      console.error('Failed to restart terminal session:', error);
      if (terminalInstance.current) {
        terminalInstance.current.writeln('\r\n[Error: Failed to restart terminal]\r\n');
      }
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

    // Load font size from localStorage
    const savedFontSize = localStorage.getItem(`terminal_font_size_${terminalId || 'default'}`);
    const initialFontSize = savedFontSize ? parseInt(savedFontSize, 10) : 14;
    setFontSize(initialFontSize);

    // Get the selected theme
    const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

    // Create terminal instance
    terminalInstance.current = new XTerm({
      cursorBlink: true,
      theme: selectedTheme,
      fontSize: initialFontSize,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      rows: 35,
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

      // For Enter key, reset command buffer
      if (data === '\r') {
        const cmd = currentCommand.trim();

        if (cmd && onCommandSubmit) {
          onCommandSubmit(cmd);
        }

        // Save command to history (if it's not empty)
        if (cmd) {
          saveCommandToHistory(cmd);
        }

        // Check if command is "clear" and clear scrollback
        if (cmd === 'clear') {
          // Let the command execute first, then clear scrollback
          setTimeout(() => {
            if (terminalInstance.current) {
              // Reset clears the entire buffer including scrollback
              terminalInstance.current.reset();

              // Clear saved buffer from localStorage
              if (terminalId) {
                const storageKey = `terminal_buffer_${terminalId}`;
                localStorage.removeItem(storageKey);
              }
            }
          }, 100);
        } else if (cmd.startsWith('cd ')) {
          // For cd commands, update the working directory display after execution
          setTimeout(async () => {
            const cwd = await getCurrentWorkingDirectory();
            if (cwd && cwd !== currentDirectory) {
              setCurrentDirectory(cwd);
              if (onWorkingDirectoryChange) {
                onWorkingDirectoryChange(cwd);
              }
            }
          }, 300);
        }

        currentCommand = '';
        currentCommandRef.current = '';

        // Send to PTY
        sendInputToPTY(data);

        // Save buffer after command (unless it's clear)
        if (cmd !== 'clear') {
          setTimeout(() => saveTerminalBuffer(), 500);
        }
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

    // Handle keyboard shortcuts for font size adjustment
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          increaseFontSize();
        } else if (e.key === '-') {
          e.preventDefault();
          decreaseFontSize();
        } else if (e.key === '0') {
          e.preventDefault();
          resetFontSize();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

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

    // Periodic working directory update every 2 seconds
    const cwdInterval = setInterval(async () => {
      if (sessionIdRef.current) {
        const cwd = await getCurrentWorkingDirectory();
        if (cwd && cwd !== currentDirectory) {
          setCurrentDirectory(cwd);
          if (onWorkingDirectoryChange) {
            onWorkingDirectoryChange(cwd);
          }
        }
      }
    }, 2000);

    // Initialize WebSocket
    const socket = initializeWebSocket();

    // Create or restore session when component mounts
    createOrRestoreSession().then((id) => {
      if (!id) {
        terminalInstance.current?.writeln('Error: Failed to create or restore terminal session');
      } else {
        // Join the terminal room for this session
        socket.emit('terminal:join', id);

        // Execute initial command if provided (e.g., SSH connection)
        if (initialCommand) {
          // Check if there are post-connection commands
          const postCommandsDelimiter = '|||POST:';
          if (initialCommand.includes(postCommandsDelimiter)) {
            const [sshCommand, postCommandsStr] = initialCommand.split(postCommandsDelimiter);
            const postCommands = postCommandsStr.split('\n').filter(c => c.trim());

            // Execute SSH command first
            setTimeout(() => {
              sendInputToPTY(sshCommand.trim() + '\r');

              // Wait for SSH connection to establish (typically 2-3 seconds)
              // Then execute post-connection commands
              setTimeout(() => {
                postCommands.forEach((cmd, index) => {
                  setTimeout(() => {
                    sendInputToPTY(cmd.trim() + '\r');
                  }, index * 1000); // 1 second delay between commands
                });
              }, 3000); // 3 second delay for SSH to connect
            }, 500);
          } else {
            // No post-connection commands, just execute the initial command
            setTimeout(() => {
              sendInputToPTY(initialCommand + '\r');
            }, 500);
          }
        }
      }
    }).catch((error) => {
      terminalInstance.current?.writeln(`Error: ${error.message}`);
    }).finally(() => {
      // Get current working directory after session is established
      setTimeout(async () => {
        const cwd = await getCurrentWorkingDirectory();
        if (cwd) {
          setCurrentDirectory(cwd);
          if (onWorkingDirectoryChange) {
            onWorkingDirectoryChange(cwd);
          }
        }
      }, 1000);
    });

    // Cleanup
    return () => {
      // Don't save on unmount - the buffer is often cleared by this point
      // We rely on periodic saves and visibility change saves instead
      clearInterval(saveInterval);
      clearInterval(cwdInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Close quick commands dropdown
      setShowQuickCommands(false);

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

  // Method to clear terminal
  const clearTerminal = () => {
    if (terminalInstance.current) {
      // Clear both viewport and scrollback buffer
      terminalInstance.current.clear();

      // Also clear the scrollback buffer completely
      if (terminalInstance.current.buffer) {
        terminalInstance.current.buffer.normal.length = 0;
      }

      // Clear saved buffer from localStorage
      if (terminalId) {
        const storageKey = `terminal_buffer_${terminalId}`;
        localStorage.removeItem(storageKey);
      }

      // Reset the terminal completely (clears all history)
      terminalInstance.current.reset();

      // PTY will provide a fresh prompt automatically
    }
  };

  // Function to save command to history
  const saveCommandToHistory = (command: string) => {
    if (!command.trim()) return;

    try {
      // Save to global history
      const globalHistoryKey = 'terminal_command_history_global';
      const globalHistory = localStorage.getItem(globalHistoryKey);
      const globalItems: { id: string; command: string; timestamp: number; terminalId?: string }[] = globalHistory ? JSON.parse(globalHistory) : [];
      
      // Add new item and remove duplicates
      const newHistoryItem = {
        id: Date.now().toString(),
        command: command.trim(),
        timestamp: Date.now(),
        terminalId
      };
      
      const filteredGlobalItems = globalItems.filter(item => item.command !== command.trim());
      const updatedGlobalHistory = [newHistoryItem, ...filteredGlobalItems].slice(0, 50);
      localStorage.setItem(globalHistoryKey, JSON.stringify(updatedGlobalHistory));
    } catch (error) {
      console.error('Failed to save command to history:', error);
    }
  };

  const selectedTheme = TERMINAL_THEMES[theme as keyof typeof TERMINAL_THEMES] || TERMINAL_THEMES['github-dark'];

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden" style={{ backgroundColor: selectedTheme.background }}>
      <TerminalHeader
        isConnected={isConnected}
        sessionId={sessionId || undefined}
        currentDirectory={currentDirectory}
        fontSize={fontSize}
        terminalId={terminalId}
        showQuickCommands={showQuickCommands}
        setShowQuickCommands={setShowQuickCommands}
        logColorizationEnabled={logColorizationEnabled}
        sessionExited={sessionExited}
        onLogColorizationToggle={() => {
          const newValue = !logColorizationEnabled;
          setLogColorizationEnabled(newValue);
          // Save to localStorage
          localStorage.setItem(`terminal_log_colorization_${terminalId || 'default'}`, newValue.toString());
        }}
        onFontSizeChange={(newFontSize) => {
          setFontSize(newFontSize);
          if (terminalInstance.current) {
            terminalInstance.current.options.fontSize = newFontSize;
          }
        }}
        onFontSizeSave={saveFontSize}
        onClearTerminal={clearTerminal}
        onRestartSession={restartSession}
        onExecuteCommand={(command) => {
          // Send the command to the PTY only - the response will be displayed via WebSocket
          sendInputToPTY(command + '\n');
        }}
        onInsertCommand={(command) => {
          // Insert the command at the current cursor position by sending each character to the PTY
          // This ensures the shell knows about the command and backspace/editing works properly
          if (terminalInstance.current) {
            // Send each character through the PTY so the shell tracks it
            for (let i = 0; i < command.length; i++) {
              sendInputToPTY(command[i]);
            }
          }
        }}
        onCommandFromHistory={(command) => {
          // Execute command from history
          if (terminalInstance.current) {
            terminalInstance.current.write(command + '\r\n');
          }
          sendInputToPTY(command + '\n');
        }}
        onNavigateToDirectory={(path) => {
          // Navigate to directory by sending cd command
          sendInputToPTY(`cd "${path}"\n`);
        }}
      />
      
      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="p-2 overflow-hidden"
        style={{
          // Custom scrollbar styles for Apple-like appearance
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
          // Add additional style to ensure proper scrolling
          height: '600px', // Increased fixed height for taller terminal
          minHeight: '600px'
        }}
      />
      
      {/* Link Detector */}
      <LinkDetector 
        terminal={terminalInstance.current} 
        onLinkHover={(url) => {
          // Handle link hover - could show a tooltip or status update
          console.log('Hovering over link:', url);
        }}
        onLinkLeave={() => {
          // Handle link leave
          console.log('Left link');
        }}
      />
    </div>
  );
}

  // Method to save font size to localStorage
  const saveFontSize = (fontSize: number) => {
    if (terminalId) {
      localStorage.setItem(`terminal_font_size_${terminalId}`, fontSize.toString());
    } else {
      localStorage.setItem(`terminal_font_size_default`, fontSize.toString());
    }
  };

  // Function to save command to history
  const saveCommandToHistory = (command: string) => {
    if (!command.trim()) return;

    try {
      // Save to global history
      const globalHistoryKey = 'terminal_command_history_global';
      const globalHistory = localStorage.getItem(globalHistoryKey);
      const globalItems: { id: string; command: string; timestamp: number; terminalId?: string }[] = globalHistory ? JSON.parse(globalHistory) : [];
      
      // Add new item and remove duplicates
      const newHistoryItem = {
        id: Date.now().toString(),
        command: command.trim(),
        timestamp: Date.now(),
        terminalId
      };
      
      const filteredGlobalItems = globalItems.filter(item => item.command !== command.trim());
      const updatedGlobalHistory = [newHistoryItem, ...filteredGlobalItems].slice(0, 50);
      localStorage.setItem(globalHistoryKey, JSON.stringify(updatedGlobalHistory));
    } catch (error) {
      console.error('Failed to save command to history:', error);
    }
  };