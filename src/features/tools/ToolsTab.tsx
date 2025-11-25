import { useState, useRef, useMemo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import JsonView from '@uiw/react-json-view';
import { format as formatSQL } from 'sql-formatter';
import { jwtDecode } from 'jwt-decode';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import JSONGridViewer from '../../components/JSONGridViewer';

// Lazy load heavy components
const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));

type ToolType = 'json' | 'jsongrid' | 'sql' | 'diff' | 'regex' | 'base64' | 'jwt' | 'xml' | 'time' | 'url' | 'text' | 'email';

export default function ToolsTab() {
  const [activeTool, setActiveTool] = useState<ToolType>('json');

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] dark:from-[#0d1117] dark:to-[#1a1d23]">
      {/* Tool Tabs */}
      <div className="px-4 py-2 bg-white/60 dark:bg-[#161b22]/60 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { id: 'json', label: 'JSON', icon: '{}', color: 'from-blue-500 to-cyan-500' },
            { id: 'jsongrid', label: 'JSON Grid', icon: '⊞', color: 'from-green-500 to-emerald-500' },
            { id: 'sql', label: 'SQL', icon: 'SQL', color: 'from-orange-500 to-red-500' },
            { id: 'diff', label: 'Diff', icon: '≠', color: 'from-purple-500 to-pink-500' },
            { id: 'regex', label: 'RegEx', icon: '.*', color: 'from-green-500 to-emerald-500' },
            { id: 'base64', label: 'Base64', icon: 'B64', color: 'from-indigo-500 to-purple-500' },
            { id: 'jwt', label: 'JWT', icon: '🔐', color: 'from-yellow-500 to-orange-500' },
            { id: 'xml', label: 'XML', icon: '<>', color: 'from-teal-500 to-cyan-500' },
            { id: 'time', label: 'Timestamp', icon: 'TS', color: 'from-pink-500 to-rose-500' },
            { id: 'url', label: 'URL', icon: 'URL', color: 'from-violet-500 to-purple-500' },
            { id: 'text', label: 'Text', icon: 'TXT', color: 'from-slate-500 to-gray-500' },
            { id: 'email', label: 'API Email', icon: 'Mail', color: 'from-emerald-500 to-teal-500' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as ToolType)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTool === tool.id
                  ? `bg-gradient-to-r ${tool.color} text-white shadow-md`
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-sm">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'json' && <JSONTool />}
        {activeTool === 'jsongrid' && <JSONGridViewer />}
        {activeTool === 'sql' && <SQLTool />}
        {activeTool === 'diff' && <DiffTool />}
        {activeTool === 'regex' && <RegExTool />}
        {activeTool === 'base64' && <Base64Tool />}
        {activeTool === 'jwt' && <JWTTool />}
        {activeTool === 'xml' && <XMLTool />}
        {activeTool === 'time' && <TimestampTool />}
        {activeTool === 'url' && <URLTool />}
        {activeTool === 'text' && <TextUtilsTool />}
        {activeTool === 'email' && <EmailTool />}
      </div>
    </div>
  );
}

