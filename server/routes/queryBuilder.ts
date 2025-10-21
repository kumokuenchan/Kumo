import { Router } from 'express';
import { queryBuilderService } from '../services/QueryBuilderService.js';
import { QueryBuilderAST } from '../types/queryBuilder.js';

const router = Router();

/**
 * POST /api/query-builder/generate
 * Generate SQL from query builder AST
 */
router.post('/generate', async (req, res) => {
  try {
    const ast: QueryBuilderAST = req.body;

    if (!ast) {
      return res.status(400).json({ error: 'Query builder AST is required' });
    }

    const result = queryBuilderService.generateSQL(ast);

    if (!result.validation.valid) {
      return res.status(400).json({
        success: false,
        errors: result.validation.errors,
        warnings: result.validation.warnings,
      });
    }

    res.json({
      success: true,
      sql: result.sql,
      warnings: result.validation.warnings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate SQL',
      message: error.message,
    });
  }
});

/**
 * POST /api/query-builder/validate
 * Validate query builder AST without generating SQL
 */
router.post('/validate', async (req, res) => {
  try {
    const ast: QueryBuilderAST = req.body;

    if (!ast) {
      return res.status(400).json({ error: 'Query builder AST is required' });
    }

    const validation = queryBuilderService.validateQuery(ast);

    res.json({
      success: true,
      validation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to validate query',
      message: error.message,
    });
  }
});

/**
 * POST /api/query-builder/preview
 * Generate SQL and return preview with validation
 */
router.post('/preview', async (req, res) => {
  try {
    const ast: QueryBuilderAST = req.body;

    if (!ast) {
      return res.status(400).json({ error: 'Query builder AST is required' });
    }

    const result = queryBuilderService.generateSQL(ast);

    res.json({
      success: result.validation.valid,
      sql: result.sql,
      validation: result.validation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to preview query',
      message: error.message,
    });
  }
});

export default router;
