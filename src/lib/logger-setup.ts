/**
 * Logger Configuration Examples
 *
 * This file demonstrates how to configure and use the logging system
 * in SQL Visualizer with different log levels and filtering options.
 */

import {
  initLogger,
  setLogLevel,
  setModuleLogLevel,
  createLogger,
  type LogLevel,
} from '@/lib/logger';

/**
 * EXAMPLE 1: Initialize logger on app startup
 * Place this in your app initialization (e.g., in layout.tsx or a useEffect)
 */
export function setupLogging() {
  // Option A: Simple configuration - all DEBUG and above in development
  initLogger({
    enabled: true,
    minLevel: process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG',
  });

  // Option B: Production setup - only WARN and ERROR
  // initLogger({
  //   enabled: true,
  //   minLevel: 'WARN',
  // });

  // Option C: Development with selective module debugging
  // initLogger({
  //   enabled: true,
  //   minLevel: 'INFO', // Global level
  //   modules: {
  //     'sqlAnalyzer': 'DEBUG', // Verbose for SQL analysis
  //     'complexityScorer': 'DEBUG', // Verbose for scoring
  //   }
  // });
}

/**
 * EXAMPLE 2: Use logger in a component or utility
 */
export function exampleComponentLogging() {
  const logger = createLogger('MyComponent');

  logger.debug('Component mounted'); // Only shows in DEBUG mode
  logger.info('User action completed'); // Shows in INFO+ modes
  logger.warn('Performance issue detected'); // Shows in WARN+ modes
  logger.error('Failed to parse query'); // Always shows if logging enabled
}

/**
 * EXAMPLE 3: Dynamic log level control (useful for debugging)
 * You can add this to your developer tools or settings panel
 */
export function setupDebugControls() {
  // Make logging functions available in browser console for debugging
  (globalThis as any).debugLogging = {
    // Set global log level
    setLevel: (level: LogLevel) => {
      setLogLevel(level);
      console.log(`Global log level set to: ${level}`);
    },
    // Set module-specific level
    setModuleLevel: (moduleName: string, level: LogLevel) => {
      setModuleLogLevel(moduleName, level);
      console.log(`${moduleName} log level set to: ${level}`);
    },
    // Quick shortcuts
    verbose: () => setLogLevel('DEBUG'),
    quiet: () => setLogLevel('ERROR'),
    normal: () => setLogLevel('WARN'),
  };

  console.log('Debug controls available: window.debugLogging');
}

/**
 * LOG LEVELS EXPLAINED:
 *
 * DEBUG (0) - Most verbose, shows all messages
 *   Use for: Detailed tracing, variable values, AST data
 *   Example: logger.debug('AST:', ast)
 *
 * INFO (1) - General information
 *   Use for: Important lifecycle events, feature usage
 *   Example: logger.info('Query analyzed successfully')
 *
 * WARN (2) - Warning messages, fallbacks triggered
 *   Use for: Deprecated features, missing optional dependencies
 *   Example: logger.warn('dt-sql-parser not available')
 *
 * ERROR (3) - Errors only, least verbose
 *   Use for: Exceptions, critical failures
 *   Example: logger.error('Failed to parse SQL:', error)
 *
 * FILTERING:
 * - Set minLevel to 'WARN' in production to reduce console noise
 * - Override specific modules to 'DEBUG' for targeted troubleshooting
 * - Use setLoggingEnabled(false) to completely disable logging
 */

/**
 * INTEGRATION POINTS:
 *
 * 1. App initialization (next.config.mjs or app/layout.tsx):
 *    import { setupLogging, setupDebugControls } from '@/lib/logger-setup'
 *    setupLogging()
 *    if (process.env.NODE_ENV === 'development') setupDebugControls()
 *
 * 2. Components using logger:
 *    import { createLogger } from '@/lib/logger'
 *    const logger = createLogger('ComponentName')
 *    logger.debug('Component state:', state)
 *
 * 3. Browser DevTools for runtime control:
 *    debugLogging.setLevel('DEBUG')  // Enable verbose
 *    debugLogging.setModuleLevel('sqlAnalyzer', 'DEBUG')  // Debug specific module
 *    debugLogging.quiet()  // Reduce to errors only
 */
