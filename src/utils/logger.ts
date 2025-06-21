/**
 * Enhanced Winston logger with correlation ID support and structured logging
 */

import { AsyncLocalStorage } from 'async_hooks';

import winston from 'winston';

import { SecureLogger, SanitizeOptions } from '../config/logging.js';

/**
 * Context information for request correlation
 */
export interface LogContext {
  correlationId: string;
  userId?: string;
  method?: string;
  url?: string;
  startTime?: number;
}

/**
 * Async local storage for maintaining request context
 */
const contextStorage = new AsyncLocalStorage<LogContext>();

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current request context
 */
export function getLogContext(): LogContext | undefined {
  return contextStorage.getStore();
}

/**
 * Set correlation ID for current async context
 */
export function withCorrelationId<T>(
  correlationId: string,
  callback: () => T,
  additionalContext?: Partial<Omit<LogContext, 'correlationId'>>
): T {
  const context: LogContext = {
    correlationId,
    ...additionalContext,
  };
  return contextStorage.run(context, callback);
}

/**
 * Custom formatter that includes correlation ID and structured data
 */
const correlationFormatter = winston.format(info => {
  const context = getLogContext();
  if (context) {
    info.correlationId = context.correlationId;
    info.userId = context.userId;
    info.method = context.method;
    info.url = context.url;

    // Add duration if start time is available
    if (context.startTime) {
      info.duration = Date.now() - context.startTime;
    }
  }

  return info;
});

/**
 * Create Winston logger with enhanced configuration
 */
export function createLogger(options: {
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
  format?: winston.Logform.Format;
  sanitizeOptions?: SanitizeOptions;
  customTransports?: winston.transport[];
}): winston.Logger {
  const {
    level = 'info',
    enableConsole = true,
    enableFile = false,
    filename = 'application.log',
    maxSize = 20 * 1024 * 1024, // 20MB in bytes
    maxFiles = 5,
    format,
    customTransports = [],
  } = options;

  const transports: winston.transport[] = [...customTransports];

  // Console transport with colored output for development
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          correlationFormatter(),
          winston.format.printf(
            ({
              timestamp,
              level,
              message,
              correlationId,
              duration,
              ...meta
            }) => {
              const correlationStr = correlationId ? ` [${correlationId}]` : '';
              const durationStr = duration ? ` (${duration}ms)` : '';
              const metaStr =
                Object.keys(meta).length > 0
                  ? `\n${JSON.stringify(meta, null, 2)}`
                  : '';
              return `${timestamp} ${level}${correlationStr}: ${message}${durationStr}${metaStr}`;
            }
          )
        ),
        // CRITICAL: Send all logs to stderr to avoid polluting stdout in MCP servers
        stderrLevels: ['error', 'warn', 'info', 'debug', 'verbose', 'silly'],
      })
    );
  }

  // File transport with rotation
  if (enableFile) {
    transports.push(
      new winston.transports.File({
        filename,
        maxsize: maxSize,
        maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          correlationFormatter(),
          winston.format.json()
        ),
      })
    );
  }

  const logger = winston.createLogger({
    level,
    format:
      format ||
      winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        correlationFormatter(),
        winston.format.json()
      ),
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Enhanced secure logger with correlation ID support
 */
export class EnhancedSecureLogger extends SecureLogger {
  private winstonLogger: winston.Logger;

  constructor(
    sanitizeOptions: SanitizeOptions = {},
    loggerOptions: Parameters<typeof createLogger>[0] = {}
  ) {
    const winstonLogger = createLogger(loggerOptions);
    super(sanitizeOptions, winstonLogger);
    this.winstonLogger = winstonLogger;
  }

  /**
   * Log with explicit correlation ID
   */
  logWithCorrelation(
    level: string,
    message: string,
    correlationId: string,
    meta?: Record<string, unknown>
  ): void {
    withCorrelationId(correlationId, () => {
      if (level in this.winstonLogger) {
        (
          this.winstonLogger as unknown as Record<
            string,
            (msg: string, meta?: Record<string, unknown>) => void
          >
        )[level](message, meta);
      }
    });
  }

  /**
   * Start a request context with correlation ID
   */
  startRequest(
    correlationId: string,
    method?: string,
    url?: string,
    userId?: string
  ): LogContext {
    const context: LogContext = {
      correlationId,
      method,
      url,
      userId,
      startTime: Date.now(),
    };

    this.info('Request started', {
      correlationId,
      method,
      url,
      userId,
    });

    return context;
  }

  /**
   * End a request context
   */
  endRequest(statusCode?: number, error?: Error): void {
    const context = getLogContext();
    if (!context) {
      this.warn('Attempted to end request without context');
      return;
    }

    const duration = context.startTime
      ? Date.now() - context.startTime
      : undefined;

    if (error) {
      this.error('Request completed with error', {
        statusCode,
        duration,
        error: error.message,
        stack: error.stack,
      });
    } else {
      this.info('Request completed', {
        statusCode,
        duration,
      });
    }
  }

  /**
   * Log performance metrics
   */
  performance(
    operation: string,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    this.info('Performance metric', {
      operation,
      duration,
      ...meta,
    });
  }

  /**
   * Log API call metrics
   */
  apiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    this.info('API call', {
      method,
      url,
      statusCode,
      duration,
      ...meta,
    });
  }

  /**
   * Log JSON serialization events with context
   */
  jsonSerialization(
    operation: 'serialize' | 'deserialize' | 'validate',
    success: boolean,
    meta?: {
      dataType?: string;
      dataSize?: number;
      duration?: number;
      error?: string;
      fallbackUsed?: boolean;
      sanitized?: boolean;
      circularRefs?: boolean;
      depth?: number;
      method?: string;
      requestId?: string;
    }
  ): void {
    const level = success ? 'debug' : 'warn';
    const message = `JSON ${operation} ${success ? 'succeeded' : 'failed'}`;

    this[level](message, {
      operation,
      success,
      ...meta,
    });
  }

  /**
   * Log MCP protocol events
   */
  mcpProtocol(
    event: 'request' | 'response' | 'error' | 'tool_call' | 'resource_access',
    method?: string,
    meta?: {
      requestId?: string;
      toolName?: string;
      resourceUri?: string;
      duration?: number;
      error?: string;
      statusCode?: number;
      responseSize?: number;
      validationStatus?: 'passed' | 'failed' | 'sanitized';
    }
  ): void {
    this.info(`MCP ${event}`, {
      event,
      method,
      ...meta,
    });
  }

  /**
   * Log JSON-RPC 2.0 protocol events
   */
  jsonRpc(
    event: 'request' | 'response' | 'notification' | 'error',
    method?: string,
    meta?: {
      id?: string | number;
      error?: {
        code: number;
        message: string;
        data?: unknown;
      };
      duration?: number;
      responseSize?: number;
      validationErrors?: string[];
    }
  ): void {
    const level = event === 'error' ? 'error' : 'debug';

    this[level](`JSON-RPC ${event}`, {
      event,
      method,
      ...meta,
    });
  }

  /**
   * Log response validation events
   */
  responseValidation(
    stage:
      | 'pre_serialization'
      | 'post_serialization'
      | 'schema_validation'
      | 'compliance_check',
    result: 'passed' | 'failed' | 'warning',
    meta?: {
      method?: string;
      requestId?: string;
      validationErrors?: string[];
      sanitizationApplied?: boolean;
      duration?: number;
      responseSize?: number;
      schemaVersion?: string;
    }
  ): void {
    const level =
      result === 'failed' ? 'error' : result === 'warning' ? 'warn' : 'debug';

    this[level](`Response validation ${stage}`, {
      stage,
      result,
      ...meta,
    });
  }
}

