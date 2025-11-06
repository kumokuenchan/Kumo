import { useEffect, useMemo, useState, useRef } from 'react';
import { useTables } from '../../hooks/useSchema';
import { schemaApi, ERDiagramData } from '../../api/schema';
import ERDiagramVisualizer from '../schema/ERDiagramVisualizer';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocumentationTabProps {
  connectionId: string;
  database: string;
}

type SubTabType = 'tables' | 'markdown' | 'diagram' | 'viewer';

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
  const [userMarkdown, setUserMarkdown] = useState<string>('# Paste your markdown here\n\nStart typing or paste your markdown content...\n\n## Features\n- **Bold** and *italic* text\n- Lists and tables\n- Code blocks\n- And more!\n\n```sql\nSELECT * FROM users;\n```');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [showTableSelector, setShowTableSelector] = useState(false);
  const tableSelectorRef = useRef<HTMLDivElement>(null);

  const hasDocs = docs.length > 0;

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

      <div className="flex-1 overflow-hidden">
        {/* Markdown Viewer Tab */}
        {activeSubTab === 'viewer' && (
          <div className="h-full flex">
            {/* Left: Input */}
            <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
              <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Input (Paste Markdown Here)</span>
                <button
                  onClick={() => setUserMarkdown('')}
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1">
                <Editor
                  language="markdown"
                  value={userMarkdown}
                  onChange={(value) => setUserMarkdown(value || '')}
                  theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </div>

            {/* Right: Preview */}
            <div className="w-1/2 flex flex-col">
              <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
              </div>
              <div className="flex-1 overflow-auto p-6 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {userMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {!hasDocs && activeSubTab !== 'viewer' && (
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

        {hasDocs && activeSubTab !== 'viewer' && (
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
