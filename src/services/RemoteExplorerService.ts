export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  connected: boolean;
}

export interface RemoteFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  permissions?: string;
  children?: RemoteFile[];
}

export interface LogFileContent {
  path: string;
  content: string;
  lines: string[];
  totalLines: number;
}

class RemoteExplorerService {
  private connections: Map<string, SSHConnection> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor() {
    this.loadSavedConnections();
  }

  private loadSavedConnections() {
    try {
      const saved = localStorage.getItem('remote_explorer_connections');
      if (saved) {
        const connections: SSHConnection[] = JSON.parse(saved);
        connections.forEach(conn => {
          conn.connected = false;
          this.connections.set(conn.id, conn);
        });
      }
    } catch (error) {
      console.error('Failed to load saved connections:', error);
    }
  }

  private saveConnections() {
    try {
      const connections = Array.from(this.connections.values());
      localStorage.setItem('remote_explorer_connections', JSON.stringify(connections));
    } catch (error) {
      console.error('Failed to save connections:', error);
    }
  }

  async addConnection(connection: Omit<SSHConnection, 'id' | 'connected'>): Promise<SSHConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConnection: SSHConnection = {
      ...connection,
      id,
      connected: false
    };
    
    this.connections.set(id, newConnection);
    this.saveConnections();
    return newConnection;
  }

  async removeConnection(id: string): Promise<void> {
    await this.disconnect(id);
    this.connections.delete(id);
    this.saveConnections();
  }

  async connect(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) return false;

    try {
      // Create WebSocket connection to our server-side SSH proxy
      const ws = new WebSocket(`ws://localhost:3001/ssh-connect`);
      
      return new Promise((resolve) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'connect',
            connection: {
              host: connection.host,
              port: connection.port,
              username: connection.username,
              password: connection.password,
              privateKey: connection.privateKey
            }
          }));
        };

        ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          if (response.type === 'connected') {
            connection.connected = true;
            this.wsConnections.set(id, ws);
            this.saveConnections();
            resolve(true);
          } else if (response.type === 'error') {
            console.error('SSH connection failed:', response.error);
            resolve(false);
          }
        };

        ws.onerror = () => {
          console.error('WebSocket connection failed');
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  async disconnect(id: string): Promise<void> {
    const connection = this.connections.get(id);
    const ws = this.wsConnections.get(id);
    
    if (connection) {
      connection.connected = false;
    }
    
    if (ws) {
      ws.close();
      this.wsConnections.delete(id);
    }
    
    this.saveConnections();
  }

  async listFiles(id: string, path: string = '/'): Promise<RemoteFile[]> {
    const ws = this.wsConnections.get(id);
    if (!ws) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const messageId = `list_${Date.now()}`;
      
      const handleMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.messageId === messageId) {
          ws.removeEventListener('message', handleMessage);
          
          if (response.type === 'error') {
            reject(new Error(response.error));
          } else {
            resolve(response.files);
          }
        }
      };

      ws.addEventListener('message', handleMessage);
      
      ws.send(JSON.stringify({
        type: 'listFiles',
        path,
        messageId
      }));

      // Timeout after 10 seconds
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage);
        reject(new Error('Timeout listing files'));
      }, 10000);
    });
  }

  async readFile(id: string, path: string, startLine?: number, endLine?: number): Promise<LogFileContent> {
    const ws = this.wsConnections.get(id);
    if (!ws) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const messageId = `read_${Date.now()}`;
      
      const handleMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.messageId === messageId) {
          ws.removeEventListener('message', handleMessage);
          
          if (response.type === 'error') {
            reject(new Error(response.error));
          } else {
            resolve({
              path,
              content: response.content,
              lines: response.content.split('\n'),
              totalLines: response.totalLines || response.content.split('\n').length
            });
          }
        }
      };

      ws.addEventListener('message', handleMessage);
      
      ws.send(JSON.stringify({
        type: 'readFile',
        path,
        startLine,
        endLine,
        messageId
      }));

      // Timeout after 15 seconds for larger files
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage);
        reject(new Error('Timeout reading file'));
      }, 15000);
    });
  }

  async deleteFile(id: string, path: string): Promise<void> {
    const ws = this.wsConnections.get(id);
    if (!ws) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const messageId = `delete_${Date.now()}`;
      
      const handleMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.messageId === messageId) {
          ws.removeEventListener('message', handleMessage);
          
          if (response.type === 'error') {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        }
      };

      ws.addEventListener('message', handleMessage);
      
      ws.send(JSON.stringify({
        type: 'deleteFile',
        path,
        messageId
      }));

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage);
        reject(new Error('Timeout deleting file'));
      }, 5000);
    });
  }

  async deleteAllLogs(id: string, logDirectory: string = '/var/log'): Promise<void> {
    const ws = this.wsConnections.get(id);
    if (!ws) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const messageId = `deleteAll_${Date.now()}`;
      
      const handleMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.messageId === messageId) {
          ws.removeEventListener('message', handleMessage);
          
          if (response.type === 'error') {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        }
      };

      ws.addEventListener('message', handleMessage);
      
      ws.send(JSON.stringify({
        type: 'deleteAllLogs',
        logDirectory,
        messageId
      }));

      // Timeout after 30 seconds for bulk operations
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage);
        reject(new Error('Timeout deleting log files'));
      }, 30000);
    });
  }

  getConnections(): SSHConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): SSHConnection | undefined {
    return this.connections.get(id);
  }

  isConnected(id: string): boolean {
    const connection = this.connections.get(id);
    return connection?.connected || false;
  }
}

export default new RemoteExplorerService();