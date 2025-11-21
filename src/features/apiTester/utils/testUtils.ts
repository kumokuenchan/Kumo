import type { ApiRequest, ApiResponse } from '../../../api/apiTester';
import type { VariableExtraction, TestDataRow } from '../../../services/apiTesterStorage';

// Variable storage for test runs
export class TestVariableStore {
  private variables: Record<string, any> = {};

  set(name: string, value: any): void {
    this.variables[name] = value;
  }

  get(name: string): any {
    return this.variables[name];
  }

  getAll(): Record<string, any> {
    return { ...this.variables };
  }

  clear(): void {
    this.variables = {};
  }

  merge(vars: Record<string, any>): void {
    Object.assign(this.variables, vars);
  }
}

// Get value from object by dot-notation path
function getByPath(obj: any, path: string): any {
  if (!path) return undefined;
  const parts = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Substitute variables in a string
export function substituteVariables(
  text: string,
  variables: Record<string, any>,
  dataRow?: TestDataRow
): string {
  if (!text) return text;

  // Replace {{variable}} patterns
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmedName = varName.trim();

    // Check data row first (for data-driven testing)
    if (dataRow && trimmedName in dataRow) {
      const val = dataRow[trimmedName];
      return val === null ? '' : String(val);
    }

    // Then check variables
    if (trimmedName in variables) {
      const val = variables[trimmedName];
      if (typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val === null ? '' : String(val);
    }

    // Return original if not found
    return match;
  });
}

// Substitute variables in a request object
export function substituteRequestVariables(
  request: ApiRequest,
  variables: Record<string, any>,
  dataRow?: TestDataRow
): ApiRequest {
  const substitute = (text: string) => substituteVariables(text, variables, dataRow);

  return {
    ...request,
    url: substitute(request.url),
    headers: request.headers
      ? Object.fromEntries(
          Object.entries(request.headers).map(([k, v]) => [substitute(k), substitute(v)])
        )
      : undefined,
    params: request.params
      ? Object.fromEntries(
          Object.entries(request.params).map(([k, v]) => [substitute(k), substitute(v)])
        )
      : undefined,
    body: request.body ? substitute(request.body) : undefined,
  };
}

// Extract variables from a response
export function extractVariables(
  response: ApiResponse,
  extractions: VariableExtraction[]
): Record<string, any> {
  const extracted: Record<string, any> = {};

  // Parse response body
  let body: any = response.data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // Normalize headers to lowercase
  const headersLc: Record<string, string> = {};
  if (response.headers) {
    Object.entries(response.headers).forEach(([k, v]) => {
      headersLc[k.toLowerCase()] = String(v);
    });
  }

  for (const extraction of extractions) {
    let value: any;

    switch (extraction.source) {
      case 'status':
        value = response.status;
        break;
      case 'body':
        value = response.data;
        break;
      case 'header':
        if (extraction.path) {
          value = headersLc[extraction.path.toLowerCase()];
        }
        break;
      case 'json':
        if (extraction.path) {
          value = getByPath(body, extraction.path);
        }
        break;
    }

    if (value !== undefined) {
      extracted[extraction.name] = value;
    }
  }

  return extracted;
}

// Parse CSV string into data rows
export function parseCSV(csvContent: string): TestDataRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: TestDataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: TestDataRow = {};
    headers.forEach((header, idx) => {
      const value = values[idx] || '';
      // Try to parse as number or boolean
      if (value === 'true') row[header] = true;
      else if (value === 'false') row[header] = false;
      else if (value === 'null') row[header] = null;
      else if (!isNaN(Number(value)) && value !== '') row[header] = Number(value);
      else row[header] = value;
    });
    rows.push(row);
  }

  return rows;
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

