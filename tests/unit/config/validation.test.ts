import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { ConfigurationError } from '../../../src/config/types';
import {
  validateConfiguration,
  validateConfigurationOrThrow,
  isEnvironmentVariableSet,
  getConfigurationSummary,
  getValidationErrorMessage,
} from '../../../src/config/validation';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables before each test
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateConfiguration', () => {
    it('should return valid result with all required fields', () => {
      process.env.OPENROUTER_API_KEY =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';

      const result = validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.openRouterApiKey).toBe(
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef'
      );
      expect(result.errors).toHaveLength(0);
    });

    it('should use default values for optional fields', () => {
      process.env.OPENROUTER_API_KEY =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';

      const result = validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.config?.defaultModel).toBe('perplexity/sonar');
      expect(result.config?.timeoutMs).toBe(30000);
      expect(result.config?.logLevel).toBe('info');
      expect(result.config?.baseUrl).toBe('https://openrouter.ai/api/v1');
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about using defaults
    });

    it('should accept OPENROUTER_KEY as alternative API key env var', () => {
      process.env.OPENROUTER_KEY =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';

      const result = validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.config?.openRouterApiKey).toBe(
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef'
      );
    });

    it('should return error when required API key is missing', () => {
      const result = validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.config).toBeUndefined();
      expect(result.errors).toContain(
        'Required environment variable OPENROUTER_API_KEY or OPENROUTER_KEY is not set'
      );
    });
  });

  describe('validateConfigurationOrThrow', () => {
    it('should return config when valid', () => {
      process.env.OPENROUTER_API_KEY =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';

      const config = validateConfigurationOrThrow();

      expect(config).toBeDefined();
      expect(config.openRouterApiKey).toBe(
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef'
      );
    });

    it('should throw ConfigurationError when invalid', () => {
      expect(() => validateConfigurationOrThrow()).toThrow(ConfigurationError);
    });
  });

  describe('isEnvironmentVariableSet', () => {
    it('should return true when single env var is set', () => {
      process.env.TEST_VAR = 'value';

      expect(isEnvironmentVariableSet('TEST_VAR')).toBe(true);
    });

    it('should return false when single env var is not set', () => {
      expect(isEnvironmentVariableSet('MISSING_VAR')).toBe(false);
    });

    it('should return true when any of multiple env vars is set', () => {
      process.env.TEST_VAR_2 = 'value';

      expect(
        isEnvironmentVariableSet(['TEST_VAR_1', 'TEST_VAR_2', 'TEST_VAR_3'])
      ).toBe(true);
    });
  });

  describe('getConfigurationSummary', () => {
    it('should return a formatted summary string', () => {
      const summary = getConfigurationSummary();

      expect(summary).toContain('Environment Configuration:');
      expect(summary).toContain('Required:');
      expect(summary).toContain('OPENROUTER_API_KEY or OPENROUTER_KEY');
      expect(summary).toContain('Optional:');
      expect(summary).toContain('LOG_LEVEL');
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return null when configuration is valid', () => {
      process.env.OPENROUTER_API_KEY =
        'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef';

      const errorMessage = getValidationErrorMessage();

      expect(errorMessage).toBeNull();
    });

    it('should return formatted error message when invalid', () => {
      const errorMessage = getValidationErrorMessage();

      expect(errorMessage).toBeDefined();
      expect(errorMessage).toContain('Configuration validation failed:');
      expect(errorMessage).toContain('Errors:');
      expect(errorMessage).toContain(
        'OPENROUTER_API_KEY or OPENROUTER_KEY is not set'
      );
    });
  });
});
