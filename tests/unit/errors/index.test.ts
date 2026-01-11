import { describe, it, expect } from 'vitest';

import {
  APIError,
  ConfigurationError,
  ValidationError,
  MCPProtocolError,
  NetworkError,
  ErrorClassifier,
  ERROR_CODES,
} from '../../../src/errors/index';

describe('Error Classes', () => {
  describe('APIError', () => {
    it('should create error with default values', () => {
      const error = new APIError('API request failed');

      expect(error.message).toBe('API request failed');
      expect(error.name).toBe('APIError');
      expect(error.code).toBe('API_ERROR');
      expect(error.severity).toBe('medium');
      expect(error.context).toEqual({});
      expect(error.timestamp).toBeDefined();
      expect(error.correlationId).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.response).toBeUndefined();
    });

    it('should create error with custom options', () => {
      const error = new APIError('API request failed', {
        statusCode: 500,
        response: { error: 'Internal Server Error' },
        code: ERROR_CODES.API_SERVER_ERROR,
        severity: 'high',
        context: { endpoint: '/api/search' },
        correlationId: 'corr-123',
      });

      expect(error.statusCode).toBe(500);
      expect(error.response).toEqual({ error: 'Internal Server Error' });
      expect(error.code).toBe(ERROR_CODES.API_SERVER_ERROR);
      expect(error.severity).toBe('high');
      expect(error.context).toEqual({ endpoint: '/api/search' });
      expect(error.correlationId).toBe('corr-123');
    });

    it('should serialize to JSON correctly', () => {
      const error = new APIError('API request failed', {
        statusCode: 401,
        code: ERROR_CODES.API_AUTHENTICATION,
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'APIError',
        message: 'API request failed',
        code: ERROR_CODES.API_AUTHENTICATION,
        severity: 'medium',
        context: {},
      });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });

    it('should maintain proper stack trace', () => {
      const error = new APIError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('APIError');
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with default values', () => {
      const error = new ConfigurationError('Missing configuration');

      expect(error.message).toBe('Missing configuration');
      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.severity).toBe('high');
      expect(error.configPath).toBeUndefined();
      expect(error.expectedType).toBeUndefined();
    });

    it('should create error with custom options', () => {
      const error = new ConfigurationError('Invalid config value', {
        configPath: 'api.key',
        expectedType: 'string',
        code: ERROR_CODES.CONFIG_TYPE_MISMATCH,
        context: { received: 123 },
      });

      expect(error.configPath).toBe('api.key');
      expect(error.expectedType).toBe('string');
      expect(error.code).toBe(ERROR_CODES.CONFIG_TYPE_MISMATCH);
      expect(error.context).toEqual({ received: 123 });
    });
  });

  describe('ValidationError', () => {
    it('should create error with default values', () => {
      const error = new ValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.severity).toBe('medium');
      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
      expect(error.constraints).toBeUndefined();
    });

    it('should create error with custom options', () => {
      const error = new ValidationError('Invalid field value', {
        field: 'temperature',
        value: 5,
        constraints: ['must be between 0 and 2'],
        code: ERROR_CODES.VALIDATION_RANGE,
      });

      expect(error.field).toBe('temperature');
      expect(error.value).toBe(5);
      expect(error.constraints).toEqual(['must be between 0 and 2']);
      expect(error.code).toBe(ERROR_CODES.VALIDATION_RANGE);
    });
  });

  describe('MCPProtocolError', () => {
    it('should create error with default values', () => {
      const error = new MCPProtocolError('Protocol error');

      expect(error.message).toBe('Protocol error');
      expect(error.name).toBe('MCPProtocolError');
      expect(error.code).toBe('MCP_PROTOCOL_ERROR');
      expect(error.severity).toBe('high');
      expect(error.method).toBeUndefined();
      expect(error.protocolVersion).toBeUndefined();
    });

    it('should create error with custom options', () => {
      const error = new MCPProtocolError('Method not found', {
        method: 'tools/call',
        protocolVersion: '2024-01-01',
        code: ERROR_CODES.MCP_METHOD_NOT_FOUND,
      });

      expect(error.method).toBe('tools/call');
      expect(error.protocolVersion).toBe('2024-01-01');
      expect(error.code).toBe(ERROR_CODES.MCP_METHOD_NOT_FOUND);
    });
  });

  describe('NetworkError', () => {
    it('should create error with default values', () => {
      const error = new NetworkError('Connection failed');

      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.severity).toBe('medium');
      expect(error.url).toBeUndefined();
      expect(error.timeout).toBeUndefined();
      expect(error.retryAttempt).toBeUndefined();
    });

    it('should create error with custom options', () => {
      const error = new NetworkError('Request timed out', {
        url: 'https://api.example.com',
        timeout: 30000,
        retryAttempt: 2,
        code: ERROR_CODES.NETWORK_TIMEOUT,
      });

      expect(error.url).toBe('https://api.example.com');
      expect(error.timeout).toBe(30000);
      expect(error.retryAttempt).toBe(2);
      expect(error.code).toBe(ERROR_CODES.NETWORK_TIMEOUT);
    });
  });

  describe('ErrorClassifier', () => {
    describe('classify', () => {
      it('should classify APIError correctly', () => {
        const error = new APIError('API failed', { statusCode: 500 });
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('APIError');
        expect(classification.isRetryable).toBe(true);
        expect(classification.shouldLog).toBe(true);
        expect(classification.severity).toBe('medium');
        expect(classification.suggestedAction).toBe(
          'Check API service status and credentials'
        );
      });

      it('should classify APIError with 429 as retryable', () => {
        const error = new APIError('Rate limited', { statusCode: 429 });
        const classification = ErrorClassifier.classify(error);

        expect(classification.isRetryable).toBe(true);
      });

      it('should classify APIError with 4xx (non-429) as non-retryable', () => {
        const error = new APIError('Bad request', { statusCode: 400 });
        const classification = ErrorClassifier.classify(error);

        expect(classification.isRetryable).toBe(false);
      });

      it('should classify APIError without statusCode as retryable', () => {
        const error = new APIError('Unknown API error');
        const classification = ErrorClassifier.classify(error);

        expect(classification.isRetryable).toBe(true);
      });

      it('should classify NetworkError as retryable', () => {
        const error = new NetworkError('Connection failed');
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('NetworkError');
        expect(classification.isRetryable).toBe(true);
        expect(classification.suggestedAction).toBe(
          'Check network connectivity and try again'
        );
      });

      it('should classify ConfigurationError correctly', () => {
        const error = new ConfigurationError('Missing config', {
          configPath: 'api.key',
        });
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('ConfigurationError');
        expect(classification.isRetryable).toBe(false);
        expect(classification.severity).toBe('high');
        expect(classification.suggestedAction).toBe(
          'Check configuration at api.key'
        );
      });

      it('should classify ConfigurationError without path', () => {
        const error = new ConfigurationError('Missing config');
        const classification = ErrorClassifier.classify(error);

        expect(classification.suggestedAction).toBe(
          'Check configuration at application settings'
        );
      });

      it('should classify ValidationError correctly', () => {
        const error = new ValidationError('Invalid input', { field: 'query' });
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('ValidationError');
        expect(classification.isRetryable).toBe(false);
        expect(classification.suggestedAction).toBe(
          'Verify input for field: query'
        );
      });

      it('should classify ValidationError without field', () => {
        const error = new ValidationError('Invalid input');
        const classification = ErrorClassifier.classify(error);

        expect(classification.suggestedAction).toBe(
          'Verify input for field: unknown field'
        );
      });

      it('should classify MCPProtocolError correctly', () => {
        const error = new MCPProtocolError('Invalid protocol');
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('MCPProtocolError');
        expect(classification.isRetryable).toBe(false);
        expect(classification.suggestedAction).toBe(
          'Check MCP client compatibility and protocol version'
        );
      });

      it('should classify standard Error correctly', () => {
        const error = new Error('Standard error');
        const classification = ErrorClassifier.classify(error);

        expect(classification.type).toBe('Error');
        expect(classification.isRetryable).toBe(false);
        expect(classification.shouldLog).toBe(true);
        expect(classification.severity).toBe('medium');
        expect(classification.suggestedAction).toBe(
          'Check application logs for details'
        );
      });

      it('should classify non-Error objects correctly', () => {
        const classification = ErrorClassifier.classify('string error');

        expect(classification.type).toBe('UnknownError');
        expect(classification.isRetryable).toBe(false);
        expect(classification.shouldLog).toBe(true);
        expect(classification.severity).toBe('medium');
        expect(classification.suggestedAction).toBe(
          'Contact support with error details'
        );
      });

      it('should classify null/undefined as unknown error', () => {
        expect(ErrorClassifier.classify(null).type).toBe('UnknownError');
        expect(ErrorClassifier.classify(undefined).type).toBe('UnknownError');
      });
    });
  });

  describe('ERROR_CODES', () => {
    it('should contain all expected API error codes', () => {
      expect(ERROR_CODES.API_TIMEOUT).toBe('API_TIMEOUT');
      expect(ERROR_CODES.API_RATE_LIMIT).toBe('API_RATE_LIMIT');
      expect(ERROR_CODES.API_AUTHENTICATION).toBe('API_AUTHENTICATION');
      expect(ERROR_CODES.API_SERVER_ERROR).toBe('API_SERVER_ERROR');
    });

    it('should contain all expected configuration error codes', () => {
      expect(ERROR_CODES.CONFIG_MISSING).toBe('CONFIG_MISSING');
      expect(ERROR_CODES.CONFIG_INVALID).toBe('CONFIG_INVALID');
      expect(ERROR_CODES.CONFIG_TYPE_MISMATCH).toBe('CONFIG_TYPE_MISMATCH');
    });

    it('should contain all expected validation error codes', () => {
      expect(ERROR_CODES.VALIDATION_REQUIRED).toBe('VALIDATION_REQUIRED');
      expect(ERROR_CODES.VALIDATION_FORMAT).toBe('VALIDATION_FORMAT');
      expect(ERROR_CODES.VALIDATION_RANGE).toBe('VALIDATION_RANGE');
    });

    it('should contain all expected network error codes', () => {
      expect(ERROR_CODES.NETWORK_TIMEOUT).toBe('NETWORK_TIMEOUT');
      expect(ERROR_CODES.NETWORK_CONNECTION).toBe('NETWORK_CONNECTION');
      expect(ERROR_CODES.NETWORK_DNS).toBe('NETWORK_DNS');
    });

    it('should contain all expected MCP error codes', () => {
      expect(ERROR_CODES.MCP_INVALID_REQUEST).toBe('MCP_INVALID_REQUEST');
      expect(ERROR_CODES.MCP_METHOD_NOT_FOUND).toBe('MCP_METHOD_NOT_FOUND');
      expect(ERROR_CODES.MCP_PROTOCOL_VERSION).toBe('MCP_PROTOCOL_VERSION');
    });
  });
});
