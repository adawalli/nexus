import winston from 'winston';

import {
  OpenRouterClient,
  OpenRouterApiError,
  AuthenticationError,
  RateLimitError,
  ServerError,
} from '../clients/openrouter.js';
import { ConfigurationManager } from '../config/manager.js';
import {
  MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
  MODEL_SEARCH_TYPES,
  type UserFriendlyModelName,
  type CostTier,
  type SearchType,
} from '../constants/models.js';
import {
  validateSearchInput,
  type SearchToolInput,
} from '../schemas/search.js';
import type { ChatCompletionRequest, ModelId } from '../types/openrouter.js';
import {
  formatSearchResponseWithMetrics,
  createErrorResponse,
  type SearchResponse,
} from '../types/search.js';
import { TTLCache, createCacheKey } from '../utils/cache.js';
import {
  RequestDeduplicator,
  createRequestKey,
} from '../utils/deduplication.js';
import { createUserFriendlyMessage } from '../utils/zod-error-parser.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      stderrLevels: ['error', 'warn', 'info', 'debug'],
    }),
  ],
});

/**
 * Resolve user-friendly model name to OpenRouter model identifier
 */
function resolveModelIdentifier(modelName: UserFriendlyModelName): ModelId {
  return MODELS[modelName];
}

/**
 * Get the effective timeout for a model, considering override
 */
function getEffectiveTimeout(
  modelName: UserFriendlyModelName,
  timeoutOverride?: number
): number {
  if (timeoutOverride !== undefined) {
    return timeoutOverride;
  }
  return MODEL_TIMEOUTS[modelName];
}

/**
 * Get the cost tier for a model
 */
function getCostTier(modelName: UserFriendlyModelName): CostTier {
  return MODEL_COST_TIERS[modelName];
}

/**
 * Get the search type for a model
 */
function getSearchType(modelName: UserFriendlyModelName): SearchType {
  return MODEL_SEARCH_TYPES[modelName];
}

/**
 * Convert an error to a SearchResponse with appropriate error type
 */
function createErrorResponseFromError(error: unknown): SearchResponse {
  if (error instanceof AuthenticationError) {
    return createErrorResponse(
      'Authentication failed: Invalid API key',
      'auth'
    );
  }

  if (error instanceof RateLimitError) {
    const retryMessage = error.retryAfter
      ? ` (retry after ${error.retryAfter}s)`
      : '';
    return createErrorResponse(
      `Rate limit exceeded${retryMessage}`,
      'rate_limit'
    );
  }

  if (error instanceof ServerError) {
    return createErrorResponse(
      'OpenRouter service temporarily unavailable',
      'api'
    );
  }

  if (error instanceof OpenRouterApiError) {
    return createErrorResponse(`API error: ${error.message}`, 'api');
  }

  if (error instanceof Error) {
    if (
      error.message.includes('timeout') ||
      error.message.includes('timed out')
    ) {
      return createErrorResponse(
        'Request timed out - please try again',
        'timeout'
      );
    }

    if (error.message.includes('Network error')) {
      return createErrorResponse(
        'Network error - please check your connection',
        'network'
      );
    }

    if (error.message.includes('Too many concurrent requests')) {
      return createErrorResponse(
        'Too many concurrent requests - please try again later',
        'rate_limit'
      );
    }

    return createErrorResponse(error.message, 'unknown');
  }

  return createErrorResponse('Unknown error occurred', 'unknown');
}

/**
 * Core search tool implementation
 * Orchestrates input validation, API calls, and response formatting
 */
export class SearchTool {
  private client: OpenRouterClient;
  private cache: TTLCache<SearchResponse>;
  private deduplicator: RequestDeduplicator<SearchResponse>;
  private config: ConfigurationManager;
  private apiKey: string;
  private performanceMetrics: Array<{
    totalTime: number;
    sourceCount: number;
    contentLength: number;
    estimatedMemoryUsage: number;
    parseTime: number;
    sourceExtractionTime: number;
    validationTime: number;
    formattingTime: number;
  }> = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.config = ConfigurationManager.getInstance();

    this.client = new OpenRouterClient({
      apiKey,
      userAgent: 'nexus-mcp/1.0.0',
      timeout: this.config.getTimeoutMs(),
      maxRetries: 3,
    });

    // Initialize cache with configuration settings
    this.cache = new TTLCache<SearchResponse>({
      defaultTtl: this.config.getCacheTtl(),
      maxSize: this.config.getCacheMaxSize(),
      cleanupInterval: Math.min(this.config.getCacheTtl() / 2, 60000), // Half TTL or 1 minute max
    });

