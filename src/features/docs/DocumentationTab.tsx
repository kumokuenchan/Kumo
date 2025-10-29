import { useEffect, useMemo, useState } from 'react';
import { useTables } from '../../hooks/useSchema';
import { schemaApi, ERDiagramData } from '../../api/schema';
import ERDiagramVisualizer from '../schema/ERDiagramVisualizer';

interface DocumentationTabProps {
  connectionId: string;
  database: string;
}

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

  const hasDocs = docs.length > 0;

  useEffect(() => {
    // Clear docs when database changes
    setDocs([]);
    setErData(null);
  }, [connectionId, database]);

  const generateDocs = async () => {
    if (!tables.length) return;
    setGenerating(true);
    try {
      // Fetch complete schemas for all tables in parallel (batch by 5 to avoid spikes)
      const batch = 5;
      const results: TableDoc[] = [];
      for (let i = 0; i < tables.length; i += batch) {
        const slice = tables.slice(i, i + batch);
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
      <div className="border-b px-4 py-3 flex items-center gap-2 bg-white dark:bg-slate-800">
        <div className="font-semibold text-gray-800 dark:text-gray-200">Database Docs</div>
        <div className="text-sm text-gray-500">{database}</div>
        <div className="flex-1" />
        <button
          onClick={generateDocs}
          disabled={tablesLoading || generating || tables.length === 0}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
        <button
          onClick={exportHTML}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
        >
          Export HTML
        </button>
        <button
          onClick={exportMarkdown}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
        >
          Export Markdown
        </button>
        <button
          onClick={exportPDF}
          disabled={!hasDocs}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
        >
          Export PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {!hasDocs && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l9-5-9-5-9 5 9 5z" />
              </svg>
              <h3 className="text-lg text-gray-700 dark:text-gray-300 font-medium mb-2">Generate Database Documentation</h3>
              <p className="text-gray-500 dark:text-gray-400">Includes tables, columns, constraints, and an ER diagram.</p>
            </div>
          </div>
        )}

        {hasDocs && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">Relationships Diagram</h2>
              <div className="h-[520px] border rounded overflow-hidden">
                <ERDiagramVisualizer data={erData || { tables: [], relationships: [] }} isLoading={false} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Tables</h2>
              <div className="space-y-6">
                {docs.map((t) => (
                  <div key={t.name} className="bg-white dark:bg-slate-800 rounded border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{t.name}</h3>
                      {t.comment && <div className="text-sm text-gray-500">{t.comment}</div>}
                    </div>
                    <div className="overflow-x-auto mt-3">
                      <table className="min-w-[600px] text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                          <tr>
                            <th className="text-left px-2 py-1">Column</th>
                            <th className="text-left px-2 py-1">Type</th>
                            <th className="text-left px-2 py-1">Nullable</th>
                            <th className="text-left px-2 py-1">Key</th>
                            <th className="text-left px-2 py-1">Default</th>
                            <th className="text-left px-2 py-1">Extra</th>
                            <th className="text-left px-2 py-1">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.columns.map((c) => (
                            <tr key={c.name} className="border-b last:border-b-0">
                              <td className="px-2 py-1 font-mono">{c.name}</td>
                              <td className="px-2 py-1">{c.type}</td>
                              <td className="px-2 py-1">{c.nullable ? 'YES' : 'NO'}</td>
                              <td className="px-2 py-1">{c.key || ''}</td>
                              <td className="px-2 py-1">{c.default ?? ''}</td>
                              <td className="px-2 py-1">{c.extra || ''}</td>
                              <td className="px-2 py-1">{c.comment || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {t.indexes?.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="font-medium mb-1">Indexes</div>
                        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                          {t.indexes.map((idx) => (
                            <li key={idx.name}>{idx.unique ? 'UNIQUE ' : ''}{idx.name} ({idx.columns.join(', ')})</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {t.foreignKeys?.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="font-medium mb-1">Foreign Keys</div>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
