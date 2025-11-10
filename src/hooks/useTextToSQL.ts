import { useState, useEffect, useCallback } from 'react';
import { getTextToSQLService, type ModelStatus } from '../services/textToSQLService';
import { extractSchemaContext, formatSchemaForPrompt, identifyRelevantTableNames } from '../utils/schemaContext';
import { aiApi } from '../api/ai';
import { schemaApi } from '../api/schema';

interface UseTextToSQLOptions {
  connectionId: string | null;
  currentDatabase: string | null;
  autoInit?: boolean;
}

interface UseTextToSQLReturn {
  generateSQL: (userQuery: string) => Promise<string>;
  status: ModelStatus;
  progress: number;
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
}

export function useTextToSQL({
  connectionId,
  currentDatabase,
  autoInit = false,
}: UseTextToSQLOptions): UseTextToSQLReturn {
  const [status, setStatus] = useState<ModelStatus>('not-loaded');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiApiAvailable, setAiApiAvailable] = useState<boolean>(false);
  const [aiModel, setAiModel] = useState<string>('');

  const service = getTextToSQLService();

  // Check if AI API is available on mount
  useEffect(() => {
    aiApi.getStatus()
      .then(response => {
        setAiApiAvailable(response.available);
        setAiModel(response.configuredModel || 'fallback');
      })
      .catch(err => {
        setAiApiAvailable(false);
      });
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = service.onStatusChange((newStatus, newProgress) => {
      setStatus(newStatus);
      if (newProgress !== undefined) {
        setProgress(newProgress);
      }
      if (newStatus === 'error') {
        setError('Failed to load AI model');
      } else {
        setError(null);
      }
    });

    return unsubscribe;
  }, [service]);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInit && status === 'not-loaded') {
      service.init().catch(err => {
        console.error('Failed to auto-init model:', err);
      });
    }
  }, [autoInit, status, service]);

  const init = useCallback(async () => {
    try {
      setError(null);
      await service.init();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize model';
      setError(message);
      throw err;
    }
  }, [service]);

  const generateSQL = useCallback(async (userQuery: string): Promise<string> => {
    if (!connectionId || !currentDatabase) {
      throw new Error('No database connection');
    }

    try {
      setError(null);

      // OPTIMIZATION: Get all table names first (lightweight)
      const allTables = await schemaApi.getTables(connectionId, currentDatabase);
      const allTableNames = allTables.map(t => t.name);

      // Identify relevant tables from user query
      const relevantTableNames = identifyRelevantTableNames(userQuery, allTableNames, 10);

      // Extract schema context ONLY for relevant tables
      const schema = await extractSchemaContext(connectionId, currentDatabase, relevantTableNames);

      if (!schema) {
        throw new Error('Failed to extract database schema');
      }

      // Format schema for model
      const schemaContext = formatSchemaForPrompt(schema);

      // Prefer AI API if available (Qwen or Claude - much more accurate)
      if (aiApiAvailable) {
        try {
          const response = await aiApi.textToSQL({
            query: userQuery,
            schema: schemaContext,
          });

          return response.sql;
        } catch (apiErr) {
          // Fall through to local model
        }
      }

      // Fallback to local browser model
      const sql = await service.generateSQL({
        userQuery,
        schemaContext,
      });

      return sql;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate SQL';
      setError(message);
      throw err;
    }
  }, [connectionId, currentDatabase, service, aiApiAvailable]);

  return {
    generateSQL,
    status,
    progress,
    isLoading: status === 'loading',
    error,
    init,
  };
}
