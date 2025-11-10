import { Client } from 'ssh2';
import * as net from 'net';
import * as fs from 'fs';
import { SSHTunnelConfig } from '../types/connection.js';

interface TunnelInfo {
  client: Client;
  server: net.Server;
  localPort: number;
  config: SSHTunnelConfig;
}

class SSHTunnelManager {
  private tunnels: Map<string, TunnelInfo> = new Map();
  private portRange = { min: 50000, max: 60000 };

  /**
   * Create an SSH tunnel and return the local port
   */
  async createTunnel(
    tunnelId: string,
    sshConfig: SSHTunnelConfig,
    targetHost: string,
    targetPort: number
  ): Promise<number> {
    // Check if tunnel already exists
    if (this.tunnels.has(tunnelId)) {
      const existing = this.tunnels.get(tunnelId)!;
      
      return existing.localPort;
    }

    // Find available local port
    const localPort = await this.findAvailablePort();

    return new Promise((resolve, reject) => {
      const sshClient = new Client();
      let server: net.Server | null = null;

      // Set up SSH client
      sshClient
        .on('ready', () => {
          

          // Create local server
          server = net.createServer((clientSocket) => {
            

            // Forward connection through SSH tunnel
            sshClient.forwardOut(
              '127.0.0.1',
              localPort,
              targetHost,
              targetPort,
              (err, stream) => {
                if (err) {
                  console.error('SSH tunnel forwarding error:', err);
                  clientSocket.end();
                  return;
                }

                // Pipe data between local socket and SSH stream
                clientSocket.pipe(stream).pipe(clientSocket);

                clientSocket.on('error', (error) => {
                  console.error('Client socket error:', error);
                  stream.end();
                });

                stream.on('error', (error) => {
                  console.error('SSH stream error:', error);
                  clientSocket.end();
                });
              }
            );
          });

          // Start listening on local port
          server!.listen(localPort, '127.0.0.1', () => {
            

            // Store tunnel info
            this.tunnels.set(tunnelId, {
              client: sshClient,
              server: server!,
              localPort,
              config: sshConfig,
            });

            resolve(localPort);
          });

          server!.on('error', (error) => {
            console.error('Local server error:', error);
            sshClient.end();
            reject(error);
          });
        })
        .on('error', (error) => {
          console.error('SSH connection error:', error);
          reject(new Error(`SSH connection failed: ${error.message}`));
        })
        .on('end', () => {
          
        })
        .on('close', () => {
          
          // Clean up if connection closes unexpectedly
          if (server) {
            server.close();
          }
          this.tunnels.delete(tunnelId);
        });

      // Prepare SSH connection config
      const connectConfig: any = {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username,
        readyTimeout: 30000, // 30 seconds
      };

      // Add authentication method
      if (sshConfig.privateKey) {
        // Use private key authentication
        try {
          if (fs.existsSync(sshConfig.privateKey)) {
            connectConfig.privateKey = fs.readFileSync(sshConfig.privateKey);
          } else {
            // Treat as raw key content
            connectConfig.privateKey = sshConfig.privateKey;
          }
        } catch (error) {
          console.error('Error reading private key:', error);
          reject(new Error('Failed to read private key'));
          return;
        }
      } else if (sshConfig.password) {
        // Use password authentication
        connectConfig.password = sshConfig.password;
      } else {
        reject(new Error('SSH authentication requires either password or private key'));
        return;
      }

      // Connect to SSH server
      try {
        sshClient.connect(connectConfig);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close an SSH tunnel
   */
  async closeTunnel(tunnelId: string): Promise<void> {
    const tunnel = this.tunnels.get(tunnelId);
    if (!tunnel) {
      
      return;
    }

    return new Promise((resolve) => {
      

      // Close local server
      tunnel.server.close(() => {
        
      });

      // Close SSH connection
      tunnel.client.end();

      // Remove from map
      this.tunnels.delete(tunnelId);

      resolve();
    });
  }

  /**
   * Get tunnel info
   */
  getTunnel(tunnelId: string): TunnelInfo | null {
    return this.tunnels.get(tunnelId) || null;
  }

  /**
   * Close all tunnels
   */
  async closeAllTunnels(): Promise<void> {
    const tunnelIds = Array.from(this.tunnels.keys());
    await Promise.all(tunnelIds.map((id) => this.closeTunnel(id)));
  }

  /**
   * Find an available port in the configured range
   */
  private async findAvailablePort(): Promise<number> {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error('No available ports in the configured range');
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port, '127.0.0.1');
    });
  }
}

// Singleton instance
export const sshTunnelManager = new SSHTunnelManager();
