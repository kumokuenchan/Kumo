/**
 * Generate code snippets in various languages from ApiRequest
 */

import type { ApiRequest } from '../api/apiTester';

export type CodeLanguage =
  | 'javascript-fetch'
  | 'javascript-axios'
  | 'python-requests'
  | 'python-http'
  | 'java-okhttp'
  | 'java-httpclient'
  | 'csharp-httpclient'
  | 'csharp-restsharp'
  | 'php-curl'
  | 'php-guzzle'
  | 'ruby-net-http'
  | 'go-http'
  | 'swift-urlsession'
  | 'kotlin-okhttp'
  | 'curl';

export interface CodeLanguageInfo {
  id: CodeLanguage;
  name: string;
  category: string;
}

export const codeLanguages: CodeLanguageInfo[] = [
  { id: 'curl', name: 'cURL', category: 'Shell' },
  { id: 'javascript-fetch', name: 'JavaScript (Fetch)', category: 'JavaScript' },
  { id: 'javascript-axios', name: 'JavaScript (Axios)', category: 'JavaScript' },
  { id: 'python-requests', name: 'Python (Requests)', category: 'Python' },
  { id: 'python-http', name: 'Python (http.client)', category: 'Python' },
  { id: 'java-okhttp', name: 'Java (OkHttp)', category: 'Java' },
  { id: 'java-httpclient', name: 'Java (HttpClient)', category: 'Java' },
  { id: 'csharp-httpclient', name: 'C# (HttpClient)', category: 'C#' },
  { id: 'csharp-restsharp', name: 'C# (RestSharp)', category: 'C#' },
  { id: 'php-curl', name: 'PHP (cURL)', category: 'PHP' },
  { id: 'php-guzzle', name: 'PHP (Guzzle)', category: 'PHP' },
  { id: 'ruby-net-http', name: 'Ruby (Net::HTTP)', category: 'Ruby' },
  { id: 'go-http', name: 'Go (net/http)', category: 'Go' },
  { id: 'swift-urlsession', name: 'Swift (URLSession)', category: 'Swift' },
  { id: 'kotlin-okhttp', name: 'Kotlin (OkHttp)', category: 'Kotlin' },
];

export function generateCode(request: ApiRequest, language: CodeLanguage): string {
  // Check if URL is empty
  if (!request.url || request.url.trim() === '') {
    return `// Error: No URL specified\n// Please enter a URL to generate code`;
  }

  const generators: Record<CodeLanguage, (req: ApiRequest) => string> = {
    'curl': generateCurl,
    'javascript-fetch': generateJavaScriptFetch,
    'javascript-axios': generateJavaScriptAxios,
    'python-requests': generatePythonRequests,
    'python-http': generatePythonHttp,
    'java-okhttp': generateJavaOkHttp,
    'java-httpclient': generateJavaHttpClient,
    'csharp-httpclient': generateCSharpHttpClient,
    'csharp-restsharp': generateCSharpRestSharp,
    'php-curl': generatePhpCurl,
    'php-guzzle': generatePhpGuzzle,
    'ruby-net-http': generateRubyNetHttp,
    'go-http': generateGoHttp,
    'swift-urlsession': generateSwiftUrlSession,
    'kotlin-okhttp': generateKotlinOkHttp,
  };

  try {
    const code = generators[language](request);
    // Check if the generated code is empty or only whitespace
    if (!code || code.trim() === '') {
      return `// Error: Failed to generate code\n// Please check your request configuration`;
    }
    return code;
  } catch (error) {
    return `// Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}\n// Please check your request configuration`;
  }
}

// Helper to build URL with params
function buildFullUrl(request: ApiRequest): string {
  let url = request.url || '';
  if (request.params && Object.keys(request.params).length > 0) {
    const params = new URLSearchParams(request.params);
    url += (url.includes('?') ? '&' : '?') + params.toString();
  }
  return url;
}

