import { format } from 'sql-formatter';

/**
 * Get the SQL query at the cursor position
 */
export const getQueryAtCursor = (editor: any): string | null => {
  const result = getQueryAtCursorWithRange(editor);
  return result ? result.query : null;
};

/**
 * Get the SQL query at cursor position with line range information
 */
export const getQueryAtCursorWithRange = (
  editor: any
): { query: string; startLine: number; endLine: number; fullQuery: string } | null => {
  const model = editor.getModel();
  if (!model) return null;

  const position = editor.getPosition();
  if (!position) return null;

  const fullText = model.getValue();
  const lines = fullText.split('\n');
  const currentLineNumber = position.lineNumber - 1; // 0-indexed

  // Find the start of the current statement (search backwards from the line BEFORE cursor for semicolon)
  let startLine = 0;
  for (let i = currentLineNumber - 1; i >= 0; i--) {
    if (lines[i].includes(';')) {
      // Found a semicolon, start after this line
      startLine = i + 1;
      break;
    }
  }

  // Find the end of the current statement (search forwards from cursor line for semicolon)
  let endLine = lines.length - 1;
  for (let i = currentLineNumber; i < lines.length; i++) {
    if (lines[i].includes(';')) {
      // Found a semicolon, end at this line
      endLine = i;
      break;
    }
  }

  // Extract the statement lines
  const statementLines = lines.slice(startLine, endLine + 1);
  const fullQuery = statementLines.join('\n');
  const statement = fullQuery.trim();

  // Remove the trailing semicolon for execution
  const cleanStatement = statement.endsWith(';') ? statement.slice(0, -1).trim() : statement;

  return cleanStatement ? { query: cleanStatement, startLine, endLine, fullQuery } : null;
};

/**
 * Validate SQL syntax and set Monaco editor markers
 */
export const validateSQL = (editor: any, sqlText: string): void => {
  const monaco = (window as any).monaco;
  if (!monaco || !editor) return;

  const model = editor.getModel();
  if (!model) return;

  const markers: any[] = [];

  // Basic syntax validation rules
  const lines = sqlText.split('\n');
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim().toUpperCase();

    // Check for common syntax errors
    // Unclosed quotes
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;

    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: lineIndex + 1,
        startColumn: 1,
        endLineNumber: lineIndex + 1,
        endColumn: line.length + 1,
        message: 'Unclosed quote detected',
      });
    }

    // Missing semicolon (warning only)
    if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
      const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
      const startsWithKeyword = keywords.some((kw) => trimmed.startsWith(kw));

      if (startsWithKeyword && !line.trim().endsWith(';') && lineIndex === lines.length - 1) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineIndex + 1,
          startColumn: line.length,
          endLineNumber: lineIndex + 1,
          endColumn: line.length + 1,
          message: 'Consider adding a semicolon at the end of the statement',
        });
      }
    }

    // Unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      markers.push({
        severity: monaco.MarkerSeverity.Warning,
        startLineNumber: lineIndex + 1,
        startColumn: 1,
        endLineNumber: lineIndex + 1,
        endColumn: line.length + 1,
        message: 'Unmatched parentheses detected',
      });
    }
  });

  monaco.editor.setModelMarkers(model, 'sql-validator', markers);
};

/**
 * Format SQL using sql-formatter
 */
export const formatSQL = (sql: string): string => {
  try {
    return format(sql, {
      language: 'mysql',
      tabWidth: 2,
      keywordCase: 'upper',
    });
  } catch (err) {
    console.error('Failed to format SQL:', err);
    throw err;
  }
};

/**
 * Minify SQL by removing comments and extra whitespace
 */
export const minifySQL = (sql: string): string => {
  try {
    let minified = sql;
    // Remove single-line comments (-- comment)
    minified = minified.replace(/--[^\n]*/g, '');
    // Remove multi-line comments (/* comment */)
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    // Collapse multiple spaces/newlines into single space
    minified = minified.replace(/\s+/g, ' ');
    // Remove spaces around common SQL operators and punctuation (except semicolons)
    minified = minified.replace(/\s*([(),=<>])\s*/g, '$1');
    // Split by semicolon, trim each query, and rejoin with semicolon + newline
    const queries = minified
      .split(';')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
    minified = queries.join(';\n');
    return minified;
  } catch (err) {
    console.error('Failed to minify SQL:', err);
    throw err;
  }
};
