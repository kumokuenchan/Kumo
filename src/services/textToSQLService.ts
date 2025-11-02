/**
 * Service for managing text-to-SQL model inference
 * Uses Web Worker to avoid blocking main thread
 */

type ModelStatus = 'not-loaded' | 'loading' | 'loaded' | 'error';

interface GenerateOptions {
  userQuery: string;
  schemaContext: string;
  onProgress?: (progress: number) => void;
}

class TextToSQLService {
  private worker: Worker | null = null;
  private status: ModelStatus = 'not-loaded';
  private initPromise: Promise<void> | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private statusCallbacks = new Set<(status: ModelStatus, progress?: number) => void>();

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initWorker() {
    try {
      // Create worker from the worker file
      this.worker = new Worker(
        new URL('../workers/textToSQLWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.updateStatus('error');
      };
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.updateStatus('error');
    }
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(message: any) {
    switch (message.type) {
      case 'status-response':
        this.updateStatus(message.status, message.progress);
        break;

      case 'generate-response': {
        const { sql, error } = message;
        const request = this.pendingRequests.get(message.id || 0);

        if (request) {
          if (error) {
            request.reject(new Error(error));
          } else {
            request.resolve(sql);
          }
          this.pendingRequests.delete(message.id || 0);
        }
        break;
      }

      case 'error': {
        console.error('Worker error:', message.message);
        const request = this.pendingRequests.get(message.id || 0);
        if (request) {
          request.reject(new Error(message.message));
          this.pendingRequests.delete(message.id || 0);
        }
        break;
      }
    }
  }

  /**
   * Update model status and notify listeners
   */
  private updateStatus(status: ModelStatus, progress?: number) {
    this.status = status;
    this.statusCallbacks.forEach(callback => callback(status, progress));
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: (status: ModelStatus, progress?: number) => void) {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);

    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Get current model status
   */
  getStatus(): ModelStatus {
    return this.status;
  }

  /**
   * Initialize the model (lazy loading)
   */
  async init(): Promise<void> {
    if (this.status === 'loaded') {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Model initialization timeout'));
      }, 120000); // 2 minute timeout

      const unsubscribe = this.onStatusChange((status) => {
        if (status === 'loaded') {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        } else if (status === 'error') {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error('Failed to load model'));
        }
      });

      this.worker.postMessage({ type: 'init' });
    });

    return this.initPromise;
  }

  /**
   * Generate SQL from natural language query
   */
  async generateSQL(options: GenerateOptions): Promise<string> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    // Ensure model is loaded
    if (this.status !== 'loaded') {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;

      // Set up request tracking
      this.pendingRequests.set(id, { resolve, reject });

      // Send message to worker
      this.worker!.postMessage({
        type: 'generate',
        id,
        userQuery: options.userQuery,
        schemaContext: options.schemaContext,
      });

      // Timeout after 10 seconds (reduced from 30 for better UX)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('SQL generation timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Unload the model and cleanup
   */
  cleanup() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.statusCallbacks.clear();
    this.status = 'not-loaded';
    this.initPromise = null;
  }
}

// Singleton instance
let instance: TextToSQLService | null = null;

export function getTextToSQLService(): TextToSQLService {
  if (!instance) {
    instance = new TextToSQLService();
  }
  return instance;
}

export function cleanupTextToSQLService() {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}

export type { ModelStatus, GenerateOptions };
