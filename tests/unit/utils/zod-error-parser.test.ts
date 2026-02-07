import { describe, it, expect } from 'bun:test';
import { z, ZodError } from 'zod';

import {
  parseZodError,
  isZodError,
  createUserFriendlyMessage,
} from '../../../src/utils/zod-error-parser';
import { SUPPORTED_MODELS } from '../../../src/schemas/search';

describe('parseZodError', () => {
  describe('invalid_type errors', () => {
    it('should parse invalid type error', () => {
      const schema = z.object({
        name: z.string(),
      });

      let error: ZodError;
      try {
        schema.parse({ name: 123 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('name');
      expect(result.details[0].issue).toContain('Invalid type');
      // Note: Zod v4 removed the 'received' property from error issues
      expect(result.details[0].expected).toBe('string');
      expect(result.details[0].suggestion).toContain('must be of type string');
    });
  });

  describe('invalid_enum_value errors', () => {
    it('should parse invalid enum error for model field', () => {
      const schema = z.object({
        model: z.enum(SUPPORTED_MODELS),
      });

      let error: ZodError;
      try {
        schema.parse({ model: 'invalid-model' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('model');
      expect(result.details[0].issue).toContain('Invalid model name');
      // Note: Zod v4 doesn't include 'received' in enum validation errors
      expect(result.details[0].expected).toEqual(SUPPORTED_MODELS);
      expect(result.details[0].suggestion).toContain('Supported models');
    });

    it('should handle model validation without suggestion', () => {
      // Note: Zod v4 doesn't provide 'received' value, so similar name suggestions
      // are not possible. This test verifies the error is still properly formatted.
      const schema = z.object({
        model: z.enum(SUPPORTED_MODELS),
      });

      let error: ZodError;
      try {
        schema.parse({ model: 'perplexity/sonar-pro' }); // Similar to perplexity/sonar
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('Supported models');
    });

    it('should not suggest when model is very different', () => {
      const schema = z.object({
        model: z.enum(SUPPORTED_MODELS),
      });

      let error: ZodError;
      try {
        schema.parse({ model: 'xyz' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).not.toContain('Did you mean');
    });

    it('should parse invalid enum error for generic field', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive']),
      });

      let error: ZodError;
      try {
        schema.parse({ status: 'unknown' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('status');
      expect(result.details[0].issue).toContain('Invalid value');
      // Note: Zod v4 doesn't include 'received' in enum validation errors
      expect(result.details[0].expected).toEqual(['active', 'inactive']);
    });
  });

  describe('too_small errors', () => {
    it('should parse string minimum length error', () => {
      const schema = z.object({
        query: z.string().min(5),
      });

      let error: ZodError;
      try {
        schema.parse({ query: 'ab' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('query');
      expect(result.details[0].issue).toContain('String too short');
      expect(result.details[0].expected).toContain('minimum 5');
      expect(result.details[0].suggestion).toContain('at least 5 characters');
    });

    it('should parse string minimum 1 character error', () => {
      const schema = z.object({
        query: z.string().min(1),
      });

      let error: ZodError;
      try {
        schema.parse({ query: '' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at least 1 character');
      expect(result.details[0].suggestion).not.toContain('characters');
    });

    it('should parse number minimum error (inclusive)', () => {
      const schema = z.object({
        count: z.number().min(0),
      });

      let error: ZodError;
      try {
        schema.parse({ count: -1 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('count');
      expect(result.details[0].issue).toContain('Number too small');
      expect(result.details[0].suggestion).toContain('>= 0');
    });

    it('should parse number minimum error (exclusive)', () => {
      const schema = z.object({
        count: z.number().gt(0),
      });

      let error: ZodError;
      try {
        schema.parse({ count: 0 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('> 0');
    });

    it('should parse array minimum length error', () => {
      const schema = z.object({
        items: z.array(z.string()).min(2),
      });

      let error: ZodError;
      try {
        schema.parse({ items: ['one'] });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('items');
      expect(result.details[0].issue).toContain('Array too small');
      expect(result.details[0].suggestion).toContain('at least 2 items');
    });

    it('should parse array minimum 1 item error', () => {
      const schema = z.object({
        items: z.array(z.string()).min(1),
      });

      let error: ZodError;
      try {
        schema.parse({ items: [] });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at least 1 item');
      // Verify singular form for count of 1 (ends with 'item' not 'items')
      expect(result.details[0].suggestion).toMatch(/1 item$/);
    });

    it('should handle unknown type with too_small error', () => {
      // Simulate an unknown type through direct ZodError construction
      const schema = z.object({
        value: z.set(z.string()).min(1),
      });

      let error: ZodError;
      try {
        schema.parse({ value: new Set() });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at least 1');
    });
  });

  describe('too_big errors', () => {
    it('should parse string maximum length error', () => {
      const schema = z.object({
        query: z.string().max(10),
      });

      let error: ZodError;
      try {
        schema.parse({ query: 'this is a very long string' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('query');
      expect(result.details[0].issue).toContain('String too long');
      expect(result.details[0].expected).toContain('maximum 10');
      expect(result.details[0].suggestion).toContain('at most 10 characters');
    });

    it('should parse string maximum 1 character error', () => {
      const schema = z.object({
        char: z.string().max(1),
      });

      let error: ZodError;
      try {
        schema.parse({ char: 'ab' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at most 1 character');
      expect(result.details[0].suggestion).not.toContain('characters');
    });

    it('should parse number maximum error (inclusive)', () => {
      const schema = z.object({
        count: z.number().max(100),
      });

      let error: ZodError;
      try {
        schema.parse({ count: 150 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('count');
      expect(result.details[0].issue).toContain('Number too large');
      expect(result.details[0].suggestion).toContain('<= 100');
    });

    it('should parse number maximum error (exclusive)', () => {
      const schema = z.object({
        count: z.number().lt(100),
      });

      let error: ZodError;
      try {
        schema.parse({ count: 100 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('< 100');
    });

    it('should parse array maximum length error', () => {
      const schema = z.object({
        items: z.array(z.string()).max(3),
      });

      let error: ZodError;
      try {
        schema.parse({ items: ['a', 'b', 'c', 'd', 'e'] });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('items');
      expect(result.details[0].issue).toContain('Array too large');
      expect(result.details[0].suggestion).toContain('at most 3 items');
    });

    it('should parse array maximum 1 item error', () => {
      const schema = z.object({
        items: z.array(z.string()).max(1),
      });

      let error: ZodError;
      try {
        schema.parse({ items: ['a', 'b'] });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at most 1 item');
      // Verify singular form for count of 1 (ends with 'item' not 'items')
      expect(result.details[0].suggestion).toMatch(/1 item$/);
    });

    it('should handle unknown type with too_big error', () => {
      const schema = z.object({
        value: z.set(z.string()).max(1),
      });

      let error: ZodError;
      try {
        schema.parse({ value: new Set(['a', 'b']) });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].suggestion).toContain('at most 1');
    });
  });

  describe('invalid_string errors', () => {
    it('should parse email format error', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      let error: ZodError;
      try {
        schema.parse({ email: 'not-an-email' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('email');
      expect(result.details[0].issue).toContain('Invalid string format');
    });

    it('should parse url format error', () => {
      const schema = z.object({
        url: z.string().url(),
      });

      let error: ZodError;
      try {
        schema.parse({ url: 'not-a-url' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].issue).toContain('Invalid string format');
    });
  });

  describe('custom errors', () => {
    it('should parse custom validation error', () => {
      const schema = z.object({
        value: z.string().refine(val => val.startsWith('prefix_'), {
          message: 'Value must start with prefix_',
        }),
      });

      let error: ZodError;
      try {
        schema.parse({ value: 'no_prefix' });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].issue).toContain(
        'Value must start with prefix_'
      );
    });
  });

  describe('multiple errors', () => {
    it('should parse multiple errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      });

      let error: ZodError;
      try {
        schema.parse({ name: '', age: -1 });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details.length).toBe(2);
      expect(result.message).toContain('Found 2 validation errors');
      expect(result.message).toContain('Primary issue');
    });
  });

  describe('nested paths', () => {
    it('should handle nested object paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      let error: ZodError;
      try {
        schema.parse({ user: { profile: { name: '' } } });
      } catch (e) {
        error = e as ZodError;
      }

      const result = parseZodError(error!);

      expect(result.details[0].field).toBe('user.profile.name');
    });
  });

  describe('default/unknown error codes', () => {
    it('should handle unknown error codes gracefully', () => {
      // Create a ZodError with a simulated unknown issue type
      const schema = z.object({
        value: z.string(),
      });

      let error: ZodError;
      try {
        schema.parse({ value: 123 });
      } catch (e) {
        error = e as ZodError;
      }

      // The result should still be parseable
      const result = parseZodError(error!);
      expect(result.details.length).toBeGreaterThan(0);
    });
  });
});

describe('isZodError', () => {
  it('should return true for ZodError', () => {
    const schema = z.string();

    try {
      schema.parse(123);
    } catch (e) {
      expect(isZodError(e)).toBe(true);
    }
  });

  it('should return false for standard Error', () => {
    expect(isZodError(new Error('test'))).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isZodError('string')).toBe(false);
    expect(isZodError(null)).toBe(false);
    expect(isZodError(undefined)).toBe(false);
    expect(isZodError(123)).toBe(false);
    expect(isZodError({})).toBe(false);
  });
});

describe('createUserFriendlyMessage', () => {
  it('should create message from ZodError', () => {
    const schema = z.string().min(1);

    let error: ZodError;
    try {
      schema.parse('');
    } catch (e) {
      error = e as ZodError;
    }

    const result = createUserFriendlyMessage(error!);

    expect(result.isValidationError).toBe(true);
    expect(result.message).toBeDefined();
    expect(result.details).toBeDefined();
    expect(result.details!.length).toBeGreaterThan(0);
  });

  it('should create message from standard Error', () => {
    const error = new Error('Something went wrong');

    const result = createUserFriendlyMessage(error);

    expect(result.isValidationError).toBe(false);
    expect(result.message).toBe('Something went wrong');
    expect(result.details).toBeUndefined();
  });

  it('should create message from non-Error values', () => {
    const result = createUserFriendlyMessage('string error');

    expect(result.isValidationError).toBe(false);
    expect(result.message).toBe('An unexpected error occurred');
  });

  it('should create message from null', () => {
    const result = createUserFriendlyMessage(null);

    expect(result.isValidationError).toBe(false);
    expect(result.message).toBe('An unexpected error occurred');
  });
});

describe('string similarity for model suggestions', () => {
  it('should handle empty input', () => {
    const schema = z.object({
      model: z.enum(SUPPORTED_MODELS),
    });

    let error: ZodError;
    try {
      schema.parse({ model: '' });
    } catch (e) {
      error = e as ZodError;
    }

    const result = parseZodError(error!);

    // Should not crash and should not suggest
    expect(result.details[0].suggestion).not.toContain('Did you mean');
  });

  it('should handle close match with similar characters', () => {
    // Note: Zod v4 doesn't provide 'received' value, so similar name suggestions
    // are not possible. This test verifies the error is still properly formatted.
    const schema = z.object({
      model: z.enum(SUPPORTED_MODELS),
    });

    let error: ZodError;
    try {
      // 'perplexity/sona' is close to 'perplexity/sonar' with high similarity
      schema.parse({ model: 'perplexity/sona' });
    } catch (e) {
      error = e as ZodError;
    }

    const result = parseZodError(error!);

    expect(result.details[0].suggestion).toContain('Supported models');
  });
});
