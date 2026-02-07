import { describe, it, expect, mock } from 'bun:test';
import type { Logger } from 'winston';

import {
  maskSensitiveValue,
  sanitizeObject,
  sanitizeString,
  sanitizeError,
  SecureLogger,
  secureLogger,
  createSecureLogger,
  type SanitizeOptions,
} from '../../../src/config/logging';

describe('Secure Logging', () => {
  describe('maskSensitiveValue', () => {
    it('should mask long values', () => {
      const result = maskSensitiveValue('sk-1234567890abcdef1234567890');
      expect(result).not.toBe('sk-1234567890abcdef1234567890');
      expect(result).toContain('*');
    });

    it('should mask short values completely', () => {
      const result = maskSensitiveValue('short');
      expect(result).toBe('*****');
    });

    it('should respect custom masking options', () => {
      const options: SanitizeOptions = {
        maskChar: '#',
        showStart: 2,
        showEnd: 2,
        minLength: 6,
      };
      const result = maskSensitiveValue('1234567890', options);
      expect(result).not.toBe('1234567890');
      expect(result).toContain('#');
    });

    it('should handle empty strings', () => {
      const result = maskSensitiveValue('');
      expect(result).toBe('');
    });

    it('should handle strings at minimum length threshold', () => {
      const result = maskSensitiveValue('12345678'); // exactly 8 chars, should be fully masked
      expect(result).toBe('********');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize sensitive field names', () => {
      const obj = {
        apiKey: 'sk-1234567890abcdef1234567890',
        username: 'john_doe',
        password: 'secret123',
        email: 'john@example.com',
      };

      const result = sanitizeObject(obj) as Record<string, unknown>;

      expect(result.apiKey).not.toBe('sk-1234567890abcdef1234567890');
      expect(result.username).toBe('john_doe'); // Not sensitive
      expect(result.password).toBe('[REDACTED]'); // Short sensitive strings
      expect(result.email).toBe('john@example.com'); // Not sensitive
    });

    it('should handle nested objects', () => {
      const obj = {
        config: {
          openRouterApiKey: 'sk-1234567890abcdef1234567890',
          timeout: 30000,
        },
        data: {
          name: 'test',
          secret: 'hidden',
        },
      };

      const result = sanitizeObject(obj) as Record<string, unknown>;
      const config = result.config as Record<string, unknown>;
      const data = result.data as Record<string, unknown>;

      expect(config.openRouterApiKey).not.toBe('sk-1234567890abcdef1234567890');
      expect(config.timeout).toBe(30000);
      expect(data.name).toBe('test');
      expect(data.secret).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const obj = {
        items: [{ apiKey: 'sk-1234567890abcdef1234567890' }, { name: 'test' }],
      };

      const result = sanitizeObject(obj) as Record<string, unknown>;
      const items = result.items as Array<Record<string, unknown>>;

      expect(items[0].apiKey).not.toBe('sk-1234567890abcdef1234567890');
      expect(items[1].name).toBe('test');
    });

    it('should handle primitive values', () => {
      expect(sanitizeObject('sk-1234567890abcdef1234567890')).not.toBe(
        'sk-1234567890abcdef1234567890'
      );
      expect(sanitizeObject(42)).toBe(42);
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should use additional sensitive fields', () => {
      const obj = {
        customSecret: 'secret123',
        normalField: 'normal',
      };

      const options: SanitizeOptions = {
        additionalSensitiveFields: ['customSecret'],
      };

      const result = sanitizeObject(obj, options) as Record<string, unknown>;

      expect(result.customSecret).toBe('[REDACTED]');
      expect(result.normalField).toBe('normal');
    });

    it('should handle case-insensitive field matching', () => {
      const obj = {
        API_KEY: 'sk-1234567890abcdef1234567890',
        'api-key': 'sk-0987654321fedcba0987654321',
        APIKEY: 'sk-abcdef1234567890abcdef1234',
      };

      const result = sanitizeObject(obj) as Record<string, unknown>;

      expect(result.API_KEY).not.toBe('sk-1234567890abcdef1234567890');
      expect(result['api-key']).not.toBe('sk-0987654321fedcba0987654321');
      expect(result.APIKEY).not.toBe('sk-abcdef1234567890abcdef1234');
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize API keys in strings', () => {
      const text =
        'Using API key sk-1234567890abcdef1234567890 for authentication';
      const result = sanitizeString(text);
      expect(result).not.toBe(text); // Should be different from original
      expect(result).not.toContain('1234567890abcdef'); // Sensitive part should be gone
      expect(result).toContain('authentication'); // Non-sensitive part should remain
    });

    it('should sanitize Bearer tokens', () => {
      const text = 'Authorization: Bearer sk-1234567890abcdef1234567890';
      const result = sanitizeString(text);
      expect(result).not.toBe(text); // Should be different from original
      expect(result).not.toContain('1234567890abcdef'); // Sensitive part should be gone
      expect(result).toContain('Authorization'); // Non-sensitive part should remain
    });

    it('should sanitize URLs with credentials', () => {
      const text = 'Connecting to https://user:pass@example.com/api';
      const result = sanitizeString(text);
      expect(result).not.toBe(text); // Should be different from original
      expect(result).not.toContain('user:pass'); // Credentials should be gone
      expect(result).toContain('Connecting'); // Non-sensitive part should remain
    });

    it('should handle multiple sensitive patterns', () => {
      const text =
        'API key sk-1234567890abcdef1234567890 and token Bearer abcdef1234567890abcdef1234567890';
      const result = sanitizeString(text);
      expect(result).not.toBe(text); // Should be different from original
      expect(result).not.toContain('1234567890abcdef'); // First sensitive part should be gone
      expect(result).not.toContain('abcdef1234567890abcdef'); // Second sensitive part should be gone
      expect(result).toContain('API key'); // Non-sensitive parts should remain
      expect(result).toContain('and token'); // Non-sensitive parts should remain
    });

    it('should not modify safe strings', () => {
      const text = 'This is a safe string with no sensitive data';
      const result = sanitizeString(text);
      expect(result).toBe(text);
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize error messages', () => {
      const error = new Error(
        'Authentication failed with API key sk-1234567890abcdef1234567890'
      );
      const result = sanitizeError(error);

      expect(result.name).toBe('Error');
      expect(result.message).not.toContain('sk-1234567890abcdef1234567890');
      expect(result.message).toContain('Authentication failed');
    });

    it('should sanitize stack traces', () => {
      const error = new Error('Test error');
      error.stack =
        'Error: Test error with sk-1234567890abcdef1234567890\\n    at test';

      const result = sanitizeError(error);

      expect(result.stack).not.toContain('sk-1234567890abcdef1234567890');
      expect(result.stack).toContain('Test error');
    });

    it('should handle custom error properties', () => {
      class CustomError extends Error {
        public apiKey = 'sk-1234567890abcdef1234567890';
        public statusCode = 401;
      }

      const error = new CustomError('Custom error');
      const result = sanitizeError(error);

      expect(result.apiKey).not.toBe('sk-1234567890abcdef1234567890');
      expect(result.statusCode).toBe(401);
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      delete error.stack;

      const result = sanitizeError(error);

      expect(result.name).toBe('Error');
      expect(result.message).toBe('Test error');
      expect(result.stack).toBeUndefined();
    });
  });

  describe('SecureLogger', () => {
    it('should sanitize arguments before logging', () => {
      // Create a mock Winston logger
      const mockLogger = {
        info: mock(() => {}),
      } as unknown as Logger;

      const logger = new SecureLogger({}, mockLogger);
      const obj = { apiKey: 'sk-1234567890abcdef1234567890' };

      logger.info('User data:', obj);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User data:',
        expect.objectContaining({
          apiKey: expect.not.stringMatching('sk-1234567890abcdef1234567890'),
        })
      );
    });

    it('should handle error objects', () => {
      const mockError = mock(() => {});
      const mockLogger = {
        error: mockError,
      } as unknown as Logger;

      const logger = new SecureLogger({}, mockLogger);
      const error = new Error(
        'API key sk-1234567890abcdef1234567890 is invalid'
      );

      logger.error('Authentication failed:', error);

      expect(mockError).toHaveBeenCalledWith(
        'Authentication failed:',
        expect.objectContaining({
          name: 'Error',
          message: expect.stringContaining('is invalid'),
        })
      );

      const call = mockError.mock.calls[0];
      expect(call[1].message).not.toContain('sk-1234567890abcdef1234567890');
    });

    it('should support all log levels', () => {
      const mockLogger = {
        error: mock(() => {}),
        warn: mock(() => {}),
        info: mock(() => {}),
        debug: mock(() => {}),
        verbose: mock(() => {}),
      } as unknown as Logger;

      const logger = new SecureLogger({}, mockLogger);
      const sensitiveData = { token: 'secret123' };

      logger.error('Error:', sensitiveData);
      logger.warn('Warning:', sensitiveData);
      logger.info('Info:', sensitiveData);
      logger.debug('Debug:', sensitiveData);
      logger.verbose('Verbose:', sensitiveData);

      // Check that sensitive data is not logged as-is
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ token: '[REDACTED]' })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Warning:',
        expect.objectContaining({ token: '[REDACTED]' })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Info:',
        expect.objectContaining({ token: '[REDACTED]' })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Debug:',
        expect.objectContaining({ token: '[REDACTED]' })
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'Verbose:',
        expect.objectContaining({ token: '[REDACTED]' })
      );
    });

    it('should use custom options', () => {
      const mockLogger = {
        info: mock(() => {}),
      } as unknown as Logger;

      const logger = new SecureLogger(
        {
          maskChar: '#',
          additionalSensitiveFields: ['customField'],
        },
        mockLogger
      );

      const obj = {
        apiKey: 'sk-1234567890abcdef1234567890',
        customField: 'sensitive',
      };

      logger.info('Data:', obj);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Data:',
        expect.objectContaining({
          apiKey: expect.stringContaining('#'),
          customField: '[REDACTED]',
        })
      );
    });
  });

  describe('Factory functions', () => {
    it('should provide a default secure logger', () => {
      expect(secureLogger).toBeInstanceOf(SecureLogger);
    });

    it('should create custom secure loggers', () => {
      const options: SanitizeOptions = {
        maskChar: '@',
        showStart: 3,
        showEnd: 3,
      };

      const logger = createSecureLogger(options);
      expect(logger).toBeInstanceOf(SecureLogger);
      expect(logger).not.toBe(secureLogger);
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle very large objects', () => {
      const largeObj: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`field${i}`] =
          i % 10 === 0 ? 'sk-1234567890abcdef1234567890' : `value${i}`;
      }

      const result = sanitizeObject(largeObj);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should handle circular references gracefully', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Create circular reference

      // This should not throw an error
      expect(() => sanitizeObject(obj)).not.toThrow();
    });

    it('should handle null and undefined in nested structures', () => {
      const obj = {
        nullValue: null,
        undefinedValue: undefined,
        nestedNull: {
          value: null,
        },
        array: [null, undefined, 'value'],
      };

      const result = sanitizeObject(obj);
      expect(result).toEqual(obj);
    });
  });
});
