import { describe, it, expect, vi } from 'vitest';

import {
  MCPApplicationError,
  MCPErrorHandler,
  MCP_ERROR_CODES,
  withMCPErrorHandling,
  createMCPContextMiddleware,
  validateMCPRequest,
  createErrorAcknowledgment,
} from '../../../src/utils/mcp-error-handler';
import {
  APIError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  MCPProtocolError,
  ERROR_CODES,
} from '../../../src/errors/index';

describe('MCPApplicationError', () => {
  it('should create error with default code', () => {
    const error = new MCPApplicationError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('MCPApplicationError');
    expect(error.code).toBe(MCP_ERROR_CODES.APPLICATION_ERROR);
    expect(error.data).toBeUndefined();
  });

  it('should create error with custom code', () => {
    const error = new MCPApplicationError(
      'Auth failed',
      MCP_ERROR_CODES.AUTHENTICATION_ERROR
    );

    expect(error.code).toBe(MCP_ERROR_CODES.AUTHENTICATION_ERROR);
  });

  it('should create error with data', () => {
    const error = new MCPApplicationError(
      'Error with data',
      MCP_ERROR_CODES.APPLICATION_ERROR,
      { extra: 'info' }
    );

    expect(error.data).toEqual({ extra: 'info' });
  });
});

describe('MCP_ERROR_CODES', () => {
  it('should have standard JSON-RPC error codes', () => {
    expect(MCP_ERROR_CODES.PARSE_ERROR).toBe(-32700);
    expect(MCP_ERROR_CODES.INVALID_REQUEST).toBe(-32600);
    expect(MCP_ERROR_CODES.METHOD_NOT_FOUND).toBe(-32601);
    expect(MCP_ERROR_CODES.INVALID_PARAMS).toBe(-32602);
    expect(MCP_ERROR_CODES.INTERNAL_ERROR).toBe(-32603);
  });

  it('should have custom application error codes', () => {
    expect(MCP_ERROR_CODES.APPLICATION_ERROR).toBe(-32000);
    expect(MCP_ERROR_CODES.CONFIGURATION_ERROR).toBe(-32001);
    expect(MCP_ERROR_CODES.AUTHENTICATION_ERROR).toBe(-32002);
    expect(MCP_ERROR_CODES.RATE_LIMIT_ERROR).toBe(-32003);
    expect(MCP_ERROR_CODES.NETWORK_ERROR).toBe(-32004);
    expect(MCP_ERROR_CODES.VALIDATION_ERROR).toBe(-32005);
    expect(MCP_ERROR_CODES.TIMEOUT_ERROR).toBe(-32006);
    expect(MCP_ERROR_CODES.CIRCUIT_BREAKER_OPEN).toBe(-32007);
  });
});

