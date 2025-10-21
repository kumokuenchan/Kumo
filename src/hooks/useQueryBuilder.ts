import { useMutation } from '@tanstack/react-query';
import { queryBuilderApi } from '../api/queryBuilder';
import type {
  QueryBuilderAST,
  GenerateSQLResponse,
  ValidateQueryResponse,
  PreviewQueryResponse,
} from '../types/queryBuilder';

/**
 * Hook to generate SQL from query builder AST
 */
export function useGenerateSQL() {
  return useMutation<GenerateSQLResponse, Error, QueryBuilderAST>({
    mutationFn: (ast: QueryBuilderAST) => queryBuilderApi.generateSQL(ast),
  });
}

/**
 * Hook to validate query builder AST
 */
export function useValidateQuery() {
  return useMutation<ValidateQueryResponse, Error, QueryBuilderAST>({
    mutationFn: (ast: QueryBuilderAST) => queryBuilderApi.validate(ast),
  });
}

/**
 * Hook to preview query (generate SQL with validation)
 */
export function usePreviewQuery() {
  return useMutation<PreviewQueryResponse, Error, QueryBuilderAST>({
    mutationFn: (ast: QueryBuilderAST) => queryBuilderApi.preview(ast),
  });
}
