import { spawn, ChildProcess } from 'child_process';
import { resolve as resolvePath, join as joinPath } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { connectionPoolManager } from './ConnectionPoolManager.js';
import { connectionStorage } from './ConnectionStorage.js';
import { ConnectionConfig } from '../types/connection.js';
import { EncryptionService } from './EncryptionService.js';
import * as pty from 'node-pty';
import * as os from 'os';
import { Server as SocketIOServer } from 'socket.io';

interface TerminalSession {
  id: string;
  isActive: boolean;
  lastActivity: Date;
  connectionId?: string;
  cwd: string; // Current working directory
  ptyProcess?: pty.IPty; // PTY instance for interactive shell
}

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private io: SocketIOServer | null = null;

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  async executeCommand(command: string, connectionId?: string): Promise<{ output: string; error: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      try {
        // For database-specific commands, we might want to execute them in the context of a connection
        if (connectionId) {
          // This would be where we handle connection-specific commands
          // For now, we'll just execute the command as-is
        }

        // Execute the command with proper shell
        const child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
        
        let output = '';
        let error = '';

        child.stdout?.on('data', (data) => {
          output += data.toString();
        });

        child.stderr?.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          resolve({ output, error, exitCode: code });
        });

        child.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  createSession(sessionId: string, connectionId?: string): TerminalSession {
    // Determine the shell based on OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    const cwd = process.cwd();

    // Create a PTY process
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: cwd,
      env: process.env as { [key: string]: string }
    });

    const session: TerminalSession = {
      id: sessionId,
      isActive: true,
      lastActivity: new Date(),
      connectionId,
      cwd: cwd,
      ptyProcess: ptyProcess
    };

    // Handle PTY data and emit via WebSocket
    ptyProcess.onData((data: string) => {
      if (this.io) {
        this.io.to(`terminal:${sessionId}`).emit('terminal:output', {
          sessionId,
          output: data
        });
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      session.isActive = false;
      if (this.io) {
        this.io.to(`terminal:${sessionId}`).emit('terminal:output', {
          sessionId,
          output: `\r\n[Process exited with code ${exitCode}]\r\n`
        });
        this.io.to(`terminal:${sessionId}`).emit('terminal:exit', {
          sessionId,
          exitCode
        });
      }
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  async sendCommandToSession(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || !session.ptyProcess) {
      throw new Error('Session not found or inactive');
    }

    session.lastActivity = new Date();

    // Write the raw input to PTY (frontend sends '\r' for Enter, we don't add it)
    // Output will be emitted via WebSocket automatically
    session.ptyProcess.write(command);
  }

  // Method to resize PTY (useful for terminal resize)
  resizeSession(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session && session.ptyProcess) {
      session.ptyProcess.resize(cols, rows);
    }
  }


  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Get the current working directory of a PTY session
  async getSessionCwd(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || !session.ptyProcess) {
      return null;
    }

    // node-pty doesn't expose cwd directly, so we need to execute pwd in the PTY
    // and capture the output. However, this is tricky with PTY.
    // The best approach is to track it via process info or use the ptyProcess pid

    try {
      // On Unix systems, we can read the cwd from /proc/[pid]/cwd
      if (os.platform() !== 'win32') {
        const { readlinkSync } = await import('fs');
        const cwdPath = `/proc/${session.ptyProcess.pid}/cwd`;
        try {
          const cwd = readlinkSync(cwdPath);
          return cwd;
        } catch (e) {
          // If /proc is not available (macOS), use lsof
          const { execSync } = await import('child_process');
          try {
            const output = execSync(`lsof -a -p ${session.ptyProcess.pid} -d cwd -Fn | grep '^n' | cut -c 2-`, {
              encoding: 'utf8',
              timeout: 1000
            });
            const cwd = output.trim();
            if (cwd) {
              return cwd;
            }
          } catch (lsofError) {
            // Fallback: return the initially set cwd
            return session.cwd;
          }
        }
      }

      // Windows fallback
      return session.cwd;
    } catch (error) {
      console.error('Failed to get session cwd:', error);
      return session.cwd;
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;

      // Kill the PTY process if it exists
      if (session.ptyProcess) {
        try {
          session.ptyProcess.kill();
        } catch (error) {
          // Ignore errors when killing process
        }
      }

      this.sessions.delete(sessionId);
    }
  }

  cleanupInactiveSessions(): void {
    const now = new Date();
    const timeout = 24 * 60 * 60 * 1000; // 24 hours - keep sessions alive for a full day

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > timeout) {
        this.closeSession(sessionId);
      }
    }
  }

  async getCompletions(sessionId: string, partial: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return [];
    }

    try {
      // Parse the command to get the part we're completing
      const parts = partial.split(/\s+/);
      const lastPart = parts[parts.length - 1] || '';

      // Determine the directory to search in
      let searchDir = session.cwd;
      let prefix = lastPart;

      if (lastPart.includes('/')) {
        const lastSlash = lastPart.lastIndexOf('/');
        const dirPart = lastPart.substring(0, lastSlash + 1);
        prefix = lastPart.substring(lastSlash + 1);

        if (dirPart.startsWith('/')) {
          searchDir = dirPart;
        } else if (dirPart.startsWith('~')) {
          searchDir = joinPath(process.env.HOME || process.env.USERPROFILE || '/', dirPart.substring(2));
        } else {
          searchDir = joinPath(session.cwd, dirPart);
        }
      }

      // Get all files/directories in the search directory
      if (!existsSync(searchDir)) {
        return [];
      }

      const entries = readdirSync(searchDir);
      const matches = entries
        .filter((entry: string) => entry.startsWith(prefix))
        .map((entry: string) => {
          const fullPath = joinPath(searchDir, entry);
          const isDir = statSync(fullPath).isDirectory();
          return isDir ? entry + '/' : entry;
        })
        .sort();

      return matches;
    } catch (error) {
      return [];
    }
  }
}