import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { logAPIRequest, logAPIResponse, getLogFilePath } from '../utils/apiLogger.js';
import { connectionPoolManager } from '../services/ConnectionPoolManager.js';

const router = express.Router();

type AIModel = 'qwen' | 'qwen-local' | 'minimax' | 'claude' | 'fallback';

// Get configured AI model (default: qwen)
const getConfiguredModel = (): AIModel => {
  const model = (process.env.AI_MODEL || 'qwen').toLowerCase();
  if (model === 'claude' || model === 'qwen' || model === 'qwen-local' || model === 'minimax' || model === 'fallback') {
    return model as AIModel;
  }
  return 'qwen'; // Default to Qwen 2.5 via OpenRouter
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
 * Generate SQL using MiniMax M2 via OpenRouter (FREE!)
 */
async function generateSQLWithMiniMax(userQuery: string, schema: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiUrl = 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
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
      model: 'minimax/minimax-m2:free', // MiniMax M2 Free via OpenRouter
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
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
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
 * Generate SQL using local Qwen via Python/Transformers
 */
async function generateSQLWithPython(userQuery: string, schema: string): Promise<string> {
  const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';

  const response = await fetch(`${pythonServerUrl}/generate-sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: userQuery,
      schema: schema,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python server error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  let sql = data.sql || '';

  // Clean up the response (Python server should already clean it, but just in case)
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

        case 'qwen-local':
          sql = await generateSQLWithPython(query, schema);
          modelUsed = 'qwen-2.5-local';
          break;

        case 'minimax':
          sql = await generateSQLWithMiniMax(query, schema);
          modelUsed = 'minimax-m2';
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

    case 'qwen-local':
      // For local mode, we assume it's available if configured
      // The actual check happens when making the request
      available = true;
      message = 'Qwen 2.5 Local (Python/Transformers) - Make sure Python server is running on port 5000';
      break;

    case 'minimax':
      available = hasQwenKey; // Uses same OpenRouter key as Qwen
      message = available
        ? 'MiniMax M2 is configured and ready (FREE via OpenRouter)'
        : 'OpenRouter API key not set. Set OPENROUTER_API_KEY environment variable.';
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

/**
 * Explain SQL query in plain English
 * POST /api/ai/explain-sql
 */
router.post('/explain-sql', async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use SQL explanation feature'
      });
    }

    const prompt = `You are a SQL expert. Explain the following MySQL query in plain English.

Provide a clear, concise explanation that a non-technical person can understand.

SQL QUERY:
${sql}

Explain what this query does:`;

    let explanation: string;

    // Use the same model selection logic as text-to-sql
    try {
      switch (configuredModel) {
        case 'qwen':
          const qwenResponse = await generateAIResponse(prompt, 'qwen');
          explanation = qwenResponse;
          break;

        case 'qwen-local':
          const localResponse = await generateAIResponse(prompt, 'qwen-local');
          explanation = localResponse;
          break;

        case 'minimax':
          const minimaxResponse = await generateAIResponse(prompt, 'minimax');
          explanation = minimaxResponse;
          break;

        case 'claude':
          const claudeResponse = await generateAIResponse(prompt, 'claude');
          explanation = claudeResponse;
          break;

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }

      res.json({
        explanation,
        model: configuredModel,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('SQL explanation error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Explain SQL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to explain SQL';
    res.status(500).json({
      error: 'Failed to explain SQL',
      details: errorMessage
    });
  }
});

/**
 * Optimize SQL query and provide suggestions
 * POST /api/ai/optimize-sql
 */
router.post('/optimize-sql', async (req, res) => {
  try {
    const { sql, schema } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use SQL optimization feature'
      });
    }

    const schemaContext = schema ? `\n\nDATABASE SCHEMA:\n${schema}` : '';

    const prompt = `You are a MySQL performance expert. Analyze the following SQL query and provide optimization suggestions.

SQL QUERY:
${sql}${schemaContext}

Provide:
1. Performance analysis (potential bottlenecks)
2. Specific optimization suggestions
3. Optimized version of the query (if improvements are possible)

Format your response clearly with sections.`;

    let optimization: string;

    // Use the same model selection logic
    try {
      switch (configuredModel) {
        case 'qwen':
          optimization = await generateAIResponse(prompt, 'qwen');
          break;

        case 'qwen-local':
          optimization = await generateAIResponse(prompt, 'qwen-local');
          break;

        case 'minimax':
          optimization = await generateAIResponse(prompt, 'minimax');
          break;

        case 'claude':
          optimization = await generateAIResponse(prompt, 'claude');
          break;

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }

      res.json({
        optimization,
        model: configuredModel,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('SQL optimization error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Optimize SQL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to optimize SQL';
    res.status(500).json({
      error: 'Failed to optimize SQL',
      details: errorMessage
    });
  }
});

/**
 * Fix SQL query errors using AI
 * POST /api/ai/fix-sql
 */
router.post('/fix-sql', async (req, res) => {
  try {
    const { sql, error, schema } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    if (!error) {
      return res.status(400).json({ error: 'Error message is required' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use SQL fix feature'
      });
    }

    const schemaContext = schema ? `\n\nDATABASE SCHEMA:\n${schema}` : '';

    const prompt = `You are a MySQL expert. Fix this broken SQL query.

BROKEN QUERY:
${sql}

ERROR:
${error}${schemaContext}

Provide ONLY the corrected SQL query. Do not include explanations, markdown, or any other text. Just return the working SQL query.`;

    let response: string;

    try {
      switch (configuredModel) {
        case 'qwen':
          response = await generateAIResponse(prompt, 'qwen');
          break;

        case 'qwen-local':
          response = await generateAIResponse(prompt, 'qwen-local');
          break;

        case 'minimax':
          response = await generateAIResponse(prompt, 'minimax');
          break;

        case 'claude':
          response = await generateAIResponse(prompt, 'claude');
          break;

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }

      console.log('AI Fix SQL Response:', response);

      // Clean up the response - remove markdown, code blocks, etc.
      let fixedSql = response.trim();

      // Remove markdown code blocks
      fixedSql = fixedSql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();

      // If response contains "FIXED_SQL:" or similar labels, try to extract just the SQL
      const sqlMatch = fixedSql.match(/(?:FIXED[_\s]SQL|CORRECTED[_\s]QUERY|HERE[_\s]IS[_\s]THE[_\s]FIX):\s*(.+)/is);
      if (sqlMatch) {
        fixedSql = sqlMatch[1].trim();
      }

      // Remove any leading/trailing quotes
      fixedSql = fixedSql.replace(/^['"`]+|['"`]+$/g, '').trim();

      // Check if we actually got a different query
      if (fixedSql === sql || fixedSql.length < 5) {
        console.error('AI did not provide a valid fix. Original response:', response);
        return res.status(400).json({
          error: 'AI could not fix the query',
          details: 'The AI response did not contain a valid SQL fix. Try rephrasing your query or check the error manually.',
          rawResponse: response
        });
      }

      const explanation = `The AI has analyzed your error and provided a corrected query. The original error was: ${error}`;

      res.json({
        fixedSql,
        explanation,
        model: configuredModel,
        timestamp: new Date().toISOString(),
        rawResponse: response // Include raw response for debugging
      });

    } catch (error) {
      console.error('SQL fix error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Fix SQL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fix SQL';
    res.status(500).json({
      error: 'Failed to fix SQL',
      details: errorMessage
    });
  }
});

/**
 * Generate test data INSERT statements using AI
 * POST /api/ai/generate-test-data
 */
router.post('/generate-test-data', async (req, res) => {
  try {
    const { tableName, schema, rowCount = 10 } = req.body;

    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    if (!schema) {
      return res.status(400).json({ error: 'Schema is required' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use test data generation feature'
      });
    }

    const prompt = `You are a MySQL data generation expert. Generate realistic test data INSERT statements for a table.

TABLE NAME: ${tableName}

DATABASE SCHEMA:
${schema}

Generate ${rowCount} realistic INSERT statements for the table "${tableName}".

RULES:
1. Generate realistic sample data that makes sense for each column type
2. For VARCHAR/TEXT fields, generate meaningful sample values
3. For INT fields, use appropriate ranges
4. For DATE/DATETIME fields, use recent realistic dates
5. For ENUM fields, use values from the enum definition
6. Respect NOT NULL constraints
7. Don't include auto-increment ID fields in the INSERT statements
8. Return ONLY the INSERT statements, no explanations
9. Each INSERT on a separate line
10. Use proper MySQL syntax

Generate the INSERT statements:`;

    let insertStatements: string;

    try {
      switch (configuredModel) {
        case 'qwen':
          insertStatements = await generateAIResponse(prompt, 'qwen');
          break;

        case 'qwen-local':
          insertStatements = await generateAIResponse(prompt, 'qwen-local');
          break;

        case 'minimax':
          insertStatements = await generateAIResponse(prompt, 'minimax');
          break;

        case 'claude':
          insertStatements = await generateAIResponse(prompt, 'claude');
          break;

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }

      // Clean up the response
      insertStatements = insertStatements.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

      res.json({
        insertStatements,
        tableName,
        rowCount,
        model: configuredModel,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Test data generation error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Generate test data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate test data';
    res.status(500).json({
      error: 'Failed to generate test data',
      details: errorMessage
    });
  }
});

/**
 * Analyze query result data with AI
 * POST /api/ai/analyze-data
 */
router.post('/analyze-data', async (req, res) => {
  try {
    const { data, sql, rowCount } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Data is required for analysis' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use data analysis feature'
      });
    }

    // Convert data to a readable format for AI
    const dataPreview = data.slice(0, 100); // Limit to first 100 rows for API efficiency
    const columns = Object.keys(dataPreview[0] || {});

    // Create a summary of the data
    const dataSummary = `
Dataset: ${rowCount || data.length} total rows
Columns: ${columns.join(', ')}

Sample Data (first ${Math.min(10, dataPreview.length)} rows):
${dataPreview.slice(0, 10).map((row, i) =>
  `Row ${i + 1}: ${JSON.stringify(row)}`
).join('\n')}
`;

    const prompt = `You are a business intelligence analyst. Analyze this dataset and provide actionable insights.

${dataSummary}

${sql ? `Original SQL Query:\n${sql}\n` : ''}

Please provide:

1. **TREND ANALYSIS**
   - Identify any increasing or decreasing trends
   - Calculate growth rates if time-series data is present
   - Highlight patterns or seasonality

2. **TOP PERFORMERS**
   - Identify top 3-5 performers (highest values, best categories, etc.)
   - Identify bottom 3-5 performers (lowest values, worst categories, etc.)
   - Provide rankings and comparisons

3. **BUSINESS INSIGHTS**
   - What are the key takeaways from this data?
   - What actions should be taken based on these findings?
   - Are there any opportunities or risks revealed?
   - Any recommendations for business decisions?

Format your response with clear sections and bullet points. Be specific with numbers and percentages.`;

    let analysis: string;

    try {
      switch (configuredModel) {
        case 'qwen':
          analysis = await generateAIResponse(prompt, 'qwen');
          break;

        case 'qwen-local':
          analysis = await generateAIResponse(prompt, 'qwen-local');
          break;

        case 'minimax':
          analysis = await generateAIResponse(prompt, 'minimax');
          break;

        case 'claude':
          analysis = await generateAIResponse(prompt, 'claude');
          break;

        default:
          throw new Error(`Unknown model: ${configuredModel}`);
      }

      res.json({
        analysis,
        model: configuredModel,
        rowsAnalyzed: Math.min(100, data.length),
        totalRows: rowCount || data.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Data analysis error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Analyze data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze data';
    res.status(500).json({
      error: 'Failed to analyze data',
      details: errorMessage
    });
  }
});

/**
 * Analyze database schema and provide recommendations
 * POST /api/ai/analyze-schema
 */
router.post('/analyze-schema', async (req, res) => {
  try {
    const { connectionId, database, table } = req.body;

    if (!connectionId || !database) {
      return res.status(400).json({ error: 'Connection ID and database are required' });
    }

    const configuredModel = getConfiguredModel();

    if (configuredModel === 'fallback') {
      return res.status(503).json({
        error: 'AI model not configured',
        details: 'Please configure an AI model to use schema analysis feature'
      });
    }

    // Get database connection pool
    const pool = connectionPoolManager.getPool(connectionId);
    if (!pool) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get schema information (optionally filtered by table)
    const tableFilter = table ? 'AND TABLE_NAME = ?' : '';
    const queryParams = table ? [database, table] : [database];

    const [tables] = await pool.query(
      `SELECT TABLE_NAME, ENGINE, TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, INDEX_LENGTH, AUTO_INCREMENT
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? ${tableFilter}
       ORDER BY TABLE_NAME`,
      queryParams
    ) as any;

    // Get columns (optionally filtered by table)
    const [columns] = await pool.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? ${tableFilter}
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      queryParams
    ) as any;

    // Get indexes (optionally filtered by table)
    const [indexes] = await pool.query(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX, CARDINALITY
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? ${tableFilter}
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      queryParams
    ) as any;

    // Get foreign keys (optionally filtered by table)
    const [foreignKeys] = await pool.query(
      `SELECT
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? ${tableFilter} AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      queryParams
    ) as any;

    // Build schema summary
    const schemaSummary = {
      database,
      tableCount: tables.length,
      tables: tables.map((table: any) => ({
        name: table.TABLE_NAME,
        engine: table.ENGINE,
        rows: table.TABLE_ROWS,
        dataSize: table.DATA_LENGTH,
        indexSize: table.INDEX_LENGTH,
        autoIncrement: table.AUTO_INCREMENT
      })),
      columns: columns.map((col: any) => ({
        table: col.TABLE_NAME,
        name: col.COLUMN_NAME,
        type: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE,
        key: col.COLUMN_KEY,
        default: col.COLUMN_DEFAULT,
        extra: col.EXTRA,
        comment: col.COLUMN_COMMENT
      })),
      indexes: indexes.map((idx: any) => ({
        table: idx.TABLE_NAME,
        name: idx.INDEX_NAME,
        column: idx.COLUMN_NAME,
        unique: idx.NON_UNIQUE === 0,
        cardinality: idx.CARDINALITY
      })),
      foreignKeys: foreignKeys.map((fk: any) => ({
        name: fk.CONSTRAINT_NAME,
        table: fk.TABLE_NAME,
        column: fk.COLUMN_NAME,
        referencedTable: fk.REFERENCED_TABLE_NAME,
        referencedColumn: fk.REFERENCED_COLUMN_NAME
      }))
    };

    // Create detailed prompt for AI
    const isTableAnalysis = !!table;
    const promptSections = `

## 1. MISSING INDEXES
- Identify columns that are likely used in WHERE/JOIN clauses but lack indexes
- Suggest specific index creation statements
- Prioritize by potential performance impact

## 2. UNUSED/REDUNDANT INDEXES
- Identify indexes that may be redundant (covered by other indexes)
- Low cardinality indexes that may not be helpful
- Suggest which indexes to DROP

## 3. COLUMN TYPE OPTIMIZATIONS
- Columns using oversized types (e.g., BIGINT when INT would suffice)
- VARCHAR lengths that are too large or too small
- DATE vs DATETIME usage
- Suggest ALTER TABLE statements

## 4. NORMALIZATION OPPORTUNITIES
- Identify tables with repeated data that should be normalized
- Suggest new table structures
- Flag potential data redundancy issues

## 5. FOREIGN KEY RECOMMENDATIONS
- Missing foreign key constraints
- Relationships that should be enforced at database level
- Suggest ALTER TABLE ADD CONSTRAINT statements

## 6. TABLE DESIGN ISSUES
- Tables without primary keys
- Tables with very wide rows (too many columns)
- Tables with very few columns that might need more structure
- Engine recommendations (InnoDB vs MyISAM)

## 7. PERFORMANCE WARNINGS
- Tables with large data but small index sizes (potential for optimization)
- Auto-increment values approaching limits
- Tables with many NULL-able columns

Format each recommendation with:
- ⚠️ ISSUE: Clear description
- 💡 RECOMMENDATION: Specific action
- 🔧 SQL: Ready-to-use SQL statement (if applicable)
- 📊 IMPACT: Expected performance improvement

Be specific and actionable. Prioritize recommendations by impact.`;

    const prompt = isTableAnalysis
      ? `You are a MySQL database performance expert. Analyze this table and provide actionable recommendations.

TABLE: ${database}.${table}

TABLE DETAILS:
${JSON.stringify(schemaSummary, null, 2)}

Please provide a comprehensive analysis with the following sections:${promptSections}`
      : `You are a MySQL database performance expert. Analyze this schema and provide actionable recommendations.

DATABASE: ${database}
TOTAL TABLES: ${schemaSummary.tableCount}

SCHEMA DETAILS:
${JSON.stringify(schemaSummary, null, 2)}

Please provide a comprehensive analysis with the following sections:${promptSections}`;

    let analysis: string;

    try {
      analysis = await generateAIResponse(prompt, configuredModel);

      res.json({
        analysis,
        database,
        tableCount: schemaSummary.tableCount,
        model: configuredModel,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Schema analysis error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Analyze schema error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze schema';
    res.status(500).json({
      error: 'Failed to analyze schema',
      details: errorMessage
    });
  }
});

/**
 * Helper function to generate AI response
 */
async function generateAIResponse(prompt: string, model: AIModel): Promise<string> {
  switch (model) {
    case 'qwen':
      return await callOpenRouterAPI(prompt, 'qwen/qwen-2.5-72b-instruct');

    case 'minimax':
      return await callOpenRouterAPI(prompt, 'minimax/minimax-m2:free');

    case 'qwen-local':
      return await callPythonServer(prompt);

    case 'claude':
      return await callClaudeAPI(prompt);

    default:
      throw new Error(`Model ${model} not supported for AI responses`);
  }
}

/**
 * Call OpenRouter API with any model
 */
async function callOpenRouterAPI(prompt: string, modelName: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'MySQL Database Tool',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.3,
      max_tokens: 2048,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Python server for local Qwen
 */
async function callPythonServer(prompt: string): Promise<string> {
  const pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';

  const response = await fetch(`${pythonServerUrl}/generate-sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: prompt,
      schema: '' // Not needed for generic prompts
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Python server error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as any;
  return data.sql || '';
}

/**
 * Call Claude API
 */
async function callClaudeAPI(prompt: string): Promise<string> {
  const anthropic = getAnthropicClient();

  if (!anthropic) {
    throw new Error('Claude API not configured');
  }

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

export default router;
