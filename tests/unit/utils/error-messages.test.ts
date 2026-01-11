import { describe, it, expect } from 'vitest';
import { ZodError, z } from 'zod';

import {
  createErrorMessage,
  createMCPErrorResponse,
  formatErrorForDisplay,
  getAvailableErrorCodes,
  getErrorTemplate,
  validateErrorTemplate,
} from '../../../src/utils/error-messages';
import {
  APIError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  ERROR_CODES,
} from '../../../src/errors/index';

describe('createErrorMessage', () => {
  describe('with BaseError instances', () => {
    it('should create message from APIError with known code', () => {
      const error = new APIError('Request timed out', {
        code: ERROR_CODES.API_TIMEOUT,
        context: { timeout: 30000 },
      });

      const result = createErrorMessage(error, {}, 'corr-123');

      expect(result.title).toBe('Service Timeout');
      expect(result.message).toContain('OpenRouter API');
      expect(result.suggestion).toContain('try again');
      expect(result.severity).toBe('error');
      expect(result.correlationId).toBe('corr-123');
      expect(result.timestamp).toBeDefined();
    });

    it('should create message from APIError with rate limit code', () => {
      const error = new APIError('Rate limited', {
        code: ERROR_CODES.API_RATE_LIMIT,
        context: { limit: 100, window: '1 minute' },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Rate Limit Exceeded');
      expect(result.severity).toBe('warning');
      expect(result.helpUrl).toBeDefined();
    });

    it('should create message from APIError with authentication code', () => {
      const error = new APIError('Invalid API key', {
        code: ERROR_CODES.API_AUTHENTICATION,
        context: { statusCode: 401 },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Authentication Failed');
      expect(result.message).toContain('API key');
    });

    it('should create message from APIError with server error code', () => {
      const error = new APIError('Server error', {
        code: ERROR_CODES.API_SERVER_ERROR,
        context: { statusCode: 500 },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Server Error');
    });

    it('should create message from ConfigurationError', () => {
      const error = new ConfigurationError('Missing config', {
        code: ERROR_CODES.CONFIG_MISSING,
        context: { key: 'apiKey' },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Missing Configuration');
      expect(result.severity).toBe('error');
    });

    it('should create message from ValidationError', () => {
      const error = new ValidationError('Invalid value', {
        code: ERROR_CODES.VALIDATION_RANGE,
        context: { value: 5, field: 'temperature', min: 0, max: 2 },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Value Out of Range');
    });

    it('should create message from NetworkError', () => {
      const error = new NetworkError('Connection failed', {
        code: ERROR_CODES.NETWORK_CONNECTION,
        context: { url: 'https://api.example.com' },
      });

      const result = createErrorMessage(error);

      expect(result.title).toBe('Connection Failed');
    });

    it('should use fallback for unknown error code', () => {
      const error = new APIError('Unknown error');

      const result = createErrorMessage(error);

      expect(result.title).toBe('Unexpected Error');
    });
  });

  describe('with Zod errors', () => {
    it('should create message from ZodError', () => {
      const schema = z.object({
        query: z.string().min(1),
      });

      let error: ZodError;
      try {
        schema.parse({ query: '' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = createErrorMessage(error!);

      expect(result.title).toBe('Validation Error');
      expect(result.severity).toBe('error');
      expect(result.message).toBeDefined();
    });
  });

  describe('with standard Error', () => {
    it('should create message from standard Error', () => {
      const error = new Error('Something went wrong');

      const result = createErrorMessage(error);

      expect(result.title).toBe('Unexpected Error');
      expect(result.message).toBe('An unexpected error occurred.');
      expect(result.technicalDetails).toContain('Something went wrong');
    });
  });

  describe('with non-Error values', () => {
    it('should handle string error', () => {
      const result = createErrorMessage('string error');

      expect(result.title).toBe('Unexpected Error');
      expect(result.technicalDetails).toContain('string error');
    });

    it('should handle null', () => {
      const result = createErrorMessage(null);

      expect(result.title).toBe('Unexpected Error');
    });

    it('should handle undefined', () => {
      const result = createErrorMessage(undefined);

      expect(result.title).toBe('Unexpected Error');
    });
  });

  describe('variable replacement', () => {
    it('should replace variables in template', () => {
      const error = new NetworkError('Timeout', {
        code: ERROR_CODES.NETWORK_TIMEOUT,
      });

      const result = createErrorMessage(error, { timeout: 30000 });

      expect(result.technicalDetails).toContain('30000');
    });
  });
});

describe('createMCPErrorResponse', () => {
  it('should create MCP-compatible error response', () => {
    const error = new APIError('Request failed', {
      code: ERROR_CODES.API_SERVER_ERROR,
    });

    const result = createMCPErrorResponse(error, {}, 'corr-123');

    expect(result.code).toBe(-32002);
    expect(result.message).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe('Server Error');
    expect(result.data?.correlationId).toBe('corr-123');
  });

  it('should map severity to correct error code', () => {
    const warningError = new APIError('Rate limited', {
      code: ERROR_CODES.API_RATE_LIMIT,
    });

    const result = createMCPErrorResponse(warningError);

    expect(result.code).toBe(-32001);
  });

  it('should include suggestion in data', () => {
    const error = new ConfigurationError('Missing config', {
      code: ERROR_CODES.CONFIG_MISSING,
    });

    const result = createMCPErrorResponse(error);

    expect(result.data?.suggestion).toBeDefined();
  });
});

describe('formatErrorForDisplay', () => {
  const error = new APIError('Request failed', {
    code: ERROR_CODES.API_SERVER_ERROR,
    context: { statusCode: 500 },
  });

  describe('plain format', () => {
    it('should format error as plain text', () => {
      const result = formatErrorForDisplay(error, 'plain');

      expect(result).toContain('Server Error');
      expect(result).toContain('Suggestion:');
      expect(result).not.toContain('<');
      expect(result).not.toContain('#');
    });

    it('should include correlation ID when provided', () => {
      const result = formatErrorForDisplay(error, 'plain', {}, 'corr-123');

      expect(result).toContain('Reference ID: corr-123');
    });

    it('should include help URL when available', () => {
      const result = formatErrorForDisplay(error, 'plain');

      expect(result).toContain('Help:');
    });

    it('should include technical details', () => {
      const result = formatErrorForDisplay(error, 'plain', { statusCode: 500 });

      expect(result).toContain('Technical Details');
    });
  });

  describe('markdown format', () => {
    it('should format error as markdown', () => {
      const result = formatErrorForDisplay(error, 'markdown');

      expect(result).toContain('## Server Error');
      expect(result).toContain('**Suggestion:**');
    });

    it('should include help link in markdown format', () => {
      const result = formatErrorForDisplay(error, 'markdown');

      expect(result).toContain('[View Documentation]');
    });

    it('should include correlation ID with backticks', () => {
      const result = formatErrorForDisplay(error, 'markdown', {}, 'corr-123');

      expect(result).toContain('`corr-123`');
    });
  });

  describe('html format', () => {
    it('should format error as HTML', () => {
      const result = formatErrorForDisplay(error, 'html');

      expect(result).toContain('<div class="error-message');
      expect(result).toContain('<h3>');
      expect(result).toContain('</div>');
    });

    it('should escape HTML characters', () => {
      const xssError = new Error('<script>alert("xss")</script>');
      const result = formatErrorForDisplay(xssError, 'html');

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should include help link with target blank', () => {
      const result = formatErrorForDisplay(error, 'html');

      expect(result).toContain('target="_blank"');
    });

    it('should include technical details in details element', () => {
      const result = formatErrorForDisplay(error, 'html', { statusCode: 500 });

      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Technical Details</summary>');
    });
  });

  describe('default format', () => {
    it('should default to plain format', () => {
      const result = formatErrorForDisplay(error);

      expect(result).not.toContain('<');
      expect(result).not.toContain('#');
    });
  });
});

describe('getAvailableErrorCodes', () => {
  it('should return all error codes', () => {
    const codes = getAvailableErrorCodes();

    expect(codes).toContain(ERROR_CODES.API_TIMEOUT);
    expect(codes).toContain(ERROR_CODES.CONFIG_MISSING);
    expect(codes).toContain(ERROR_CODES.VALIDATION_REQUIRED);
    expect(codes).toContain(ERROR_CODES.NETWORK_TIMEOUT);
    expect(codes).toContain(ERROR_CODES.MCP_INVALID_REQUEST);
  });

  it('should return array', () => {
    const codes = getAvailableErrorCodes();

    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(0);
  });
});

describe('getErrorTemplate', () => {
  it('should return template for known error code', () => {
    const template = getErrorTemplate(ERROR_CODES.API_TIMEOUT);

    expect(template).toBeDefined();
    expect(template?.code).toBe(ERROR_CODES.API_TIMEOUT);
    expect(template?.title).toBe('Service Timeout');
  });

  it('should return undefined for unknown error code', () => {
    const template = getErrorTemplate('UNKNOWN_CODE' as any);

    expect(template).toBeUndefined();
  });
});

describe('validateErrorTemplate', () => {
  it('should return true for valid template', () => {
    const template = {
      code: ERROR_CODES.API_TIMEOUT,
      severity: 'error' as const,
      title: 'Test Title',
      message: 'Test message',
      suggestion: 'Test suggestion',
    };

    expect(validateErrorTemplate(template)).toBe(true);
  });

  it('should return false for template missing code', () => {
    const template = {
      severity: 'error' as const,
      title: 'Test Title',
      message: 'Test message',
      suggestion: 'Test suggestion',
    } as any;

    expect(validateErrorTemplate(template)).toBe(false);
  });

  it('should return false for template missing title', () => {
    const template = {
      code: ERROR_CODES.API_TIMEOUT,
      severity: 'error' as const,
      message: 'Test message',
      suggestion: 'Test suggestion',
    } as any;

    expect(validateErrorTemplate(template)).toBe(false);
  });

  it('should return false for template missing message', () => {
    const template = {
      code: ERROR_CODES.API_TIMEOUT,
      severity: 'error' as const,
      title: 'Test Title',
      suggestion: 'Test suggestion',
    } as any;

    expect(validateErrorTemplate(template)).toBe(false);
  });

  it('should return false for template missing suggestion', () => {
    const template = {
      code: ERROR_CODES.API_TIMEOUT,
      severity: 'error' as const,
      title: 'Test Title',
      message: 'Test message',
    } as any;

    expect(validateErrorTemplate(template)).toBe(false);
  });

  it('should return false for template missing severity', () => {
    const template = {
      code: ERROR_CODES.API_TIMEOUT,
      title: 'Test Title',
      message: 'Test message',
      suggestion: 'Test suggestion',
    } as any;

    expect(validateErrorTemplate(template)).toBe(false);
  });
});