    // Initialize request deduplicator
    this.deduplicator = new RequestDeduplicator<SearchResponse>({
      defaultTimeout: this.config.getTimeoutMs(),
      maxConcurrentRequests: 50, // Reasonable limit for concurrent searches
      cleanupInterval: 2 * 60 * 1000, // Cleanup every 2 minutes
    });
  }

  /**
   * Perform a search using the OpenRouter API
   * @param input - Raw input to validate and process
   * @returns Promise<SearchResponse> - Formatted search results
   */
  async search(input: unknown): Promise<SearchResponse> {
    const startTime = Date.now();
    let validatedInput: SearchToolInput;

    try {
      // Step 1: Validate input using Zod schemas
      validatedInput = validateSearchInput(input);
      logger.debug('Input validation successful', {
        query: validatedInput.query,
        model: validatedInput.model,
        maxTokens: validatedInput.maxTokens,
        temperature: validatedInput.temperature,
        timeout: validatedInput.timeout,
      });
    } catch (error) {
      logger.warn('Input validation failed', { error });

      // Use enhanced Zod error parsing for better user experience
      const parsedError = createUserFriendlyMessage(error);

      // Log detailed validation errors for debugging
      if (parsedError.isValidationError && parsedError.details) {
        logger.debug('Detailed validation errors', {
          errors: parsedError.details,
          originalInput: input,
        });
      }

      return createErrorResponse(parsedError.message, 'validation');
    }

    // Step 2: Resolve model name to OpenRouter identifier and determine timeout/cost tier/search type
    const userFriendlyModel = validatedInput.model as UserFriendlyModelName;
    const openRouterModelId = resolveModelIdentifier(userFriendlyModel);
    const effectiveTimeout = getEffectiveTimeout(
      userFriendlyModel,
      validatedInput.timeout
    );
    const costTier = getCostTier(userFriendlyModel);
    const searchType = getSearchType(userFriendlyModel);

    logger.debug('Model resolution complete', {
      userFriendlyModel,
      openRouterModelId,
      effectiveTimeout,
      costTier,
      searchType,
    });

    // Step 3: Generate keys for cache and deduplication
    const requestParams = {
      query: validatedInput.query,
      model: openRouterModelId,
      temperature: validatedInput.temperature,
      maxTokens: validatedInput.maxTokens,
      topP: validatedInput.topP,
      frequencyPenalty: validatedInput.frequencyPenalty,
      presencePenalty: validatedInput.presencePenalty,
      stop: validatedInput.stop,
    };

    const cacheKey = createCacheKey(requestParams);
    const requestKey = createRequestKey(requestParams);

    // Step 4: Check cache first if enabled
    if (this.config.isCacheEnabled()) {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        logger.info('Cache hit for search request', {
          query: validatedInput.query,
          model: openRouterModelId,
          cacheKey,
        });
        return cachedResponse;
      }
      logger.debug('Cache miss for search request', { cacheKey });
    }

    // Step 5: Use deduplication to handle concurrent identical requests
    try {
      const result = await this.deduplicator.execute(
        requestKey,
        async () => {
          return this.performActualSearch(
            validatedInput,
            openRouterModelId,
            effectiveTimeout,
            costTier,
            searchType,
            cacheKey,
            startTime
          );
        },
        effectiveTimeout
      );

      // Log deduplication info if this was a deduplicated request
      const waitingCallers = this.deduplicator.getWaitingCallers(requestKey);
      if (waitingCallers > 1) {
        logger.info('Request deduplication occurred', {
          requestKey,
          waitingCallers,
          query: validatedInput.query,
        });
      }

      return result;
    } catch (error) {
      logger.error('Deduplicated search request failed', {
        error,
        requestKey,
        query: validatedInput.query,
      });

      return createErrorResponseFromError(error);
    }
  }

  /**
   * Perform the actual search API call (used by deduplication)
   */
  private async performActualSearch(
    validatedInput: SearchToolInput,
    openRouterModelId: ModelId,
    effectiveTimeout: number,
    costTier: CostTier,
    searchType: SearchType,
    cacheKey: string,
    startTime: number
  ): Promise<SearchResponse> {
    try {
      // Create a new client with model-specific timeout
      const modelClient = new OpenRouterClient({
        apiKey: this.apiKey,
        userAgent: 'nexus-mcp/1.0.0',
        timeout: effectiveTimeout,
        maxRetries: 3,
      });

      // Prepare chat completion request with resolved model identifier
      const chatRequest: ChatCompletionRequest = {
        model: openRouterModelId,
        messages: [
          {
            role: 'user',
            content: validatedInput.query,
          },
        ],
        temperature: validatedInput.temperature,
        max_tokens: validatedInput.maxTokens,
        top_p: validatedInput.topP,
        frequency_penalty: validatedInput.frequencyPenalty,
        presence_penalty: validatedInput.presencePenalty,
        stop: validatedInput.stop,
        stream: false,
      };

      logger.info('Sending search request to OpenRouter', {
        model: openRouterModelId,
        query: validatedInput.query,
        temperature: validatedInput.temperature,
        maxTokens: validatedInput.maxTokens,
        topP: validatedInput.topP,
        frequencyPenalty: validatedInput.frequencyPenalty,
        presencePenalty: validatedInput.presencePenalty,
        stop: validatedInput.stop,
        timeout: effectiveTimeout,
        costTier,
      });

      // Call OpenRouter API with model-specific client
      const apiResponse = await modelClient.chatCompletions(chatRequest);

      logger.info('Search request completed successfully', {
        requestId: apiResponse.id,
        model: apiResponse.model,
        tokensUsed: apiResponse.usage?.total_tokens,
        responseTime: Date.now() - startTime,
      });

      // Format response with metrics for performance monitoring
      const formattingResult = formatSearchResponseWithMetrics(
        apiResponse,
        validatedInput.query,
        startTime,
        validatedInput.temperature,
        validatedInput.maxTokens,
        {
          timeout: effectiveTimeout,
          costTier,
          searchType,
        }
      );

      const searchResponse = formattingResult.response;

      // Store performance metrics (keep last 100 entries)
      this.performanceMetrics.push(formattingResult.metrics);
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics.shift();
      }

      // Log performance metrics if they exceed thresholds
      if (formattingResult.metrics.totalTime > 10) {
        // > 10ms
        logger.warn('Response formatting took longer than expected', {
          totalTime: formattingResult.metrics.totalTime,
          sourceCount: formattingResult.metrics.sourceCount,
          contentLength: formattingResult.metrics.contentLength,
          estimatedMemoryUsage: formattingResult.metrics.estimatedMemoryUsage,
        });
      }

      // Cache the response if enabled and successful
      if (this.config.isCacheEnabled() && searchResponse.success) {
        this.cache.set(cacheKey, searchResponse);
        logger.debug('Cached search response', { cacheKey });
      }

      return searchResponse;
    } catch (error) {
      logger.error('Search request failed', {
        error,
        query: validatedInput.query,
      });

      return createErrorResponseFromError(error);
    }
  }

  /**
   * Test the connection to OpenRouter API
   * @returns Promise<boolean> - Whether connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch (error) {
      logger.error('Connection test failed', { error });
      return false;
    }
  }

  /**
   * Get client configuration info
   */
  getClientInfo(): { headers: Record<string, string>; baseUrl: string } {
    const headers = this.client.getHeaders();
    // Remove the API key from headers for security
    const safeHeaders = { ...headers };
    delete safeHeaders.Authorization;

    return {
      headers: safeHeaders,
      baseUrl: 'https://openrouter.ai/api/v1', // Default base URL
    };
  }

  /**
   * Get request deduplication statistics
   */
  getDeduplicationStats() {
    return this.deduplicator.getStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get response processing performance metrics
   */
  getPerformanceMetrics() {
    if (this.performanceMetrics.length === 0) {
      return {
        averageProcessingTime: 0,
        averageSourceCount: 0,
        averageContentLength: 0,
        averageMemoryUsage: 0,
        totalRequests: 0,
        slowestRequest: null,
        fastestRequest: null,
      };
    }

    const totalTime = this.performanceMetrics.reduce(
      (acc, m) => acc + m.totalTime,
      0
    );
    const totalSourceCount = this.performanceMetrics.reduce(
      (acc, m) => acc + m.sourceCount,
      0
    );
    const totalContentLength = this.performanceMetrics.reduce(
      (acc, m) => acc + m.contentLength,
      0
    );
    const totalMemoryUsage = this.performanceMetrics.reduce(
      (acc, m) => acc + m.estimatedMemoryUsage,
      0
    );

    const slowest = this.performanceMetrics.reduce((prev, current) =>
      current.totalTime > prev.totalTime ? current : prev
    );

    const fastest = this.performanceMetrics.reduce((prev, current) =>
      current.totalTime < prev.totalTime ? current : prev
    );

    return {
      averageProcessingTime: totalTime / this.performanceMetrics.length,
      averageSourceCount: totalSourceCount / this.performanceMetrics.length,
      averageContentLength: totalContentLength / this.performanceMetrics.length,
      averageMemoryUsage: totalMemoryUsage / this.performanceMetrics.length,
      totalRequests: this.performanceMetrics.length,
      slowestRequest: slowest,
      fastestRequest: fastest,
    };
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics() {
    this.performanceMetrics = [];
  }
}

/**
 * Factory function to create a SearchTool instance
 * @param apiKey - OpenRouter API key
 * @returns SearchTool instance
 */
export function createSearchTool(apiKey: string): SearchTool {
  return new SearchTool(apiKey);
}

/**
 * Standalone search function for direct usage
 * @param query - Search query
 * @param apiKey - OpenRouter API key
 * @param options - Optional search parameters
 * @returns Promise<SearchResponse> - Search results
 */
export async function performSearch(
  query: string,
  apiKey: string,
  options: Partial<SearchToolInput> = {}
): Promise<SearchResponse> {
  const searchTool = createSearchTool(apiKey);
  return searchTool.search({
    query,
    ...options,
  });
}