// cURL
function generateCurl(req: ApiRequest): string {
  const escape = (s: string) => String(s).replace(/'/g, "'\\''");
  let url = buildFullUrl(req);
  const headers = req.headers || {};
  let cmd = `curl -X ${req.method} '${escape(url)}'`;

  Object.entries(headers).forEach(([k, v]) => {
    cmd += ` \\\n  -H '${escape(k)}: ${escape(v)}'`;
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    cmd += ` \\\n  -d '${escape(bodyStr)}'`;
  }

  return cmd;
}

// JavaScript Fetch
function generateJavaScriptFetch(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `fetch('${url}', {\n  method: '${req.method}'`;

  if (Object.keys(headers).length > 0) {
    code += `,\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')}`;
  }

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string'
      ? `'${req.body.replace(/'/g, "\\'")}'`
      : JSON.stringify(req.body, null, 4);
    code += `,\n  body: ${bodyStr}`;
  }

  code += `\n})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;

  return code;
}

// JavaScript Axios
function generateJavaScriptAxios(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `axios({\n  method: '${req.method.toLowerCase()}',\n  url: '${url}'`;

  if (Object.keys(headers).length > 0) {
    code += `,\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')}`;
  }

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    code += `,\n  data: ${JSON.stringify(req.body, null, 4).replace(/\n/g, '\n  ')}`;
  }

  code += `\n})\n  .then(response => console.log(response.data))\n  .catch(error => console.error('Error:', error));`;

  return code;
}

// Python Requests
function generatePythonRequests(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `import requests\n\n`;
  code += `url = '${url}'\n`;

  if (Object.keys(headers).length > 0) {
    code += `headers = ${JSON.stringify(headers, null, 4).replace(/"([^"]+)":/g, "'$1':")}\n`;
  }

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const dataStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 4);
    code += `data = ${dataStr.replace(/"([^"]+)":/g, "'$1':")}\n`;
  }

  code += `\nresponse = requests.${req.method.toLowerCase()}(url`;
  if (Object.keys(headers).length > 0) code += `, headers=headers`;
  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    code += typeof req.body === 'string' ? `, data=data` : `, json=data`;
  }
  code += `)\nprint(response.json())`;

  return code;
}

// Python http.client
function generatePythonHttp(req: ApiRequest): string {
  const url = new URL(buildFullUrl(req));
  const headers = req.headers || {};
  let code = `import http.client\nimport json\n\n`;
  code += `conn = http.client.HTTPSConnection('${url.host}')\n`;

  if (Object.keys(headers).length > 0) {
    code += `headers = ${JSON.stringify(headers, null, 4).replace(/"([^"]+)":/g, "'$1':")}\n`;
  }

  const bodyStr = req.body && !['GET', 'HEAD'].includes(req.method)
    ? typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    : '';

  code += `\nconn.request('${req.method}', '${url.pathname}${url.search}'`;
  if (bodyStr) code += `, ${typeof req.body === 'string' ? `'${bodyStr}'` : `json.dumps(${bodyStr})`}`;
  if (Object.keys(headers).length > 0) code += `, headers`;
  code += `)\n\nresponse = conn.getresponse()\ndata = response.read()\nprint(json.loads(data))`;

  return code;
}

// Java OkHttp
function generateJavaOkHttp(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `OkHttpClient client = new OkHttpClient();\n\n`;

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const mediaType = headers['Content-Type'] || 'application/json';
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `MediaType mediaType = MediaType.parse("${mediaType}");\n`;
    code += `RequestBody body = RequestBody.create(mediaType, "${bodyStr.replace(/"/g, '\\"')}");\n`;
  }

  code += `Request request = new Request.Builder()\n  .url("${url}")\n  .method("${req.method}", ${req.body && !['GET', 'HEAD'].includes(req.method) ? 'body' : 'null'})`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `\n  .addHeader("${k}", "${v}")`;
  });

  code += `\n  .build();\n\nResponse response = client.newCall(request).execute();`;

  return code;
}

// Java HttpClient (Java 11+)
function generateJavaHttpClient(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `HttpClient client = HttpClient.newHttpClient();\n`;

  code += `HttpRequest request = HttpRequest.newBuilder()\n  .uri(URI.create("${url}"))`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `\n  .header("${k}", "${v}")`;
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `\n  .${req.method}(HttpRequest.BodyPublishers.ofString("${bodyStr.replace(/"/g, '\\"')}"))`;
  } else {
    code += `\n  .${req.method}(HttpRequest.BodyPublishers.noBody())`;
  }

  code += `\n  .build();\n\nHttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`;

  return code;
}

// C# HttpClient
function generateCSharpHttpClient(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `using var client = new HttpClient();\n`;

  Object.entries(headers).forEach(([k, v]) => {
    if (k.toLowerCase() !== 'content-type') {
      code += `client.DefaultRequestHeaders.Add("${k}", "${v}");\n`;
    }
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const contentType = headers['Content-Type'] || headers['content-type'] || 'application/json';
    code += `var content = new StringContent("${bodyStr.replace(/"/g, '\\"')}", Encoding.UTF8, "${contentType}");\n`;
    code += `var response = await client.${req.method.charAt(0) + req.method.slice(1).toLowerCase()}Async("${url}", content);`;
  } else {
    code += `var response = await client.${req.method.charAt(0) + req.method.slice(1).toLowerCase()}Async("${url}");`;
  }

  code += `\nvar result = await response.Content.ReadAsStringAsync();`;

  return code;
}

// C# RestSharp
function generateCSharpRestSharp(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `var client = new RestClient("${url}");\nvar request = new RestRequest(Method.${req.method});\n`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `request.AddHeader("${k}", "${v}");\n`;
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `request.AddParameter("application/json", "${bodyStr.replace(/"/g, '\\"')}", ParameterType.RequestBody);\n`;
  }

  code += `IRestResponse response = client.Execute(request);`;

  return code;
}