// API Incident Email Generator
function EmailTool() {
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api.partner.com/v1/orders');
  const [method, setMethod] = useState('GET');
  const [requestHeaders, setRequestHeaders] = useState('Authorization: Bearer <token>\nAccept: application/json');
  const [requestBody, setRequestBody] = useState('');
  const [responseStatus, setResponseStatus] = useState('500 Internal Server Error');
  const [responseHeaders, setResponseHeaders] = useState('Content-Type: application/json');
  const [responseBody, setResponseBody] = useState('{"error":"Internal Server Error"}');
  const [summary, setSummary] = useState('Intermittent 500 errors when fetching recent orders');
  const [expected, setExpected] = useState('Successful 200 response with JSON payload');
  const [impact, setImpact] = useState('Blocks daily order sync for several customers');
  const [notes, setNotes] = useState('Issue started around 10:15 UTC today');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rephrasing, setRephrasing] = useState(false);
  const [askText, setAskText] = useState('');
  const [asking, setAsking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const isBusy = loading || rephrasing || asking;
  const [variants, setVariants] = useState<Array<{ tone: string; subject: string; body: string }>>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    setSubject('');
    setBody('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          company,
          apiUrl,
          method,
          requestHeaders,
          requestBody,
          responseStatus,
          responseHeaders,
          responseBody,
          summary,
          expected,
          impact,
          notes,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate email');
      setSubject(data.subject || '');
      setBody(data.body || '');
    } catch (e: any) {
      setError(e.message || 'Failed to generate email');
      // Minimal local fallback
      const subj = `[API Issue] ${method} ${apiUrl} — ${responseStatus}`;
      const b = `I hope this email finds you well.\n\nI’m ${fullName || 'a developer'}${company ? ` from ${company}` : ''}, working on an integration with your API. We encountered an issue.\n\n- API URL: ${apiUrl}\n- Method: ${method}\n- Summary: ${summary}\n- Expected: ${expected}\n- Impact: ${impact}\n\nRequest Headers:\n${requestHeaders}\n\nRequest Body:\n${requestBody}\n\nResponse Status: ${responseStatus}\nResponse Headers:\n${responseHeaders}\n\nResponse Body:\n${responseBody}\n\nCould you please advise on next steps?\n\nBest regards,\n${fullName || 'Your Name'}${company ? `\n${company}` : ''}`;
      setSubject(subj);
      setBody(b);
    } finally {
      setLoading(false);
    }
  };

  const copySubject = () => navigator.clipboard.writeText(subject);
  const copyBody = () => navigator.clipboard.writeText(body);
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const buildHtml = (text: string) => {
    const normalized = (text || '').replace(/\r\n/g, '\n');
    const paragraphs = normalized.split(/\n\n+/).map(p => {
      const inner = escapeHtml(p).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 12px 0; line-height:1.5; font-family:Segoe UI, Arial, sans-serif; font-size:14px; color:#111;">${inner}</p>`;
    }).join('\n');
    return `<!DOCTYPE html><html><body>${paragraphs}</body></html>`;
  };
  const copyHtml = async () => {
    const html = buildHtml(body);
    try {
      // Attempt rich HTML copy; fallback to text
      const blob = new Blob([html], { type: 'text/html' });
      // @ts-ignore
      if (navigator.clipboard && navigator.clipboard.write) {
        // @ts-ignore
        await navigator.clipboard.write([new window.ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([html], { type: 'text/plain' }) })]);
        return;
      }
    } catch {}
    navigator.clipboard.writeText(html);
  };
  const downloadEml = () => {
    if (!subject && !body) return;
    const html = buildHtml(body);
    const date = new Date().toUTCString();
    const boundary = `====Ava_${Math.random().toString(36).slice(2)}_${Date.now()}====`;
    const lines: string[] = [];
    lines.push(`Date: ${date}`);
    lines.push(`Subject: ${subject || 'API Issue Report'}`);
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(body || '');
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    lines.push('');
    lines.push(html);
    lines.push('');
    lines.push(`--${boundary}--`);
    const eml = lines.join('\r\n');
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-incident.eml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const rephrase = async () => {
    if (!body) return;
    setRephrasing(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rephrase: true,
          previousSubject: subject,
          previousBody: body,
          fullName,
          company,
          apiUrl,
          method,
          requestHeaders,
          requestBody,
          responseStatus,
          responseHeaders,
          responseBody,
          summary,
          expected,
          impact,
          notes,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to rephrase email');
      setSubject(data.subject || subject);
      setBody(data.body || body);
    } catch (e: any) {
      setError(e.message || 'Failed to rephrase email');
    } finally {
      setRephrasing(false);
    }
  };

  const askAva = async () => {
    if (!body || !askText.trim()) return;
    setAsking(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: askText,
          previousSubject: subject,
          previousBody: body,
          fullName,
          company,
          apiUrl,
          method,
          requestHeaders,
          requestBody,
          responseStatus,
          responseHeaders,
          responseBody,
          summary,
          expected,
          impact,
          notes,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to apply instructions');
      setSubject(data.subject || subject);
      setBody(data.body || body);
    } catch (e: any) {
      setError(e.message || 'Failed to apply instructions');
    } finally {
      setAsking(false);
    }
  };

  const generateVariants = async () => {
    if (!body && !subject) return;
    setVariantsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'variants',
          previousSubject: subject,
          previousBody: body,
          fullName,
          company,
          apiUrl,
          method,
          requestHeaders,
          requestBody,
          responseStatus,
          responseHeaders,
          responseBody,
          summary,
          expected,
          impact,
          notes,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate variants');
      setVariants(Array.isArray(data.variants) ? data.variants : []);
    } catch (e: any) {
      setError(e.message || 'Failed to generate variants');
    } finally {
      setVariantsLoading(false);
    }
  };

  const generateSubjects = async () => {
    setSubjectsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'subjects',
          previousSubject: subject,
          previousBody: body,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate subjects');
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
    } catch (e: any) {
      setError(e.message || 'Failed to generate subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">API Incident Email</span>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={!apiUrl || loading} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" title="Generate a fresh draft">
            {loading ? 'Generating…' : 'Generate Email'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-auto">
        <div className="border-r dark:border-slate-700 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1">Your Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs mb-1">HTTP Method</label>
              <input value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">API URL</label>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Request Headers</label>
              <textarea value={requestHeaders} onChange={(e) => setRequestHeaders(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs mb-1">Request Body</label>
              <textarea value={requestBody} onChange={(e) => setRequestBody(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Response Status</label>
              <input value={responseStatus} onChange={(e) => setResponseStatus(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs mb-1">Impact</label>
              <input value={impact} onChange={(e) => setImpact(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Response Headers</label>
              <textarea value={responseHeaders} onChange={(e) => setResponseHeaders(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs mb-1">Response Body</label>
              <textarea value={responseBody} onChange={(e) => setResponseBody(e.target.value)} className="w-full min-h-[80px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs" />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Summary</label>
            <input value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Expected</label>
            <input value={expected} onChange={(e) => setExpected(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Subject</span>
            <button onClick={copySubject} disabled={!subject} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
          </div>
          <input readOnly value={subject} className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          {subjects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {subjects.map((s, idx) => (
                <button key={idx} onClick={() => navigator.clipboard.writeText(s)} className="px-2 py-0.5 text-[11px] rounded border dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800" title="Click to copy">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2">
            <button onClick={generateSubjects} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700" disabled={subjectsLoading}>
              {subjectsLoading ? 'Generating subjects…' : 'Generate smart subjects'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm font-medium">Email Body</span>
            <div className="flex items-center gap-2">
              <button onClick={copyBody} disabled={!body} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50" title="Copy Markdown/plain text">Copy MD</button>
              <button onClick={copyHtml} disabled={!body} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50" title="Copy as HTML">Copy HTML</button>
              <button onClick={downloadEml} disabled={!subject && !body} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50" title="Download .eml file">Download .eml</button>
            </div>
          </div>
          <div className={`relative h-[360px] border rounded dark:border-slate-700 overflow-hidden ${isBusy ? 'animate-pulse' : ''}`}>
            <Editor
              language="markdown"
              value={body}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
            />
            {isBusy && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-slate-700">
                  <svg className="w-4 h-4 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  <span className="text-xs text-gray-700 dark:text-gray-200">Ava is generating…</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAskOpen((v) => !v)}
                className="px-3 py-1.5 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                title="Open Ava to refine this draft"
              >
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3" />
                  <path d="M12 18v3" />
                  <path d="M3 12h3" />
                  <path d="M18 12h3" />
                  <path d="M5.6 5.6l2.1 2.1" />
                  <path d="M16.3 16.3l2.1 2.1" />
                  <path d="M5.6 18.4l2.1-2.1" />
                  <path d="M16.3 7.7l2.1-2.1" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{askOpen ? 'Close Ask Ava' : 'Ask Ava'}</span>
              </button>
              <button
                onClick={rephrase}
                disabled={!body || rephrasing}
                className="px-3 py-1.5 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                title="Rephrase this draft"
              >
                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <path d="M21 3v6h-6" />
                </svg>
                <span>{rephrasing ? 'Rephrasing…' : 'Rephrase Draft'}</span>
              </button>
            </div>
            {askOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded border dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="px-3 py-2 flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs mt-0.5">A</div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Tell Ava how to refine the email</div>
                    <div className="flex items-center gap-2">
                      <input
                        value={askText}
                        onChange={(e) => setAskText(e.target.value)}
                        placeholder="e.g., make it more formal and add ticket ID ABC-123"
                        className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                      />
                      <button
                        onClick={askAva}
                        disabled={!body || !askText.trim() || asking}
                        className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {asking ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">Quick suggestions</div>
                      <div className="flex flex-wrap gap-2">
                        {['More concise', 'More formal', 'Friendlier', 'Apologetic', 'Urgent', 'Softer tone', 'Emphasize impact', 'Longer with more detail'].map((s) => (
                          <button key={s} onClick={() => setAskText(s)} className="px-2 py-0.5 text-[11px] rounded border dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// JSON Viewer/Formatter
function JSONTool() {
  const [input, setInput] = useState('{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john@example.com",\n  "address": {\n    "street": "123 Main St",\n    "city": "New York"\n  },\n  "hobbies": ["reading", "coding", "gaming"]\n}');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('tree');

  const parsedJSON = useMemo(() => {
    try {
      setError('');
      return JSON.parse(input);
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [input]);

  const formatJSON = () => {
    if (parsedJSON) {
      setInput(JSON.stringify(parsedJSON, null, 2));
    }
  };

  const minifyJSON = () => {
    if (parsedJSON) {
      setInput(JSON.stringify(parsedJSON));
    }
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(input);
  };

  return (
    <div className="h-full flex">
      {/* Input */}
      <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Input JSON</span>
          <div className="flex gap-2">
            <button onClick={formatJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Format
            </button>
            <button onClick={minifyJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Minify
            </button>
            <button onClick={copyJSON} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Copy
            </button>
            <button onClick={() => setInput('')} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Clear
            </button>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <Editor
            language="json"
            value={input}
            onChange={(value) => setInput(value || '')}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      {/* Output */}
      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Preview</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'tree' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'code' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
            >
              Code
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900">
          {parsedJSON && viewMode === 'tree' ? (
            <JsonView value={parsedJSON} collapsed={2} />
          ) : parsedJSON && viewMode === 'code' ? (
            <pre className="text-sm font-mono">{JSON.stringify(parsedJSON, null, 2)}</pre>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center mt-8">Invalid JSON</div>
          )}
        </div>
      </div>
    </div>
  );
}

// SQL Formatter
function SQLTool() {
  const [input, setInput] = useState('SELECT users.id, users.name, orders.total FROM users LEFT JOIN orders ON users.id = orders.user_id WHERE users.active = 1 AND orders.total > 100 ORDER BY orders.total DESC LIMIT 10;');
  const [formatted, setFormatted] = useState('');
  const [language, setLanguage] = useState<'sql' | 'mysql' | 'postgresql'>('mysql');

  const formatQuery = () => {
    try {
      const result = formatSQL(input, { language });
      setFormatted(result);
    } catch (e) {
      setFormatted('Error formatting SQL');
    }
  };

  const copyFormatted = () => {
    navigator.clipboard.writeText(formatted || input);
  };

  return (
    <div className="h-full flex">
      <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">SQL Input</span>
          <div className="flex gap-2 items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="sql">SQL</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
            <button onClick={formatQuery} className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
              Format
            </button>
            <button onClick={() => setInput('')} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
              Clear
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            language="sql"
            value={input}
            onChange={(value) => setInput(value || '')}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
            }}
          />
        </div>
      </div>

      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium">Formatted SQL</span>
          <button onClick={copyFormatted} className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700">
            Copy
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            language="sql"
            value={formatted || input}
            theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Diff Viewer
function DiffTool() {
  const [oldText, setOldText] = useState('Hello World\nThis is line 2\nThis is line 3\nFoo Bar');
  const [newText, setNewText] = useState('Hello World!\nThis is line 2\nThis is line 4\nFoo Bar Baz');
  const [splitView, setSplitView] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">Text Comparison</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSplitView(true)}
            className={`px-2 py-1 text-xs rounded ${splitView ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Split View
          </button>
          <button
            onClick={() => setSplitView(false)}
            className={`px-2 py-1 text-xs rounded ${!splitView ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Unified View
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Original</span>
          </div>
          <div className="flex-1">
            <Editor
              language="plaintext"
              value={oldText}
              onChange={(value) => setOldText(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Modified</span>
          </div>
          <div className="flex-1">
            <Editor
              language="plaintext"
              value={newText}
              onChange={(value) => setNewText(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>

      <div className="h-1/2 border-t dark:border-slate-700">
        <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
          <span className="text-sm font-medium">Comparison Result</span>
        </div>
        <div className="overflow-auto h-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading diff viewer...</div>
              </div>
            }
          >
            <ReactDiffViewer
              oldValue={oldText}
              newValue={newText}
              splitView={splitView}
              useDarkTheme={document.documentElement.classList.contains('dark')}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// RegEx Tester
function RegExTool() {
  const [pattern, setPattern] = useState('\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b');
  const [flags, setFlags] = useState('gi');
  const [testString, setTestString] = useState('Contact us at: support@example.com or sales@company.org\nInvalid: not-an-email');
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState('');

  const testRegex = () => {
    try {
      setError('');
      const regex = new RegExp(pattern, flags);
      const found = [...testString.matchAll(regex)];
      setMatches(found);
    } catch (e: any) {
      setError(e.message);
      setMatches([]);
    }
  };

  const commonPatterns = [
    { name: 'Email', pattern: '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b', flags: 'gi' },
    { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)', flags: 'g' },
    { name: 'Phone', pattern: '\\+?\\d{1,4}?[-.\\s]?\\(?\\d{1,3}?\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}', flags: 'g' },
    { name: 'IP Address', pattern: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b', flags: 'g' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16">Pattern:</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
            placeholder="Regular expression pattern"
          />
          <input
            type="text"
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="w-16 px-3 py-1.5 text-sm rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
            placeholder="flags"
          />
          <button
            onClick={testRegex}
            className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Test
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</div>
        )}
        <div className="flex gap-2 mt-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Common:</span>
          {commonPatterns.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setPattern(p.pattern);
                setFlags(p.flags);
              }}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Test String</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="plaintext"
              value={testString}
              onChange={(value) => setTestString(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        <div className="w-1/3 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Matches ({matches.length})</span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {matches.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">No matches found</div>
            ) : (
              <div className="space-y-2">
                {matches.map((match, i) => (
                  <div key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Match {i + 1}</div>
                    <div className="text-sm font-mono break-all">{match[0]}</div>
                    {match.length > 1 && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Groups: {match.slice(1).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Base64 Encoder/Decoder
function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('Hello, World! This is a test message.');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const process = () => {
    try {
      setError('');
      if (mode === 'encode') {
        setOutput(btoa(input));
      } else {
        setOutput(atob(input));
      }
    } catch (e: any) {
      setError(e.message);
      setOutput('');
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">Base64 Encoder/Decoder</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('encode')}
            className={`px-3 py-1 text-xs rounded ${mode === 'encode' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-3 py-1 text-xs rounded ${mode === 'decode' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' : 'border dark:border-slate-600'}`}
          >
            Decode
          </button>
          <button
            onClick={process}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Convert
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Input</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm resize-none"
              placeholder={mode === 'encode' ? 'Enter text to encode' : 'Enter Base64 to decode'}
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <button
              onClick={copyOutput}
              disabled={!output}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex-1 p-4 overflow-auto">
            <pre className="font-mono text-sm break-all whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// JWT Decoder
function JWTTool() {
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const [decoded, setDecoded] = useState<any>(null);
  const [error, setError] = useState('');

  const decodeToken = () => {
    try {
      setError('');
      const decoded = jwtDecode(token);
      setDecoded(decoded);
    } catch (e: any) {
      setError(e.message);
      setDecoded(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">JWT Decoder</span>
        <button
          onClick={decodeToken}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Decode
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">JWT Token</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full h-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm resize-none"
              placeholder="Paste JWT token here"
            />
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Decoded Payload</span>
          </div>
          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-900">
            {decoded ? (
              <JsonView value={decoded} collapsed={1} />
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-center mt-8">
                Decoded payload will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// XML Viewer/Formatter
function XMLTool() {
  const [input, setInput] = useState('<root>\n  <user id="1">\n    <name>John Doe</name>\n    <email>john@example.com</email>\n  </user>\n</root>');
  const [formatted, setFormatted] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState('');

  const formatXML = () => {
    try {
      setError('');
      const parser = new XMLParser({ ignoreAttributes: false });
      const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
      const parsed = parser.parse(input);
      setFormatted(builder.build(parsed));
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyFormatted = () => {
    navigator.clipboard.writeText(formatted);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(jsonOutput);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">XML Formatter & Converter</span>
        <button
          onClick={formatXML}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Format & Convert
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">XML Input</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="xml"
              value={input}
              onChange={(value) => setInput(value || '')}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/3 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Formatted XML</span>
            <button
              onClick={copyFormatted}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Copy
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="xml"
              value={formatted}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div className="w-1/3 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">JSON Output</span>
            <button
              onClick={copyJSON}
              className="px-2 py-1 text-xs rounded border dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Copy
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              language="json"
              value={jsonOutput}
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Timestamp Converter
function TimestampTool() {
  const [epoch, setEpoch] = useState<string>('1704067200');
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const [dateLocal, setDateLocal] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [epochToISO, setEpochToISO] = useState('');
  const [epochToLocal, setEpochToLocal] = useState('');
  const [dateToSec, setDateToSec] = useState('');
  const [dateToMs, setDateToMs] = useState('');

  const convertFromEpoch = () => {
    try {
      setError('');
      const n = Number(epoch);
      if (!isFinite(n)) throw new Error('Invalid epoch value');
      const ms = unit === 'seconds' ? n * 1000 : n;
      const d = new Date(ms);
      if (isNaN(d.getTime())) throw new Error('Invalid date');
      setEpochToISO(d.toISOString());
      setEpochToLocal(d.toLocaleString());
    } catch (e: any) {
      setError(e.message || 'Conversion error');
      setEpochToISO('');
      setEpochToLocal('');
    }
  };

  const toDatetimeLocalValue = (d: Date) => {
    const pad = (v: number) => v.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  };

  const useNow = () => {
    const now = new Date();
    setDateLocal(toDatetimeLocalValue(now));
  };

  const convertFromDate = () => {
    try {
      setError('');
      const d = dateLocal ? new Date(dateLocal) : new Date();
      if (isNaN(d.getTime())) throw new Error('Invalid date');
      const ms = d.getTime();
      setDateToMs(String(ms));
      setDateToSec(String(Math.floor(ms / 1000)));
    } catch (e: any) {
      setError(e.message || 'Conversion error');
      setDateToMs('');
      setDateToSec('');
    }
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <span className="text-sm font-medium">Timestamp Converter</span>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Epoch -> Date */}
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Epoch → Date</span>
            <div className="flex items-center gap-2">
              <select
                className="text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'seconds' | 'milliseconds')}
              >
                <option value="seconds">seconds</option>
                <option value="milliseconds">milliseconds</option>
              </select>
              <button onClick={convertFromEpoch} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">
                Convert
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3 overflow-auto">
            <div>
              <label className="block text-xs mb-1">Epoch</label>
              <input
                value={epoch}
                onChange={(e) => setEpoch(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm"
                placeholder={unit === 'seconds' ? 'e.g. 1704067200' : 'e.g. 1704067200000'}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">ISO (UTC)</label>
              <div className="flex gap-2">
                <input readOnly value={epochToISO} className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm" />
                <button disabled={!epochToISO} onClick={() => copy(epochToISO)} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1">Local</label>
              <div className="flex gap-2">
                <input readOnly value={epochToLocal} className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm" />
                <button disabled={!epochToLocal} onClick={() => copy(epochToLocal)} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
              </div>
            </div>
          </div>
        </div>

        {/* Date -> Epoch */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Date → Epoch</span>
            <div className="flex items-center gap-2">
              <button onClick={useNow} className="px-2 py-1 text-xs rounded border dark:border-slate-600">Now</button>
              <button onClick={convertFromDate} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Convert</button>
            </div>
          </div>
          <div className="p-4 space-y-3 overflow-auto">
            <div>
              <label className="block text-xs mb-1">Local Date/Time</label>
              <input
                type="datetime-local"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                className="w-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Epoch (seconds)</label>
              <div className="flex gap-2">
                <input readOnly value={dateToSec} className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm" />
                <button disabled={!dateToSec} onClick={() => copy(dateToSec)} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1">Epoch (milliseconds)</label>
              <div className="flex gap-2">
                <input readOnly value={dateToMs} className="flex-1 px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm" />
                <button disabled={!dateToMs} onClick={() => copy(dateToMs)} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// URL Tools
function URLTool() {
  const [raw, setRaw] = useState('Hello world! äöü?&=');
  const [encoded, setEncoded] = useState('');
  const [queryIn, setQueryIn] = useState('https://example.com/path?b=2&a=1&c=hello%20world');
  const [queryOut, setQueryOut] = useState('');
  const [error, setError] = useState('');

  const doEncode = () => {
    try {
      setError('');
      setEncoded(encodeURIComponent(raw));
    } catch (e: any) {
      setError(e.message || 'Encode failed');
      setEncoded('');
    }
  };

  const doDecode = () => {
    try {
      setError('');
      setRaw(decodeURIComponent(encoded));
    } catch (e: any) {
      setError(e.message || 'Decode failed');
    }
  };

  const parseQuery = (input: string): Record<string, string | string[]> => {
    let qs = input.trim();
    try {
      if (/^https?:\/\//i.test(qs)) {
        const u = new URL(qs);
        qs = u.search.startsWith('?') ? u.search.slice(1) : u.search;
      }
    } catch {
      // not a URL, treat as raw query
    }
    if (qs.startsWith('?')) qs = qs.slice(1);
    const sp = new URLSearchParams(qs);
    const obj: Record<string, string | string[]> = {};
    sp.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const prev = obj[key];
        if (Array.isArray(prev)) obj[key] = [...prev, value];
        else obj[key] = [prev as string, value];
      } else {
        obj[key] = value;
      }
    });
    return obj;
  };

  const doParse = () => {
    try {
      setError('');
      const obj = parseQuery(queryIn);
      setQueryOut(JSON.stringify(obj, null, 2));
    } catch (e: any) {
      setError(e.message || 'Parse failed');
      setQueryOut('');
    }
  };

  const doStringify = () => {
    try {
      setError('');
      const obj = JSON.parse(queryOut || '{}');
      const entries: [string, string][] = [];
      Object.keys(obj)
        .sort()
        .forEach((k) => {
          const v = (obj as any)[k];
          if (Array.isArray(v)) v.forEach((vv) => entries.push([k, String(vv)]));
          else if (v != null) entries.push([k, String(v)]);
        });
      const sp = new URLSearchParams(entries);
      setQueryIn(sp.toString());
    } catch (e: any) {
      setError(e.message || 'Stringify failed');
    }
  };

  const copy = (t: string) => navigator.clipboard.writeText(t);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <span className="text-sm font-medium">URL Tools</span>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Encode / Decode */}
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Encode / Decode</span>
            <div className="flex gap-2">
              <button onClick={doEncode} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Encode</button>
              <button onClick={doDecode} className="px-3 py-1 text-xs rounded border dark:border-slate-600">Decode</button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4 overflow-auto">
            <div className="flex flex-col">
              <label className="text-xs mb-1">Raw</label>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="w-full h-full min-h-[160px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs mb-1">Encoded</label>
                <button className="px-2 py-1 text-xs rounded border dark:border-slate-600" disabled={!encoded} onClick={() => copy(encoded)}>Copy</button>
              </div>
              <textarea
                value={encoded}
                onChange={(e) => setEncoded(e.target.value)}
                className="w-full h-full min-h-[160px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Query Params */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Query Params</span>
            <div className="flex gap-2">
              <button onClick={doParse} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Parse</button>
              <button onClick={doStringify} className="px-3 py-1 text-xs rounded border dark:border-slate-600">Stringify</button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4 overflow-auto">
            <div className="flex flex-col">
              <label className="text-xs mb-1">URL or Query String</label>
              <textarea
                value={queryIn}
                onChange={(e) => setQueryIn(e.target.value)}
                className="w-full h-full min-h-[160px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs mb-1">Params (JSON)</label>
                <button className="px-2 py-1 text-xs rounded border dark:border-slate-600" disabled={!queryOut} onClick={() => copy(queryOut)}>Copy</button>
              </div>
              <textarea
                value={queryOut}
                onChange={(e) => setQueryOut(e.target.value)}
                className="w-full h-full min-h-[160px] px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Text Utilities
function TextUtilsTool() {
  const [input, setInput] = useState('One\nTwo\nTwo\n  three  ');
  const [output, setOutput] = useState('');
  const [trimLines, setTrimLines] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [dedupe, setDedupe] = useState(true);
  const [sort, setSort] = useState<'none' | 'asc' | 'desc'>('asc');
  const [textCase, setTextCase] = useState<'none' | 'lower' | 'upper' | 'title'>('none');

  const toTitle = (s: string) => s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

  const apply = () => {
    const lines0 = input.split(/\r?\n/);
    let lines = trimLines ? lines0.map((l) => l.trim()) : lines0.slice();
    if (removeEmpty) lines = lines.filter((l) => l.length > 0);
    if (textCase !== 'none') {
      lines = lines.map((l) =>
        textCase === 'lower' ? l.toLowerCase() : textCase === 'upper' ? l.toUpperCase() : toTitle(l)
      );
    }
    if (dedupe) {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const l of lines) {
        if (!seen.has(l)) {
          seen.add(l);
          out.push(l);
        }
      }
      lines = out;
    }
    if (sort !== 'none') {
      lines.sort((a, b) => (sort === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));
    }
    setOutput(lines.join('\n'));
  };

  const copy = () => navigator.clipboard.writeText(output);
  const swap = () => {
    setInput(output);
    setOutput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
        <span className="text-sm font-medium">Text Utilities</span>
        <div className="flex items-center gap-2">
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={trimLines} onChange={(e) => setTrimLines(e.target.checked)} /> Trim lines
          </label>
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} /> Remove empty
          </label>
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} /> Dedupe
          </label>
          <select
            className="text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'none' | 'asc' | 'desc')}
            title="Sort order"
          >
            <option value="none">no sort</option>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
          <select
            className="text-xs rounded border dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1"
            value={textCase}
            onChange={(e) => setTextCase(e.target.value as 'none' | 'lower' | 'upper' | 'title')}
            title="Change case"
          >
            <option value="none">case: none</option>
            <option value="lower">lower</option>
            <option value="upper">upper</option>
            <option value="title">Title</option>
          </select>
          <button onClick={apply} className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Apply</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r dark:border-slate-700 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <span className="text-sm font-medium">Input</span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-full px-3 py-2 rounded border dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-sm resize-none"
              placeholder="Enter text here"
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <div className="flex gap-2">
              <button onClick={swap} disabled={!output} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Swap</button>
              <button onClick={copy} disabled={!output} className="px-2 py-1 text-xs rounded border dark:border-slate-600 disabled:opacity-50">Copy</button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <pre className="font-mono text-sm break-all whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