/**
 * Create logger configuration based on environment
 */
function createLoggerConfig() {
  const isTestEnvironment = process.env.NODE_ENV === 'test';

  if (isTestEnvironment) {
    // In test environment, use a silent transport to prevent warnings
    // while still allowing log capture for testing
    return {
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: false,
      enableFile: false,
      // Create a custom transport for test environment
      customTransports: [
        new winston.transports.Console({
          silent: true, // Silent transport prevents output but allows logging calls
          format: winston.format.combine(
            winston.format.timestamp(),
            correlationFormatter(),
            winston.format.json()
          ),
        }),
      ],
    };
  }

  // Non-test environment configuration
  return {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
    filename: process.env.LOG_FILE || 'logs/application.log',
  };
}

/**
 * Default logger instance
 */
export const logger = new EnhancedSecureLogger(
  {}, // Default sanitize options
  createLoggerConfig()
);

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  context: Record<string, unknown>,
  sanitizeOptions?: SanitizeOptions
): EnhancedSecureLogger {
  const childLogger = new EnhancedSecureLogger(sanitizeOptions);

  // Override logging methods to include context
  const originalMethods = [
    'error',
    'warn',
    'info',
    'debug',
    'verbose',
  ] as const;

  originalMethods.forEach(method => {
    const originalMethod = childLogger[method].bind(childLogger);
    childLogger[method] = (...args: unknown[]) => {
      // Add context to the last argument if it's an object, otherwise add as new argument
      const lastArg = args[args.length - 1];
      if (
        typeof lastArg === 'object' &&
        lastArg !== null &&
        !Array.isArray(lastArg)
      ) {
        Object.assign(lastArg as Record<string, unknown>, context);
      } else {
        args.push(context);
      }
      originalMethod(...args);
    };
  });

  return childLogger;
}

/**
 * Middleware helper for Express-like frameworks
 */
export function createLoggingMiddleware() {
  return (
    req: { headers: Record<string, string>; method: string; url: string },
    res: {
      setHeader: (name: string, value: string) => void;
      statusCode: number;
      end: (...args: unknown[]) => void;
    },
    next: () => void
  ) => {
    const correlationId =
      req.headers['x-correlation-id'] || generateCorrelationId();
    const method = req.method;
    const url = req.url;

    // Set correlation ID header in response
    res.setHeader('x-correlation-id', correlationId);

    withCorrelationId(
      correlationId,
      () => {
        logger.startRequest(correlationId, method, url);

        // Override res.end to log completion
        const originalEnd = res.end;
        res.end = function (...args: unknown[]) {
          logger.endRequest(res.statusCode);
          originalEnd.apply(this, args);
        };

        next();
      },
      {
        method,
        url,
        startTime: Date.now(),
      }
    );
  };
}

/**
 * Log levels for reference
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;
