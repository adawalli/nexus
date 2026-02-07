import { describe, it, expect } from 'bun:test';

import {
  CONFIG_SCHEMA,
  getSchemaForField,
  getRequiredFields,
  getOptionalFields,
} from '../../../src/config/schema';

describe('Configuration Schema', () => {
  describe('CONFIG_SCHEMA', () => {
    it('should have all required fields defined', () => {
      const requiredFields = CONFIG_SCHEMA.filter(schema => schema.required);
      expect(requiredFields).toHaveLength(1);
      expect(requiredFields[0].field).toBe('openRouterApiKey');
    });

    it('should have all optional fields with default values', () => {
      const optionalFields = CONFIG_SCHEMA.filter(schema => !schema.required);
      expect(optionalFields).toHaveLength(12);

      for (const field of optionalFields) {
        expect(field.defaultValue).toBeDefined();
      }
    });

    it('should have descriptions for all fields', () => {
      for (const schema of CONFIG_SCHEMA) {
        expect(schema.description).toBeDefined();
        expect(typeof schema.description).toBe('string');
        expect(schema.description.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have environment variable names for all fields', () => {
      for (const schema of CONFIG_SCHEMA) {
        expect(schema.envVar).toBeDefined();
        const envVars = Array.isArray(schema.envVar)
          ? schema.envVar
          : [schema.envVar];
        expect(envVars.length).toBeGreaterThan(0);
        for (const envVar of envVars) {
          expect(typeof envVar).toBe('string');
          expect(envVar.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getSchemaForField', () => {
    it('should return schema for existing fields', () => {
      const schema = getSchemaForField('openRouterApiKey');
      expect(schema).toBeDefined();
      expect(schema?.field).toBe('openRouterApiKey');
    });

    it('should return undefined for non-existent fields', () => {
      const schema = getSchemaForField(
        'nonExistentField' as keyof import('../../../src/config/types').EnvironmentConfig
      );
      expect(schema).toBeUndefined();
    });
  });

  describe('getRequiredFields', () => {
    it('should return only required fields', () => {
      const requiredFields = getRequiredFields();
      expect(requiredFields).toHaveLength(1);
      expect(requiredFields[0].field).toBe('openRouterApiKey');
      expect(requiredFields[0].required).toBe(true);
    });
  });

  describe('getOptionalFields', () => {
    it('should return only optional fields', () => {
      const optionalFields = getOptionalFields();
      expect(optionalFields.length).toBeGreaterThan(0);

      for (const field of optionalFields) {
        expect(field.required).toBe(false);
      }
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', () => {
      const schema = getSchemaForField('openRouterApiKey');
      expect(schema?.validator).toBeDefined();

      const validApiKey =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = schema?.validator!(validApiKey);
      expect(result).toBeNull();
    });

    it('should reject empty string', () => {
      const schema = getSchemaForField('openRouterApiKey');
      const result = schema?.validator!('');
      expect(result).toBe('Cannot be empty');
    });

    it('should reject short API keys', () => {
      const schema = getSchemaForField('openRouterApiKey');
      const result = schema?.validator!('short');
      expect(result).toBe(
        'API key appears to be too short (minimum 20 characters)'
      );
    });

    it('should reject API keys with invalid characters', () => {
      const schema = getSchemaForField('openRouterApiKey');
      const result = schema?.validator!('this-has-invalid-chars!@#$%');
      expect(result).toBe(
        'API key contains invalid characters (only alphanumeric, underscore, and dash allowed)'
      );
    });

    it('should reject non-string values', () => {
      const schema = getSchemaForField('openRouterApiKey');
      const result = schema?.validator!(123);
      expect(result).toBe('Must be a string');
    });
  });

  describe('Model Validation', () => {
    it('should validate correct model names', () => {
      const schema = getSchemaForField('defaultModel');
      expect(schema?.validator).toBeDefined();

      const validModels = ['perplexity/sonar'];

      for (const model of validModels) {
        const result = schema?.validator!(model);
        expect(result).toBeNull();
      }
    });

    it('should reject invalid model names', () => {
      const schema = getSchemaForField('defaultModel');
      const result = schema?.validator!('invalid-model');
      expect(result).toContain('Must be one of:');
    });
  });

  describe('Timeout Validation', () => {
    it('should validate positive integers', () => {
      const schema = getSchemaForField('timeoutMs');
      expect(schema?.validator).toBeDefined();

      const result = schema?.validator!(30000);
      expect(result).toBeNull();
    });

    it('should validate string numbers', () => {
      const schema = getSchemaForField('timeoutMs');
      const result = schema?.validator!('30000');
      expect(result).toBeNull();
    });

    it('should reject negative numbers', () => {
      const schema = getSchemaForField('timeoutMs');
      const result = schema?.validator!(-1000);
      expect(result).toBe('Must be a positive number');
    });

    it('should reject zero', () => {
      const schema = getSchemaForField('timeoutMs');
      const result = schema?.validator!(0);
      expect(result).toBe('Must be a positive number');
    });

    it('should reject non-integers', () => {
      const schema = getSchemaForField('timeoutMs');
      const result = schema?.validator!(30000.5);
      expect(result).toBe('Must be an integer');
    });
  });

  describe('Log Level Validation', () => {
    it('should validate correct log levels', () => {
      const schema = getSchemaForField('logLevel');
      expect(schema?.validator).toBeDefined();

      const validLevels = ['error', 'warn', 'info', 'debug', 'silly'];

      for (const level of validLevels) {
        const result = schema?.validator!(level);
        expect(result).toBeNull();
      }
    });

    it('should be case insensitive', () => {
      const schema = getSchemaForField('logLevel');
      const result = schema?.validator!('INFO');
      expect(result).toBeNull();
    });

    it('should reject invalid log levels', () => {
      const schema = getSchemaForField('logLevel');
      const result = schema?.validator!('invalid');
      expect(result).toContain('Must be one of:');
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      const schema = getSchemaForField('baseUrl');
      expect(schema?.validator).toBeDefined();

      const validUrls = [
        'https://openrouter.ai/api/v1',
        'http://localhost:3000',
        'https://api.example.com/v2',
      ];

      for (const url of validUrls) {
        const result = schema?.validator!(url);
        expect(result).toBeNull();
      }
    });

    it('should reject invalid URLs', () => {
      const schema = getSchemaForField('baseUrl');
      const result = schema?.validator!('not-a-url');
      expect(result).toBe('Must be a valid URL');
    });

    it('should reject non-string values', () => {
      const schema = getSchemaForField('baseUrl');
      const result = schema?.validator!(123);
      expect(result).toBe('Must be a string');
    });
  });

  describe('Cache Size Validation', () => {
    it('should validate cache size within range', () => {
      const schema = getSchemaForField('cacheMaxSize');
      expect(schema?.validator).toBeDefined();

      const result = schema?.validator!(100);
      expect(result).toBeNull();
    });

    it('should reject cache size below minimum', () => {
      const schema = getSchemaForField('cacheMaxSize');
      const result = schema?.validator!(5);
      expect(result).toBe('Cache size must be at least 10 entries');
    });

    it('should reject cache size above maximum', () => {
      const schema = getSchemaForField('cacheMaxSize');
      const result = schema?.validator!(50000);
      expect(result).toBe('Cache size cannot exceed 10,000 entries');
    });

    it('should accept minimum cache size', () => {
      const schema = getSchemaForField('cacheMaxSize');
      const result = schema?.validator!(10);
      expect(result).toBeNull();
    });

    it('should accept maximum cache size', () => {
      const schema = getSchemaForField('cacheMaxSize');
      const result = schema?.validator!(10000);
      expect(result).toBeNull();
    });
  });

  describe('Cache TTL Validation', () => {
    it('should validate cache TTL within range', () => {
      const schema = getSchemaForField('cacheTtl');
      expect(schema?.validator).toBeDefined();

      const result = schema?.validator!(30000);
      expect(result).toBeNull();
    });

    it('should reject cache TTL below minimum', () => {
      const schema = getSchemaForField('cacheTtl');
      const result = schema?.validator!(500);
      expect(result).toBe('Cache TTL must be at least 1000ms (1 second)');
    });

    it('should reject cache TTL above maximum', () => {
      const schema = getSchemaForField('cacheTtl');
      const result = schema?.validator!(90000000);
      expect(result).toBe('Cache TTL cannot exceed 24 hours');
    });
  });
});
