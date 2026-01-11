import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  generateCorrelationId,
  getLogContext,
  withCorrelationId,
  createLogger,
  EnhancedSecureLogger,
  createChildLogger,
  createLoggingMiddleware,
  LOG_LEVELS,
} from '../../../src/utils/logger';

describe('generateCorrelationId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).not.toBe(id2);
  });

  it('should contain timestamp component', () => {
    const before = Date.now();
    const id = generateCorrelationId();
    const after = Date.now();

    const timestampPart = parseInt(id.split('-')[0]);

    expect(timestampPart).toBeGreaterThanOrEqual(before);
    expect(timestampPart).toBeLessThanOrEqual(after);
  });

  it('should have expected format', () => {
    const id = generateCorrelationId();

    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe('withCorrelationId', () => {
  it('should set context during callback execution', () => {
    let capturedContext;

    withCorrelationId('test-correlation-id', () => {
      capturedContext = getLogContext();
    });

    expect(capturedContext).toBeDefined();
    expect(capturedContext!.correlationId).toBe('test-correlation-id');
  });

  it('should return callback result', () => {
    const result = withCorrelationId('test-id', () => {
      return 'callback result';
    });

    expect(result).toBe('callback result');
  });

  it('should include additional context', () => {
    let capturedContext;

    withCorrelationId(
      'test-id',
      () => {
        capturedContext = getLogContext();
      },
      {
        method: 'GET',
        url: '/api/test',
        userId: 'user-123',
      }
    );

    expect(capturedContext!.method).toBe('GET');
    expect(capturedContext!.url).toBe('/api/test');
    expect(capturedContext!.userId).toBe('user-123');
  });

  it('should restore context after callback', () => {
    withCorrelationId('test-id', () => {
      // Inside context
    });

    const contextAfter = getLogContext();
    expect(contextAfter).toBeUndefined();
  });
});

describe('getLogContext', () => {
  it('should return undefined when no context set', () => {
    const context = getLogContext();

    expect(context).toBeUndefined();
  });

  it('should return context when set', () => {
    withCorrelationId('test-id', () => {
      const context = getLogContext();
      expect(context).toBeDefined();
      expect(context!.correlationId).toBe('test-id');
    });
  });
});

describe('createLogger', () => {
  it('should create logger with default options', () => {
    const logger = createLogger({});

    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should create logger with console transport', () => {
    const logger = createLogger({ enableConsole: true });

    expect(logger.transports.length).toBeGreaterThan(0);
  });

  it('should create logger without console transport', () => {
    const logger = createLogger({ enableConsole: false });

    // Custom transports might still be added
    expect(logger).toBeDefined();
  });

  it('should create logger with file transport', () => {
    const logger = createLogger({
      enableConsole: false,
      enableFile: true,
      filename: 'test.log',
    });

    expect(logger.transports.length).toBeGreaterThan(0);
  });

  it('should respect log level', () => {
    const logger = createLogger({ level: 'error' });

    expect(logger.level).toBe('error');
  });

  it('should accept custom transports', () => {
    const customTransport = {
      log: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      listenerCount: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      eventNames: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      off: vi.fn(),
    } as any;

    const logger = createLogger({
      enableConsole: false,
      customTransports: [customTransport],
    });

    // Custom transport is added to the logger's transports
    expect(logger.transports.length).toBeGreaterThan(0);
  });
});

describe('EnhancedSecureLogger', () => {
  let logger: EnhancedSecureLogger;

  beforeEach(() => {
    logger = new EnhancedSecureLogger({}, { enableConsole: false });
  });

  describe('logWithCorrelation', () => {
    it('should log with correlation ID', () => {
      expect(() => {
        logger.logWithCorrelation('info', 'Test message', 'corr-123', {
          extra: 'data',
        });
      }).not.toThrow();
    });

    it('should handle different log levels', () => {
      expect(() => {
        logger.logWithCorrelation('error', 'Error message', 'corr-123');
        logger.logWithCorrelation('warn', 'Warning message', 'corr-123');
        logger.logWithCorrelation('debug', 'Debug message', 'corr-123');
      }).not.toThrow();
    });
  });

  describe('startRequest', () => {
    it('should return context with correlation ID', () => {
      const context = logger.startRequest('corr-123', 'GET', '/api/test');

      expect(context.correlationId).toBe('corr-123');
      expect(context.method).toBe('GET');
      expect(context.url).toBe('/api/test');
      expect(context.startTime).toBeDefined();
    });

    it('should include userId when provided', () => {
      const context = logger.startRequest(
        'corr-123',
        'GET',
        '/api/test',
        'user-456'
      );

      expect(context.userId).toBe('user-456');
    });
  });

  describe('endRequest', () => {
    it('should log warning when no context', () => {
      expect(() => {
        logger.endRequest(200);
      }).not.toThrow();
    });

    it('should log success when no error', () => {
      expect(() => {
        withCorrelationId(
          'test-id',
          () => {
            logger.endRequest(200);
          },
          { startTime: Date.now() - 100 }
        );
      }).not.toThrow();
    });

    it('should log error when error provided', () => {
      expect(() => {
        withCorrelationId(
          'test-id',
          () => {
            logger.endRequest(500, new Error('Test error'));
          },
          { startTime: Date.now() - 100 }
        );
      }).not.toThrow();
    });

    it('should handle missing startTime', () => {
      expect(() => {
        withCorrelationId('test-id', () => {
          logger.endRequest(200);
        });
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should log performance metrics', () => {
      expect(() => {
        logger.performance('database_query', 150, { query: 'SELECT *' });
      }).not.toThrow();
    });
  });

  describe('apiCall', () => {
    it('should log API call metrics', () => {
      expect(() => {
        logger.apiCall('POST', '/api/search', 200, 250, {
          requestSize: 100,
        });
      }).not.toThrow();
    });
  });

  describe('jsonSerialization', () => {
    it('should log successful serialization', () => {
      expect(() => {
        logger.jsonSerialization('serialize', true, {
          dataType: 'object',
          duration: 5,
        });
      }).not.toThrow();
    });

    it('should log failed deserialization', () => {
      expect(() => {
        logger.jsonSerialization('deserialize', false, {
          error: 'Invalid JSON',
        });
      }).not.toThrow();
    });

    it('should log validation events', () => {
      expect(() => {
        logger.jsonSerialization('validate', true, {
          sanitized: true,
        });
      }).not.toThrow();
    });
  });

  describe('mcpProtocol', () => {
    it('should log MCP request events', () => {
      expect(() => {
        logger.mcpProtocol('request', 'tools/call', {
          requestId: 'req-123',
          toolName: 'search',
        });
      }).not.toThrow();
    });

    it('should log MCP response events', () => {
      expect(() => {
        logger.mcpProtocol('response', 'tools/call', {
          duration: 100,
          responseSize: 500,
        });
      }).not.toThrow();
    });

    it('should log MCP error events', () => {
      expect(() => {
        logger.mcpProtocol('error', 'tools/call', {
          error: 'Tool not found',
        });
      }).not.toThrow();
    });

    it('should log MCP tool call events', () => {
      expect(() => {
        logger.mcpProtocol('tool_call', undefined, {
          toolName: 'search',
        });
      }).not.toThrow();
    });

    it('should log MCP resource access events', () => {
      expect(() => {
        logger.mcpProtocol('resource_access', undefined, {
          resourceUri: 'file:///test',
        });
      }).not.toThrow();
    });
  });

  describe('jsonRpc', () => {
    it('should log JSON-RPC request events', () => {
      expect(() => {
        logger.jsonRpc('request', 'tools/call', {
          id: 'req-123',
        });
      }).not.toThrow();
    });

    it('should log JSON-RPC response events', () => {
      expect(() => {
        logger.jsonRpc('response', 'tools/call', {
          duration: 100,
        });
      }).not.toThrow();
    });

    it('should log JSON-RPC notification events', () => {
      expect(() => {
        logger.jsonRpc('notification', 'progress');
      }).not.toThrow();
    });

    it('should log JSON-RPC error events', () => {
      expect(() => {
        logger.jsonRpc('error', 'tools/call', {
          error: { code: -32600, message: 'Invalid request' },
        });
      }).not.toThrow();
    });
  });

  describe('responseValidation', () => {
    it('should log passed validation', () => {
      expect(() => {
        logger.responseValidation('schema_validation', 'passed', {
          method: 'search',
        });
      }).not.toThrow();
    });

    it('should log failed validation', () => {
      expect(() => {
        logger.responseValidation('schema_validation', 'failed', {
          validationErrors: ['Invalid field'],
        });
      }).not.toThrow();
    });

    it('should log warning validation', () => {
      expect(() => {
        logger.responseValidation('compliance_check', 'warning', {
          sanitizationApplied: true,
        });
      }).not.toThrow();
    });

    it('should log pre_serialization stage', () => {
      expect(() => {
        logger.responseValidation('pre_serialization', 'passed');
      }).not.toThrow();
    });

    it('should log post_serialization stage', () => {
      expect(() => {
        logger.responseValidation('post_serialization', 'passed');
      }).not.toThrow();
    });
  });
});

describe('createChildLogger', () => {
  it('should create child logger with context', () => {
    const childLogger = createChildLogger({ service: 'test-service' });

    expect(childLogger).toBeInstanceOf(EnhancedSecureLogger);
  });

  it('should include context in log calls', () => {
    const childLogger = createChildLogger({ service: 'test-service' });

    // Should not throw
    expect(() => {
      childLogger.info('Test message', { extra: 'data' });
    }).not.toThrow();
  });

  it('should handle log calls without additional meta', () => {
    const childLogger = createChildLogger({ service: 'test-service' });

    expect(() => {
      childLogger.info('Test message');
    }).not.toThrow();
  });

  it('should accept sanitize options', () => {
    const childLogger = createChildLogger(
      { service: 'test-service' },
      { sensitiveFields: ['password'] }
    );

    expect(childLogger).toBeInstanceOf(EnhancedSecureLogger);
  });
});

describe('createLoggingMiddleware', () => {
  it('should create middleware function', () => {
    const middleware = createLoggingMiddleware();

    expect(typeof middleware).toBe('function');
  });

  it('should call next function', () => {
    const middleware = createLoggingMiddleware();
    const req = {
      headers: {},
      method: 'GET',
      url: '/test',
    };
    const res = {
      setHeader: vi.fn(),
      statusCode: 200,
      end: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should set correlation ID header', () => {
    const middleware = createLoggingMiddleware();
    const req = {
      headers: {},
      method: 'GET',
      url: '/test',
    };
    const res = {
      setHeader: vi.fn(),
      statusCode: 200,
      end: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      expect.any(String)
    );
  });

  it('should use existing correlation ID from request', () => {
    const middleware = createLoggingMiddleware();
    const req = {
      headers: { 'x-correlation-id': 'existing-id' },
      method: 'GET',
      url: '/test',
    };
    const res = {
      setHeader: vi.fn(),
      statusCode: 200,
      end: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'existing-id'
    );
  });

  it('should log request completion on res.end', () => {
    const middleware = createLoggingMiddleware();
    const req = {
      headers: {},
      method: 'GET',
      url: '/test',
    };
    const originalEnd = vi.fn();
    const res = {
      setHeader: vi.fn(),
      statusCode: 200,
      end: originalEnd,
    };
    const next = vi.fn();

    middleware(req, res, next);

    // Call the wrapped end function
    res.end();

    expect(originalEnd).toHaveBeenCalled();
  });
});

describe('LOG_LEVELS', () => {
  it('should have expected log levels', () => {
    expect(LOG_LEVELS.error).toBe(0);
    expect(LOG_LEVELS.warn).toBe(1);
    expect(LOG_LEVELS.info).toBe(2);
    expect(LOG_LEVELS.http).toBe(3);
    expect(LOG_LEVELS.verbose).toBe(4);
    expect(LOG_LEVELS.debug).toBe(5);
    expect(LOG_LEVELS.silly).toBe(6);
  });

  it('should have error as highest priority', () => {
    expect(LOG_LEVELS.error).toBeLessThan(LOG_LEVELS.warn);
    expect(LOG_LEVELS.warn).toBeLessThan(LOG_LEVELS.info);
    expect(LOG_LEVELS.info).toBeLessThan(LOG_LEVELS.debug);
  });
});
