/**
 * API CLI Utility for Terminal Integration
 * Allows making API calls directly from the terminal
 */

import { apiTesterApi, type ApiRequest, type ApiResponse } from '../../../api/apiTester';
import { apiTesterStorage, type Collection, type SavedRequest } from '../../../services/apiTesterStorage';

export interface ApiCliResult {
  success: boolean;
  output: string;
  error?: string;
  response?: ApiResponse;
}

/**
 * Parse and execute API commands from terminal
 */
export class ApiCli {
  /**
   * Main command router
   */
  async execute(command: string): Promise<ApiCliResult> {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    if (!cmd || cmd !== 'api') {
      return {
        success: false,
        output: '',
        error: 'Invalid command. Use "api --help" for usage.'
      };
    }

    const subCommand = parts[1]?.toLowerCase();

    switch (subCommand) {
      case 'list':
      case 'ls':
        return this.listSavedRequests();

      case 'exec':
      case 'run':
        return this.executeById(parts.slice(2));

      case 'get':
        return this.quickRequest('GET', parts.slice(2));

      case 'post':
        return this.quickRequest('POST', parts.slice(2));

      case 'put':
        return this.quickRequest('PUT', parts.slice(2));

      case 'delete':
      case 'del':
        return this.quickRequest('DELETE', parts.slice(2));

      case 'patch':
        return this.quickRequest('PATCH', parts.slice(2));

      case 'collections':
        return this.listCollections();

      case 'search':
        return this.searchRequests(parts.slice(2).join(' '));

      case '--help':
      case '-h':
      case 'help':
        return this.showHelp();

      default:
        return {
          success: false,
          output: '',
          error: `Unknown subcommand: ${subCommand}. Use "api --help" for usage.`
        };
    }
  }

  /**
   * List all saved API requests
   */
  private listSavedRequests(): ApiCliResult {
    const collections = apiTesterStorage.getCollections();

    if (collections.length === 0) {
      const lines = [
        '',
        '\x1b[33mNo saved API requests found.\x1b[0m',
        '',
        'Create requests in the API Tester and save them to collections.',
        ''
      ];
      return {
        success: true,
        output: lines.join('\n')
      };
    }

    const lines: string[] = [
      '',
      '\x1b[1m\x1b[36m📚 Saved API Requests\x1b[0m',
      ''
    ];

    collections.forEach((collection, idx) => {
      lines.push(`\x1b[1m\x1b[32m${collection.name}\x1b[0m \x1b[2m(${collection.requests.length} requests)\x1b[0m`);

      collection.requests.forEach((req, reqIdx) => {
        const method = req.request.method;
        const methodColor = this.getMethodColor(method);
        lines.push(`  \x1b[2m${idx}.${reqIdx}\x1b[0m ${methodColor}${method}\x1b[0m \x1b[36m${req.name}\x1b[0m`);
        lines.push(`      \x1b[2m${req.request.url}\x1b[0m`);
      });

      lines.push('');
    });

    lines.push('\x1b[2mUse "api exec <collection>.<request>" to execute a request\x1b[0m');
    lines.push('\x1b[2mExample: api exec 0.0\x1b[0m');
    lines.push('');

    return {
      success: true,
      output: lines.join('\n')
    };
  }

  /**
   * List all collections
   */
  private listCollections(): ApiCliResult {
    const collections = apiTesterStorage.getCollections();

    if (collections.length === 0) {
      const lines = [
        '',
        '\x1b[33mNo collections found.\x1b[0m',
        ''
      ];
      return {
        success: true,
        output: lines.join('\n')
      };
    }

    const lines: string[] = [
      '',
      '\x1b[1m\x1b[36m📁 Collections\x1b[0m',
      ''
    ];

    collections.forEach((collection, idx) => {
      lines.push(`\x1b[2m${idx}\x1b[0m \x1b[1m${collection.name}\x1b[0m`);
      lines.push(`   \x1b[2m${collection.requests.length} requests\x1b[0m`);
      if (collection.description) {
        lines.push(`   \x1b[2m${collection.description}\x1b[0m`);
      }
      lines.push('');
    });

    return {
      success: true,
      output: lines.join('\n')
    };
  }

