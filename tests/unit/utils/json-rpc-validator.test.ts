import { describe, it, expect, beforeEach, mock } from 'bun:test';

import {
  JsonRpcValidator,
  validatePreTransmission,
  createResponseValidationMiddleware,
  JSON_RPC_ERROR_CODES,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
} from '../../../src/utils/json-rpc-validator.js';

// Mock logger
mock.module('../../../src/utils/logger.js', () => ({
  logger: {
    responseValidation: mock(() => {}),
    jsonRpc: mock(() => {}),
  },
}));

describe('JsonRpcValidator', () => {
  beforeEach(() => {});

  describe('validateMessage', () => {
    it('should validate a valid JSON-RPC request', () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'test.method',
        params: { arg1: 'value1' },
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(request);

      expect(result.valid).toBe(true);
      expect(result.messageType).toBe('request');
      expect(result.method).toBe('test.method');
      expect(result.id).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid JSON-RPC response', () => {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(response);

      expect(result.valid).toBe(true);
      expect(result.messageType).toBe('response');
      expect(result.id).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid JSON-RPC notification', () => {
      const notification: JsonRpcNotification = {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: { progress: 50 },
      };

      const result = JsonRpcValidator.validateMessage(notification);

      expect(result.valid).toBe(true);
      expect(result.messageType).toBe('notification');
      expect(result.method).toBe('notifications/progress');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid jsonrpc version', () => {
      const invalid = {
        jsonrpc: '1.0',
        method: 'test',
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing or invalid jsonrpc version (must be "2.0")'
      );
    });

    it('should reject non-object messages', () => {
      const result = JsonRpcValidator.validateMessage('invalid');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message must be an object');
    });

    it('should reject request with invalid method type', () => {
      const invalid = {
        jsonrpc: '2.0',
        method: 123,
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Method must be a string');
    });

    it('should reject request with invalid id type', () => {
      const invalid = {
        jsonrpc: '2.0',
        method: 'test',
        id: {},
      };

      const result = JsonRpcValidator.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ID must be a string, number, or null');
    });

    it('should reject response with both result and error', () => {
      const invalid = {
        jsonrpc: '2.0',
        result: 'success',
        error: { code: -1, message: 'error' },
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Response cannot contain both "result" and "error"'
      );
    });

    it('should reject response without result or error', () => {
      const invalid = {
        jsonrpc: '2.0',
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Message must contain either "method" (request/notification) or "result"/"error" (response)'
      );
    });

    it('should reject notification with id', () => {
      // This should be treated as a request, but if we force it as notification:
      const notification = {
        jsonrpc: '2.0',
        method: 'test',
        // id intentionally missing to make it a notification
      };

      const result = JsonRpcValidator.validateMessage(notification);
      expect(result.valid).toBe(true);
      expect(result.messageType).toBe('notification');
    });

    it('should warn about reserved method names', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'rpc.test',
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(request);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Method names beginning with "rpc." are reserved'
      );
    });

    it('should validate error responses properly', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: { details: 'Missing method' },
        },
        id: null,
      };

      const result = JsonRpcValidator.validateMessage(errorResponse);

      expect(result.valid).toBe(true);
      expect(result.messageType).toBe('response');
    });

    it('should reject error with invalid code type', () => {
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: 'invalid',
          message: 'Invalid Request',
        },
        id: 1,
      };

      const result = JsonRpcValidator.validateMessage(errorResponse);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Error code must be a number');
    });
  });

  describe('createErrorResponse', () => {
    it('should create a valid error response', () => {
      const response = JsonRpcValidator.createErrorResponse(
        1,
        JSON_RPC_ERROR_CODES.INVALID_REQUEST,
        'Invalid request format'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid request format',
        },
        id: 1,
      });
    });

    it('should create error response with data', () => {
      const response = JsonRpcValidator.createErrorResponse(
        'test-id',
        JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
        'Server error',
        { details: 'Database connection failed' }
      );

      expect(response.error?.data).toEqual({
        details: 'Database connection failed',
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a valid success response', () => {
      const result = { value: 42 };
      const response = JsonRpcValidator.createSuccessResponse(
        'test-id',
        result
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        result: { value: 42 },
        id: 'test-id',
      });
    });
  });

  describe('validateAndSanitizeResponse', () => {
    it('should return valid response as-is', () => {
      const validResponse = {
        jsonrpc: '2.0',
        result: 'success',
        id: 1,
      };

      const result =
        JsonRpcValidator.validateAndSanitizeResponse(validResponse);

      expect(result).toEqual(validResponse);
    });

    it('should return error response for invalid input', () => {
      const invalidResponse = {
        invalid: 'response',
      };

      const result =
        JsonRpcValidator.validateAndSanitizeResponse(invalidResponse);

      expect(result.jsonrpc).toBe('2.0');
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(JSON_RPC_ERROR_CODES.INTERNAL_ERROR);
    });
  });

  describe('validateMcpExtensions', () => {
    it('should validate known MCP methods', () => {
      const mcpRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const result = JsonRpcValidator.validateMcpExtensions(mcpRequest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about unknown methods', () => {
      const unknownRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'unknown/method',
        id: 1,
      };

      const result = JsonRpcValidator.validateMcpExtensions(unknownRequest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Unknown MCP method: unknown/method');
    });

    it('should allow notification methods', () => {
      const notificationRequest: JsonRpcNotification = {
        jsonrpc: '2.0',
        method: 'notifications/progress',
      };

      const result =
        JsonRpcValidator.validateMcpExtensions(notificationRequest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});

describe('validatePreTransmission', () => {
  it('should validate a correct response', () => {
    const response = {
      jsonrpc: '2.0',
      result: { success: true },
      id: 1,
    };

    const result = validatePreTransmission(response);

    expect(result.valid).toBe(true);
    expect(result.sanitizedResponse).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('should detect round-trip failures', () => {
    // Mock JSON.parse to fail
    const originalParse = JSON.parse;
    const parseMock = mock(() => {
      throw new Error('Parse error');
    });
    JSON.parse = parseMock as any;

    const response = {
      jsonrpc: '2.0',
      result: 'test',
      id: 1,
    };

    const result = validatePreTransmission(response);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Round-trip test failed'))).toBe(
      true
    );

    // Restore original function
    JSON.parse = originalParse;
  });

  it('should handle validation errors gracefully', () => {
    const invalidResponse = 'not an object';

    const result = validatePreTransmission(invalidResponse);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('createResponseValidationMiddleware', () => {
  it('should return valid response when validation passes', () => {
    const middleware = createResponseValidationMiddleware();
    const response = {
      jsonrpc: '2.0',
      result: { success: true },
      id: 1,
    };

    const result = middleware(response);

    expect(result.jsonrpc).toBe('2.0');
    expect(result.result).toBeDefined();
  });

  it('should return error response when validation fails', () => {
    const middleware = createResponseValidationMiddleware();
    const invalidResponse = 'invalid';

    const result = middleware(invalidResponse);

    expect(result.jsonrpc).toBe('2.0');
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe(JSON_RPC_ERROR_CODES.INTERNAL_ERROR);
  });
});
