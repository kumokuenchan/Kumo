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

export const aiApi = {
  /**
   * Generate SQL from natural language using Claude API
   */
  textToSQL: async (request: TextToSQLRequest): Promise<TextToSQLResponse> => {
    const response = await api.post<TextToSQLResponse>('/ai/text-to-sql', request);
    return response;
  },

  /**
   * Check if Claude API is available
   */
  getStatus: async (): Promise<AIStatusResponse> => {
    const response = await api.get<AIStatusResponse>('/ai/status');
    return response;
  },
};
