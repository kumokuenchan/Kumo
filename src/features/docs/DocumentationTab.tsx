import { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { useTables } from '../../hooks/useSchema';
import { schemaApi, ERDiagramData } from '../../api/schema';
import ERDiagramVisualizer from '../schema/ERDiagramVisualizer';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { CodeBlock } from '../../components/MarkdownComponents';
import 'swagger-ui-react/swagger-ui.css';

// Lazy load SwaggerUI - only loads when Swagger tab is opened
const SwaggerUI = lazy(() => import('swagger-ui-react'));

interface DocumentationTabProps {
  connectionId: string;
  database: string;
}

type SubTabType = 'tables' | 'markdown' | 'diagram' | 'viewer' | 'swagger';

type TableDoc = {
  name: string;
  comment?: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    key: string;
    default: string | null;
    extra: string;
    comment: string;
  }>;
  indexes: Array<{ name: string; columns: string[]; unique: boolean; type: string }>;
  foreignKeys: Array<{ name: string; column: string; referencedTable: string; referencedColumn: string; onDelete: string; onUpdate: string }>;
};

function download(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toMarkdown(database: string, docs: TableDoc[], er?: ERDiagramData) {
  const lines: string[] = [];
  lines.push(`# Database Documentation: ${database}`);
  lines.push('');
  lines.push(`Generated at ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`## Tables (${docs.length})`);
  lines.push('');
  for (const t of docs) {
    lines.push(`### ${t.name}`);
    if (t.comment) {
      lines.push(t.comment);
      lines.push('');
    }
    lines.push('| Column | Type | Nullable | Key | Default | Extra | Comment |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const c of t.columns) {
      lines.push(`| ${c.name} | ${c.type} | ${c.nullable ? 'YES' : 'NO'} | ${c.key || ''} | ${c.default ?? ''} | ${c.extra || ''} | ${c.comment || ''} |`);
    }
    if (t.indexes?.length) {
      lines.push('');
      lines.push('Indexes:');
      for (const idx of t.indexes) {
        lines.push(`- ${idx.unique ? 'UNIQUE ' : ''}${idx.name} (${idx.columns.join(', ')})`);
      }
    }
    if (t.foreignKeys?.length) {
      lines.push('');
      lines.push('Foreign Keys:');
      for (const fk of t.foreignKeys) {
        lines.push(`- ${fk.name}: ${t.name}.${fk.column} → ${fk.referencedTable}.${fk.referencedColumn} (ON DELETE ${fk.onDelete}, ON UPDATE ${fk.onUpdate})`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

export default function DocumentationTab({ connectionId, database }: DocumentationTabProps) {
  const { data: tablesData, isLoading: tablesLoading } = useTables(connectionId, database);
  const tables = tablesData || [];

  const [generating, setGenerating] = useState(false);
  const [docs, setDocs] = useState<TableDoc[]>([]);
  const [erData, setErData] = useState<ERDiagramData | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('viewer');
  const [userMarkdown, setUserMarkdown] = useState<string>('# Paste your markdown here\n\nStart typing or paste your markdown content...\n\n## Features\n- **Bold** and *italic* text\n- Lists and tables\n- Code blocks\n- Math equations: $E = mc^2$\n- Mermaid diagrams\n\n```sql\nSELECT * FROM users WHERE id = 1;\n```\n\n```mermaid\ngraph TD\n  A[Start] --> B[Process]\n  B --> C[End]\n```\n\n$$\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n$$');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [showTableSelector, setShowTableSelector] = useState(false);
  const tableSelectorRef = useRef<HTMLDivElement>(null);

  // Markdown viewer enhancements
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'edit'>('split');
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [showToc, setShowToc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const editorRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Swagger viewer
  const [swaggerSpec, setSwaggerSpec] = useState<string>(`{
  "openapi": "3.0.0",
  "info": {
    "title": "Sample API",
    "description": "Paste your Swagger/OpenAPI spec here (JSON or YAML)",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.example.com/v1",
      "description": "Production server"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "description": "Returns a list of users",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/User"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a user",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created"
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        }
      }
    }
  }
}`);
  const [swaggerError, setSwaggerError] = useState<string>('');
  const swaggerEditorRef = useRef<any>(null);

  const hasDocs = docs.length > 0;

  // Initialize Mermaid
  useEffect(() => {
    import('mermaid').then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
      });
    });
  }, []);

  // Memoize markdown content for performance
  const markdownContent = useMemo(() => {
    if (!hasDocs) return '';
    return toMarkdown(database, docs, erData || undefined);
  }, [database, docs, erData, hasDocs]);

  useEffect(() => {
    // Clear docs when database changes
    setDocs([]);
    setErData(null);
    setSelectedTables(new Set());
  }, [connectionId, database]);

  // Close table selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableSelectorRef.current && !tableSelectorRef.current.contains(event.target as Node)) {
        setShowTableSelector(false);
      }
    };

    if (showTableSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTableSelector]);

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const selectAllTables = () => {
    setSelectedTables(new Set(tables.map(t => t.name)));
  };

  const deselectAllTables = () => {
    setSelectedTables(new Set());
  };

  // Markdown viewer helper functions
  const wordCount = useMemo(() => {
    const words = userMarkdown.trim().split(/\s+/).filter(w => w.length > 0);
    const chars = userMarkdown.length;
    const charsNoSpaces = userMarkdown.replace(/\s/g, '').length;
    return { words: words.length, chars, charsNoSpaces };
  }, [userMarkdown]);

  const extractHeadings = useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let match;
    while ((match = headingRegex.exec(userMarkdown)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^\w]+/g, '-');
      headings.push({ level, text, id });
    }
    return headings;
  }, [userMarkdown]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([userMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSwagger = () => {
    const blob = new Blob([swaggerSpec], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseSwaggerSpec = useMemo(() => {
    try {
      setSwaggerError('');
      // Try parsing as JSON first
      return JSON.parse(swaggerSpec);
    } catch (e) {
      // If JSON fails, try YAML (using a simple check)
      try {
        // For now, just return as-is if it's YAML - SwaggerUI can handle it
        if (swaggerSpec.trim().startsWith('openapi:') || swaggerSpec.trim().startsWith('swagger:')) {
          setSwaggerError('');
          return swaggerSpec;
        }
        setSwaggerError('Invalid JSON/YAML format');
        return null;
      } catch {
        setSwaggerError('Invalid specification format');
        return null;
      }
    }
  }, [swaggerSpec]);

  const insertMarkdown = (before: string, after: string = '') => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    const selection = editor.getSelection();
    const selectedText = model.getValueInRange(selection);

    const newText = before + selectedText + after;
    editor.executeEdits('', [{
      range: selection,
      text: newText,
    }]);

    // Set cursor position
    const newPosition = {
      lineNumber: selection.startLineNumber,
      column: selection.startColumn + before.length + selectedText.length,
    };
    editor.setPosition(newPosition);
    editor.focus();
  };

  const insertTemplate = (template: string) => {
    setUserMarkdown(template);
  };

  const templates = {
    readme: `# Project Name

## Description
A brief description of your project.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`javascript
// Example code
\`\`\`

## Contributing
Pull requests are welcome.

## License
MIT`,

    api: `# API Documentation

## Endpoints

### GET /api/users
Retrieve all users.

**Parameters:**
- \`limit\` (optional): Number of results

**Response:**
\`\`\`json
{
  "users": [],
  "total": 0
}
\`\`\`

### POST /api/users
Create a new user.

**Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\``,

    meeting: `# Meeting Notes - ${new Date().toLocaleDateString()}

## Attendees
-
-

## Agenda
1.
2.
3.

## Discussion Points

### Topic 1
-

## Action Items
- [ ]
- [ ]

## Next Meeting
Date: `,

    changelog: `# Changelog

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

## [1.0.0] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release`
  };

  const generateDocs = async () => {
    if (selectedTables.size === 0) {
      alert('Please select at least one table to generate documentation.');
      return;
    }
    setGenerating(true);
    setShowTableSelector(false);
    try {
      // Filter to only selected tables
      const tablesToGenerate = tables.filter(t => selectedTables.has(t.name));

      // Fetch complete schemas for selected tables in parallel (batch by 5 to avoid spikes)
      const batch = 5;
      const results: TableDoc[] = [];
      for (let i = 0; i < tablesToGenerate.length; i += batch) {
        const slice = tablesToGenerate.slice(i, i + batch);
        const schemas = await Promise.all(
          slice.map(async (t) => {
            const [schema, stats] = await Promise.all([
              schemaApi.getCompleteTableSchema(connectionId, database, t.name),
              schemaApi.getTableStats(connectionId, database, t.name),
            ]);
            return {
              name: t.name,
              comment: t.comment || stats.comment,
              columns: schema.columns,
              indexes: schema.indexes,
              foreignKeys: schema.foreignKeys,
            } as TableDoc;
          })
        );
        results.push(...schemas);
      }
      setDocs(results);

      // Build ER diagram data
      const er: ERDiagramData = {
        tables: results.map((t) => ({
          name: t.name,
          columns: t.columns.map((c) => ({
            name: c.name,
            type: c.type,
            isPrimaryKey: (c.key || '').toUpperCase().includes('PRI'),
            isForeignKey: (c.key || '').toUpperCase().includes('MUL'),
            nullable: !!c.nullable,
          })),
        })),
        relationships: results.flatMap((t) =>
          t.foreignKeys.map((fk, idx) => ({
            id: `${t.name}:${fk.name}:${idx}`,
            name: fk.name,
            sourceTable: t.name,
            targetTable: fk.referencedTable,
            sourceColumn: fk.column,
            targetColumn: fk.referencedColumn,
            onDelete: fk.onDelete,
            onUpdate: fk.onUpdate,
          }))
        ),
      };
      setErData(er);
    } finally {
      setGenerating(false);
    }
  };

  const buildHTML = () => {
    const styles = `
      <style>
        :root { color-scheme: light; }
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:24px;background:#ffffff;color:#111827}
        h1,h2,h3{color:#111;margin:0 0 8px}
        .muted{color:#6b7280;font-size:12px}
        .section{margin:18px 0; page-break-inside: avoid}
        table{border-collapse:collapse;width:100%;margin:8px 0; table-layout: fixed}
        th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;word-break: break-word}
        th{background:#e8eef9;text-align:left;color:#1f2937}
        thead {display: table-header-group}
        tr {page-break-inside: avoid}
        a { color: #2563eb }
        @media print {
          body{padding:0}
          .page-break{page-break-before: always}
        }
      </style>`;
    const body = `
      <h1>Database Documentation: ${database}</h1>
      <div class="muted">Generated at ${new Date().toLocaleString()}</div>
      <h2>Tables (${docs.length})</h2>
      ${docs
        .map((t) => `
          <div class="section">
            <h3>${t.name}</h3>
            ${t.comment ? `<div class="muted">${t.comment}</div>` : ''}
            <table>
              <thead><tr>
                <th style="width:16%">Column</th>
                <th style="width:18%">Type</th>
                <th style="width:9%">Nullable</th>
                <th style="width:9%">Key</th>
                <th style="width:16%">Default</th>
                <th style="width:12%">Extra</th>
                <th style="width:20%">Comment</th>
              </tr></thead>
              <tbody>
                ${t.columns
                  .map(
                    (c) => `<tr>
                      <td>${c.name}</td>
                      <td>${c.type}</td>
                      <td>${c.nullable ? 'YES' : 'NO'}</td>
                      <td>${c.key || ''}</td>
                      <td>${c.default ?? ''}</td>
                      <td>${c.extra || ''}</td>
                      <td>${c.comment || ''}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
            ${
              t.indexes?.length
                ? `<div class="muted">Indexes: <ul>${t.indexes
                    .map((idx) => `<li>${idx.unique ? 'UNIQUE ' : ''}${idx.name} (${idx.columns.join(', ')})</li>`)
                    .join('')}</ul></div>`
                : ''
            }
            ${
              t.foreignKeys?.length
                ? `<div class="muted">Foreign Keys: <ul>${t.foreignKeys
                    .map(
                      (fk) =>
                        `<li>${fk.name}: ${t.name}.${fk.column} → ${fk.referencedTable}.${fk.referencedColumn} (ON DELETE ${fk.onDelete}, ON UPDATE ${fk.onUpdate})</li>`
                    )
                    .join('')}</ul></div>`
                : ''
            }
          </div>`)
        .join('')}
    `;
    return `<!doctype html><html><head><meta charset="utf-8"/><title>DB Docs - ${database}</title>${styles}</head><body>${body}</body></html>`;
  };

  const exportHTML = () => {
    const html = buildHTML();
    download(`db-docs-${database}.html`, new Blob([html], { type: 'text/html' }));
  };

  const exportMarkdown = () => {
    const md = toMarkdown(database, docs, erData || undefined);
    download(`db-docs-${database}.md`, new Blob([md], { type: 'text/markdown' }));
  };

  const exportPDF = () => {
    // Open the same HTML with print styles and trigger print
    const html = buildHTML().replace('<body>', '<body onload="window.print(); setTimeout(()=>window.close(), 300);">');
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="border-b px-4 py-3 flex items-center gap-2 bg-white dark:bg-slate-800">
        <div className="font-semibold text-gray-800 dark:text-gray-200">Database Docs</div>
        <div className="text-sm text-gray-500">{database}</div>
        <div className="flex-1" />

        {/* Table Selector */}
        <div className="relative" ref={tableSelectorRef}>
          <button
            onClick={() => setShowTableSelector(!showTableSelector)}
            disabled={tablesLoading || tables.length === 0}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 dark:border-slate-600 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
            </svg>
            Select Tables ({selectedTables.size})
          </button>

          {showTableSelector && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
              <div className="p-3 border-b dark:border-slate-600 flex items-center justify-between">
                <span className="font-medium text-sm">Select Tables</span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllTables}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    All
                  </button>
                  <button
                    onClick={deselectAllTables}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {tables.map(table => (
                  <label
                    key={table.name}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTables.has(table.name)}
                      onChange={() => toggleTableSelection(table.name)}
                      className="rounded"
                    />
                    <span className="text-sm">{table.name}</span>
                  </label>
                ))}
              </div>
              <div className="p-2 border-t dark:border-slate-600 flex gap-2">
                <button
                  onClick={() => setShowTableSelector(false)}
                  className="flex-1 px-3 py-1.5 rounded border text-sm dark:border-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={generateDocs}
          disabled={tablesLoading || generating || selectedTables.size === 0}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50 hover:bg-blue-700"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
        <button
          onClick={exportHTML}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 dark:border-slate-600"
        >
          Export HTML
        </button>
        <button
          onClick={exportMarkdown}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 dark:border-slate-600"
        >
          Export Markdown
        </button>
        <button
          onClick={exportPDF}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 dark:border-slate-600"
        >
          Export PDF
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-6 px-4">
          <button
            onClick={() => setActiveSubTab('viewer')}
            className={`relative px-1 py-3 text-sm font-medium transition-colors ${
              activeSubTab === 'viewer' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Markdown Viewer
            {activeSubTab === 'viewer' && (
              <motion.div layoutId="sub-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('swagger')}
            className={`relative px-1 py-3 text-sm font-medium transition-colors ${
              activeSubTab === 'swagger' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Swagger/OpenAPI
            {activeSubTab === 'swagger' && (
              <motion.div layoutId="sub-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded" />
            )}
          </button>
          {hasDocs && (
            <>
              <button
                onClick={() => setActiveSubTab('tables')}
                className={`relative px-1 py-3 text-sm font-medium transition-colors ${
                  activeSubTab === 'tables' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Tables
                {activeSubTab === 'tables' && (
                  <motion.div layoutId="sub-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded" />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('markdown')}
                className={`relative px-1 py-3 text-sm font-medium transition-colors ${
                  activeSubTab === 'markdown' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                DB Markdown
                {activeSubTab === 'markdown' && (
                  <motion.div layoutId="sub-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded" />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('diagram')}
                className={`relative px-1 py-3 text-sm font-medium transition-colors ${
                  activeSubTab === 'diagram' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                ER Diagram
                {activeSubTab === 'diagram' && (
                  <motion.div layoutId="sub-tab-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900' : ''}`}>
        {/* Markdown Viewer Tab */}
        {activeSubTab === 'viewer' && (
          <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-2 py-1 flex items-center gap-2 flex-wrap">
              {/* Formatting Buttons */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="flex items-center gap-1 border-r dark:border-slate-600 pr-2">
                  <button onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Bold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 5H7v2h4c1.1 0 2 .9 2 2s-.9 2-2 2H7v2h4c2.21 0 4-1.79 4-4s-1.79-4-4-4z"/>
                    </svg>
                  </button>
                  <button onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded italic" title="Italic">I</button>
                  <button onClick={() => insertMarkdown('~~', '~~')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded line-through" title="Strikethrough">S</button>
                  <button onClick={() => insertMarkdown('\n# ', '')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Heading">H1</button>
                  <button onClick={() => insertMarkdown('\n- ', '')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="List">•</button>
                  <button onClick={() => insertMarkdown('\n```\n', '\n```\n')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Code Block">{ }</button>
                  <button onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Link">🔗</button>
                  <button onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded font-mono text-xs" title="Inline Code">code</button>
                </div>
              )}

              {/* View Mode */}
              <div className="flex items-center gap-1 border-r dark:border-slate-600 pr-2">
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  title="Split View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16m6-16v16M4 4h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  title="Edit Only"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  title="Preview Only"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              {/* Split Direction (only visible in split mode) */}
              {viewMode === 'split' && (
                <div className="flex items-center gap-1 border-r dark:border-slate-600 pr-2">
                  <button
                    onClick={() => setSplitDirection('horizontal')}
                    className={`p-1.5 rounded ${splitDirection === 'horizontal' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    title="Horizontal Split"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16M4 12h16M4 20h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSplitDirection('vertical')}
                    className={`p-1.5 rounded ${splitDirection === 'vertical' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    title="Vertical Split"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16m8-16v16m8-16v16" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 border-r dark:border-slate-600 pr-2">
                <button onClick={downloadMarkdown} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Download Markdown">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button onClick={() => setShowToc(!showToc)} className={`p-1.5 rounded ${showToc ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`} title="Table of Contents">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
                <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Search">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded" title="Fullscreen">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Templates Dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && insertTemplate(templates[e.target.value as keyof typeof templates])}
                  className="px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
                  defaultValue=""
                >
                  <option value="">Templates</option>
                  <option value="readme">README</option>
                  <option value="api">API Docs</option>
                  <option value="meeting">Meeting Notes</option>
                  <option value="changelog">Changelog</option>
                </select>
              </div>

              <div className="flex-1" />

              {/* Word Count */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {wordCount.words} words · {wordCount.chars} chars
              </div>

              <button onClick={() => setUserMarkdown('')} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700">
                Clear
              </button>
            </div>

            {/* Search Bar */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search markdown..."
                      className="flex-1 px-3 py-1 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                      autoFocus
                    />
                    <button onClick={() => setShowSearch(false)} className="px-3 py-1 text-sm rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className={`flex-1 flex ${splitDirection === 'vertical' ? 'flex-row' : 'flex-col'} overflow-hidden min-h-0`}>
              {/* Editor */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`${viewMode === 'split' ? (splitDirection === 'vertical' ? 'w-1/2' : 'h-1/2') : 'flex-1'} flex flex-col ${splitDirection === 'vertical' ? 'border-r' : 'border-b'} dark:border-slate-700 min-h-0`}>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      language="markdown"
                      value={userMarkdown}
                      onChange={(value) => setUserMarkdown(value || '')}
                      onMount={(editor) => (editorRef.current = editor)}
                      theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                        find: {
                          seedSearchStringFromSelection: 'always',
                          autoFindInSelection: 'never'
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={`${viewMode === 'split' ? (splitDirection === 'vertical' ? 'w-1/2' : 'h-1/2') : 'flex-1'} flex overflow-hidden min-h-0`}>
                  {/* Table of Contents */}
                  <AnimatePresence>
                    {showToc && extractHeadings.length > 0 && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 200, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="border-r dark:border-slate-700 overflow-y-auto bg-gray-50 dark:bg-slate-800 flex-shrink-0"
                      >
                        <div className="p-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Contents</div>
                          {extractHeadings.map((heading, idx) => (
                            <a
                              key={idx}
                              href={`#${heading.id}`}
                              className="block py-1 text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                              style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                            >
                              {heading.text}
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Preview Content */}
                  <div ref={previewRef} className="flex-1 overflow-y-auto overflow-x-hidden p-6 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                      components={{
                        code: CodeBlock as any,
                        h1: ({ children, ...props }) => <h1 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h1>,
                        h2: ({ children, ...props }) => <h2 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h2>,
                        h3: ({ children, ...props }) => <h3 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h3>,
                        h4: ({ children, ...props }) => <h4 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h4>,
                        h5: ({ children, ...props }) => <h5 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h5>,
                        h6: ({ children, ...props }) => <h6 id={String(children).toLowerCase().replace(/[^\w]+/g, '-')} {...props}>{children}</h6>,
                      }}
                    >
                      {userMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Swagger/OpenAPI Viewer Tab */}
        {activeSubTab === 'swagger' && (
          <div className="h-full flex">
            {/* Left: Spec Editor */}
            <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
              <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">OpenAPI Spec (JSON/YAML)</span>
                <div className="flex gap-2">
                  <button
                    onClick={downloadSwagger}
                    className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Download Spec"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setSwaggerSpec('')}
                    className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {swaggerError && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
                  {swaggerError}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <Editor
                  language="json"
                  value={swaggerSpec}
                  onChange={(value) => setSwaggerSpec(value || '')}
                  onMount={(editor) => (swaggerEditorRef.current = editor)}
                  theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    padding: { top: 16, bottom: 16 },
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
              </div>
            </div>

            {/* Right: Swagger UI Preview */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-slate-900">
              <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Documentation Preview</span>
              </div>
              <div className="flex-1 overflow-auto">
                {parseSwaggerSpec && !swaggerError ? (
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center p-8">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-600 dark:text-gray-400">Loading Swagger UI...</p>
                        </div>
                      </div>
                    }
                  >
                    <SwaggerUI
                      spec={parseSwaggerSpec}
                      docExpansion="list"
                      defaultModelsExpandDepth={1}
                      defaultModelExpandDepth={1}
                    />
                  </Suspense>
                ) : (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg text-gray-700 dark:text-gray-300 font-medium mb-2">Invalid Specification</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Please paste a valid OpenAPI/Swagger specification in JSON or YAML format.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasDocs && activeSubTab !== 'viewer' && activeSubTab !== 'swagger' && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l9-5-9-5-9 5 9 5z" />
              </svg>
              <h3 className="text-lg text-gray-700 dark:text-gray-300 font-medium mb-2">Generate Database Documentation</h3>
              <p className="text-gray-500 dark:text-gray-400">Includes tables, columns, constraints, and an ER diagram.</p>
            </div>
          </div>
        )}

        {hasDocs && activeSubTab !== 'viewer' && activeSubTab !== 'swagger' && (
          <div className="overflow-auto p-4 space-y-6 h-full">
            {/* Tables View */}
            {activeSubTab === 'tables' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Tables</h2>
                {docs.map((t) => (
                  <div key={t.name} className="bg-white dark:bg-slate-800 rounded border dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                      {t.comment && <div className="text-sm text-gray-500 dark:text-gray-400">{t.comment}</div>}
                    </div>
                    <div className="overflow-x-auto mt-3">
                      <table className="min-w-[600px] text-sm border-collapse">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                          <tr>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Column</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Type</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Nullable</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Key</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Default</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Extra</th>
                            <th className="text-left px-2 py-1 border dark:border-slate-600">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.columns.map((c) => (
                            <tr key={c.name} className="border-b last:border-b-0 dark:border-slate-700">
                              <td className="px-2 py-1 font-mono border dark:border-slate-700">{c.name}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.type}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.nullable ? 'YES' : 'NO'}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.key || ''}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.default ?? ''}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.extra || ''}</td>
                              <td className="px-2 py-1 border dark:border-slate-700">{c.comment || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {t.indexes?.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Indexes</div>
                        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                          {t.indexes.map((idx) => (
                            <li key={idx.name}>{idx.unique ? 'UNIQUE ' : ''}{idx.name} ({idx.columns.join(', ')})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {t.foreignKeys?.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="font-medium mb-1 text-gray-900 dark:text-gray-100">Foreign Keys</div>
                        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                          {t.foreignKeys.map((fk) => (
                            <li key={fk.name}>{fk.name}: {t.name}.{fk.column} → {fk.referencedTable}.{fk.referencedColumn} (ON DELETE {fk.onDelete}, ON UPDATE {fk.onUpdate})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Markdown Preview */}
            {activeSubTab === 'markdown' && (
              <div className="h-full">
                <div className="h-[calc(100vh-240px)] border rounded overflow-hidden">
                  <Editor
                    language="markdown"
                    value={markdownContent}
                    theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      lineNumbers: 'off',
                      folding: false,
                      lineDecorationsWidth: 0,
                      lineNumbersMinChars: 0,
                      renderLineHighlight: 'none',
                      scrollBeyondLastLine: false,
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>
              </div>
            )}

            {/* ER Diagram View */}
            {activeSubTab === 'diagram' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Entity Relationship Diagram</h2>
                <div className="h-[calc(100vh-240px)] border rounded overflow-hidden">
                  <ERDiagramVisualizer data={erData || { tables: [], relationships: [] }} isLoading={false} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
