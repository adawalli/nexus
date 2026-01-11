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
      expect(result.model).toBe('perplexity/sonar');
      expect(result.maxTokens).toBe(1000);
      expect(result.temperature).toBe(0.3);
    });

    it('should validate with all parameters', () => {
      const input = {
        query: 'test query',
        model: 'perplexity/sonar' as const,
        maxTokens: 2000,
        temperature: 0.5,
      };

      const result = validateSearchInput(input);

      expect(result.query).toBe('test query');
      expect(result.model).toBe('perplexity/sonar');
      expect(result.maxTokens).toBe(2000);
      expect(result.temperature).toBe(0.5);
    });

    it('should apply defaults for optional parameters', () => {
      const input = { query: 'test query' };
      const result = validateSearchInput(input);

      expect(result.model).toBe('perplexity/sonar');
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
    it('should contain expected Perplexity models', () => {
      expect(SUPPORTED_MODELS).toContain('perplexity/sonar');
    });

    it('should have correct number of models', () => {
      expect(SUPPORTED_MODELS).toHaveLength(1);
    });
  });

  describe('SearchToolInputSchema', () => {
    it('should parse valid input', () => {
      const input = {
        query: 'test query',
        model: 'perplexity/sonar',
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
});
