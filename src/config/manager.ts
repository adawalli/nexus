import { EnvironmentConfig, ConfigurationError } from './types.js';
import { validateConfigurationOrThrow } from './validation.js';

/**
 * ConfigurationManager provides a singleton interface to access configuration values
 * loaded from environment variables. It validates configuration on initialization
 * and provides type-safe getters for all configuration fields.
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager | null = null;
  private readonly config: EnvironmentConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  /**
   * Get the singleton instance of ConfigurationManager
   * @throws {ConfigurationError} if configuration validation fails
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      try {
        const config = validateConfigurationOrThrow();
        ConfigurationManager.instance = new ConfigurationManager(config);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          // Enhance error message with specific details
          const enhancedMessage = error.errors.join('; ');
          throw new ConfigurationError(
            enhancedMessage,
            error.errors,
            error.warnings
          );
        }
        throw error;
      }
    }
    return ConfigurationManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    ConfigurationManager.instance = null;
  }

  /**
   * Get the OpenRouter API key
   */
  public getApiKey(): string {
    return this.config.openRouterApiKey;
  }

  /**
   * Get a masked version of the API key for logging
   */
  public getMaskedApiKey(): string {
    const apiKey = this.config.openRouterApiKey;
    if (apiKey.length <= 10) {
      // For very short keys, show first 3 and last 3 characters
      return `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`;
    }
    // Show first 15 and last 5 characters
    return `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 5)}`;
  }

  /**
   * Get the default model for search operations
   */
  public getDefaultModel(): string {
    return this.config.defaultModel || 'perplexity/sonar';
  }

  /**
   * Get the request timeout in milliseconds
   */
  public getTimeoutMs(): number {
    return this.config.timeoutMs || 30000;
  }

  /**
   * Get the configured log level
   */
  public getLogLevel(): string {
    return this.config.logLevel || 'info';
  }

  /**
   * Get the base URL for OpenRouter API
   */
  public getBaseUrl(): string {
    return this.config.baseUrl || 'https://openrouter.ai/api/v1';
  }

  /**
   * Get the default maximum tokens for responses
   */
  public getDefaultMaxTokens(): number {
    return this.config.defaultMaxTokens || 1000;
  }

  /**
   * Get the default temperature for response generation
   */
  public getDefaultTemperature(): number {
    return this.config.defaultTemperature || 0.3;
  }

  /**
   * Get the default top_p parameter for nucleus sampling
   */
  public getDefaultTopP(): number {
    return this.config.defaultTopP || 1.0;
  }

  /**
   * Get the default frequency penalty
   */
  public getDefaultFrequencyPenalty(): number {
    return this.config.defaultFrequencyPenalty || 0.0;
  }

  /**
   * Get the default presence penalty
   */
  public getDefaultPresencePenalty(): number {
    return this.config.defaultPresencePenalty || 0.0;
  }

  /**
   * Get whether caching is enabled
   */
  public isCacheEnabled(): boolean {
    return this.config.cacheEnabled !== false; // Default to true
  }

  /**
   * Get the cache TTL in milliseconds
   */
  public getCacheTtl(): number {
    return this.config.cacheTtl || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get the maximum cache size
   */
  public getCacheMaxSize(): number {
    return this.config.cacheMaxSize || 500;
  }

  /**
   * Get the full configuration object
   */
  public getConfig(): EnvironmentConfig {
    return {
      openRouterApiKey: this.config.openRouterApiKey,
      defaultModel: this.getDefaultModel(),
      timeoutMs: this.getTimeoutMs(),
      logLevel: this.getLogLevel(),
      baseUrl: this.getBaseUrl(),
      defaultMaxTokens: this.getDefaultMaxTokens(),
      defaultTemperature: this.getDefaultTemperature(),
      defaultTopP: this.getDefaultTopP(),
      defaultFrequencyPenalty: this.getDefaultFrequencyPenalty(),
      defaultPresencePenalty: this.getDefaultPresencePenalty(),
      cacheEnabled: this.isCacheEnabled(),
      cacheTtl: this.getCacheTtl(),
      cacheMaxSize: this.getCacheMaxSize(),
    };
  }

  /**
   * Get a safe version of the configuration with sensitive values masked
   */
  public getSafeConfig(): EnvironmentConfig {
    return {
      openRouterApiKey: this.getMaskedApiKey(),
      defaultModel: this.getDefaultModel(),
      timeoutMs: this.getTimeoutMs(),
      logLevel: this.getLogLevel(),
      baseUrl: this.getBaseUrl(),
      defaultMaxTokens: this.getDefaultMaxTokens(),
      defaultTemperature: this.getDefaultTemperature(),
      defaultTopP: this.getDefaultTopP(),
      defaultFrequencyPenalty: this.getDefaultFrequencyPenalty(),
      defaultPresencePenalty: this.getDefaultPresencePenalty(),
      cacheEnabled: this.isCacheEnabled(),
      cacheTtl: this.getCacheTtl(),
      cacheMaxSize: this.getCacheMaxSize(),
    };
  }

  /**
   * Validate the current configuration
   * @throws {ConfigurationError} if configuration is invalid
   */
  public validate(): void {
    // Configuration is already validated in constructor
    // This method exists for explicit validation if needed
    validateConfigurationOrThrow();
  }

  /**
   * Custom JSON serialization to prevent leaking sensitive data
   */
  public toJSON(): EnvironmentConfig {
    return this.getSafeConfig();
  }
}
