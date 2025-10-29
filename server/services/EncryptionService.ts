/**
 * EncryptionService
 *
 * Handles encryption/decryption of sensitive data.
 * In Electron mode, this service stores encrypted data and relies on
 * the client to perform actual encryption/decryption using safeStorage.
 *
 * In web mode (non-Electron), passwords are stored encrypted with a
 * fallback mechanism (not as secure as OS keychain).
 */

import crypto from 'crypto';

export class EncryptionService {
  private static readonly ENCRYPTION_PREFIX = 'enc:v1:';
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  // Fallback encryption key (used in non-Electron environments)
  // In production, this should be derived from machine-specific data
  private static getFallbackKey(): Buffer {
    // Use a combination of machine-specific identifiers
    // This is NOT as secure as OS keychain, but better than plain text
    const machineId = process.platform + process.arch + (process.env.COMPUTERNAME || process.env.HOSTNAME || 'default');
    return crypto.createHash('sha256').update(machineId).digest();
  }

  /**
   * Check if a password is encrypted
   */
  static isEncrypted(password: string | undefined): boolean {
    if (!password) return false;
    return password.startsWith(this.ENCRYPTION_PREFIX);
  }

  /**
   * Encrypt a password using Node.js crypto (fallback method)
   * This is used when Electron safeStorage is not available
   */
  static encryptFallback(plaintext: string): string {
    try {
      const key = this.getFallbackKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);

      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'base64'),
        authTag,
      ]);

      return this.ENCRYPTION_PREFIX + combined.toString('base64');
    } catch (error) {
      console.error('Fallback encryption error:', error);
      throw new Error('Failed to encrypt password');
    }
  }

  /**
   * Decrypt a password using Node.js crypto (fallback method)
   */
  static decryptFallback(encrypted: string): string {
    try {
      // Remove prefix
      if (!encrypted.startsWith(this.ENCRYPTION_PREFIX)) {
        throw new Error('Invalid encrypted format');
      }

      const encryptedData = encrypted.substring(this.ENCRYPTION_PREFIX.length);
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, encrypted data, and auth tag
      const iv = combined.subarray(0, this.IV_LENGTH);
      const authTag = combined.subarray(combined.length - this.AUTH_TAG_LENGTH);
      const ciphertext = combined.subarray(this.IV_LENGTH, combined.length - this.AUTH_TAG_LENGTH);

      const key = this.getFallbackKey();
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext.toString('base64'), 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Fallback decryption error:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  /**
   * Marks a password as encrypted (Electron safeStorage)
   * The actual encryption is done on the client side
   */
  static markAsElectronEncrypted(encryptedBase64: string): string {
    return `electron:${encryptedBase64}`;
  }

  /**
   * Check if password is encrypted with Electron safeStorage
   */
  static isElectronEncrypted(password: string | undefined): boolean {
    if (!password) return false;
    return password.startsWith('electron:');
  }

  /**
   * Extract Electron encrypted data
   */
  static extractElectronEncrypted(password: string): string {
    if (!this.isElectronEncrypted(password)) {
      throw new Error('Not an Electron encrypted password');
    }
    return password.substring('electron:'.length);
  }

  /**
   * Determine if a password needs migration
   */
  static needsMigration(password: string | undefined): boolean {
    if (!password) return false;
    // If it's not encrypted at all, it needs migration
    return !this.isEncrypted(password) && !this.isElectronEncrypted(password);
  }
}

export const encryptionService = new EncryptionService();