// PHP cURL
function generatePhpCurl(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `<?php\n$curl = curl_init();\n\ncurl_setopt_array($curl, [\n  CURLOPT_URL => '${url}',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_CUSTOMREQUEST => '${req.method}',`;

  if (Object.keys(headers).length > 0) {
    code += `\n  CURLOPT_HTTPHEADER => [`;
    Object.entries(headers).forEach(([k, v], i) => {
      code += `\n    '${k}: ${v}'${i < Object.keys(headers).length - 1 ? ',' : ''}`;
    });
    code += `\n  ],`;
  }

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `\n  CURLOPT_POSTFIELDS => '${bodyStr.replace(/'/g, "\\'")}',`;
  }

  code += `\n]);\n\n$response = curl_exec($curl);\ncurl_close($curl);\necho $response;`;

  return code;
}

// PHP Guzzle
function generatePhpGuzzle(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `<?php\n$client = new \\GuzzleHttp\\Client();\n\n$response = $client->request('${req.method}', '${url}', [`;

  if (Object.keys(headers).length > 0) {
    code += `\n  'headers' => [`;
    Object.entries(headers).forEach(([k, v], i) => {
      code += `\n    '${k}' => '${v}'${i < Object.keys(headers).length - 1 ? ',' : ''}`;
    });
    code += `\n  ],`;
  }

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyKey = typeof req.body === 'string' ? 'body' : 'json';
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `\n  '${bodyKey}' => '${bodyStr.replace(/'/g, "\\'")}',`;
  }

  code += `\n]);\n\necho $response->getBody();`;

  return code;
}

// Ruby Net::HTTP
function generateRubyNetHttp(req: ApiRequest): string {
  const url = new URL(buildFullUrl(req));
  const headers = req.headers || {};
  let code = `require 'net/http'\nrequire 'json'\n\n`;
  code += `uri = URI('${buildFullUrl(req)}')\nhttp = Net::HTTP.new(uri.host, uri.port)\nhttp.use_ssl = true\n\n`;
  code += `request = Net::HTTP::${req.method.charAt(0) + req.method.slice(1).toLowerCase()}.new(uri)`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `\nrequest['${k}'] = '${v}'`;
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `\nrequest.body = '${bodyStr.replace(/'/g, "\\'")}'`;
  }

  code += `\n\nresponse = http.request(request)\nputs response.read_body`;

  return code;
}

// Go net/http
function generateGoHttp(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n`;

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    code += `\t"strings"\n`;
  }

  code += `)\n\nfunc main() {\n`;

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `\tpayload := strings.NewReader(\`${bodyStr}\`)\n\treq, _ := http.NewRequest("${req.method}", "${url}", payload)\n`;
  } else {
    code += `\treq, _ := http.NewRequest("${req.method}", "${url}", nil)\n`;
  }

  Object.entries(headers).forEach(([k, v]) => {
    code += `\treq.Header.Add("${k}", "${v}")\n`;
  });

  code += `\n\tres, _ := http.DefaultClient.Do(req)\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`;

  return code;
}

// Swift URLSession
function generateSwiftUrlSession(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `import Foundation\n\nlet url = URL(string: "${url}")!\nvar request = URLRequest(url: url)\nrequest.httpMethod = "${req.method}"\n`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `request.setValue("${v}", forHTTPHeaderField: "${k}")\n`;
  });

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `request.httpBody = "${bodyStr.replace(/"/g, '\\"')}".data(using: .utf8)\n`;
  }

  code += `\nlet task = URLSession.shared.dataTask(with: request) { data, response, error in\n\tguard let data = data else { return }\n\tprint(String(data: data, encoding: .utf8)!)\n}\ntask.resume()`;

  return code;
}

// Kotlin OkHttp
function generateKotlinOkHttp(req: ApiRequest): string {
  const url = buildFullUrl(req);
  const headers = req.headers || {};
  let code = `val client = OkHttpClient()\n\n`;

  if (req.body && !['GET', 'HEAD'].includes(req.method)) {
    const mediaType = headers['Content-Type'] || 'application/json';
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    code += `val mediaType = "${mediaType}".toMediaType()\n`;
    code += `val body = "${bodyStr.replace(/"/g, '\\"')}".toRequestBody(mediaType)\n\n`;
  }

  code += `val request = Request.Builder()\n\t.url("${url}")\n\t.method("${req.method}", ${req.body && !['GET', 'HEAD'].includes(req.method) ? 'body' : 'null'})`;

  Object.entries(headers).forEach(([k, v]) => {
    code += `\n\t.addHeader("${k}", "${v}")`;
  });

  code += `\n\t.build()\n\nval response = client.newCall(request).execute()`;

  return code;
}
