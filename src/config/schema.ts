import { ConfigSchema } from './types.js';

// URL is a global in Node.js environments
declare const URL: typeof globalThis.URL;

/**
 * Validates that a value is a non-empty string
 */
function validateNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'Must be a string';
  }
  if (value.trim().length === 0) {
    return 'Cannot be empty';
  }
  return null;
}

/**
 * Validates that a value is a valid API key format
 */
function validateApiKey(value: unknown): string | null {
  const stringError = validateNonEmptyString(value);
  if (stringError) return stringError;

  const apiKey = value as string;

  // Basic API key format validation - should be at least 20 characters
  if (apiKey.length < 20) {
    return 'API key appears to be too short (minimum 20 characters)';
  }

  // Check for common API key patterns
  if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    return 'API key contains invalid characters (only alphanumeric, underscore, and dash allowed)';
  }

  return null;
}

/**
 * Validates that a value is a positive integer
 */
function validatePositiveInteger(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      return 'Must be a valid number';
    }
    value = parsed;
  }

  if (typeof value !== 'number') {
    return 'Must be a number';
  }

  if (!Number.isInteger(value)) {
    return 'Must be an integer';
  }

  if (value <= 0) {
    return 'Must be a positive number';
  }

  return null;
}

/**
 * Validates that a value is a valid log level
 */
function validateLogLevel(value: unknown): string | null {
  const validLevels = ['error', 'warn', 'info', 'debug', 'silly'];

  if (typeof value !== 'string') {
    return 'Must be a string';
  }

  if (!validLevels.includes(value.toLowerCase())) {
    return `Must be one of: ${validLevels.join(', ')}`;
  }

  return null;
}

/**
 * Validates that a value is a valid URL
 */
function validateUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'Must be a string';
  }

  try {
    new URL(value);
    return null;
  } catch {
    return 'Must be a valid URL';
  }
}

/**
 * Validates that a value is a valid temperature (0-2)
 */
function validateTemperature(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return 'Must be a valid number';
    }
    value = parsed;
  }

  if (typeof value !== 'number') {
    return 'Must be a number';
  }

  if (value < 0 || value > 2) {
    return 'Must be between 0 and 2';
  }

  return null;
}

/**
 * Validates that a value is a valid top_p (0-1)
 */
function validateTopP(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return 'Must be a valid number';
    }
    value = parsed;
  }

  if (typeof value !== 'number') {
    return 'Must be a number';
  }

  if (value < 0 || value > 1) {
    return 'Must be between 0 and 1';
  }

  return null;
}

/**
 * Validates that a value is a valid penalty (-2 to 2)
 */
function validatePenalty(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return 'Must be a valid number';
    }
    value = parsed;
  }

  if (typeof value !== 'number') {
    return 'Must be a number';
  }

  if (value < -2 || value > 2) {
    return 'Must be between -2 and 2';
  }

  return null;
}

/**
 * Validates max tokens (positive integer, reasonable upper bound)
 */
function validateMaxTokens(value: unknown): string | null {
  const intError = validatePositiveInteger(value);
  if (intError) return intError;

  const maxTokens = value as number;
  if (maxTokens > 8000) {
    return 'Maximum tokens cannot exceed 8000';
  }

  return null;
}

/**
 * Validates boolean values from environment variables
 */
function validateBoolean(value: unknown): string | null {
  if (typeof value === 'boolean') {
    return null;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
      return null;
    }
  }

  return 'Must be a boolean value (true/false, 1/0, yes/no)';
}

/**
 * Validates cache TTL (positive integer with reasonable bounds)
 */
function validateCacheTtl(value: unknown): string | null {
  const intError = validatePositiveInteger(value);
  if (intError) return intError;

  const ttl = value as number;
  if (ttl < 1000) {
    return 'Cache TTL must be at least 1000ms (1 second)';
  }
  if (ttl > 24 * 60 * 60 * 1000) {
    return 'Cache TTL cannot exceed 24 hours';
  }

  return null;
}

/**
 * Validates cache size (positive integer with reasonable bounds)
 */
function validateCacheSize(value: unknown): string | null {
  const intError = validatePositiveInteger(value);
  if (intError) return intError;

  const size = value as number;
  if (size < 10) {
    return 'Cache size must be at least 10 entries';
  }
  if (size > 10000) {
    return 'Cache size cannot exceed 10,000 entries';
  }

  return null;
}

/**
 * Validates that a value is a valid Perplexity model identifier
 */
