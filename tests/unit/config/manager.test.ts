import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { ConfigurationManager } from '../../../src/config/manager';
import { ConfigurationError } from '../../../src/config/types';

describe('ConfigurationManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear singleton instance before each test
    ConfigurationManager['instance'] = null;
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error if required configuration is missing', () => {
      delete process.env.OPENROUTER_API_KEY;

      expect(() => ConfigurationManager.getInstance()).toThrow(
        ConfigurationError
      );
    });

    it('should successfully initialize with valid configuration', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const instance = ConfigurationManager.getInstance();
      expect(instance).toBeDefined();
      expect(instance.getApiKey()).toBe('sk-or-v1-test1234567890abcdef');
    });
  });

  describe('Configuration Getters', () => {
    let config: ConfigurationManager;

    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';
      process.env.OPENROUTER_DEFAULT_MODEL = 'perplexity/sonar';
      process.env.OPENROUTER_TIMEOUT_MS = '60000';
      process.env.LOG_LEVEL = 'debug';
      process.env.OPENROUTER_BASE_URL = 'https://api.test.com';

      config = ConfigurationManager.getInstance();
    });

    it('should return API key', () => {
      expect(config.getApiKey()).toBe('sk-or-v1-test1234567890abcdef');
    });

    it('should return default model', () => {
      expect(config.getDefaultModel()).toBe('perplexity/sonar');
    });

    it('should return timeout in milliseconds', () => {
      expect(config.getTimeoutMs()).toBe(60000);
    });

    it('should return log level', () => {
      expect(config.getLogLevel()).toBe('debug');
    });

    it('should return base URL', () => {
      expect(config.getBaseUrl()).toBe('https://api.test.com');
    });

    it('should return default values when optional config is not set', () => {
      // Create fresh instance with only required config
      ConfigurationManager['instance'] = null;
      delete process.env.OPENROUTER_DEFAULT_MODEL;
      delete process.env.OPENROUTER_TIMEOUT_MS;
      delete process.env.LOG_LEVEL;
      delete process.env.OPENROUTER_BASE_URL;

      const freshConfig = ConfigurationManager.getInstance();

      expect(freshConfig.getDefaultModel()).toBe('perplexity/sonar');
      expect(freshConfig.getTimeoutMs()).toBe(30000);
      expect(freshConfig.getLogLevel()).toBe('info');
      expect(freshConfig.getBaseUrl()).toBe('https://openrouter.ai/api/v1');
    });
  });

  describe('getMaskedApiKey', () => {
    it('should return masked API key for security', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';
      const config = ConfigurationManager.getInstance();

      expect(config.getMaskedApiKey()).toBe('sk-or-v1-test12...bcdef');
    });

    it('should handle shorter valid API keys', () => {
      // Use a valid 20-character API key (minimum length)
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-12345678901';
      const config = ConfigurationManager.getInstance();

      // For 21 character key, should show first 15 and last 5
      expect(config.getMaskedApiKey()).toBe('sk-or-v1-123456...78901');
    });
  });

  describe('getConfig', () => {
    it('should return full configuration object', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';
      process.env.OPENROUTER_DEFAULT_MODEL = 'perplexity/sonar';

      const config = ConfigurationManager.getInstance();
      const fullConfig = config.getConfig();

      expect(fullConfig).toEqual({
        openRouterApiKey: 'sk-or-v1-test1234567890abcdef',
        defaultModel: 'perplexity/sonar',
        timeoutMs: 30000,
        logLevel: 'info',
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultMaxTokens: 1000,
        defaultTemperature: 0.3,
        defaultTopP: 1.0,
        defaultFrequencyPenalty: 0.0,
        defaultPresencePenalty: 0.0,
        cacheEnabled: true,
        cacheTtl: 300000,
        cacheMaxSize: 500,
      });
    });
  });

  describe('getSafeConfig', () => {
    it('should return configuration with masked sensitive values', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const config = ConfigurationManager.getInstance();
      const safeConfig = config.getSafeConfig();

      expect(safeConfig.openRouterApiKey).toBe('sk-or-v1-test12...bcdef');
      expect(safeConfig.defaultModel).toBe('perplexity/sonar');
      expect(safeConfig.timeoutMs).toBe(30000);
    });
  });

  describe('validate', () => {
    it('should not throw for valid configuration', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const config = ConfigurationManager.getInstance();
      expect(() => config.validate()).not.toThrow();
    });
  });

  describe('Alternative environment variable names', () => {
    it('should accept OPENROUTER_KEY as alternative to OPENROUTER_API_KEY', () => {
      delete process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_KEY = 'sk-or-v1-alternative123456789';

      const config = ConfigurationManager.getInstance();
      expect(config.getApiKey()).toBe('sk-or-v1-alternative123456789');
    });

    it('should prefer OPENROUTER_API_KEY over OPENROUTER_KEY', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-primary1234567890abc';
      process.env.OPENROUTER_KEY = 'sk-or-v1-alternative123456789';

      const config = ConfigurationManager.getInstance();
      expect(config.getApiKey()).toBe('sk-or-v1-primary1234567890abc');
    });
  });

  describe('Error handling', () => {
    it('should provide helpful error message when API key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_KEY;

      expect(() => ConfigurationManager.getInstance()).toThrow(
        /OPENROUTER_API_KEY or OPENROUTER_KEY/
      );
    });

    it('should provide helpful error message when API key is invalid', () => {
      process.env.OPENROUTER_API_KEY = 'invalid';

      expect(() => ConfigurationManager.getInstance()).toThrow(
        /API key appears to be too short/
      );
    });
  });

  describe('toJSON', () => {
    it('should return safe configuration for JSON serialization', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const config = ConfigurationManager.getInstance();
      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.openRouterApiKey).toBe('sk-or-v1-test12...bcdef');
      expect(parsed.defaultModel).toBe('perplexity/sonar');
    });
  });

  describe('reset', () => {
    it('should allow resetting the singleton instance', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test1234567890abcdef';

      const instance1 = ConfigurationManager.getInstance();
      ConfigurationManager.reset();

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-different1234567890ab';
      const instance2 = ConfigurationManager.getInstance();

      expect(instance1).not.toBe(instance2);
      expect(instance2.getApiKey()).toBe('sk-or-v1-different1234567890ab');
    });
  });
});
