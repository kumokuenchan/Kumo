/**
 * Encryption utilities for secure password storage
 *
 * Uses Electron's safeStorage API when available (Electron environment)
 * Falls back to warning about insecure storage in browser environment
 */

// TypeScript declarations for Electron API
declare global {
  interface Window {
    electron?: {
      crypto?: {
        isAvailable: () => Promise<boolean>;
        encrypt: (text: string) => Promise<string>;
        decrypt: (encryptedText: string) => Promise<string>;
      };
    };
    isElectron?: boolean;
  }
}

class EncryptionUtil {
  private isElectronEnv: boolean;
  private encryptionAvailable: boolean | null = null;

  constructor() {
    this.isElectronEnv = typeof window !== 'undefined' && !!window.isElectron;
  }

  /**
   * Check if encryption is available
   */
  async isAvailable(): Promise<boolean> {
    if (this.encryptionAvailable !== null) {
      return this.encryptionAvailable;
    }

    const isElectron = typeof window !== 'undefined' && !!window.isElectron;
    if (!isElectron || !window.electron?.crypto) {
      this.encryptionAvailable = false;
      console.warn('Electron crypto API not available. Passwords will not be encrypted.');
      return false;
    }

    try {
      this.encryptionAvailable = await window.electron.crypto.isAvailable();
      if (!this.encryptionAvailable) {
        console.warn('Electron safeStorage is not available on this system.');
      }
      return this.encryptionAvailable;
    } catch (error) {
      console.error('Error checking encryption availability:', error);
      this.encryptionAvailable = false;
      return false;
    }
  }

  /**
   * Encrypt a password
   * Returns the encrypted password with a prefix to identify it as encrypted
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext) {
      return '';
    }

    const available = await this.isAvailable();

    if (!available) {
      // In non-Electron environment, we can't encrypt securely
      // Just return the plain text with a warning
      console.warn('⚠️  Encryption not available. Password will be stored insecurely.');
      return plaintext;
    }

    try {
      const encrypted = await window.electron!.crypto!.encrypt(plaintext);
      // Add prefix to identify as Electron-encrypted
      return `electron:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt password');
    }
  }

  /**
   * Decrypt a password
   */
  async decrypt(encrypted: string): Promise<string> {
    if (!encrypted) {
      return '';
    }

    // Check if it's actually encrypted
    if (!this.isEncrypted(encrypted)) {
      // It's plain text, just return it
      return encrypted;
    }

    const available = await this.isAvailable();

    if (!available) {
      throw new Error('Cannot decrypt: Encryption not available');
    }

    try {
      // Remove the prefix
      const encryptedData = encrypted.replace(/^electron:/, '');
      const decrypted = await window.electron!.crypto!.decrypt(encryptedData);
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  /**
   * Check if a password is encrypted
   */
  isEncrypted(password: string): boolean {
    if (!password) return false;
    return password.startsWith('electron:');
  }

  /**
   * Check if running in Electron environment
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.isElectron;
  }
}

// Export singleton instance
export const encryption = new EncryptionUtil();
