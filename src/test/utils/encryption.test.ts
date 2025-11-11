import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encryption,
} from '../../../src/utils/encryption';

describe('encryption utilities', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset global window for each test - ensure proper structure
    global.window = {
      electron: {
        crypto: {
          isAvailable: vi.fn().mockResolvedValue(true),
          encrypt: vi.fn().mockImplementation((text) => `encrypted-${text}`),
          decrypt: vi.fn().mockImplementation((encryptedText) => encryptedText.replace('encrypted-', '')),
        },
      },
      isElectron: true,
    };
    
    // Reset encryption instance state
    (encryption as any).encryptionAvailable = null;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('EncryptionUtil class', () => {
    describe('constructor and initialization', () => {
      it('should initialize with Electron environment detection', () => {
        global.window.isElectron = true;
        const enc = new (encryption.constructor as any)();
        expect(enc.isElectronEnv).toBe(true);
      });

      it('should detect non-Electron environment', () => {
        global.window.isElectron = false;
        const enc = new (encryption.constructor as any)();
        expect(enc.isElectronEnv).toBe(false);
      });

      it('should handle missing window object', () => {
        const originalWindow = global.window;
        delete (global as any).window;
        const enc = new (encryption.constructor as any)();
        expect(enc.isElectronEnv).toBe(false);
        global.window = originalWindow;
      });
    });

    describe('isElectron method', () => {
      it('should return true for Electron environment', () => {
        global.window.isElectron = true;
        expect(encryption.isElectron()).toBe(true);
      });

      it('should return false for non-Electron environment', () => {
        global.window.isElectron = false;
        expect(encryption.isElectron()).toBe(false);
      });

      it('should handle missing isElectron flag', () => {
        delete (global.window as any).isElectron;
        expect(encryption.isElectron()).toBe(false);
      });
    });

    describe('isAvailable method', () => {
      it('should return false when crypto API is not available', async () => {
        global.window.electron = undefined;
        (encryption as any).encryptionAvailable = null;
        const isAvailable = await encryption.isAvailable();
        expect(isAvailable).toBe(false);
      });

      it('should return false when crypto object is missing', async () => {
        global.window.electron = {};
        (encryption as any).encryptionAvailable = null;
        const isAvailable = await encryption.isAvailable();
        expect(isAvailable).toBe(false);
      });

      it('should return true when crypto is available', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockResolvedValue('encrypted'),
            decrypt: vi.fn().mockResolvedValue('decrypted'),
          },
        };
        (encryption as any).encryptionAvailable = null;
        const isAvailable = await encryption.isAvailable();
        expect(isAvailable).toBe(true);
        expect(global.window.electron?.crypto?.isAvailable).toHaveBeenCalled();
      });

      it('should return false when crypto is not available on system', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(false),
          },
        };
        const isAvailable = await encryption.isAvailable();
        expect(isAvailable).toBe(false);
      });

      it('should handle crypto API errors', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockRejectedValue(new Error('Crypto not available')),
          },
        };
        const isAvailable = await encryption.isAvailable();
        expect(isAvailable).toBe(false);
      });

      it('should cache availability result', async () => {
        const mockIsAvailable = vi.fn().mockResolvedValue(true);
        global.window.electron = {
          crypto: {
            isAvailable: mockIsAvailable,
          },
        };
        
        await encryption.isAvailable();
        await encryption.isAvailable();
        await encryption.isAvailable();
        
        expect(mockIsAvailable).toHaveBeenCalledTimes(1);
      });

      it('should reset cache when called with new instance', async () => {
        const mockIsAvailable = vi.fn().mockResolvedValue(true);
        global.window.electron = {
          crypto: {
            isAvailable: mockIsAvailable,
          },
        };
        
        await encryption.isAvailable();
        (encryption as any).encryptionAvailable = null; // Reset cache
        await encryption.isAvailable();
        
        expect(mockIsAvailable).toHaveBeenCalledTimes(2);
      });
    });

    describe('encrypt method', () => {
      it('should return empty string for empty input', async () => {
        const result = await encryption.encrypt('');
        expect(result).toBe('');
      });

      it('should return empty string for null input', async () => {
        const result = await encryption.encrypt(null as any);
        expect(result).toBe('');
      });

      it('should return empty string for undefined input', async () => {
        const result = await encryption.encrypt(undefined as any);
        expect(result).toBe('');
      });

      it('should encrypt with Electron when available', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockResolvedValue('encrypted-password'),
          },
        };
        
        const result = await encryption.encrypt('password123');
        expect(result).toBe('electron:encrypted-password');
        expect(global.window.electron?.crypto?.encrypt).toHaveBeenCalledWith('password123');
      });

      it('should return plaintext when encryption not available', async () => {
        global.window.electron = undefined;
        
        const result = await encryption.encrypt('password123');
        expect(result).toBe('password123');
      });

      it('should handle encryption errors gracefully', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockRejectedValue(new Error('Encryption failed')),
          },
        };
        
        await expect(encryption.encrypt('password')).rejects.toThrow('Failed to encrypt password');
      });

      it('should handle very long passwords', async () => {
        const longPassword = 'a'.repeat(10000);
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockResolvedValue('encrypted-long-password'),
          },
        };
        
        const result = await encryption.encrypt(longPassword);
        expect(result).toBe('electron:encrypted-long-password');
      });

      it('should handle passwords with special characters', async () => {
        const specialPassword = 'p@ssw0rd!#$%^&*()_+=[]|';
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockResolvedValue('encrypted-special'),
          },
        };
        
        const result = await encryption.encrypt(specialPassword);
        expect(result).toBe('electron:encrypted-special');
      });

      it('should handle Unicode passwords', async () => {
        const unicodePassword = '🔐пароль🔑ññoü中文字符';
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockResolvedValue('encrypted-unicode'),
          },
        };
        
        const result = await encryption.encrypt(unicodePassword);
        expect(result).toBe('electron:encrypted-unicode');
      });

      it('should return plaintext with warning when not in Electron', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        global.window.electron = undefined;
        
        const result = await encryption.encrypt('password123');
        expect(result).toBe('password123');
        expect(consoleSpy).toHaveBeenCalledWith('⚠️  Encryption not available. Password will be stored insecurely.');
        
        consoleSpy.mockRestore();
      });
    });

    describe('decrypt method', () => {
      it('should return empty string for empty input', async () => {
        const result = await encryption.decrypt('');
        expect(result).toBe('');
      });

      it('should return empty string for null input', async () => {
        const result = await encryption.decrypt(null as any);
        expect(result).toBe('');
      });

      it('should return empty string for undefined input', async () => {
        const result = await encryption.decrypt(undefined as any);
        expect(result).toBe('');
      });

      it('should return plaintext for unencrypted passwords', async () => {
        const result = await encryption.decrypt('plain-password');
        expect(result).toBe('plain-password');
      });

      it('should return plaintext for passwords without electron: prefix', async () => {
        const result = await encryption.decrypt('some-encrypted-data-but-not-electron');
        expect(result).toBe('some-encrypted-data-but-not-electron');
      });

      it('should decrypt Electron-encrypted passwords', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            decrypt: vi.fn().mockResolvedValue('password123'),
          },
        };
        
        const result = await encryption.decrypt('electron:encrypted-data');
        expect(result).toBe('password123');
        expect(global.window.electron?.crypto?.decrypt).toHaveBeenCalledWith('encrypted-data');
      });

      it('should handle decryption errors gracefully', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            decrypt: vi.fn().mockRejectedValue(new Error('Decryption failed')),
          },
        };
        
        await expect(encryption.decrypt('electron:encrypted-data')).rejects.toThrow('Failed to decrypt password');
      });

      it('should throw error when trying to decrypt without crypto', async () => {
        global.window.electron = undefined;
        
        await expect(encryption.decrypt('electron:encrypted-data')).rejects.toThrow('Cannot decrypt: Encryption not available');
      });

      it('should throw error when trying to decrypt with unavailable crypto', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(false),
            decrypt: vi.fn(),
          },
        };
        
        await expect(encryption.decrypt('electron:encrypted-data')).rejects.toThrow('Cannot decrypt: Encryption not available');
      });

      it('should handle partial electron: prefix', async () => {
        const result = await encryption.decrypt('electron:');
        expect(result).toBe('');
      });

      it('should handle malformed electron: prefixed strings', async () => {
        const result = await encryption.decrypt('electron:');
        expect(result).toBe('');
      });

      it('should handle very long encrypted data', async () => {
        const longEncryptedData = 'electron:' + 'a'.repeat(10000);
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            decrypt: vi.fn().mockResolvedValue('long-password'),
          },
        };
        
        const result = await encryption.decrypt(longEncryptedData);
        expect(result).toBe('long-password');
      });

      it('should handle Unicode in encrypted data', async () => {
        const unicodeEncrypted = 'electron:' + encodeURIComponent('🔐encrypted🔑');
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            decrypt: vi.fn().mockResolvedValue('🔑password🔐'),
          },
        };
        
        const result = await encryption.decrypt(unicodeEncrypted);
        expect(result).toBe('🔑password🔐');
      });
    });

    describe('isEncrypted method', () => {
      it('should return true for Electron-encrypted passwords', () => {
        expect(encryption.isEncrypted('electron:encrypted-data')).toBe(true);
        expect(encryption.isEncrypted('electron:abc123')).toBe(true);
        expect(encryption.isEncrypted('electron:')).toBe(true);
      });

      it('should return false for plain passwords', () => {
        expect(encryption.isEncrypted('plain-password')).toBe(false);
        expect(encryption.isEncrypted('password123')).toBe(false);
        expect(encryption.isEncrypted('some-encrypted-data')).toBe(false);
      });

      it('should return false for empty strings', () => {
        expect(encryption.isEncrypted('')).toBe(false);
      });

      it('should return false for null/undefined', () => {
        expect(encryption.isEncrypted(null as any)).toBe(false);
        expect(encryption.isEncrypted(undefined as any)).toBe(false);
      });

      it('should return false for strings with similar prefixes', () => {
        expect(encryption.isEncrypted('electron-encrypted-data')).toBe(false);
        expect(encryption.isEncrypted('electronically:data')).toBe(false);
        expect(encryption.isEncrypted('not-electron:data')).toBe(false);
      });

      it('should handle case sensitivity', () => {
        expect(encryption.isEncrypted('ELECTRON:data')).toBe(false);
        expect(encryption.isEncrypted('Electron:data')).toBe(false);
      });

      it('should handle strings with electron: in the middle', () => {
        expect(encryption.isEncrypted('prefix-electron:data')).toBe(false);
        expect(encryption.isEncrypted('data-electron:suffix')).toBe(false);
      });
    });

    describe('integration scenarios', () => {
      it('should handle complete encrypt/decrypt cycle', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockImplementation((text) => `encrypted-${text}`),
            decrypt: vi.fn().mockImplementation((encryptedText) => encryptedText.replace('encrypted-', '')),
          },
        };
        (encryption as any).encryptionAvailable = null;
        
        const original = 'my-secret-password';
        const encrypted = await encryption.encrypt(original);
        const decrypted = await encryption.decrypt(encrypted);
        
        expect(encrypted).toBe('electron:encrypted-my-secret-password');
        expect(decrypted).toBe('my-secret-password');
        expect(global.window.electron?.crypto?.encrypt).toHaveBeenCalledWith(original);
        expect(global.window.electron?.crypto?.decrypt).toHaveBeenCalledWith('encrypted-my-secret-password');
      });

      it('should handle multiple encryption/decryption operations', async () => {
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockImplementation((text) => `encrypted-${text}`),
            decrypt: vi.fn().mockImplementation((encryptedText) => encryptedText.replace('encrypted-', '')),
          },
        };
        (encryption as any).encryptionAvailable = null;
        
        const passwords = ['password1', 'password2', 'password3'];
        const results = [];
        
        for (const pwd of passwords) {
          const encrypted = await encryption.encrypt(pwd);
          const decrypted = await encryption.decrypt(encrypted);
          results.push({ original: pwd, encrypted, decrypted });
        }
        
        expect(results).toHaveLength(3);
        expect(results[0].decrypted).toBe('password1');
        expect(results[1].decrypted).toBe('password2');
        expect(results[2].decrypted).toBe('password3');
      });

      it('should handle switching between encrypted and non-encrypted modes', async () => {
        // First encrypt with Electron available
        global.window.electron = {
          crypto: {
            isAvailable: vi.fn().mockResolvedValue(true),
            encrypt: vi.fn().mockImplementation((text) => `encrypted-${text}`),
            decrypt: vi.fn().mockImplementation((encryptedText) => encryptedText.replace('encrypted-', '')),
          },
        };
        (encryption as any).encryptionAvailable = null;
        
        const encrypted = await encryption.encrypt('password');
        expect(encrypted).toBe('electron:encrypted-password');
        
        // Then try to decrypt when Electron is not available
        global.window.electron = undefined;
        (encryption as any).encryptionAvailable = null;
        
        await expect(encryption.decrypt(encrypted)).rejects.toThrow('Cannot decrypt: Encryption not available');
      });
    });
  });
});