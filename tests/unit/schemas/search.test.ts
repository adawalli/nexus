import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';

import {
  validateSearchInput,
  SearchToolInputSchema,
  SUPPORTED_MODELS,
} from '../../../src/schemas/search';

describe('Search Schema Validation', () => {
  describe('validateSearchInput', () => {
    it('should validate a basic query', () => {
      const input = { query: 'test query' };
      const result = validateSearchInput(input);

      expect(result.query).toBe('test query');
      expect(result.model).toBe('sonar');
      expect(result.maxTokens).toBe(1000);
      expect(result.temperature).toBe(0.3);
    });

    it('should validate with all parameters', () => {
      const input = {
        query: 'test query',
        model: 'sonar' as const,
        maxTokens: 2000,
        temperature: 0.5,
      };

      const result = validateSearchInput(input);

      expect(result.query).toBe('test query');
      expect(result.model).toBe('sonar');
      expect(result.maxTokens).toBe(2000);
      expect(result.temperature).toBe(0.5);
    });

    it('should apply defaults for optional parameters', () => {
      const input = { query: 'test query' };
      const result = validateSearchInput(input);

      expect(result.model).toBe('sonar');
      expect(result.maxTokens).toBe(1000);
      expect(result.temperature).toBe(0.3);
    });

    it('should reject empty query', () => {
      const input = { query: '' };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject missing query', () => {
      const input = {};

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject query that is too long', () => {
      const input = { query: 'a'.repeat(2001) };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject invalid model', () => {
      const input = {
        query: 'test query',
        model: 'invalid-model',
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject maxTokens below minimum', () => {
      const input = {
        query: 'test query',
        maxTokens: 0,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject maxTokens above maximum', () => {
      const input = {
        query: 'test query',
        maxTokens: 5000,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject temperature below minimum', () => {
      const input = {
        query: 'test query',
        temperature: -0.1,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should reject temperature above maximum', () => {
      const input = {
        query: 'test query',
        temperature: 2.1,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
    });

    it('should accept boundary values', () => {
      const input = {
        query: 'a', // minimum length
        maxTokens: 1, // minimum value
        temperature: 0, // minimum value
      };

      const result = validateSearchInput(input);
      expect(result.query).toBe('a');
      expect(result.maxTokens).toBe(1);
      expect(result.temperature).toBe(0);
    });

    it('should accept maximum boundary values', () => {
      const input = {
        query: 'a'.repeat(2000), // maximum length
        maxTokens: 4000, // maximum value
        temperature: 2, // maximum value
      };

      const result = validateSearchInput(input);
      expect(result.query).toBe('a'.repeat(2000));
      expect(result.maxTokens).toBe(4000);
      expect(result.temperature).toBe(2);
    });

    it('should validate new parameter ranges', () => {
      const input = {
        query: 'test query',
        topP: 0.9,
        frequencyPenalty: 1.5,
        presencePenalty: -1.0,
        stop: ['<|im_end|>', 'END'],
      };

      expect(() => validateSearchInput(input)).not.toThrow();
    });

    it('should reject invalid topP values', () => {
      expect(() =>
        validateSearchInput({
          query: 'test',
          topP: 1.5,
        })
      ).toThrow('Top-p cannot exceed 1');

      expect(() =>
        validateSearchInput({
          query: 'test',
          topP: -0.1,
        })
      ).toThrow('Top-p must be at least 0');
    });

    it('should reject invalid penalty values', () => {
      expect(() =>
        validateSearchInput({
          query: 'test',
          frequencyPenalty: 3,
        })
      ).toThrow('Frequency penalty cannot exceed 2');

      expect(() =>
        validateSearchInput({
          query: 'test',
          presencePenalty: -3,
        })
      ).toThrow('Presence penalty must be at least -2');
    });

    it('should validate stop sequences', () => {
      // Valid single string
      expect(() =>
        validateSearchInput({
          query: 'test',
          stop: 'STOP',
        })
      ).not.toThrow();

      // Valid array
      expect(() =>
        validateSearchInput({
          query: 'test',
          stop: ['END', 'STOP'],
        })
      ).not.toThrow();

      // Too many stop sequences
      expect(() =>
        validateSearchInput({
          query: 'test',
          stop: ['A', 'B', 'C', 'D', 'E'],
        })
      ).toThrow('Maximum 4 stop sequences');
    });
  });

  describe('SUPPORTED_MODELS', () => {
    it('should contain all four user-friendly model names', () => {
      expect(SUPPORTED_MODELS).toContain('sonar');
      expect(SUPPORTED_MODELS).toContain('sonar-pro');
      expect(SUPPORTED_MODELS).toContain('sonar-reasoning-pro');
      expect(SUPPORTED_MODELS).toContain('sonar-deep-research');
    });

    it('should have exactly four models', () => {
      expect(SUPPORTED_MODELS).toHaveLength(4);
    });
  });

  describe('SearchToolInputSchema', () => {
    it('should parse valid input', () => {
      const input = {
        query: 'test query',
        model: 'sonar',
        maxTokens: 500,
        temperature: 0.3,
      };

      const result = SearchToolInputSchema.parse(input);
      expect(result).toEqual({
        ...input,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      });
    });

    it('should provide detailed error messages', () => {
      const input = {
        query: '',
        maxTokens: -1,
        temperature: 3,
      };

      try {
        SearchToolInputSchema.parse(input);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        // Zod v4 uses 'issues' instead of 'errors'
        expect(zodError.issues).toHaveLength(3);
        expect(zodError.issues.some(e => e.path.includes('query'))).toBe(true);
        expect(zodError.issues.some(e => e.path.includes('maxTokens'))).toBe(
          true
        );
        expect(zodError.issues.some(e => e.path.includes('temperature'))).toBe(
          true
        );
      }
    });
  });

  // Task Group 2: Model and Timeout Validation Tests
  describe('Model parameter validation', () => {
    it('should accept all four valid model names', () => {
      const models = [
        'sonar',
        'sonar-pro',
        'sonar-reasoning-pro',
        'sonar-deep-research',
      ];

      for (const model of models) {
        const input = { query: 'test query', model };
        const result = validateSearchInput(input);
        expect(result.model).toBe(model);
      }
    });

    it('should return descriptive error with valid options when invalid model provided', () => {
      const input = {
        query: 'test query',
        model: 'invalid',
      };

      try {
        validateSearchInput(input);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        const modelError = zodError.issues.find(e => e.path.includes('model'));
        expect(modelError).toBeDefined();
        expect(modelError?.message).toContain("Invalid model 'invalid'");
        expect(modelError?.message).toContain('sonar');
        expect(modelError?.message).toContain('sonar-pro');
        expect(modelError?.message).toContain('sonar-reasoning-pro');
        expect(modelError?.message).toContain('sonar-deep-research');
      }
    });

    it('should apply default model when not specified', () => {
      const input = { query: 'test query' };
      const result = validateSearchInput(input);
      expect(result.model).toBe('sonar');
    });

    it('should maintain backwards compatibility with existing calls', () => {
      // Existing calls without model parameter should work
      const input = {
        query: 'test query',
        maxTokens: 500,
        temperature: 0.5,
      };

      const result = validateSearchInput(input);
      expect(result.model).toBe('sonar');
      expect(result.maxTokens).toBe(500);
      expect(result.temperature).toBe(0.5);
    });
  });

  describe('Timeout parameter validation', () => {
    it('should accept valid timeout values within bounds', () => {
      const input = {
        query: 'test query',
        timeout: 30000,
      };

      const result = validateSearchInput(input);
      expect(result.timeout).toBe(30000);
    });

    it('should accept minimum timeout value (5000ms)', () => {
      const input = {
        query: 'test query',
        timeout: 5000,
      };

      const result = validateSearchInput(input);
      expect(result.timeout).toBe(5000);
    });

    it('should accept maximum timeout value (600000ms)', () => {
      const input = {
        query: 'test query',
        timeout: 600000,
      };

      const result = validateSearchInput(input);
      expect(result.timeout).toBe(600000);
    });

    it('should reject timeout below minimum (5000ms)', () => {
      const input = {
        query: 'test query',
        timeout: 4999,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
      try {
        validateSearchInput(input);
      } catch (error) {
        const zodError = error as ZodError;
        const timeoutError = zodError.issues.find(e =>
          e.path.includes('timeout')
        );
        expect(timeoutError).toBeDefined();
        expect(timeoutError?.message).toContain('5000');
      }
    });

    it('should reject timeout above maximum (600000ms)', () => {
      const input = {
        query: 'test query',
        timeout: 600001,
      };

      expect(() => validateSearchInput(input)).toThrow(ZodError);
      try {
        validateSearchInput(input);
      } catch (error) {
        const zodError = error as ZodError;
        const timeoutError = zodError.issues.find(e =>
          e.path.includes('timeout')
        );
        expect(timeoutError).toBeDefined();
        expect(timeoutError?.message).toContain('600000');
      }
    });

    it('should allow timeout to be optional', () => {
      const input = { query: 'test query' };
      const result = validateSearchInput(input);
      expect(result.timeout).toBeUndefined();
    });
  });
});