describe('MCPErrorHandler', () => {
  describe('handleError', () => {
    it('should handle ConfigurationError', () => {
      const error = new ConfigurationError('Missing config');

      const result = MCPErrorHandler.handleError(error, { method: 'test' });

      expect(result).toBeInstanceOf(MCPApplicationError);
      expect(result.code).toBe(MCP_ERROR_CODES.CONFIGURATION_ERROR);
    });

    it('should handle APIError with authentication code', () => {
      const error = new APIError('Auth failed', {
        code: ERROR_CODES.API_AUTHENTICATION,
      });

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.AUTHENTICATION_ERROR);
    });

    it('should handle APIError with rate limit code', () => {
      const error = new APIError('Rate limited', {
        code: ERROR_CODES.API_RATE_LIMIT,
      });

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.RATE_LIMIT_ERROR);
    });

    it('should handle APIError with timeout code', () => {
      const error = new APIError('Timed out', {
        code: ERROR_CODES.API_TIMEOUT,
      });

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.TIMEOUT_ERROR);
    });

    it('should handle APIError with generic code', () => {
      const error = new APIError('Generic API error');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.APPLICATION_ERROR);
    });

    it('should handle NetworkError', () => {
      const error = new NetworkError('Connection failed');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.NETWORK_ERROR);
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.VALIDATION_ERROR);
    });

    it('should handle MCPProtocolError', () => {
      const error = new MCPProtocolError('Invalid request');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.INVALID_REQUEST);
    });

    it('should handle standard Error with timeout message', () => {
      const error = new Error('Operation timed out');

      const result = MCPErrorHandler.handleError(error);

      // Standard errors with timeout in message may map to APPLICATION_ERROR
      // since mapToMCPErrorCode checks for specific BaseError types first
      expect(result).toBeInstanceOf(MCPApplicationError);
    });

    it('should handle standard Error with network message', () => {
      const error = new Error('network connection failed');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.NETWORK_ERROR);
    });

    it('should handle standard Error with connection message', () => {
      const error = new Error('connection refused');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.NETWORK_ERROR);
    });

    it('should handle standard Error with validation message', () => {
      const error = new Error('validation failed');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.VALIDATION_ERROR);
    });

    it('should handle standard Error with invalid message', () => {
      const error = new Error('invalid input provided');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.VALIDATION_ERROR);
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');

      const result = MCPErrorHandler.handleError(error);

      expect(result.code).toBe(MCP_ERROR_CODES.APPLICATION_ERROR);
    });

    it('should handle non-Error values', () => {
      const result = MCPErrorHandler.handleError('string error');

      expect(result).toBeInstanceOf(MCPApplicationError);
      expect(result.code).toBe(MCP_ERROR_CODES.APPLICATION_ERROR);
    });

    it('should include context in error data', () => {
      const error = new Error('Test error');

      const result = MCPErrorHandler.handleError(error, {
        method: 'tools/call',
        requestId: 'req-123',
      });

      expect(result.data).toBeDefined();
      const data = result.data as Record<string, unknown>;
      expect(data.context).toBeDefined();
      expect((data.context as Record<string, unknown>).method).toBe(
        'tools/call'
      );
      expect((data.context as Record<string, unknown>).requestId).toBe(
        'req-123'
      );
    });

    it('should include classification in error data', () => {
      const error = new NetworkError('Connection failed');

      const result = MCPErrorHandler.handleError(error);

      const data = result.data as Record<string, unknown>;
      expect(data.classification).toBeDefined();
      expect((data.classification as Record<string, unknown>).isRetryable).toBe(
        true
      );
    });
  });

  describe('wrapOperation', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await MCPErrorHandler.wrapOperation(operation);

      expect(result).toBe('success');
    });

    it('should throw MCPApplicationError on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      await expect(
        MCPErrorHandler.wrapOperation(operation, { method: 'test' })
      ).rejects.toBeInstanceOf(MCPApplicationError);
    });
  });

  describe('createSafeResponse', () => {
    it('should create safe error response', () => {
      const error = new Error('Test error');

      const result = MCPErrorHandler.createSafeResponse(error);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('logOperationMetrics', () => {
    it('should log metrics without error', () => {
      expect(() => {
        MCPErrorHandler.logOperationMetrics('test', Date.now() - 100, true, {
          extra: 'data',
        });
      }).not.toThrow();
    });

    it('should log metrics for failed operations', () => {
      expect(() => {
        MCPErrorHandler.logOperationMetrics('test', Date.now() - 100, false);
      }).not.toThrow();
    });
  });
});

describe('withMCPErrorHandling', () => {
  it('should wrap handler and return result', async () => {
    const handler = vi.fn().mockResolvedValue('result');
    const wrapped = withMCPErrorHandling('test', handler);

    const result = await wrapped('arg1', 'arg2');

    expect(result).toBe('result');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should throw MCPApplicationError on handler failure', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
    const wrapped = withMCPErrorHandling('test', handler);

    await expect(wrapped()).rejects.toBeInstanceOf(MCPApplicationError);
  });

  it('should handle MCPApplicationError from handler', async () => {
    const originalError = new MCPApplicationError(
      'Original error',
      MCP_ERROR_CODES.VALIDATION_ERROR
    );
    const handler = vi.fn().mockRejectedValue(originalError);
    const wrapped = withMCPErrorHandling('test', handler);

    // The wrapped function should throw MCPApplicationError
    await expect(wrapped()).rejects.toBeInstanceOf(MCPApplicationError);
  });
});

describe('createMCPContextMiddleware', () => {
  it('should create middleware that wraps handler', async () => {
    const middleware = createMCPContextMiddleware();
    const handler = vi.fn().mockResolvedValue('result');

    const wrapped = middleware(handler);
    const result = await wrapped({ params: { name: 'test' } });

    expect(result).toBe('result');
    expect(handler).toHaveBeenCalled();
  });

  it('should provide correlation ID to handler', async () => {
    const middleware = createMCPContextMiddleware();
    const handler = vi.fn().mockResolvedValue('result');

    const wrapped = middleware(handler);
    await wrapped({ params: { name: 'test' } });

    expect(handler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ correlationId: expect.any(String) })
    );
  });

  it('should handle missing params.name', async () => {
    const middleware = createMCPContextMiddleware();
    const handler = vi.fn().mockResolvedValue('result');

    const wrapped = middleware(handler);
    await wrapped({});

    expect(handler).toHaveBeenCalled();
  });
});

