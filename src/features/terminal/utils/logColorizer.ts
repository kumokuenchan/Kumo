/**
 * Log Colorizer Utility
 * Detects and colorizes common log patterns in terminal output
 */

export interface ColorizeOptions {
  enabled: boolean;
  colorScheme?: 'default' | 'solarized' | 'monokai';
}

// ANSI color codes
const COLORS = {
  // Regular colors
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Log level patterns
const LOG_LEVEL_PATTERNS = {
  error: /\b(ERROR|FATAL|CRIT|CRITICAL|FAIL|FAILED)\b/gi,
  warn: /\b(WARN|WARNING|CAUTION)\b/gi,
  info: /\b(INFO|INFORMATION|NOTICE)\b/gi,
  debug: /\b(DEBUG|TRACE|VERBOSE)\b/gi,
  success: /\b(SUCCESS|OK|PASS|PASSED|COMPLETE|COMPLETED)\b/gi,
};

// Other patterns
const PATTERNS = {
  // Timestamp patterns (ISO 8601, common formats)
  timestamp: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\d{2}:\d{2}:\d{2}(?:\.\d+)?|\d{2}\/\d{2}\/\d{4}/g,

  // IP addresses (IPv4 and IPv6)
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,

  // URLs
  url: /https?:\/\/[^\s]+/g,

  // File paths (Unix and Windows)
  filePath: /(?:\/[\w.-]+)+\/?|[A-Z]:\\(?:[\w.-]+\\)*[\w.-]*/g,

  // Numbers (integers, floats, hex)
  number: /\b-?\d+\.?\d*(?:e[+-]?\d+)?\b/g,
  hexNumber: /\b0x[0-9a-fA-F]+\b/gi,

  // JSON-like structures
  jsonKey: /"([^"]+)":/g,
  jsonString: /:\s*"([^"]*)"/g,

  // HTTP status codes
  httpSuccess: /\b(200|201|202|204)\b/g,
  httpRedirect: /\b(301|302|303|307|308)\b/g,
  httpClientError: /\b(400|401|403|404|409|422)\b/g,
  httpServerError: /\b(500|502|503|504)\b/g,

  // Common log indicators
  arrow: /[-=]>|<[-=]/g,
  pipe: /\|/g,
  bracket: /[\[\]]/g,

  // Docker-specific patterns
  containerID: /\b[0-9a-f]{12}\b/g,
  dockerImage: /[\w.-]+\/[\w.-]+:[\w.-]+/g,
};

/**
 * Colorize log output based on detected patterns
 */
export function colorizeLine(line: string, options: ColorizeOptions = { enabled: true }): string {
  if (!options.enabled) {
    return line;
  }

  let colorizedLine = line;

  // Colorize log levels (order matters - do this first)
  colorizedLine = colorizedLine.replace(
    LOG_LEVEL_PATTERNS.error,
    `${COLORS.bold}${COLORS.brightRed}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    LOG_LEVEL_PATTERNS.warn,
    `${COLORS.bold}${COLORS.brightYellow}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    LOG_LEVEL_PATTERNS.info,
    `${COLORS.brightCyan}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    LOG_LEVEL_PATTERNS.debug,
    `${COLORS.dim}${COLORS.white}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    LOG_LEVEL_PATTERNS.success,
    `${COLORS.bold}${COLORS.brightGreen}$&${COLORS.reset}`
  );

  // Colorize HTTP status codes
  colorizedLine = colorizedLine.replace(
    PATTERNS.httpSuccess,
    `${COLORS.green}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    PATTERNS.httpRedirect,
    `${COLORS.cyan}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    PATTERNS.httpClientError,
    `${COLORS.yellow}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    PATTERNS.httpServerError,
    `${COLORS.red}$&${COLORS.reset}`
  );

  // Colorize timestamps
  colorizedLine = colorizedLine.replace(
    PATTERNS.timestamp,
    `${COLORS.dim}${COLORS.cyan}$&${COLORS.reset}`
  );

  // Colorize IP addresses
  colorizedLine = colorizedLine.replace(
    PATTERNS.ipv4,
    `${COLORS.magenta}$&${COLORS.reset}`
  );

  colorizedLine = colorizedLine.replace(
    PATTERNS.ipv6,
    `${COLORS.magenta}$&${COLORS.reset}`
  );

  // Colorize URLs
  colorizedLine = colorizedLine.replace(
    PATTERNS.url,
    `${COLORS.blue}${COLORS.bold}$&${COLORS.reset}`
  );

  // Colorize file paths (be careful not to colorize too much)
  // Only colorize if it looks like a real path
  const pathMatches = colorizedLine.match(/(?:\/[\w.-]+){2,}\/?|[A-Z]:\\(?:[\w.-]+\\){2,}[\w.-]*/g);
  if (pathMatches) {
    pathMatches.forEach(path => {
      colorizedLine = colorizedLine.replace(
        path,
        `${COLORS.yellow}${path}${COLORS.reset}`
      );
    });
  }

  // Colorize hex numbers
  colorizedLine = colorizedLine.replace(
    PATTERNS.hexNumber,
    `${COLORS.brightMagenta}$&${COLORS.reset}`
  );

  // Colorize JSON keys
  colorizedLine = colorizedLine.replace(
    PATTERNS.jsonKey,
    `${COLORS.cyan}"$1"${COLORS.reset}:`
  );

  // Colorize JSON string values
  colorizedLine = colorizedLine.replace(
    /:\s*"([^"]*)"/g,
    `: ${COLORS.green}"$1"${COLORS.reset}`
  );

  // Colorize Docker container IDs
  colorizedLine = colorizedLine.replace(
    PATTERNS.containerID,
    `${COLORS.brightBlue}$&${COLORS.reset}`
  );

  // Colorize Docker image names
  colorizedLine = colorizedLine.replace(
    PATTERNS.dockerImage,
    `${COLORS.brightCyan}$&${COLORS.reset}`
  );

  // Colorize arrows and pipes (common in logs)
  colorizedLine = colorizedLine.replace(
    PATTERNS.arrow,
    `${COLORS.dim}$&${COLORS.reset}`
  );

  return colorizedLine;
}

/**
 * Detect if a line contains logs that should be colorized
 */
export function shouldColorizeLine(line: string): boolean {
  // Check if line already has ANSI codes
  if (line.includes('\x1b[')) {
    return false;
  }

  // Check if line contains any log-like patterns
  const hasLogPattern =
    Object.values(LOG_LEVEL_PATTERNS).some(pattern => pattern.test(line)) ||
    PATTERNS.timestamp.test(line) ||
    PATTERNS.ipv4.test(line) ||
    PATTERNS.httpSuccess.test(line) ||
    PATTERNS.httpClientError.test(line) ||
    PATTERNS.httpServerError.test(line);

  return hasLogPattern;
}

/**
 * Auto-detect and colorize logs
 */
export function autoColorizeLogs(text: string, options: ColorizeOptions = { enabled: true }): string {
  if (!options.enabled) {
    return text;
  }

  const lines = text.split('\n');
  return lines
    .map(line => {
      // Auto-detect if line should be colorized
      if (shouldColorizeLine(line)) {
        return colorizeLine(line, options);
      }
      return line;
    })
    .join('\n');
}
