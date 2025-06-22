import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  OpenRouterError,
  PerplexityModelId,
} from '../types/openrouter.js';

export interface OpenRouterClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  userAgent?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
}

export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly retryConfig: RetryConfig;

  constructor(config: OpenRouterClientConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.timeout = config.timeout || 30000; // 30 seconds default

    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000, // 1 second default
      retryableStatusCodes: [429, 500, 502, 503, 504],
    };

    this.defaultHeaders = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent || 'nexus-mcp/1.0.0',
      'HTTP-Referer': 'https://github.com/adawalli/nexus',
      'X-Title': 'Nexus Search MCP',
    };
  }

  /**
   * Validate API key format
   */
  private validateApiKey(): boolean {
    return this.apiKey.startsWith('sk-or-') && this.apiKey.length > 10;
  }

  /**
   * Sleep for a given amount of time
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: OpenRouterApiError): boolean {
    return this.retryConfig.retryableStatusCodes.includes(error.statusCode);
  }

  /**
   * Make authenticated HTTP request to OpenRouter API with retry logic
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.validateApiKey()) {
      throw new AuthenticationError('Invalid OpenRouter API key format');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const url = `${this.baseUrl}${endpoint}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: OpenRouterError = await response
            .json()
            .catch(() => ({
              error: {
                code: response.status,
                message: response.statusText,
                type: 'http_error',
              },
            }));

          let apiError: OpenRouterApiError;

          // Create specific error types based on status code
          if (response.status === 401) {
            apiError = new AuthenticationError(
              errorData.error.message,
              response.status,
              errorData.error.code
            );
          } else if (response.status === 429) {
            // Extract retry-after header if available
            const retryAfter = response.headers.get('retry-after');
            apiError = new RateLimitError(
              errorData.error.message,
              retryAfter ? parseInt(retryAfter, 10) : undefined,
              response.status,
              errorData.error.code
            );
          } else if (response.status >= 500) {
            apiError = new ServerError(
              errorData.error.message,
              response.status,
              errorData.error.code
            );
          } else if (response.status >= 400) {
            apiError = new ClientError(
              errorData.error.message,
              response.status,
              errorData.error.type,
              errorData.error.code
            );
          } else {
            apiError = new OpenRouterApiError(
              errorData.error.message,
              response.status,
              errorData.error.type,
              errorData.error.code
            );
          }

          // Don't retry non-retryable errors or on the last attempt
          if (
            !this.isRetryableError(apiError) ||
            attempt === this.retryConfig.maxRetries
          ) {
            throw apiError;
          }

          lastError = apiError;
          const delay = this.calculateBackoffDelay(
            attempt,
            this.retryConfig.retryDelay
          );
          await this.sleep(delay);
          continue;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof OpenRouterApiError) {
          // This error was already handled above
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutError = new Error(
            `Request timeout after ${this.timeout}ms`
          );

          // Don't retry timeout errors on the last attempt
          if (attempt === this.retryConfig.maxRetries) {
            throw timeoutError;
          }

          lastError = timeoutError;
          const delay = this.calculateBackoffDelay(
            attempt,
            this.retryConfig.retryDelay
          );
          await this.sleep(delay);
          continue;
        }

        const networkError = new Error(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Don't retry network errors on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          throw networkError;
        }

        lastError = networkError;
        const delay = this.calculateBackoffDelay(
          attempt,
          this.retryConfig.retryDelay
        );
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Set custom headers for requests
   */
  setHeaders(headers: Record<string, string>): void {
    Object.assign(this.defaultHeaders, headers);
  }

  /**
   * Get current headers
   */
  getHeaders(): Record<string, string> {
    return { ...this.defaultHeaders };
  }

  /**
   * Test API connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/models');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a chat completion using the OpenRouter API
   */
  async chatCompletions(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    // Default to Perplexity Sonar model if not specified or use a fallback
    const defaultModel: PerplexityModelId = 'perplexity/sonar';

    const payload: ChatCompletionRequest = {
      ...request,
      model: request.model || defaultModel,
      // Ensure we don't accidentally enable streaming for non-streaming requests
      stream: request.stream || false,
    };

    // Validate required fields
    if (!payload.messages || payload.messages.length === 0) {
      throw new Error('Messages array is required and cannot be empty');
    }

    return await this.makeRequest<ChatCompletionResponse>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Create a streaming chat completion using the OpenRouter API
   * Returns an async generator that yields chat completion chunks
   */
  async *chatCompletionsStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
    const defaultModel: PerplexityModelId = 'perplexity/sonar';

    const payload: ChatCompletionRequest = {
      ...request,
      model: request.model || defaultModel,
      stream: true,
    };

    // Validate required fields
    if (!payload.messages || payload.messages.length === 0) {
      throw new Error('Messages array is required and cannot be empty');
    }

    if (!this.validateApiKey()) {
      throw new AuthenticationError('Invalid OpenRouter API key format');
    }

    const url = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.defaultHeaders,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: OpenRouterError = await response.json().catch(() => ({
          error: {
            code: response.status,
            message: response.statusText,
            type: 'http_error',
          },
        }));

        // Create specific error types for streaming requests too
        if (response.status === 401) {
          throw new AuthenticationError(
            errorData.error.message,
            response.status,
            errorData.error.code
          );
        } else if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw new RateLimitError(
            errorData.error.message,
            retryAfter ? parseInt(retryAfter, 10) : undefined,
            response.status,
            errorData.error.code
          );
        } else if (response.status >= 500) {
          throw new ServerError(
            errorData.error.message,
            response.status,
            errorData.error.code
          );
        } else if (response.status >= 400) {
          throw new ClientError(
            errorData.error.message,
            response.status,
            errorData.error.type,
            errorData.error.code
          );
        } else {
          throw new OpenRouterApiError(
            errorData.error.message,
            response.status,
            errorData.error.type,
            errorData.error.code
          );
        }
      }

      if (!response.body) {
        throw new Error('No response body for streaming request');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine === '' || !trimmedLine.startsWith('data: ')) {
              continue;
            }

            const data = trimmedLine.slice(6); // Remove 'data: ' prefix

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: ChatCompletionChunk = JSON.parse(data);
              yield parsed;
            } catch {
              // Log parsing errors but continue processing
              // Note: Using minimal logging to avoid stdout contamination
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenRouterApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw new Error(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Base error class for OpenRouter API errors
 */
export class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly type: string,
    public readonly code: number
  ) {
    super(message);
    this.name = 'OpenRouterApiError';
  }

  isRateLimitError(): boolean {
    return this.statusCode === 429 || this.type === 'rate_limit_error';
  }

  isAuthenticationError(): boolean {
    return this.statusCode === 401 || this.type === 'authentication_error';
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends OpenRouterApiError {
  constructor(message: string, statusCode: number = 401, code: number = 401) {
    super(message, statusCode, 'authentication_error', code);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends OpenRouterApiError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    statusCode: number = 429,
    code: number = 429
  ) {
    super(message, statusCode, 'rate_limit_error', code);
    this.name = 'RateLimitError';
  }
}

/**
 * Server error class for 5xx status codes
 */
export class ServerError extends OpenRouterApiError {
  constructor(message: string, statusCode: number, code: number) {
    super(message, statusCode, 'server_error', code);
    this.name = 'ServerError';
  }
}

/**
 * Generic API error class for 4xx client errors
 */
export class ClientError extends OpenRouterApiError {
  constructor(message: string, statusCode: number, type: string, code: number) {
    super(message, statusCode, type, code);
    this.name = 'ClientError';
  }
}
