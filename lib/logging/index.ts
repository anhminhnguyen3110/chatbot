/**
 * Enhanced logging system for Next.js with optional Winston CloudWatch support
 * Works in both development and production environments
 */

// Type definitions
export interface LogMetadata {
  [key: string]: any;
}

export interface Logger {
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
}

// Import Winston logger (server-side only)
let winstonLogger: any = null;
if (typeof window === 'undefined') {
  try {
    const winstonModule = require('./winston-logger');
    winstonLogger = winstonModule.winstonLogger;
  } catch (error) {
    // Winston not available - will fall back to console logging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Winston CloudWatch not available, using console logging:', error);
    }
  }
}

// Simple logger implementation (fallback)
class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    
    // ANSI color codes for different log levels
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      debug: '\x1b[90m',   // Gray
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[level as keyof typeof colors] || colors.reset;
    const coloredLevel = `${color}${level.toUpperCase()}${colors.reset}`;
    
    let logEntry = `[${timestamp}] [${coloredLevel}]: ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      logEntry += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    
    return logEntry;
  }

  info(message: string, metadata?: LogMetadata): void {
    if (winstonLogger) {
      winstonLogger.info(message, metadata);
    } else {
      console.log(this.formatMessage('info', message, metadata));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (winstonLogger) {
      winstonLogger.warn(message, metadata);
    } else {
      console.warn(this.formatMessage('warn', message, metadata));
    }
  }

  error(message: string, metadata?: LogMetadata): void {
    if (winstonLogger) {
      winstonLogger.error(message, metadata);
    } else {
      console.error(this.formatMessage('error', message, metadata));
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (winstonLogger) {
      winstonLogger.debug(message, metadata);
    } else if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, metadata));
    }
  }
}

// Export the logger instance
export const logger = new SimpleLogger();

// Initialize logging and report status
if (typeof window === 'undefined') {
  const environment = process.env.NODE_ENV || 'development';
  const cloudWatchEnabled = winstonLogger?.isCloudWatchEnabled?.() || false;
  
  logger.info('Logging system initialized successfully', { 
    environment,
    cloudWatchEnabled,
    winston: !!winstonLogger,
    timestamp: new Date().toISOString()
  });
}

// Export winston logger for advanced usage
export { winstonLogger };

// Utility functions for creating structured metadata
export function createRequestMetadata(
  requestId: string,
  method: string,
  url: string,
  userId?: string
): LogMetadata {
  return {
    requestId,
    method,
    url,
    userId,
    component: 'http-request',
    timestamp: new Date().toISOString()
  };
}

export function createChatMetadata(
  action: string,
  userId?: string,
  conversationId?: string,
  model?: string,
  tokenCount?: number
): LogMetadata {
  return {
    action,
    userId,
    conversationId,
    model,
    tokenCount,
    component: 'chat',
    timestamp: new Date().toISOString()
  };
}

export function formatError(error: Error): LogMetadata {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    component: 'error-handler',
    timestamp: new Date().toISOString()
  };
}

// Example usage and setup guide
export const USAGE_EXAMPLES = {
  basic: `
import { logger } from '@/lib/logging';

// Basic logging
logger.info('Application started');
logger.error('Database connection failed', { 
  error: 'Connection timeout',
  retryCount: 3 
});
`,
  
  withMetadata: `
import { logger, createRequestMetadata } from '@/lib/logging';

// Logging with structured metadata
const metadata = createRequestMetadata('req-123', 'POST', '/api/chat', 'user-456');
logger.info('Processing chat request', metadata);
`,
  
  cloudWatch: `
import { logger, winstonLogger } from '@/lib/logging';

// Basic logging (automatically routes to CloudWatch in production)
logger.info('Application started');
logger.error('Database connection failed', { 
  error: 'Connection timeout',
  retryCount: 3 
});

// Advanced Winston usage
if (winstonLogger) {
  const winston = winstonLogger.getWinstonLogger();
  winston.log('custom', 'Custom log level', { customData: true });
}
`,
  
  performance: `
import { logger } from '@/lib/logging';

// Performance logging with timing
const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

logger.info('Operation completed', { 
  operation: 'database-query',
  duration,
  query: 'SELECT * FROM users' 
});
`
};