  /**
   * Execute a saved request by index
   */
  private async executeById(args: string[]): Promise<ApiCliResult> {
    if (args.length === 0) {
      return {
        success: false,
        output: '',
        error: 'Usage: api exec <collection>.<request>\nExample: api exec 0.0'
      };
    }

    const [collectionIdx, requestIdx] = args[0].split('.').map(n => parseInt(n, 10));

    if (isNaN(collectionIdx) || isNaN(requestIdx)) {
      return {
        success: false,
        output: '',
        error: 'Invalid request index. Use "api list" to see available requests.'
      };
    }

    const collections = apiTesterStorage.getCollections();
    const collection = collections[collectionIdx];

    if (!collection) {
      return {
        success: false,
        output: '',
        error: `Collection ${collectionIdx} not found. Use "api list" to see available collections.`
      };
    }

    const savedRequest = collection.requests[requestIdx];

    if (!savedRequest) {
      return {
        success: false,
        output: '',
        error: `Request ${requestIdx} not found in collection "${collection.name}".`
      };
    }

    return this.executeRequest(savedRequest.request, savedRequest.name);
  }

  /**
   * Quick HTTP request
   */
  private async quickRequest(method: string, args: string[]): Promise<ApiCliResult> {
    if (args.length === 0) {
      return {
        success: false,
        output: '',
        error: `Usage: api ${method.toLowerCase()} <url> [options]\nExample: api get https://api.github.com/users/octocat`
      };
    }

    const url = args[0];
    const request: ApiRequest = {
      method: method as ApiRequest['method'],
      url,
    };

    // Parse options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === '-H' || arg === '--header') {
        const headerStr = args[++i];
        if (headerStr) {
          const [key, ...valueParts] = headerStr.split(':');
          if (key && valueParts.length > 0) {
            request.headers = request.headers || {};
            request.headers[key.trim()] = valueParts.join(':').trim();
          }
        }
      } else if (arg === '-d' || arg === '--data') {
        const dataStr = args[++i];
        if (dataStr) {
          try {
            request.body = JSON.parse(dataStr);
          } catch {
            request.body = dataStr;
          }
        }
      } else if (arg === '-q' || arg === '--query') {
        const queryStr = args[++i];
        if (queryStr) {
          const [key, value] = queryStr.split('=');
          if (key && value) {
            request.params = request.params || {};
            request.params[key] = value;
          }
        }
      }
    }

    return this.executeRequest(request, `${method} ${url}`);
  }

  /**
   * Search for requests by name or URL
   */
  private searchRequests(query: string): ApiCliResult {
    if (!query) {
      return {
        success: false,
        output: '',
        error: 'Usage: api search <query>\nExample: api search user'
      };
    }

    const collections = apiTesterStorage.getCollections();
    const lines: string[] = [
      '',
      `\x1b[1m\x1b[36m🔍 Search results for "${query}"\x1b[0m`,
      ''
    ];
    let found = 0;

    collections.forEach((collection, collIdx) => {
      const matchingRequests = collection.requests.filter((req, reqIdx) => {
        const nameMatch = req.name.toLowerCase().includes(query.toLowerCase());
        const urlMatch = req.request.url.toLowerCase().includes(query.toLowerCase());
        return nameMatch || urlMatch;
      });

      if (matchingRequests.length > 0) {
        lines.push(`\x1b[1m\x1b[32m${collection.name}\x1b[0m`);

        matchingRequests.forEach(req => {
          const reqIdx = collection.requests.indexOf(req);
          const method = req.request.method;
          const methodColor = this.getMethodColor(method);
          lines.push(`  \x1b[2m${collIdx}.${reqIdx}\x1b[0m ${methodColor}${method}\x1b[0m \x1b[36m${req.name}\x1b[0m`);
          lines.push(`      \x1b[2m${req.request.url}\x1b[0m`);
          found++;
        });

        lines.push('');
      }
    });

    if (found === 0) {
      lines.push('\x1b[33mNo requests found matching your query.\x1b[0m');
    } else {
      lines.push(`\x1b[2mFound ${found} request(s)\x1b[0m`);
    }
    lines.push('');

    return {
      success: true,
      output: lines.join('\n')
    };
  }

  /**
   * Execute an API request and format output
   */
  private async executeRequest(request: ApiRequest, name?: string): Promise<ApiCliResult> {
    try {
      const startTime = Date.now();

      const lines: string[] = [
        '',
        '\x1b[1m\x1b[36m🚀 Executing Request\x1b[0m',
        ''
      ];

      if (name) {
        lines.push(`\x1b[1m${name}\x1b[0m`);
      }

      const methodColor = this.getMethodColor(request.method);
      lines.push(`${methodColor}${request.method}\x1b[0m \x1b[36m${request.url}\x1b[0m`);
      lines.push('');

      const response = await apiTesterApi.executeRequest(request);
      const duration = Date.now() - startTime;

      // Save to history
      apiTesterStorage.addToHistory(request, response, name);

      // Format response
      const responseLines = this.formatResponse(response, duration);
      lines.push(...responseLines);

      return {
        success: true,
        output: lines.join('\n'),
        response
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: `Failed to execute request: ${error.message || error}`
      };
    }
  }

  /**
   * Format API response for terminal display
   */
  private formatResponse(response: ApiResponse, duration: number): string[] {
    const lines: string[] = [
      '\x1b[1m\x1b[36m📥 Response\x1b[0m',
      ''
    ];

    // Status
    const statusColor = this.getStatusColor(response.status);
    lines.push(`${statusColor}${response.status} ${response.statusText}\x1b[0m`);
    lines.push(`\x1b[2mTime: ${duration}ms | Size: ${this.formatBytes(response.size)}\x1b[0m`);
    lines.push('');

    // Headers (show first few)
    if (response.headers && Object.keys(response.headers).length > 0) {
      lines.push('\x1b[1mHeaders:\x1b[0m');
      const headerKeys = Object.keys(response.headers).slice(0, 5);
      headerKeys.forEach(key => {
        lines.push(`  \x1b[2m${key}:\x1b[0m ${response.headers[key]}`);
      });
      if (Object.keys(response.headers).length > 5) {
        lines.push(`  \x1b[2m... and ${Object.keys(response.headers).length - 5} more\x1b[0m`);
      }
      lines.push('');
    }

    // Body
    lines.push('\x1b[1mBody:\x1b[0m');
    try {
      const bodyStr = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

      // Limit output length for terminal
      const maxLength = 1000;
      if (bodyStr.length > maxLength) {
        const bodyLines = bodyStr.substring(0, maxLength).split('\n');
        lines.push(...bodyLines);
        lines.push(`\x1b[2m... (${bodyStr.length - maxLength} more characters)\x1b[0m`);
      } else {
        const bodyLines = bodyStr.split('\n');
        lines.push(...bodyLines);
      }
    } catch {
      lines.push(String(response.data));
    }
    lines.push('');

    return lines;
  }

  /**
   * Show help message
   */
  private showHelp(): ApiCliResult {
    const lines = [
      '',
      '\x1b[1m\x1b[36mAPI CLI - Make API calls from terminal\x1b[0m',
      '',
      '\x1b[1mUSAGE:\x1b[0m',
      '  api <command> [options]',
      '',
      '\x1b[1mCOMMANDS:\x1b[0m',
      '  \x1b[32mlist, ls\x1b[0m                 List all saved API requests',
      '  \x1b[32mcollections\x1b[0m              List all collections',
      '  \x1b[32mexec, run\x1b[0m <id>           Execute a saved request by index',
      '  \x1b[32msearch\x1b[0m <query>          Search requests by name or URL',
      '',
      '  \x1b[1mQuick Requests:\x1b[0m',
      '  \x1b[32mget\x1b[0m <url> [options]     Make a GET request',
      '  \x1b[32mpost\x1b[0m <url> [options]    Make a POST request',
      '  \x1b[32mput\x1b[0m <url> [options]     Make a PUT request',
      '  \x1b[32mdelete\x1b[0m <url> [options]  Make a DELETE request',
      '  \x1b[32mpatch\x1b[0m <url> [options]   Make a PATCH request',
      '',
      '\x1b[1mOPTIONS:\x1b[0m',
      '  \x1b[33m-H, --header\x1b[0m <key:value>  Add header',
      '  \x1b[33m-d, --data\x1b[0m <json>        Add request body (JSON)',
      '  \x1b[33m-q, --query\x1b[0m <key=value>  Add query parameter',
      '',
      '\x1b[1mEXAMPLES:\x1b[0m',
      '  api list',
      '  api exec 0.0',
      '  api search user',
      '  api get https://api.github.com/users/octocat',
      '  api post https://api.example.com/users -d \'{"name":"John"}\'',
      '',
      '\x1b[2mTip: Use "api list" to see all your saved requests\x1b[0m',
      ''
    ];

    return {
      success: true,
      output: lines.join('\n')
    };
  }

  /**
   * Get color for HTTP method
   */
  private getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      'GET': '\x1b[32m',      // Green
      'POST': '\x1b[33m',     // Yellow
      'PUT': '\x1b[34m',      // Blue
      'DELETE': '\x1b[31m',   // Red
      'PATCH': '\x1b[35m',    // Magenta
      'HEAD': '\x1b[36m',     // Cyan
      'OPTIONS': '\x1b[37m',  // White
    };
    return colors[method] || '\x1b[37m';
  }

  /**
   * Get color for HTTP status
   */
  private getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return '\x1b[32m'; // Green
    if (status >= 300 && status < 400) return '\x1b[36m'; // Cyan
    if (status >= 400 && status < 500) return '\x1b[33m'; // Yellow
    if (status >= 500) return '\x1b[31m';                 // Red
    return '\x1b[37m';                                     // White
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export const apiCli = new ApiCli();