function validateModel(value: unknown): string | null {
  const stringError = validateNonEmptyString(value);
  if (stringError) return stringError;

  const model = value as string;
  const validModels = ['perplexity/sonar'];

  if (!validModels.includes(model)) {
    return `Must be one of: ${validModels.join(', ')}`;
  }

  return null;
}

/**
 * Configuration schema defining all environment variables and their validation rules
 */
export const CONFIG_SCHEMA: ConfigSchema[] = [
  {
    field: 'openRouterApiKey',
    envVar: ['OPENROUTER_API_KEY', 'OPENROUTER_KEY'],
    required: true,
    validator: validateApiKey,
    description: 'OpenRouter API key for authentication (required)',
  },
  {
    field: 'defaultModel',
    envVar: 'OPENROUTER_DEFAULT_MODEL',
    required: false,
    defaultValue: 'perplexity/sonar',
    validator: validateModel,
    description: 'Default Perplexity model to use for search operations',
  },
  {
    field: 'timeoutMs',
    envVar: 'OPENROUTER_TIMEOUT_MS',
    required: false,
    defaultValue: 30000,
    validator: validatePositiveInteger,
    description: 'Request timeout in milliseconds (default: 30000)',
  },
  {
    field: 'logLevel',
    envVar: 'LOG_LEVEL',
    required: false,
    defaultValue: 'info',
    validator: validateLogLevel,
    description:
      'Log level for the application (error, warn, info, debug, silly)',
  },
  {
    field: 'baseUrl',
    envVar: 'OPENROUTER_BASE_URL',
    required: false,
    defaultValue: 'https://openrouter.ai/api/v1',
    validator: validateUrl,
    description:
      'Base URL for OpenRouter API (default: https://openrouter.ai/api/v1)',
  },
  {
    field: 'defaultMaxTokens',
    envVar: 'OPENROUTER_DEFAULT_MAX_TOKENS',
    required: false,
    defaultValue: 1000,
    validator: validateMaxTokens,
    description: 'Default maximum tokens for responses (default: 1000)',
  },
  {
    field: 'defaultTemperature',
    envVar: 'OPENROUTER_DEFAULT_TEMPERATURE',
    required: false,
    defaultValue: 0.3,
    validator: validateTemperature,
    description: 'Default temperature for response generation (default: 0.3)',
  },
  {
    field: 'defaultTopP',
    envVar: 'OPENROUTER_DEFAULT_TOP_P',
    required: false,
    defaultValue: 1.0,
    validator: validateTopP,
    description: 'Default top_p parameter for nucleus sampling (default: 1.0)',
  },
  {
    field: 'defaultFrequencyPenalty',
    envVar: 'OPENROUTER_DEFAULT_FREQUENCY_PENALTY',
    required: false,
    defaultValue: 0.0,
    validator: validatePenalty,
    description:
      'Default frequency penalty to reduce repetition (default: 0.0)',
  },
  {
    field: 'defaultPresencePenalty',
    envVar: 'OPENROUTER_DEFAULT_PRESENCE_PENALTY',
    required: false,
    defaultValue: 0.0,
    validator: validatePenalty,
    description:
      'Default presence penalty to encourage topic diversity (default: 0.0)',
  },
  {
    field: 'cacheEnabled',
    envVar: 'CACHE_ENABLED',
    required: false,
    defaultValue: true,
    validator: validateBoolean,
    description: 'Enable/disable response caching (default: true)',
  },
  {
    field: 'cacheTtl',
    envVar: 'CACHE_TTL_MS',
    required: false,
    defaultValue: 5 * 60 * 1000, // 5 minutes
    validator: validateCacheTtl,
    description: 'Cache TTL in milliseconds (default: 300000 = 5 minutes)',
  },
  {
    field: 'cacheMaxSize',
    envVar: 'CACHE_MAX_SIZE',
    required: false,
    defaultValue: 500,
    validator: validateCacheSize,
    description: 'Maximum cache size in number of entries (default: 500)',
  },
];

/**
 * Get the schema definition for a specific field
 */
export function getSchemaForField(
  field: keyof import('./types').EnvironmentConfig
): ConfigSchema | undefined {
  return CONFIG_SCHEMA.find(schema => schema.field === field);
}

/**
 * Get all required fields from the schema
 */
export function getRequiredFields(): ConfigSchema[] {
  return CONFIG_SCHEMA.filter(schema => schema.required);
}

/**
 * Get all optional fields from the schema
 */
export function getOptionalFields(): ConfigSchema[] {
  return CONFIG_SCHEMA.filter(schema => !schema.required);
}
