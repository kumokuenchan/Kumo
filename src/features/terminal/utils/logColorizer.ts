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

// File type color mappings
const FILE_TYPE_COLORS = {
  // Source code - Bright Green
  source: {
    extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'lua', 'pl', 'pm'],
    color: COLORS.brightGreen
  },
  // Markup/Config - Bright Cyan
  config: {
    extensions: ['json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'sass', 'less', 'ini', 'cfg', 'conf'],
    color: COLORS.brightCyan
  },
  // Shell scripts - Bright Yellow
  script: {
    extensions: ['sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1'],
    color: COLORS.brightYellow
  },
  // Images - Bright Magenta
  image: {
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp', 'tiff', 'tif'],
    color: COLORS.brightMagenta
  },
  // Videos - Magenta
  video: {
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v'],
    color: COLORS.magenta
  },
  // Audio - Cyan
  audio: {
    extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'],
    color: COLORS.cyan
  },
  // Documents - Blue
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'tex'],
    color: COLORS.blue
  },
  // Spreadsheets - Green
  spreadsheet: {
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    color: COLORS.green
  },
  // Archives - Red
  archive: {
    extensions: ['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z', 'tgz', 'tbz2'],
    color: COLORS.red
  },
  // Executables - Bright Red (bold)
  executable: {
    extensions: ['exe', 'bin', 'app', 'dmg', 'deb', 'rpm', 'msi'],
    color: COLORS.bold + COLORS.brightRed
  },
  // Database - Yellow
  database: {
    extensions: ['sql', 'db', 'sqlite', 'sqlite3', 'mdb', 'accdb'],
    color: COLORS.yellow
  },
  // Fonts - Bright Blue
  font: {
    extensions: ['ttf', 'otf', 'woff', 'woff2', 'eot'],
    color: COLORS.brightBlue
  },
  // Lock/Log files - Dim
  system: {
    extensions: ['log', 'lock', 'pid', 'tmp', 'temp', 'cache'],
    color: COLORS.dim + COLORS.white
  }
};

/**
 * Get color for a file based on its extension
 */
function getFileColor(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  for (const type of Object.values(FILE_TYPE_COLORS)) {
    if (type.extensions.includes(ext)) {
      return type.color;
    }
  }
  return null;
}

/**
 * Colorize filenames in a line based on their extensions
 * This detects filenames with extensions and applies colors
 */
function colorizeFiles(line: string): string {
  // Pattern to match filenames with extensions
  // Matches: filename.ext, path/filename.ext, etc.
  const filePattern = /\b([\w.-]*\w+\.\w+)\b/g;

  let colorizedLine = line;
  const matches = line.match(filePattern);

  if (matches) {
    matches.forEach(filename => {
      const color = getFileColor(filename);
      if (color) {
        // Use a more specific regex to replace only exact matches
        const regex = new RegExp(`\\b${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        colorizedLine = colorizedLine.replace(
          regex,
          `${color}${filename}${COLORS.reset}`
        );
      }
    });
  }

  return colorizedLine;
}

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

  // Colorize file names based on extensions (do this last to avoid conflicts)
  colorizedLine = colorizeFiles(colorizedLine);

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

  // Check if line contains any log-like patterns or filenames
  const hasLogPattern =
    Object.values(LOG_LEVEL_PATTERNS).some(pattern => pattern.test(line)) ||
    PATTERNS.timestamp.test(line) ||
    PATTERNS.ipv4.test(line) ||
    PATTERNS.httpSuccess.test(line) ||
    PATTERNS.httpClientError.test(line) ||
    PATTERNS.httpServerError.test(line);

  // Check if line contains filenames with extensions
  const hasFilenames = /\b[\w.-]*\w+\.\w+\b/.test(line);

  return hasLogPattern || hasFilenames;
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

/**
 * Get file type color reference for documentation
 * Returns a map of file categories to their color codes and extensions
 */
export function getFileTypeColors() {
  return FILE_TYPE_COLORS;
}

/**
 * Get the color for a specific file extension
 * @param extension - File extension (without the dot)
 * @returns ANSI color code or null if no color defined
 */
export function getColorForExtension(extension: string): string | null {
  const dummyFile = `file.${extension}`;
  return getFileColor(dummyFile);
}
