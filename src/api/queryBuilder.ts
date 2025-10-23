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
    return await api.post<GenerateSQLResponse>(
      '/query-builder/generate',
      ast
    );
  },

  /**
   * Validate query builder AST without generating SQL
   */
  validate: async (ast: QueryBuilderAST): Promise<ValidateQueryResponse> => {
    return await api.post<ValidateQueryResponse>(
      '/query-builder/validate',
      ast
    );
  },

  /**
   * Generate SQL and return preview with validation
   */
  preview: async (ast: QueryBuilderAST): Promise<PreviewQueryResponse> => {
    return await api.post<PreviewQueryResponse>(
      '/query-builder/preview',
      ast
    );
  },
};
