/**
 * LocalStorage Backup and Restore Utility
 * Provides functions to export and import localStorage state as JSON
 */

export interface BackupData {
  version: string;
  timestamp: number;
  data: Record<string, string>;
  metadata: {
    itemCount: number;
    totalSize: number;
    keys: string[];
  };
}

export interface BackupResult {
  success: boolean;
  message: string;
  data?: BackupData;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  itemsRestored: number;
  itemsSkipped: number;
  errors: string[];
}

/**
 * Export localStorage to a BackupData object
 */
export function exportLocalStorage(): BackupResult {
  try {
    const data: Record<string, string> = {};
    const keys: string[] = [];
    let totalSize = 0;

    // Iterate through all localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          data[key] = value;
          keys.push(key);
          totalSize += key.length + value.length;
        }
      }
    }

    const backupData: BackupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      data,
      metadata: {
        itemCount: keys.length,
        totalSize,
        keys
      }
    };

    return {
      success: true,
      message: `Successfully exported ${keys.length} items from localStorage`,
      data: backupData
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to export localStorage',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download localStorage backup as JSON file
 */
export function downloadBackup(): BackupResult {
  const result = exportLocalStorage();

  if (!result.success || !result.data) {
    return result;
  }

  try {
    const jsonString = JSON.stringify(result.data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `kumodb-backup-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      ...result,
      message: `Backup downloaded as ${filename}`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to download backup file',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Import and restore localStorage from BackupData
 */
export function importLocalStorage(
  backupData: BackupData,
  options: {
    overwrite?: boolean;
    skipKeys?: string[];
    onlyKeys?: string[];
  } = {}
): RestoreResult {
  const {
    overwrite = false,
    skipKeys = [],
    onlyKeys = []
  } = options;

  const result: RestoreResult = {
    success: true,
    message: '',
    itemsRestored: 0,
    itemsSkipped: 0,
    errors: []
  };

  try {
    // Validate backup data
    if (!backupData.data || typeof backupData.data !== 'object') {
      return {
        success: false,
        message: 'Invalid backup data format',
        itemsRestored: 0,
        itemsSkipped: 0,
        errors: ['Backup data is missing or invalid']
      };
    }

    // Process each item
    for (const [key, value] of Object.entries(backupData.data)) {
      // Skip if in skipKeys list
      if (skipKeys.includes(key)) {
        result.itemsSkipped++;
        continue;
      }

      // Skip if onlyKeys is specified and key is not in it
      if (onlyKeys.length > 0 && !onlyKeys.includes(key)) {
        result.itemsSkipped++;
        continue;
      }

      // Check if key already exists
      const existingValue = localStorage.getItem(key);
      if (existingValue !== null && !overwrite) {
        result.itemsSkipped++;
        continue;
      }

      // Restore the item
      try {
        localStorage.setItem(key, value);
        result.itemsRestored++;
      } catch (error) {
        result.errors.push(`Failed to restore key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    result.message = result.success
      ? `Successfully restored ${result.itemsRestored} items (${result.itemsSkipped} skipped)`
      : `Restored ${result.itemsRestored} items with ${result.errors.length} errors`;

    return result;
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import localStorage',
      itemsRestored: result.itemsRestored,
      itemsSkipped: result.itemsSkipped,
      errors: [...result.errors, error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Parse and restore from JSON file
 */
export async function importFromFile(file: File, options?: {
  overwrite?: boolean;
  skipKeys?: string[];
  onlyKeys?: string[];
}): Promise<RestoreResult> {
  try {
    const text = await file.text();
    const backupData: BackupData = JSON.parse(text);

    return importLocalStorage(backupData, options);
  } catch (error) {
    return {
      success: false,
      message: 'Failed to read or parse backup file',
      itemsRestored: 0,
      itemsSkipped: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Clear all localStorage items (with optional filter)
 */
export function clearLocalStorage(options: {
  skipKeys?: string[];
  onlyKeys?: string[];
} = {}): { success: boolean; message: string; itemsCleared: number } {
  const { skipKeys = [], onlyKeys = [] } = options;
  let itemsCleared = 0;

  try {
    const keysToRemove: string[] = [];

    // Collect keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Skip if in skipKeys list
        if (skipKeys.includes(key)) {
          continue;
        }

        // Skip if onlyKeys is specified and key is not in it
        if (onlyKeys.length > 0 && !onlyKeys.includes(key)) {
          continue;
        }

        keysToRemove.push(key);
      }
    }

    // Remove collected keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      itemsCleared++;
    });

    return {
      success: true,
      message: `Successfully cleared ${itemsCleared} items from localStorage`,
      itemsCleared
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to clear localStorage',
      itemsCleared
    };
  }
}

/**
 * Get localStorage statistics
 */
export function getLocalStorageStats(): {
  itemCount: number;
  totalSize: number;
  keys: string[];
  sizeByKey: Record<string, number>;
} {
  let totalSize = 0;
  const keys: string[] = [];
  const sizeByKey: Record<string, number> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        const size = key.length + value.length;
        keys.push(key);
        sizeByKey[key] = size;
        totalSize += size;
      }
    }
  }

  return {
    itemCount: keys.length,
    totalSize,
    keys,
    sizeByKey
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
