import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { logAPIRequest, logAPIResponse, getLogFilePath } from '../utils/apiLogger';

const router = express.Router();

type AIModel = 'qwen' | 'claude' | 'fallback';

// Get configured AI model (default: qwen)
const getConfiguredModel = (): AIModel => {
  const model = (process.env.AI_MODEL || 'qwen').toLowerCase();
  if (model === 'claude' || model === 'qwen' || model === 'fallback') {
    return model as AIModel;
  }
  return 'qwen'; // Default to Qwen 2.5
};

// Initialize Anthropic client (only if API key is set)
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    return new Anthropic({ apiKey });
  } catch (error) {
    console.error('Failed to initialize Anthropic client:', error);
    return null;
  }
};

/**
 * Generate SQL using Qwen 2.5 via OpenRouter
 */
async function generateSQLWithQwen(userQuery: string, schema: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('Qwen API key not configured');
  }

  const prompt = `You are a SQL expert. Generate a MySQL query based on the user's question and database schema.

DATABASE SCHEMA:
${schema}

RULES:
1. Generate ONLY the SQL query, no explanations
2. Use proper MySQL syntax
3. Always add LIMIT clause for SELECT queries (default 100)
4. Use backticks for table/column names if they contain special characters
5. For "has" or "contains", use LIKE '%value%'
6. For date queries, use appropriate MySQL date functions
7. Return the SQL query as plain text without markdown formatting

USER QUESTION:
${userQuery}

Generate the MySQL query:`;

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'MySQL Database Tool',
    },
    body: JSON.stringify({
      model: 'qwen/qwen-2.5-72b-instruct', // Qwen 2.5 72B via OpenRouter
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0,
      max_tokens: 1024,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  let sql = data.choices?.[0]?.message?.content || '';

  // Clean up the response
  sql = sql.trim();
  sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '');
  sql = sql.replace(/^SQL:\s*/i, '');

  if (!sql || sql.length < 5) {
    throw new Error('Generated SQL is too short or empty');
  }

  return sql;
}

/**
 * Generate SQL using Claude API
 */
async function generateSQLWithClaude(userQuery: string, schema: string): Promise<string> {
  const anthropic = getAnthropicClient();

  if (!anthropic) {
    throw new Error('Claude API not configured');
  }

  const prompt = `You are a SQL expert. Generate a MySQL query based on the user's question and database schema.

DATABASE SCHEMA:
${schema}

RULES:
1. Generate ONLY the SQL query, no explanations
2. Use proper MySQL syntax
3. Always add LIMIT clause for SELECT queries (default 100)
4. Use backticks for table/column names if they contain special characters
5. For "has" or "contains", use LIKE '%value%'
6. For date queries, use appropriate MySQL date functions
7. Return the SQL query as plain text without markdown formatting

USER QUESTION:
${userQuery}

Generate the MySQL query:`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    temperature: 0,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  let sql = message.content[0].type === 'text' ? message.content[0].text : '';

  // Clean up the response
  sql = sql.trim();
  sql = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '');
  sql = sql.replace(/^SQL:\s*/i, '');

  if (!sql || sql.length < 5) {
    throw new Error('Generated SQL is too short or empty');
  }

  return sql;
}

/**
 * Generate SQL from natural language using configured AI model
 * POST /api/ai/text-to-sql
 */
router.post('/text-to-sql', async (req, res) => {
  try {
    const { query, schema } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }

    const configuredModel = getConfiguredModel();

    // Log the incoming request
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Logging API request to file: ${getLogFilePath()}`);
    logAPIRequest({
      userQuery: query,
      schema: schema,
      model: configuredModel,
    });
    console.log(`${'='.repeat(60)}\n`);

    let sql: string;
    let modelUsed: string;

    // Generate SQL using configured model
    try {
      switch (configuredModel) {
        case 'qwen':
          sql = await generateSQLWithQwen(query, schema);
          modelUsed = 'qwen-2.5-72b';
          break;

        case 'claude':
          sql = await generateSQLWithClaude(query, schema);
          modelUsed = 'claude-3.5-sonnet';
          break;

        case 'fallback':
          return res.status(503).json({
            error: 'AI model configured as fallback',
            details: 'Please use smart fallback mode in frontend'
          });

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }
    } catch (modelError: any) {
      // If primary model fails, try fallback to other model
      console.warn(`${configuredModel} failed, trying fallback:`, modelError.message);

      if (configuredModel === 'qwen') {
        // Try Claude as fallback
        try {
          sql = await generateSQLWithClaude(query, schema);
          modelUsed = 'claude-3.5-sonnet (fallback)';
        } catch {
          throw modelError; // Throw original error if fallback also fails
        }
      } else if (configuredModel === 'claude') {
        // Try Qwen as fallback
        try {
          sql = await generateSQLWithQwen(query, schema);
          modelUsed = 'qwen-2.5-72b (fallback)';
        } catch {
          throw modelError; // Throw original error if fallback also fails
        }
      } else {
        throw modelError;
      }
    }

    // Log the successful response
    logAPIResponse({
      model: modelUsed,
      generatedSQL: sql,
      success: true,
    });

    res.json({
      sql,
      model: modelUsed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Text-to-SQL error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Log the error
    logAPIResponse({
      model: 'error',
      generatedSQL: '',
      success: false,
      error: errorMessage,
    });

    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return res.status(500).json({
          error: 'Claude API is not configured. Please set ANTHROPIC_API_KEY environment variable.',
          details: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to generate SQL',
        details: error.message
      });
    }

    res.status(500).json({ error: 'Unknown error occurred' });
  }
});

/**
 * Check AI model configuration and status
 * GET /api/ai/status
 */
router.get('/status', (req, res) => {
  const configuredModel = getConfiguredModel();
  const hasQwenKey = !!(process.env.OPENROUTER_API_KEY || process.env.QWEN_API_KEY);
  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;

  let available = false;
  let message = '';

  switch (configuredModel) {
    case 'qwen':
      available = hasQwenKey;
      message = available
        ? 'Qwen 2.5 is configured and ready (default)'
        : 'Qwen API key not set. Set OPENROUTER_API_KEY or QWEN_API_KEY environment variable.';
      break;

    case 'claude':
      available = hasClaudeKey;
      message = available
        ? 'Claude API is configured and ready'
        : 'Claude API key not set. Set ANTHROPIC_API_KEY environment variable.';
      break;

    case 'fallback':
      available = false;
      message = 'AI model set to fallback mode. Using smart pattern matching only.';
      break;
  }

  res.json({
    available,
    message,
    configuredModel,
    models: {
      qwen: {
        available: hasQwenKey,
        name: 'Qwen 2.5 72B',
        provider: 'OpenRouter / Alibaba Cloud'
      },
      claude: {
        available: hasClaudeKey,
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic'
      }
    }
  });
});

export default router;
