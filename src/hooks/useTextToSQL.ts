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
    console.log('🔍 Checking AI model configuration...');

    aiApi.getStatus()
      .then(response => {
        console.log('📊 AI Status Response:', response);

        setAiApiAvailable(response.available);
        setAiModel(response.configuredModel || 'fallback');

        if (response.available) {
          const modelName = response.configuredModel === 'qwen' ? 'Qwen 2.5 72B' : 'Claude 3.5 Sonnet';
          console.log(`✅ AI Model Available: ${modelName}`);
          console.log('   Provider:', response.configuredModel === 'qwen' ? 'OpenRouter' : 'Anthropic');
          console.log('   Accuracy: ~90-95%');
        } else {
          console.log('ℹ️ No AI model configured');
          console.log('   Using: Smart fallback mode');
          console.log('   Accuracy: ~60-70%');
          console.log('   Message:', response.message);
        }
      })
      .catch(err => {
        console.error('❌ Failed to check AI status:', err);
        console.warn('⚠️ Defaulting to smart fallback mode');
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

      console.log('🚀 generateSQL called');
      console.log('   aiApiAvailable:', aiApiAvailable);
      console.log('   connectionId:', connectionId);
      console.log('   currentDatabase:', currentDatabase);

      // OPTIMIZATION: Get all table names first (lightweight)
      const allTables = await schemaApi.getTables(connectionId, currentDatabase);
      const allTableNames = allTables.map(t => t.name);

      console.log(`📊 Database has ${allTableNames.length} tables`);

      // Identify relevant tables from user query
      const relevantTableNames = identifyRelevantTableNames(userQuery, allTableNames, 10);

      console.log(`🎯 Identified ${relevantTableNames.length} relevant tables:`, relevantTableNames);
      console.log(`💰 Optimization: Sending ${relevantTableNames.length}/${allTableNames.length} tables (${Math.round(relevantTableNames.length / allTableNames.length * 100)}% of total)`);

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
          console.log('📤 Sending request to AI API...');
          console.log('Query:', userQuery);
          console.log('Schema context length:', schemaContext.length, 'characters');

          const response = await aiApi.textToSQL({
            query: userQuery,
            schema: schemaContext,
          });

          console.log('📥 AI API Response:');
          console.log('  Model used:', response.model);
          console.log('  SQL generated:', response.sql);
          console.log('  Timestamp:', response.timestamp);
          console.log('✅ Successfully generated SQL using', response.model);

          return response.sql;
        } catch (apiErr) {
          console.error('❌ AI API failed:', apiErr);
          console.warn('⚠️ Falling back to local model');
          // Fall through to local model
        }
      }

      // Fallback to local browser model
      console.log('🔄 Using smart fallback mode (no AI API available)');
      const sql = await service.generateSQL({
        userQuery,
        schemaContext,
      });
      console.log('📝 Fallback generated SQL:', sql);

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
