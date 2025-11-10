import fs from 'fs/promises';
import path from 'path';
import { MongoDBConnectionConfig } from '../types/mongodb.js';
import { EncryptionService } from './EncryptionService.js';

class MongoDBConnectionStorage {
  private storageDir: string;
  private storageFile: string;
  private storageBackupFile: string;
  private connections: Map<string, MongoDBConnectionConfig> = new Map();
  private initialized = false;

  constructor() {
    // Use data directory relative to project root
    this.storageDir = path.join(process.cwd(), 'data');
    this.storageFile = path.join(this.storageDir, 'mongodb-connections.json');
    this.storageBackupFile = path.join(this.storageDir, 'mongodb-connections.backup.json');
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
      
    } catch (error) {
      console.error('Error initializing MongoDB connection storage:', error);
      throw error;
    }
  }

  /**
   * Load connections from file
   */
  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const connections = JSON.parse(data) as MongoDBConnectionConfig[];

      this.connections.clear();
      let needsMigrationCount = 0;

      connections.forEach((conn) => {
        // Check if URI needs migration from plain-text
        if (conn.uri && EncryptionService.needsMigration(conn.uri)) {
          console.warn(`MongoDB connection ${conn.name} has plain-text URI - needs migration`);
          needsMigrationCount++;
        }

        this.connections.set(conn.id, conn);
      });

      

      if (needsMigrationCount > 0) {
        console.warn(`⚠️  ${needsMigrationCount} MongoDB connection(s) have plain-text URIs.`);
        

        // Auto-migrate plain-text URIs
        let migrated = 0;
        for (const [id, conn] of this.connections.entries()) {
          if (conn.uri && EncryptionService.needsMigration(conn.uri)) {
            
            conn.uri = EncryptionService.encryptFallback(conn.uri);
            migrated++;
          }
        }

        if (migrated > 0) {
          await this.saveToFile();
          
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, that's okay
        
      } else {
        console.error('Error loading MongoDB connections:', error);
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

      
    } catch (error) {
      console.error('Error saving MongoDB connections:', error);
      throw error;
    }
  }

  /**
   * Get all connections (with decrypted URIs)
   */
  async getAll(): Promise<MongoDBConnectionConfig[]> {
    await this.initialize();
    // Return deep copies to prevent external mutation of stored objects
    return Array.from(this.connections.values()).map((c) => JSON.parse(JSON.stringify(c)));
  }

  /**
   * Get connection by ID (with decrypted URI)
   */
  async getById(id: string): Promise<MongoDBConnectionConfig | null> {
    await this.initialize();
    const found = this.connections.get(id) || null;
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  /**
   * Save connection
   */
  async save(connection: MongoDBConnectionConfig): Promise<void> {
    await this.initialize();

    // Ensure URI is encrypted before persisting
    if (connection.uri &&
        !EncryptionService.isEncrypted(connection.uri) &&
        !EncryptionService.isElectronEncrypted(connection.uri)) {
      connection.uri = EncryptionService.encryptFallback(connection.uri);
    }

    this.connections.set(connection.id, connection);

    await this.saveToFile();
  }

  /**
   * Update connection
   */
  async update(id: string, updates: Partial<MongoDBConnectionConfig>): Promise<MongoDBConnectionConfig> {
    await this.initialize();

    const existing = this.connections.get(id);
    if (!existing) {
      throw new Error(`MongoDB connection not found: ${id}`);
    }

    // Merge updates with existing connection
    const updated = {
      ...existing,
      ...updates,
    };

    // If URI is explicitly undefined in updates, keep the existing URI
    if (updates.uri === undefined && existing.uri) {
      updated.uri = existing.uri;
    }

    // Ensure URI is encrypted before persisting
    if (updated.uri &&
        !EncryptionService.isEncrypted(updated.uri) &&
        !EncryptionService.isElectronEncrypted(updated.uri)) {
      updated.uri = EncryptionService.encryptFallback(updated.uri);
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
      throw new Error(`MongoDB connection not found: ${id}`);
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
export const mongodbConnectionStorage = new MongoDBConnectionStorage();