// Parse JSON array into data rows
export function parseJSONData(jsonContent: string): TestDataRow[] {
  try {
    const data = JSON.parse(jsonContent);
    if (Array.isArray(data)) {
      return data.map(item => {
        const row: TestDataRow = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
            row[key] = value;
          } else {
            row[key] = JSON.stringify(value);
          }
        }
        return row;
      });
    }
    return [];
  } catch {
    return [];
  }
}

// Generate HTML test report
export function generateHTMLReport(
  results: Array<{
    testId: string;
    testName: string;
    passed: boolean;
    status: number;
    duration: number;
    assertionResults: Array<{ assertion: any; passed: boolean; actual?: any; message?: string }>;
    error?: string;
  }>,
  options: {
    title?: string;
    runAt: number;
    totalDuration: number;
  }
): string {
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const passRate = results.length > 0 ? ((passedCount / results.length) * 100).toFixed(1) : '0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title || 'Test Report'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: bold; }
    .summary-card .label { font-size: 12px; color: #666; margin-top: 5px; }
    .passed .value { color: #22c55e; }
    .failed .value { color: #ef4444; }
    .results { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    .result { border-bottom: 1px solid #eee; }
    .result:last-child { border-bottom: none; }
    .result-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
    .result-header:hover { background: #f9f9f9; }
    .result-name { display: flex; align-items: center; gap: 10px; }
    .result-name .icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .result-name .icon.pass { background: #dcfce7; color: #22c55e; }
    .result-name .icon.fail { background: #fee2e2; color: #ef4444; }
    .result-meta { display: flex; gap: 15px; font-size: 12px; color: #666; }
    .result-meta span { display: flex; align-items: center; gap: 4px; }
    .result-details { padding: 0 20px 15px; display: none; }
    .result.expanded .result-details { display: block; }
    .assertion { padding: 8px 12px; margin: 5px 0; border-radius: 4px; font-size: 13px; font-family: monospace; }
    .assertion.pass { background: #dcfce7; color: #166534; }
    .assertion.fail { background: #fee2e2; color: #991b1b; }
    .status-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .status-2xx { background: #dcfce7; color: #166534; }
    .status-4xx { background: #fef3c7; color: #92400e; }
    .status-5xx { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${options.title || 'API Test Report'}</h1>
      <div class="meta">
        Run at: ${new Date(options.runAt).toLocaleString()} • Duration: ${options.totalDuration}ms
      </div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="value">${results.length}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="summary-card passed">
        <div class="value">${passedCount}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="value">${failedCount}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card">
        <div class="value">${passRate}%</div>
        <div class="label">Pass Rate</div>
      </div>
    </div>

    <div class="results">
      ${results.map(result => `
        <div class="result ${result.passed ? '' : 'expanded'}">
          <div class="result-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="result-name">
              <span class="icon ${result.passed ? 'pass' : 'fail'}">${result.passed ? '✓' : '✗'}</span>
              <span>${escapeHtml(result.testName)}</span>
            </div>
            <div class="result-meta">
              ${result.error ? `<span style="color: #ef4444">${escapeHtml(result.error)}</span>` : `
                <span class="status-badge status-${Math.floor(result.status / 100)}xx">${result.status}</span>
                <span>${result.duration}ms</span>
              `}
            </div>
          </div>
          <div class="result-details">
            ${result.assertionResults.map(ar => `
              <div class="assertion ${ar.passed ? 'pass' : 'fail'}">
                ${ar.passed ? '✓' : '✗'} ${escapeHtml(formatAssertion(ar.assertion))}
                ${ar.message ? `<br><small>${escapeHtml(ar.message)}</small>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAssertion(assertion: any): string {
  if (assertion.type === 'status') {
    return `Status ${assertion.op} ${assertion.value}`;
  }
  if (assertion.type === 'header') {
    return `Header "${assertion.key}" ${assertion.op} ${assertion.value || ''}`;
  }
  if (assertion.type === 'json') {
    return `${assertion.path} ${assertion.op} ${JSON.stringify(assertion.value) || ''}`;
  }
  return JSON.stringify(assertion);
}
