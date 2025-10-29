import fs from 'fs/promises';
import path from 'path';
import { ConnectionConfig } from '../types/connection.js';
import { EncryptionService } from './EncryptionService.js';

class ConnectionStorage {
  private storageDir: string;
  private storageFile: string;
  private storageBackupFile: string;
  private connections: Map<string, ConnectionConfig> = new Map();
  private initialized = false;

  constructor() {
    // Use data directory relative to project root
    this.storageDir = path.join(process.cwd(), 'data');
    this.storageFile = path.join(this.storageDir, 'connections.json');
    this.storageBackupFile = path.join(this.storageDir, 'connections.backup.json');
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
      let needsMigrationCount = 0;

      connections.forEach((conn) => {
        // Check if password needs migration from plain-text
        if (conn.password && EncryptionService.needsMigration(conn.password)) {
          console.warn(`Connection ${conn.name} has plain-text password - needs migration`);
          needsMigrationCount++;
        }

        this.connections.set(conn.id, conn);
      });

      console.log(`Loaded ${connections.length} connections from storage`);

      if (needsMigrationCount > 0) {
        console.warn(`⚠️  ${needsMigrationCount} connection(s) have plain-text passwords.`);
        console.log('🔐 Auto-encrypting plain-text passwords...');

        // Auto-migrate plain-text passwords
        let migrated = 0;
        for (const [id, conn] of this.connections.entries()) {
          if (conn.password && EncryptionService.needsMigration(conn.password)) {
            console.log(`  Encrypting password for: ${conn.name}`);
            conn.password = EncryptionService.encryptFallback(conn.password);
            migrated++;
          }
        }

        if (migrated > 0) {
          await this.saveToFile();
          console.log(`✅ Successfully encrypted ${migrated} password(s)`);
        }
      }
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
      const connections = Array.from(this.connections.values());

      // Create backup of existing file before saving
      try {
        await fs.access(this.storageFile);
        await fs.copyFile(this.storageFile, this.storageBackupFile);
      } catch {
        // Backup file doesn't exist yet, that's okay
      }

      await fs.writeFile(this.storageFile, JSON.stringify(connections, null, 2), 'utf-8');

      console.log(`Saved ${connections.length} connections to storage`);
    } catch (error) {
      console.error('Error saving connections:', error);
      throw error;
    }
  }

  /**
   * Get all connections (with passwords)
   */
  async getAll(): Promise<ConnectionConfig[]> {
    await this.initialize();
    // Return deep copies to prevent external mutation of stored objects
    return Array.from(this.connections.values()).map((c) => JSON.parse(JSON.stringify(c)));
  }

  /**
   * Get connection by ID
   */
  async getById(id: string): Promise<ConnectionConfig | null> {
    await this.initialize();
    const found = this.connections.get(id) || null;
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  /**
   * Save connection
   */
  async save(connection: ConnectionConfig): Promise<void> {
    await this.initialize();

    // Ensure passwords are encrypted before persisting
    if (connection.password &&
        !EncryptionService.isEncrypted(connection.password) &&
        !EncryptionService.isElectronEncrypted(connection.password)) {
      connection.password = EncryptionService.encryptFallback(connection.password);
    }

    if (connection.sshTunnel?.password &&
        !EncryptionService.isEncrypted(connection.sshTunnel.password) &&
        !EncryptionService.isElectronEncrypted(connection.sshTunnel.password)) {
      connection.sshTunnel.password = EncryptionService.encryptFallback(connection.sshTunnel.password);
    }

    this.connections.set(connection.id, connection);

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

    // Merge updates with existing connection
    // If password is undefined, keep existing password
    const updated = {
      ...existing,
      ...updates,
    };

    // If password is explicitly undefined in updates, keep the existing password
    if (updates.password === undefined && existing.password) {
      updated.password = existing.password;
    }

    // Ensure passwords are encrypted before persisting
    if (updated.password &&
        !EncryptionService.isEncrypted(updated.password) &&
        !EncryptionService.isElectronEncrypted(updated.password)) {
      updated.password = EncryptionService.encryptFallback(updated.password);
    }

    if (updated.sshTunnel?.password &&
        !EncryptionService.isEncrypted(updated.sshTunnel.password) &&
        !EncryptionService.isElectronEncrypted(updated.sshTunnel.password)) {
      updated.sshTunnel.password = EncryptionService.encryptFallback(updated.sshTunnel.password);
    }

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
