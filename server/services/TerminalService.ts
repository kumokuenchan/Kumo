import { spawn, ChildProcess } from 'child_process';
import { resolve as resolvePath, join as joinPath } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { connectionPoolManager } from './ConnectionPoolManager.js';
import { connectionStorage } from './ConnectionStorage.js';
import { ConnectionConfig } from '../types/connection.js';
import { EncryptionService } from './EncryptionService.js';

interface TerminalSession {
  id: string;
  isActive: boolean;
  lastActivity: Date;
  connectionId?: string;
  cwd: string; // Current working directory
}

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();

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
    const session: TerminalSession = {
      id: sessionId,
      isActive: true,
      lastActivity: new Date(),
      connectionId,
      cwd: process.cwd() // Start in the current working directory
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async sendCommandToSession(sessionId: string, command: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Session not found or inactive');
    }

    session.lastActivity = new Date();

    // Handle cd command specially to update session state
    if (command.trim() === 'cd') {
      const homePath = process.env.HOME || process.env.USERPROFILE || '/';
      return this.handleCdCommand(session, homePath);
    }

    const cdMatch = command.match(/^\s*cd\s+(.+)\s*$/);
    if (cdMatch) {
      const path = cdMatch[1].trim();
      return this.handleCdCommand(session, path);
    }

    // Handle pwd command
    if (command.trim() === 'pwd') {
      return Promise.resolve(session.cwd);
    }

    // Execute the command in the session's current working directory
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: session.cwd,
        env: { ...process.env }
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        const result = output + error;
        resolve(result.trim() || `Command completed with exit code ${code}`);
      });

      child.on('error', (err) => {
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        resolve('Command timed out after 10 seconds');
      }, 10000);
    });
  }

  private handleCdCommand(session: TerminalSession, path: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        // Resolve the path relative to the current working directory
        const newPath = path.startsWith('/') || path.startsWith('~')
          ? path.replace('~', process.env.HOME || process.env.USERPROFILE || '')
          : resolvePath(session.cwd, path);

        // Check if the directory exists
        if (existsSync(newPath) && statSync(newPath).isDirectory()) {
          session.cwd = newPath;
          resolve(`Changed directory to ${newPath}`);
        } else {
          resolve(`cd: ${path}: No such file or directory`);
        }
      } catch (error: any) {
        resolve(`cd: ${path}: ${error.message}`);
      }
    });
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
    }
  }

  cleanupInactiveSessions(): void {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

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