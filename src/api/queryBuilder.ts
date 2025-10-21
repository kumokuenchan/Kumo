import api from './index';
import type {
  QueryBuilderAST,
  GenerateSQLResponse,
  ValidateQueryResponse,
  PreviewQueryResponse,
} from '../types/queryBuilder';

/**
 * Query Builder API Client
 */
export const queryBuilderApi = {
  /**
   * Generate SQL from query builder AST
   */
  generateSQL: async (ast: QueryBuilderAST): Promise<GenerateSQLResponse> => {
    const response = await api.post<GenerateSQLResponse>(
      '/query-builder/generate',
      ast
    );
    return response.data;
  },

  /**
   * Validate query builder AST without generating SQL
   */
  validate: async (ast: QueryBuilderAST): Promise<ValidateQueryResponse> => {
    const response = await api.post<ValidateQueryResponse>(
      '/query-builder/validate',
      ast
    );
    return response.data;
  },

  /**
   * Generate SQL and return preview with validation
   */
  preview: async (ast: QueryBuilderAST): Promise<PreviewQueryResponse> => {
    const response = await api.post<PreviewQueryResponse>(
      '/query-builder/preview',
      ast
    );
    return response.data;
  },
};
