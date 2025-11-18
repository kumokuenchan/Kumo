import { spawn, ChildProcess } from 'child_process';
import { resolve as resolvePath, join as joinPath } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import * as pty from 'node-pty';
import * as os from 'os';
import { Server as SocketIOServer } from 'socket.io';
import { sqliteNotesStorage as notesStorage } from './SQLiteNotesStorage.js';

interface TerminalSession {
  id: string;
  isActive: boolean;
  lastActivity: Date;
  connectionId?: string;
  cwd: string; // Current working directory
  ptyProcess?: pty.IPty; // PTY instance for interactive shell
  commandHistory: string[]; // Command history
}

export interface CompletionItem {
  value: string;
  type: 'file' | 'directory' | 'command' | 'git-branch' | 'env-var' | 'history' | 'saved-command';
  description?: string;
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
      ptyProcess: ptyProcess,
      commandHistory: []
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

    // If command ends with newline, add to history (excluding the newline)
    if (command.endsWith('\r') || command.endsWith('\n')) {
      const cmd = command.replace(/[\r\n]+$/, '').trim();
      if (cmd.length > 0 && !cmd.startsWith(' ')) { // Don't save empty or space-prefixed commands
        // Add to history, avoiding duplicates of the last command
        if (session.commandHistory.length === 0 || session.commandHistory[session.commandHistory.length - 1] !== cmd) {
          session.commandHistory.push(cmd);
          // Keep history limited to last 1000 commands
          if (session.commandHistory.length > 1000) {
            session.commandHistory.shift();
          }
        }
      }
    }

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

