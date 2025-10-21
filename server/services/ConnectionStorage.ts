import fs from 'fs/promises';
import path from 'path';
import { ConnectionConfig } from '../types/connection.js';

class ConnectionStorage {
  private storageDir: string;
  private storageFile: string;
  private connections: Map<string, ConnectionConfig> = new Map();
  private initialized = false;

  constructor() {
    // Use data directory relative to project root
    this.storageDir = path.join(process.cwd(), 'data');
    this.storageFile = path.join(this.storageDir, 'connections.json');
  }

  /**
   * Initialize storage (create directory and load existing connections)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load existing connections
      await this.loadFromFile();

      this.initialized = true;
      console.log('Connection storage initialized');
    } catch (error) {
      console.error('Error initializing connection storage:', error);
      throw error;
    }
  }

  /**
   * Load connections from file
   */
  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const connections = JSON.parse(data) as ConnectionConfig[];

      this.connections.clear();
      connections.forEach((conn) => {
        // Don't load passwords from file (they should be in secure storage)
        delete conn.password;
        this.connections.set(conn.id, conn);
      });

      console.log(`Loaded ${connections.length} connections from storage`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, that's okay
        console.log('No existing connections file, starting fresh');
      } else {
        console.error('Error loading connections:', error);
        throw error;
      }
    }
  }

  /**
   * Save connections to file
   */
  private async saveToFile(): Promise<void> {
    try {
      const connections = Array.from(this.connections.values()).map((conn) => {
        // Don't save passwords to file
        const { password, ...connWithoutPassword } = conn;
        return connWithoutPassword;
      });

      await fs.writeFile(this.storageFile, JSON.stringify(connections, null, 2), 'utf-8');

      console.log(`Saved ${connections.length} connections to storage`);
    } catch (error) {
      console.error('Error saving connections:', error);
      throw error;
    }
  }

  /**
   * Get all connections (without passwords)
   */
  async getAll(): Promise<ConnectionConfig[]> {
    await this.initialize();
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  async getById(id: string): Promise<ConnectionConfig | null> {
    await this.initialize();
    return this.connections.get(id) || null;
  }

  /**
   * Save connection
   */
  async save(connection: ConnectionConfig): Promise<void> {
    await this.initialize();

    // Store without password (password goes to secure storage)
    const { password, ...connWithoutPassword } = connection;
    this.connections.set(connection.id, connWithoutPassword as ConnectionConfig);

    await this.saveToFile();
  }

  /**
   * Update connection
   */
  async update(id: string, updates: Partial<ConnectionConfig>): Promise<ConnectionConfig> {
    await this.initialize();

    const existing = this.connections.get(id);
    if (!existing) {
      throw new Error(`Connection not found: ${id}`);
    }

    // Don't store password in file
    const { password, ...updatesWithoutPassword } = updates;

    const updated = {
      ...existing,
      ...updatesWithoutPassword,
    };

    this.connections.set(id, updated);
    await this.saveToFile();

    return updated;
  }

  /**
   * Delete connection
   */
  async delete(id: string): Promise<void> {
    await this.initialize();

    if (!this.connections.has(id)) {
      throw new Error(`Connection not found: ${id}`);
    }

    this.connections.delete(id);
    await this.saveToFile();
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.initialize();

    const connection = this.connections.get(id);
    if (connection) {
      connection.lastUsed = new Date().toISOString();
      await this.saveToFile();
    }
  }

  /**
   * Check if connection exists
   */
  async exists(id: string): Promise<boolean> {
    await this.initialize();
    return this.connections.has(id);
  }
}

// Export singleton instance
export const connectionStorage = new ConnectionStorage();
