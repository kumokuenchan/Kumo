import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-api-requests.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

interface APIRequestLog {
  timestamp: string;
  userQuery: string;
  schemaPreview: string;
  schemaLength: number;
  model: string;
}

interface APIResponseLog {
  timestamp: string;
  model: string;
  generatedSQL: string;
  success: boolean;
  error?: string;
}

/**
 * Log API request details to file
 */
export function logAPIRequest(params: {
  userQuery: string;
  schema: string;
  model: 'qwen' | 'claude' | 'fallback';
}) {
  const timestamp = new Date().toISOString();

  // Create preview of schema (first 500 chars)
  const schemaPreview = params.schema.length > 500
    ? params.schema.substring(0, 500) + '...'
    : params.schema;

  const logEntry: APIRequestLog = {
    timestamp,
    userQuery: params.userQuery,
    schemaPreview,
    schemaLength: params.schema.length,
    model: params.model,
  };

  const logText = `
${'='.repeat(80)}
REQUEST @ ${timestamp}
${'='.repeat(80)}
Model: ${params.model}
User Query: ${params.userQuery}
Schema Length: ${params.schema.length} characters

Schema Preview:
${schemaPreview}

Full Schema:
${params.schema}
${'-'.repeat(80)}

`;

  appendLog(logText);
  console.log(`📝 Logged API request to: ${LOG_FILE}`);
}

/**
 * Log API response details to file
 */
export function logAPIResponse(params: {
  model: string;
  generatedSQL: string;
  success: boolean;
  error?: string;
}) {
  const timestamp = new Date().toISOString();

  const logEntry: APIResponseLog = {
    timestamp,
    model: params.model,
    generatedSQL: params.generatedSQL,
    success: params.success,
    error: params.error,
  };

  const logText = `
RESPONSE @ ${timestamp}
Model Used: ${params.model}
Success: ${params.success ? 'YES' : 'NO'}
${params.error ? `Error: ${params.error}\n` : ''}
Generated SQL:
${params.generatedSQL}

${'='.repeat(80)}

`;

  appendLog(logText);
  console.log(`📝 Logged API response to: ${LOG_FILE}`);
}

/**
 * Append text to log file
 */
function appendLog(text: string) {
  try {
    fs.appendFileSync(LOG_FILE, text, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Get the log file path (for user reference)
 */
export function getLogFilePath(): string {
  return LOG_FILE;
}

/**
 * Clear old logs (optional - can be called periodically)
 */
export function clearOldLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
    console.log('✅ Cleared old API logs');
  }
}
