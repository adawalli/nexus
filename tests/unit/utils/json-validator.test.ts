import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  JSONValidator,
  safeStringify,
  validateJSON,
} from '../../../src/utils/json-validator.js';

// Mock logger to avoid noise in test output
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe('JSONValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeStringify', () => {
    it('should stringify simple objects correctly', () => {
      const obj = { name: 'test', value: 42 };
      const result = JSONValidator.safeStringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(JSON.parse(result.data!)).toEqual(obj);
    });

    it('should handle circular references with fallback', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Create circular reference

      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      // Should use fallback serialization which shows depth exceeded
      expect(result.data).toContain('[Max Depth Exceeded]');
    });

    it('should handle circular references without fallback', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Create circular reference

      const result = JSONValidator.safeStringify(obj, { fallback: false });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined values', () => {
      const obj = { name: 'test', value: undefined };
      const result = JSONValidator.safeStringify(obj);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // undefined values are omitted in JSON
      expect(JSON.parse(result.data!)).toEqual({ name: 'test' });
    });

    it('should handle functions in objects', () => {
      const obj = {
        name: 'test',
        func: () => 'hello',
        method: function () {
          return 'world';
        },
      };
      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('[Function]');
    });

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const obj = { timestamp: date };
      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('2023-01-01T00:00:00.000Z');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      const obj = { error };
      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('Test error');
      expect(result.data).toContain('Error: Test error');
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');
      const obj = { symbol: sym };
      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('Symbol(test)');
    });

    it('should handle BigInt values', () => {
      const obj = { bigNum: BigInt(123456789012345678901234567890n) };
      const result = JSONValidator.safeStringify(obj, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('123456789012345678901234567890');
    });

    it('should respect max depth limit', () => {
      // Create deeply nested object
      const deep: Record<string, unknown> = {};
      let current = deep;
      for (let i = 0; i < 25; i++) {
        current.next = {};
        current = current.next as Record<string, unknown>;
      }
      current.value = 'deep';

      const result = JSONValidator.safeStringify(deep, { fallback: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('[Max Depth Exceeded]');
    });

    it('should sanitize unsafe characters', () => {
      const obj = { message: 'test\u0000\u001F\u007F\u009Ftest' };
      const result = JSONValidator.safeStringify(obj, { sanitize: true });

      expect(result.success).toBe(true);
      // eslint-disable-next-line no-control-regex
      expect(result.data).not.toMatch(/[\u0000-\u001F\u007F-\u009F]/);
    });

    it('should handle custom replacer function', () => {
      const obj = { secret: 'password', public: 'data' };
      const replacer = (key: string, value: unknown) =>
        key === 'secret' ? '[REDACTED]' : value;

      const result = JSONValidator.safeStringify(obj, { replacer });

      expect(result.success).toBe(true);
      expect(result.data).toContain('[REDACTED]');
      expect(result.data).not.toContain('password');
    });
  });

  describe('validateJSON', () => {
    it('should validate correct JSON', () => {
      const validJson = '{"name": "test", "value": 42}';
      const result = validateJSON(validJson);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 42 });
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{"name": "test", "value": }';
      const result = validateJSON(invalidJson);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-string input', () => {
      const result = validateJSON(null as unknown as string);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a string');
    });

    it('should reject empty string', () => {
      const result = validateJSON('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('wrapMCPResponse', () => {
    it('should wrap valid MCP responses', () => {
      const response = {
        content: [{ type: 'text', text: 'Hello' }],
      };

      const result = JSONValidator.wrapMCPResponse(response);

      expect(result).toEqual(response);
    });

    it('should handle responses with circular references', () => {
      const response: Record<string, unknown> = {
        content: [{ type: 'text', text: 'Hello' }],
      };
      response.self = response; // Create circular reference

      const result = JSONValidator.wrapMCPResponse(response);

      // Should return error response due to serialization failure
      expect(result).toHaveProperty('error');
      expect(
        (result as Record<string, unknown>).error as Record<string, unknown>
      ).toHaveProperty('code');
      expect(
        ((result as Record<string, unknown>).error as Record<string, unknown>)
          .code
      ).toBe(-32603);
    });

    it('should handle responses that fail serialization', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'Hello',
            func: () => 'world', // Function that will cause issues
          },
        ],
      };

      const result = JSONValidator.wrapMCPResponse(response);

      // Should still work with fallback serialization
      expect(result).toBeDefined();
    });
  });

  describe('safeStringify utility function', () => {
    it('should return string for valid objects', () => {
      const obj = { name: 'test' };
      const result = safeStringify(obj);

      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should return error JSON for problematic objects', () => {
      const obj: Record<string, unknown> = {};
      obj.self = obj; // Circular reference

      const result = safeStringify(obj, { fallback: false });

      expect(typeof result).toBe('string');
      expect(result).toContain('Serialization failed');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null values', () => {
      const result = JSONValidator.safeStringify(null);

      expect(result.success).toBe(true);
      expect(result.data).toBe('null');
    });

    it('should handle primitive values', () => {
      const stringResult = JSONValidator.safeStringify('test');
      const numberResult = JSONValidator.safeStringify(42);
      const booleanResult = JSONValidator.safeStringify(true);

      expect(stringResult.success).toBe(true);
      expect(numberResult.success).toBe(true);
      expect(booleanResult.success).toBe(true);

      expect(stringResult.data).toBe('"test"');
      expect(numberResult.data).toBe('42');
      expect(booleanResult.data).toBe('true');
    });

    it('should handle arrays with mixed types', () => {
      const arr = [1, 'test', null, undefined, { key: 'value' }];
      const result = JSONValidator.safeStringify(arr);

      expect(result.success).toBe(true);
      expect(JSON.parse(result.data!)).toEqual([
        1,
        'test',
        null,
        null,
        { key: 'value' },
      ]);
    });

    it('should handle deeply nested arrays', () => {
      const nested = [[[[[['deep']]]]]];
      const result = JSONValidator.safeStringify(nested);

      expect(result.success).toBe(true);
      expect(JSON.parse(result.data!)).toEqual(nested);
    });

    it('should sanitize trailing commas', () => {
      // This test simulates what happens when malformed JSON is processed
      const malformedJson = '{"test": "value",}';
      const cleanJson = malformedJson.replace(/,(\s*[}\]])/g, '$1');

      expect(cleanJson).toBe('{"test": "value"}');

      const result = validateJSON(cleanJson);
      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters properly', () => {
      const obj = {
        emoji: '🚀',
        chinese: '你好',
        arabic: 'مرحبا',
        special: 'test\u2028\u2029',
      };

      const result = JSONValidator.safeStringify(obj, { sanitize: true });

      expect(result.success).toBe(true);
      expect(result.data).toContain('🚀');
      expect(result.data).toContain('你好');
      expect(result.data).toContain('مرحبا');
    });
  });

  describe('performance and stress testing', () => {
    it('should handle large objects efficiently', () => {
      const largeObj: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      const startTime = Date.now();
      const result = JSONValidator.safeStringify(largeObj);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: `item${i}`,
      }));

      const startTime = Date.now();
      const result = JSONValidator.safeStringify(largeArray);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
