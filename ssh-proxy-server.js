const WebSocket = require('ws');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

class SSHProxyServer {
  constructor() {
    this.wss = null;
    this.connections = new Map();
  }

  start(port = 3001) {
    this.wss = new WebSocket.Server({ port });
    
    console.log(`SSH Proxy Server started on port ${port}`);
    
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
            messageId: message.messageId
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.cleanupConnection(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.cleanupConnection(ws);
      });
    });
  }

  async handleMessage(ws, message) {
    const { type, messageId } = message;
    
    switch (type) {
      case 'connect':
        await this.handleConnect(ws, message, messageId);
        break;
      case 'listFiles':
        await this.handleListFiles(ws, message, messageId);
        break;
      case 'readFile':
        await this.handleReadFile(ws, message, messageId);
        break;
      case 'deleteFile':
        await this.handleDeleteFile(ws, message, messageId);
        break;
      case 'deleteAllLogs':
        await this.handleDeleteAllLogs(ws, message, messageId);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Unknown message type',
          messageId
        }));
    }
  }

  async handleConnect(ws, message, messageId) {
    const { connection } = message;
    const sshClient = new Client();
    
    sshClient.on('ready', () => {
      console.log(`SSH connected to ${connection.host}`);
      this.connections.set(ws, sshClient);
      
      ws.send(JSON.stringify({
        type: 'connected',
        messageId
      }));
    });
    
    sshClient.on('error', (err) => {
      console.error('SSH connection error:', err);
      let errorMessage = err.message;
      
      // Provide more helpful error messages for common SSH issues
      if (err.message.includes('All configured authentication methods failed')) {
        errorMessage = 'Authentication failed. Please check your credentials or private key.';
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'Host not found. Please check the hostname.';
      } else if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Please check the port and ensure SSH service is running.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your network connection.';
      }
      
      ws.send(JSON.stringify({
        type: 'error',
        error: errorMessage,
        messageId
      }));
    });
    
    try {
      const config = {
        host: connection.host,
        port: connection.port,
        username: connection.username
      };
      
      if (connection.password) {
        config.password = connection.password;
      }
      
      if (connection.privateKey) {
        config.privateKey = connection.privateKey;
      } else if (connection.privateKeyPath) {
        // Try to read the private key file if path is provided
        try {
          const keyPath = connection.privateKeyPath.startsWith('~') 
            ? connection.privateKeyPath.replace('~', require('os').homedir())
            : connection.privateKeyPath;
          config.privateKey = fs.readFileSync(keyPath, 'utf8');
        } catch (error) {
          console.error('Failed to read private key file:', error);
        }
      }
      
      sshClient.connect(config);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
        messageId
      }));
    }
  }

  async handleListFiles(ws, message, messageId) {
    const sshClient = this.connections.get(ws);
    if (!sshClient) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Not connected',
        messageId
      }));
      return;
    }
    
    const { path } = message;
    
    sshClient.exec(`ls -la "${path}"`, (err, stream) => {
      if (err) {
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message,
          messageId
        }));
        return;
      }
      
      let output = '';
      stream.on('data', (data) => {
        output += data.toString();
      });
      
      stream.on('close', () => {
        try {
          const files = this.parseLsOutput(output, path);
          ws.send(JSON.stringify({
            type: 'files',
            files,
            messageId
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message,
            messageId
          }));
        }
      });
    });
  }

  async handleReadFile(ws, message, messageId) {
    const sshClient = this.connections.get(ws);
    if (!sshClient) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Not connected',
        messageId
      }));
      return;
    }
    
    const { path, startLine, endLine } = message;
    
    let command = `cat "${path}"`;
    if (startLine !== undefined && endLine !== undefined) {
      command = `sed -n '${startLine},${endLine}p' "${path}"`;
    }
    
    sshClient.exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stream) => {
      if (err) {
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message,
          messageId
        }));
        return;
      }
      
      let output = '';
      stream.on('data', (data) => {
        output += data.toString();
      });
      
      stream.on('close', (code) => {
        ws.send(JSON.stringify({
          type: 'fileContent',
          content: output,
          totalLines: output.split('\n').length,
          messageId
        }));
      });
    });
  }

  async handleDeleteFile(ws, message, messageId) {
    const sshClient = this.connections.get(ws);
    if (!sshClient) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Not connected',
        messageId
      }));
      return;
    }
    
    const { path } = message;
    
    sshClient.exec(`rm -f "${path}"`, (err, stream) => {
      if (err) {
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message,
          messageId
        }));
        return;
      }
      
      stream.on('close', (code) => {
        if (code === 0) {
          ws.send(JSON.stringify({
            type: 'deleted',
            messageId
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            error: `Failed to delete file (exit code: ${code})`,
            messageId
          }));
        }
      });
    });
  }

  async handleDeleteAllLogs(ws, message, messageId) {
    const sshClient = this.connections.get(ws);
    if (!sshClient) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Not connected',
        messageId
      }));
      return;
    }
    
    const { logDirectory = '/var/log' } = message;
    
    // Command to find and delete all .log files
    const command = `find "${logDirectory}" -name "*.log" -type f -delete`;
    
    sshClient.exec(command, (err, stream) => {
      if (err) {
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message,
          messageId
        }));
        return;
      }
      
      stream.on('close', (code) => {
        if (code === 0) {
          ws.send(JSON.stringify({
            type: 'deletedAll',
            messageId
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            error: `Failed to delete log files (exit code: ${code})`,
            messageId
          }));
        }
      });
    });
  }

  parseLsOutput(output, basePath) {
    const lines = output.split('\n').filter(line => line.trim());
    const files = [];
    
    for (const line of lines) {
      // Skip total line
      if (line.startsWith('total')) continue;
      
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;
      
      const permissions = parts[0];
      const size = parseInt(parts[4]);
      const month = parts[5];
      const day = parts[6];
      const timeOrYear = parts[7];
      const name = parts.slice(8).join(' ');
      
      const isDirectory = permissions.startsWith('d');
      const fullPath = path.join(basePath, name);
      
      // Try to parse date
      let modified;
      try {
        const dateStr = `${month} ${day} ${timeOrYear}`;
        modified = new Date(dateStr);
        if (isNaN(modified.getTime())) {
          // Try with current year if time is provided
          const currentYear = new Date().getFullYear();
          modified = new Date(`${dateStr} ${currentYear}`);
        }
      } catch (e) {
        modified = undefined;
      }
      
      files.push({
        name,
        path: fullPath,
        type: isDirectory ? 'directory' : 'file',
        size: isDirectory ? undefined : size,
        modified,
        permissions
      });
    }
    
    return files;
  }

  cleanupConnection(ws) {
    const sshClient = this.connections.get(ws);
    if (sshClient) {
      sshClient.end();
      this.connections.delete(ws);
    }
  }
}

// Start the server
const server = new SSHProxyServer();
server.start(3001);

module.exports = SSHProxyServer;