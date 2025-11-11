/**
 * Parse cURL command to ApiRequest
 * Supports common cURL flags and formats
 */

import type { ApiRequest } from '../api/apiTester';

export function parseCurlCommand(curlCommand: string): ApiRequest | null {
  try {
    // Check if it looks like a valid cURL command first
    if (!looksLikeCurl(curlCommand)) {
      return null;
    }

    // Clean up the command
    let cmd = curlCommand.trim();

    // Remove 'curl' at the beginning
    cmd = cmd.replace(/^curl\s+/i, '');

    // Handle line continuations (backslash)
    cmd = cmd.replace(/\\\s*\n\s*/g, ' ');

    // Initialize request object
    const request: ApiRequest = {
      method: 'GET',
      url: '',
    };

    // Extract method (-X or --request) first
    const methodMatch = cmd.match(/(?:-X|--request)\s+(['"?]?)(\w+)\1/i);
    if (methodMatch) {
      request.method = methodMatch[2].toUpperCase() as ApiRequest['method'];
      cmd = cmd.replace(methodMatch[0], '').trim();
    }

    // Extract URL (first unquoted argument or first quoted string)
    const urlMatch = cmd.match(/^(['"?])(.*?)\1/) || cmd.match(/^([^\s-]+)/);
    if (urlMatch) {
      request.url = urlMatch[2] || urlMatch[1];
      cmd = cmd.substring(urlMatch[0].length).trim();
    }

    // Extract headers (-H or --header)
    const headers: Record<string, string> = {};
    let headerMatch;
    const headerRegex = /(?:-H|--header)\s+(['"])(.*?)\1/g;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
      const headerStr = headerMatch[2];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex > 0) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
    request.headers = headers;

    // Extract data/body (-d, --data, --data-raw, --data-binary, --data-urlencode)
    const dataMatch = cmd.match(/(?:-d|--data|--data-raw|--data-binary|--data-urlencode)\s+(['"])([\s\S]*?)\1/);
    if (dataMatch) {
      const bodyStr = dataMatch[2];

      // Try to parse as JSON
      try {
        request.body = JSON.parse(bodyStr);
      } catch {
        // If not JSON, store as string
        request.body = bodyStr;
      }
    }

    // Extract basic auth (-u or --user)
    const authMatch = cmd.match(/(?:-u|--user)\s+(['"]?)([^'"\s]+)\1/);
    if (authMatch) {
      const [username, password = ''] = authMatch[2].split(':');
      request.auth = {
        type: 'basic',
        username,
        password,
      };
    }

    // Extract bearer token from Authorization header
    if (headers['Authorization'] || headers['authorization']) {
      const authHeader = headers['Authorization'] || headers['authorization'];
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      if (bearerMatch) {
        request.auth = {
          type: 'bearer',
          bearerToken: bearerMatch[1],
        };
        // Remove from headers as it will be applied via auth
        delete headers['Authorization'];
        delete headers['authorization'];
      }
    }

    // If URL is empty, return null
    if (!request.url) {
      return null;
    }

    return request;
  } catch (error) {
    console.error('Failed to parse cURL command:', error);
    return null;
  }
}

/**
 * Validate if a string looks like a cURL command
 */
export function looksLikeCurl(text: string): boolean {
  if (!text) return false;
  
  // Must start with "curl " (not just "curl") - allow leading whitespace
  if (!/^[ \t\n]*curl\s+/i.test(text)) {
    return false;
  }
  
  const trimmed = text.trim();
  // Remove the "curl " part to check what's after it
  const afterCurl = trimmed.replace(/^curl\s+/i, '');
  
  // Must have something after "curl "
  if (!afterCurl) {
    return false;
  }
  
  // Check for specific valid curl flags and patterns
  // Valid single dash flags: -X, -H, -d, -i, --user, -u, -v
  // Valid double dash flags: --request, --header, --data, etc.
  // Valid URLs: http://, https://, ftp://, localhost, domain names
  // Valid arguments
  
  const validStartPatterns = [
    /^-X\s/,              // -X (with space after)
    /^-H\s/,              // -H (with space after)  
    /^-d\s/,              // -d (with space after)
    /^-i\s/,              // -i (with space after)
    /^-u\s/,              // -u (with space after)
    /^-[A-Za-z]+/,        // Any single dash flag
    /^--[a-zA-Z-]+/,      // Double dash flags
    /^[a-zA-Z]+:\/\//,    // URL protocols
    /^(localhost|\d+\.\d+\.\d+\.\d+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/, // Hostnames/IPs
    /^\S/                 // Any other non-space
  ];
  
  return validStartPatterns.some(pattern => pattern.test(afterCurl));
}