  // Get session info including PID
  getSessionInfo(sessionId: string): { pid: number; isActive: boolean; cwd: string } | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) {
      return null;
    }

    return {
      pid: session.ptyProcess.pid,
      isActive: session.isActive,
      cwd: session.cwd
    };
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

  async getCompletions(sessionId: string, partial: string): Promise<CompletionItem[]> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return [];
    }

    try {
      // Get the current working directory from the PTY process
      const currentCwd = await this.getSessionCwd(sessionId) || session.cwd;

      const completions: CompletionItem[] = [];

      // Parse the command to get the part we're completing
      const parts = partial.split(/\s+/);
      const lastPart = parts[parts.length - 1] || '';
      const commandName = parts[0] || '';

      // 1. Environment variable completion (starts with $)
      if (lastPart.startsWith('$')) {
        const varPrefix = lastPart.substring(1).toUpperCase();
        const envVars = Object.keys(process.env)
          .filter(key => key.toUpperCase().startsWith(varPrefix))
          .map(key => ({
            value: '$' + key,
            type: 'env-var' as const,
            description: process.env[key]?.substring(0, 50) + (process.env[key] && process.env[key]!.length > 50 ? '...' : '')
          }));
        completions.push(...envVars);
      }

      // 2. Git subcommand completion (when typing "git <subcommand>")
      if (commandName === 'git') {
        // Show git subcommands when:
        // - User typed "git " (with space) OR
        // - User typed "git c" (partial subcommand)
        const shouldShowGitCommands = parts.length === 1 ||
          (parts.length === 2 && !partial.endsWith(' '));

        if (shouldShowGitCommands) {
          const gitCommands = [
            { cmd: 'add', desc: 'Add file contents to the index' },
            { cmd: 'branch', desc: 'List, create, or delete branches' },
            { cmd: 'checkout', desc: 'Switch branches or restore files' },
            { cmd: 'clone', desc: 'Clone a repository' },
            { cmd: 'commit', desc: 'Record changes to the repository' },
            { cmd: 'diff', desc: 'Show changes between commits' },
            { cmd: 'fetch', desc: 'Download objects from another repository' },
            { cmd: 'init', desc: 'Create an empty Git repository' },
            { cmd: 'log', desc: 'Show commit logs' },
            { cmd: 'merge', desc: 'Join two or more development histories' },
            { cmd: 'pull', desc: 'Fetch and integrate with another repository' },
            { cmd: 'push', desc: 'Update remote refs along with objects' },
            { cmd: 'rebase', desc: 'Reapply commits on top of another base' },
            { cmd: 'reset', desc: 'Reset current HEAD to the specified state' },
            { cmd: 'stash', desc: 'Stash changes in a dirty working directory' },
            { cmd: 'status', desc: 'Show the working tree status' },
            { cmd: 'switch', desc: 'Switch branches' },
            { cmd: 'tag', desc: 'Create, list, delete tags' }
          ];

          const subCommandPrefix = parts.length === 2 ? lastPart.toLowerCase() : '';
          const matchingCommands = gitCommands
            .filter(item => item.cmd.startsWith(subCommandPrefix))
            .map(item => ({
              value: item.cmd,
              type: 'command' as const,
              description: item.desc
            }));
          completions.push(...matchingCommands);
        }
      }

      // 3. Git branch completion (for git commands)
      if (commandName === 'git' && parts.length >= 2) {
        const gitCommand = parts[1];
        const branchCommands = ['checkout', 'merge', 'rebase', 'branch', 'switch'];

        // Check if we should show branch completions
        // Show branches if:
        // 1. The git subcommand is a branch command AND
        // 2. We have at least 3 parts (e.g., "git checkout m") OR
        // 3. The partial ends with a space (e.g., "git checkout ")
        const shouldShowBranches = branchCommands.includes(gitCommand) &&
          (parts.length >= 3 || partial.endsWith(' '));

        if (shouldShowBranches) {
          const branches = await this.getGitBranches(currentCwd);
          // If we have at least 3 parts, use lastPart as prefix, otherwise show all
          const branchPrefix = parts.length >= 3 ? lastPart.toLowerCase() : '';
          const matchingBranches = branches
            .filter(branch => branch.toLowerCase().startsWith(branchPrefix))
            .map(branch => ({
              value: branch,
              type: 'git-branch' as const,
              description: 'Git branch'
            }));
          completions.push(...matchingBranches);
        }
      }

      // 4. Command history suggestions (if at the beginning of line)
      if (parts.length === 1 && partial.length > 0) {
        const historyMatches = session.commandHistory
          .filter(cmd => cmd.toLowerCase().startsWith(partial.toLowerCase()))
          .reverse() // Most recent first
          .slice(0, 10) // Limit to 10 suggestions
          .map(cmd => ({
            value: cmd,
            type: 'history' as const,
            description: 'From history'
          }));
        completions.push(...historyMatches);
      }

      // 4.5. Saved commands from notes (triggered by "sc" prefix)
      // When user types "sc" or "sc <filter>", show saved commands
      if (commandName === 'sc' || (parts.length === 1 && 'sc'.startsWith(partial.toLowerCase()))) {
        console.log('[Autocomplete] Saved commands triggered. commandName:', commandName, 'partial:', partial, 'parts:', parts);
        try {
          const savedCommands = await notesStorage.getDevCommands();
          console.log('[Autocomplete] Loaded', savedCommands.length, 'saved commands');

          // Get filter text after "sc "
          const filterText = parts.length === 2 ? parts[1].toLowerCase() : '';
          console.log('[Autocomplete] Filter text:', filterText);

          // Filter saved commands by name, command, description, or tags
          const savedMatches = savedCommands
            .filter(cmd => {
              if (!filterText) return true; // Show all if no filter
              return cmd.command.toLowerCase().includes(filterText) ||
                     cmd.name.toLowerCase().includes(filterText) ||
                     cmd.description?.toLowerCase().includes(filterText) ||
                     cmd.tags?.some(tag => tag.toLowerCase().includes(filterText));
            })
            .slice(0, 20) // Limit to 20 saved command suggestions
            .map(cmd => ({
              value: cmd.command,
              type: 'saved-command' as const,
              description: `${cmd.name}${cmd.description ? ' - ' + cmd.description : ''}`
            }));
          console.log('[Autocomplete] Found', savedMatches.length, 'matching saved commands');
          completions.push(...savedMatches);
        } catch (error) {
          // If notes storage fails, just skip saved commands
          console.error('[Autocomplete] Failed to load saved commands:', error);
        }
      }

      // 5. Common command completion (if at the beginning of line)
      if (parts.length === 1 && partial.length > 0) {
        const commonCommands = ['cd', 'ls', 'cat', 'git', 'npm', 'node', 'python', 'docker', 'kubectl', 'grep', 'find', 'mkdir', 'rm', 'mv', 'cp', 'pwd', 'echo'];
        const commandMatches = commonCommands
          .filter(cmd => cmd.startsWith(partial.toLowerCase()))
          .map(cmd => ({
            value: cmd,
            type: 'command' as const,
            description: 'Common command'
          }));
        completions.push(...commandMatches);
      }

      // 6. File/directory path completion
      let searchDir = currentCwd;
      let prefix = lastPart;
      let basePath = '';

      if (lastPart.includes('/')) {
        const lastSlash = lastPart.lastIndexOf('/');
        basePath = lastPart.substring(0, lastSlash + 1);
        prefix = lastPart.substring(lastSlash + 1);

        if (basePath.startsWith('/')) {
          searchDir = basePath;
        } else if (basePath.startsWith('~')) {
          searchDir = joinPath(process.env.HOME || process.env.USERPROFILE || '/', basePath.substring(2));
        } else {
          searchDir = joinPath(currentCwd, basePath);
        }
      }

      // Get all files/directories in the search directory
      if (existsSync(searchDir)) {
        const entries = readdirSync(searchDir);
        const fileMatches = entries
          .filter((entry: string) => entry.toLowerCase().startsWith(prefix.toLowerCase()))
          .map((entry: string) => {
            const fullPath = joinPath(searchDir, entry);
            try {
              const stats = statSync(fullPath);
              const isDir = stats.isDirectory();
              return {
                value: basePath + entry + (isDir ? '/' : ''),
                type: isDir ? 'directory' as const : 'file' as const,
                description: isDir ? 'Directory' : `File (${this.formatBytes(stats.size)})`
              };
            } catch {
              return null;
            }
          })
          .filter((item) => item !== null) as CompletionItem[];

        completions.push(...fileMatches.sort((a, b) => {
          // Directories first, then files
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.value.localeCompare(b.value);
        }));
      }

      // Remove duplicates and limit results
      const uniqueCompletions = Array.from(
        new Map(completions.map(item => [item.value, item])).values()
      ).slice(0, 50); // Limit to 50 completions

      return uniqueCompletions;
    } catch (error) {
      console.error('Error getting completions:', error);
      return [];
    }
  }

  private async getGitBranches(cwd: string): Promise<string[]> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('git branch -a --format="%(refname:short)"', {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // Ignore stderr
      });
      return output
        .split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch.length > 0 && !branch.startsWith('remotes/'));
    } catch {
      return [];
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Get list of running processes
  async getProcessList(): Promise<Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    command: string;
    user?: string;
  }>> {
    try {
      const { execSync } = await import('child_process');

      if (os.platform() === 'darwin' || os.platform() === 'linux') {
        // Use ps command on Unix-like systems
        // Format: PID %CPU %MEM USER COMMAND
        const output = execSync('ps aux', { encoding: 'utf8' });
        const lines = output.split('\n').slice(1); // Skip header

        const processes = lines
          .filter(line => line.trim())
          .map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 11) return null;

            const user = parts[0];
            const pid = parseInt(parts[1], 10);
            const cpu = parseFloat(parts[2]);
            const mem = parseFloat(parts[3]);
            const command = parts.slice(10).join(' ');
            const name = parts[10].split('/').pop() || parts[10];

            // Convert memory from percentage to bytes (approximate)
            // This is a rough estimate based on system memory
            const totalMemory = os.totalmem();
            const memoryBytes = (mem / 100) * totalMemory;

            return {
              pid,
              name,
              cpu,
              memory: memoryBytes,
              command,
              user
            };
          })
          .filter(Boolean) as Array<{
            pid: number;
            name: string;
            cpu: number;
            memory: number;
            command: string;
            user?: string;
          }>;

        return processes;
      } else if (os.platform() === 'win32') {
        // Use tasklist on Windows
        const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8' });
        const lines = output.split('\n').slice(0); // No header to skip

        const processes = lines
          .filter(line => line.trim())
          .map(line => {
            // Parse CSV format
            const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!parts || parts.length < 5) return null;

            const name = parts[0].replace(/"/g, '');
            const pid = parseInt(parts[1].replace(/"/g, ''), 10);
            const memStr = parts[4].replace(/"/g, '').replace(/[^\d]/g, '');
            const memory = parseInt(memStr, 10) * 1024; // Convert KB to bytes

            return {
              pid,
              name,
              cpu: 0, // Windows tasklist doesn't provide CPU usage easily
              memory,
              command: name,
              user: undefined
            };
          })
          .filter(Boolean) as Array<{
            pid: number;
            name: string;
            cpu: number;
            memory: number;
            command: string;
            user?: string;
          }>;

        return processes;
      }

      return [];
    } catch (error) {
      console.error('Failed to get process list:', error);
      return [];
    }
  }

  // Kill a process by PID
  async killProcess(pid: number): Promise<void> {
    try {
      const { execSync } = await import('child_process');

      if (os.platform() === 'win32') {
        execSync(`taskkill /PID ${pid} /F`);
      } else {
        execSync(`kill -9 ${pid}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to kill process ${pid}: ${error.message}`);
    }
  }
}