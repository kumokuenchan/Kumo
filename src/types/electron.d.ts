export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // File system operations
  selectFile: (options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: string[];
  }) => Promise<string | null>;
  saveFile: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    content?: string;
  }) => Promise<string | null>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;

  // Credential storage
  storeCredentials: (connectionId: string, credentials: Record<string, string>) => Promise<void>;
  getCredentials: (connectionId: string) => Promise<Record<string, string> | null>;
  deleteCredentials: (connectionId: string) => Promise<void>;

  // Encryption
  crypto: {
    isAvailable: () => Promise<boolean>;
    encrypt: (text: string) => Promise<string>;
    decrypt: (encryptedText: string) => Promise<string>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
    isElectron?: boolean;
  }
}

export {};