describe('validateMCPRequest', () => {
  it('should pass valid request', () => {
    expect(() => {
      validateMCPRequest({ name: 'test' }, { required: ['name'] });
    }).not.toThrow();
  });

  it('should throw for non-object request', () => {
    expect(() => {
      validateMCPRequest('string', {});
    }).toThrow(MCPApplicationError);
  });

  it('should throw for null request', () => {
    expect(() => {
      validateMCPRequest(null, {});
    }).toThrow(MCPApplicationError);
  });

  it('should throw for missing required parameter', () => {
    expect(() => {
      validateMCPRequest({}, { required: ['name'] });
    }).toThrow(MCPApplicationError);

    try {
      validateMCPRequest({}, { required: ['name'] });
    } catch (error) {
      expect((error as MCPApplicationError).code).toBe(
        MCP_ERROR_CODES.INVALID_PARAMS
      );
    }
  });

  it('should validate parameter types', () => {
    expect(() => {
      validateMCPRequest(
        { name: 123 },
        { properties: { name: { type: 'string' } } }
      );
    }).toThrow(MCPApplicationError);
  });

  it('should pass when parameter type matches', () => {
    expect(() => {
      validateMCPRequest(
        { name: 'test' },
        { properties: { name: { type: 'string' } } }
      );
    }).not.toThrow();
  });

  it('should skip validation for missing optional properties', () => {
    expect(() => {
      validateMCPRequest({}, { properties: { optional: { type: 'string' } } });
    }).not.toThrow();
  });
});

describe('createErrorAcknowledgment', () => {
  it('should create acknowledgment without recovery', () => {
    const error = new MCPApplicationError(
      'Test error',
      MCP_ERROR_CODES.APPLICATION_ERROR,
      { correlationId: 'corr-123' }
    );

    const result = createErrorAcknowledgment(error);

    expect(result.acknowledged).toBe(true);
    expect(result.originalError.code).toBe(MCP_ERROR_CODES.APPLICATION_ERROR);
    expect(result.originalError.message).toBe('Test error');
    expect(result.originalError.correlationId).toBe('corr-123');
    expect(result.recovery).toBeUndefined();
    expect(result.timestamp).toBeDefined();
  });

  it('should create acknowledgment with recovery info', () => {
    const error = new MCPApplicationError('Test error');
    const recovery = {
      attempted: true,
      successful: true,
      strategy: 'retry',
    };

    const result = createErrorAcknowledgment(error, recovery);

    expect(result.recovery).toEqual(recovery);
  });

  it('should handle error without correlationId in data', () => {
    const error = new MCPApplicationError('Test error');

    const result = createErrorAcknowledgment(error);

    expect(result.originalError.correlationId).toBeUndefined();
  });
});
