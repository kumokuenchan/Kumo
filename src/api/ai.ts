import api from './index';

export interface TextToSQLRequest {
  query: string;
  schema: string;
}

export interface TextToSQLResponse {
  sql: string;
  model: string;
  timestamp: string;
}

export interface AIStatusResponse {
  available: boolean;
  message: string;
  configuredModel?: string;
  models?: {
    qwen?: {
      available: boolean;
      name: string;
      provider: string;
    };
    claude?: {
      available: boolean;
      name: string;
      provider: string;
    };
  };
}

export interface ExplainSQLRequest {
  sql: string;
}

export interface ExplainSQLResponse {
  explanation: string;
  model: string;
  timestamp: string;
}

export interface OptimizeSQLRequest {
  sql: string;
  schema?: string;
}

export interface OptimizeSQLResponse {
  optimization: string;
  model: string;
  timestamp: string;
}

export interface FixSQLRequest {
  sql: string;
  error: string;
  schema?: string;
}

export interface FixSQLResponse {
  fixedSql: string;
  explanation: string;
  model: string;
  timestamp: string;
  rawResponse?: string;
}

export interface GenerateTestDataRequest {
  tableName: string;
  schema: string;
  rowCount?: number;
}

export interface GenerateTestDataResponse {
  insertStatements: string;
  tableName: string;
  rowCount: number;
  model: string;
  timestamp: string;
}

export interface AnalyzeDataRequest {
  data: any[];
  sql?: string;
  rowCount?: number;
}

export interface AnalyzeDataResponse {
  analysis: string;
  model: string;
  rowsAnalyzed: number;
  totalRows: number;
  timestamp: string;
}

export const aiApi = {
  /**
   * Generate SQL from natural language using Claude API
   */
  textToSQL: async (request: TextToSQLRequest): Promise<TextToSQLResponse> => {
    const response = await api.post<TextToSQLResponse>('/ai/text-to-sql', request);
    return response;
  },

  /**
   * Explain SQL query in plain English
   */
  explainSQL: async (request: ExplainSQLRequest): Promise<ExplainSQLResponse> => {
    const response = await api.post<ExplainSQLResponse>('/ai/explain-sql', request);
    return response;
  },

  /**
   * Optimize SQL query and get suggestions
   */
  optimizeSQL: async (request: OptimizeSQLRequest): Promise<OptimizeSQLResponse> => {
    const response = await api.post<OptimizeSQLResponse>('/ai/optimize-sql', request);
    return response;
  },

  /**
   * Check if Claude API is available
   */
  getStatus: async (): Promise<AIStatusResponse> => {
    const response = await api.get<AIStatusResponse>('/ai/status');
    return response;
  },

  /**
   * Fix SQL query errors using AI
   */
  fixSQL: async (request: FixSQLRequest): Promise<FixSQLResponse> => {
    const response = await api.post<FixSQLResponse>('/ai/fix-sql', request);
    return response;
  },

  /**
   * Generate test data INSERT statements using AI
   */
  generateTestData: async (request: GenerateTestDataRequest): Promise<GenerateTestDataResponse> => {
    const response = await api.post<GenerateTestDataResponse>('/ai/generate-test-data', request);
    return response;
  },

  /**
   * Analyze query result data with AI for trends, insights, and recommendations
   */
  analyzeData: async (request: AnalyzeDataRequest): Promise<AnalyzeDataResponse> => {
    const response = await api.post<AnalyzeDataResponse>('/ai/analyze-data', request);
    return response;
  },
};
