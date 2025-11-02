import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js to use local models
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Types for worker messages
interface GenerateRequest {
  type: 'generate';
  userQuery: string;
  schemaContext: string;
}

interface InitRequest {
  type: 'init';
}

interface StatusRequest {
  type: 'status';
}

type WorkerRequest = GenerateRequest | InitRequest | StatusRequest;

interface GenerateResponse {
  type: 'generate-response';
  sql: string;
  error?: string;
}

interface StatusResponse {
  type: 'status-response';
  status: 'not-loaded' | 'loading' | 'loaded' | 'error';
  progress?: number;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

type WorkerResponse = GenerateResponse | StatusResponse | ErrorResponse;

// Global model instance
let generator: any = null;
let modelStatus: 'not-loaded' | 'loading' | 'loaded' | 'error' = 'not-loaded';

/**
 * Initialize the text-to-SQL model
 * Using a small model that can run in browser
 */
async function initModel() {
  if (generator) return generator;

  try {
    modelStatus = 'loading';
    postMessage({ type: 'status-response', status: 'loading' } as StatusResponse);

    // Use a small text generation model
    // Options:
    // 1. 'Xenova/LaMini-Flan-T5-783M' - Small instruction-following model
    // 2. 'Xenova/flan-t5-small' - Very small, fast
    // 3. Custom fine-tuned model (future)

    // For now, we'll use a small T5 model
    // In production, you'd want to use a model specifically fine-tuned for text-to-SQL
    generator = await pipeline(
      'text2text-generation',
      'Xenova/flan-t5-small',
      {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            const percent = progress.progress || 0;
            postMessage({
              type: 'status-response',
              status: 'loading',
              progress: percent,
            } as StatusResponse);
          }
        },
      }
    );

    modelStatus = 'loaded';
    postMessage({ type: 'status-response', status: 'loaded' } as StatusResponse);

    return generator;
  } catch (error) {
    modelStatus = 'error';
    const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
    postMessage({
      type: 'error',
      message: errorMessage,
    } as ErrorResponse);
    throw error;
  }
}

/**
 * Generate SQL from natural language query
 */
async function generateSQL(userQuery: string, schemaContext: string): Promise<string> {
  try {
    if (!generator) {
      await initModel();
    }

    // Construct prompt for text-to-SQL generation
    const prompt = buildPrompt(userQuery, schemaContext);

    // Generate SQL using the model
    const result = await generator(prompt, {
      max_length: 200,
      temperature: 0.3,
      do_sample: false,
      num_beams: 4,
    });

    const generatedText = result[0].generated_text;

    // Post-process the generated SQL
    const sql = cleanGeneratedSQL(generatedText);

    return sql;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL';
    throw new Error(errorMessage);
  }
}

/**
 * Build prompt for the model
 */
function buildPrompt(userQuery: string, schemaContext: string): string {
  // Improved prompt template with examples for better results
  return `You are a SQL expert. Given a database schema, generate a MySQL query.

Database Schema:
${schemaContext}

Instructions:
- Generate ONLY the SQL query, no explanations
- Use proper MySQL syntax
- Use backticks for table/column names if needed
- Add LIMIT clause for safety (default 100)

Examples:
Question: show me all users
SQL: SELECT * FROM users LIMIT 100;

Question: count total orders
SQL: SELECT COUNT(*) as total FROM orders;

Question: find products where category is Electronics
SQL: SELECT * FROM products WHERE category = 'Electronics' LIMIT 100;

Now generate SQL for this question:
Question: ${userQuery}
SQL:`;
}

/**
 * Clean and validate generated SQL
 */
function cleanGeneratedSQL(generatedText: string): string {
  let sql = generatedText.trim();

  // Remove common prefixes/suffixes the model might add
  sql = sql.replace(/^SQL:\s*/i, '');
  sql = sql.replace(/^Query:\s*/i, '');
  sql = sql.replace(/;+$/, ';'); // Normalize semicolons

  // Basic validation
  if (!sql.toLowerCase().includes('select') &&
      !sql.toLowerCase().includes('insert') &&
      !sql.toLowerCase().includes('update') &&
      !sql.toLowerCase().includes('delete')) {
    throw new Error('Generated text does not appear to be valid SQL');
  }

  return sql;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data;

  try {
    switch (type) {
      case 'init':
        await initModel();
        break;

      case 'status':
        postMessage({
          type: 'status-response',
          status: modelStatus,
        } as StatusResponse);
        break;

      case 'generate': {
        const { userQuery, schemaContext } = event.data as GenerateRequest;
        const sql = await generateSQL(userQuery, schemaContext);
        postMessage({
          type: 'generate-response',
          sql,
        } as GenerateResponse);
        break;
      }

      default:
        postMessage({
          type: 'error',
          message: `Unknown message type: ${type}`,
        } as ErrorResponse);
    }
  } catch (error) {
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ErrorResponse);
  }
};

// Export types for use in main thread
export type { WorkerRequest, WorkerResponse };
