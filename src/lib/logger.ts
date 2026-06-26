/**
 * Configurable logging utility for SQL Visualizer
 * Provides logging levels, filtering, and console output control
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  modules: Record<string, LogLevel>;
}

// Log level hierarchy (lower number = higher priority)
const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Default configuration
const defaultConfig: LoggerConfig = {
  enabled: true,
  minLevel: process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG',
  modules: {},
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Initialize logger configuration
 * @param userConfig - Partial config to merge with defaults
 */
export function initLogger(userConfig: Partial<LoggerConfig> = {}) {
  config = { ...defaultConfig, ...userConfig };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...config };
}

/**
 * Set minimum log level globally
 */
export function setLogLevel(level: LogLevel) {
  config.minLevel = level;
}

/**
 * Set log level for specific module
 */
export function setModuleLogLevel(moduleName: string, level: LogLevel) {
  config.modules[moduleName] = level;
}

/**
 * Enable/disable logging globally
 */
export function setLoggingEnabled(enabled: boolean) {
  config.enabled = enabled;
}

/**
 * Check if a log message should be output
 */
function shouldLog(level: LogLevel, moduleName?: string): boolean {
  if (!config.enabled) return false;

  const logLevelValue = LOG_LEVELS[level];

  // Check module-specific level first
  if (moduleName && config.modules[moduleName]) {
    const moduleLevel = LOG_LEVELS[config.modules[moduleName]];
    return logLevelValue >= moduleLevel;
  }

  // Fall back to global level
  return logLevelValue >= LOG_LEVELS[config.minLevel];
}

/**
 * Format log message with timestamp and module
 */
function formatMessage(level: LogLevel, moduleName: string | undefined, args: any[]): string {
  const timestamp = new Date().toISOString();
  const module = moduleName ? `[${moduleName}]` : '';
  const levelStr = `[${level}]`;
  return `${timestamp} ${levelStr} ${module}`.trim();
}

/**
 * Logger instance for a specific module
 */
export class Logger {
  constructor(private moduleName: string) {}

  debug(...args: any[]) {
    if (shouldLog('DEBUG', this.moduleName)) {
      const prefix = formatMessage('DEBUG', this.moduleName, args);
      console.log(`%c${prefix}`, 'color: #888; font-weight: bold;', ...args);
    }
  }

  info(...args: any[]) {
    if (shouldLog('INFO', this.moduleName)) {
      const prefix = formatMessage('INFO', this.moduleName, args);
      console.info(`%c${prefix}`, 'color: #0066cc; font-weight: bold;', ...args);
    }
  }

  warn(...args: any[]) {
    if (shouldLog('WARN', this.moduleName)) {
      const prefix = formatMessage('WARN', this.moduleName, args);
      console.warn(`%c${prefix}`, 'color: #ff9900; font-weight: bold;', ...args);
    }
  }

  error(...args: any[]) {
    if (shouldLog('ERROR', this.moduleName)) {
      const prefix = formatMessage('ERROR', this.moduleName, args);
      console.error(`%c${prefix}`, 'color: #cc0000; font-weight: bold;', ...args);
    }
  }
}

/**
 * Create logger for a specific module
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}

// Export default logger for global use
export const globalLogger = createLogger('Global');
