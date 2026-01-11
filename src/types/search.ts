import {
  ResponseOptimizer,
  formatResponseQuick,
  type ResponseMetadataOptions,
} from '../utils/response-optimizer.js';

import type { ChatCompletionResponse, Usage } from './openrouter.js';

/**
 * Source information for search results
 */
export interface SearchSource {
  /** URL of the source */
  url: string;
  /** Title of the source */
  title: string;
  /** Brief description or snippet */
  description?: string;
}

/**
 * Metadata about the search operation
 */
export interface SearchMetadata {
  /** Model used for search */
  model: string;
  /** Timestamp when search was performed */
  timestamp: number;
  /** Query that was searched */
  query: string;
  /** Temperature used for generation */
  temperature?: number;
  /** Maximum tokens requested */
  maxTokens?: number;
  /** Token usage information */
  usage?: Usage;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Cost tier classification for billing awareness */
  costTier?: 'standard' | 'premium';
  /** Effective timeout applied in milliseconds */
  timeout?: number;
}

/**
 * Search result data structure
 */
export interface SearchResult {
  /** Main search result content */
  content: string;
  /** Confidence score (0-1) if available */
  confidence?: number;
  /** Sources cited in the result */
  sources: SearchSource[];
  /** Additional metadata */
  metadata: SearchMetadata;
}

/**
 * Complete search response structure
 */
export interface SearchResponse {
  /** Whether the search was successful */
  success: boolean;
  /** Search result data (if successful) */
  result?: SearchResult;
  /** Error message (if unsuccessful) */
  error?: string;
  /** Error type for better error handling */
  errorType?:
    | 'validation'
    | 'api'
    | 'network'
    | 'timeout'
    | 'rate_limit'
    | 'auth'
    | 'unknown';
  /** Request ID for tracking */
  requestId?: string;
}

/**
 * Format a ChatCompletionResponse into a SearchResponse
 * Uses optimized formatter for better performance
 */
export function formatSearchResponse(
  apiResponse: ChatCompletionResponse,
  query: string,
  startTime: number,
  temperature?: number,
  maxTokens?: number,
  metadataOptions?: ResponseMetadataOptions
): SearchResponse {
  // Use optimized formatter for better performance
  return formatResponseQuick(
    apiResponse,
    query,
    startTime,
    temperature,
    maxTokens,
    metadataOptions
  );
}

/**
 * Format a ChatCompletionResponse with detailed performance metrics
 */
export function formatSearchResponseWithMetrics(
  apiResponse: ChatCompletionResponse,
  query: string,
  startTime: number,
  temperature?: number,
  maxTokens?: number,
  metadataOptions?: ResponseMetadataOptions
) {
  const optimizer = ResponseOptimizer.getInstance();
  return optimizer.formatSearchResponseOptimized(
    apiResponse,
    query,
    startTime,
    temperature,
    maxTokens,
    metadataOptions
  );
}

/**
 * Create an error SearchResponse
 */
export function createErrorResponse(
  error: string,
  errorType: SearchResponse['errorType'] = 'unknown',
  requestId?: string
): SearchResponse {
  return {
    success: false,
    error,
    errorType,
    requestId,
  };
}

/**
 * Validate that a SearchResponse is well-formed
 */
export function validateSearchResponse(response: SearchResponse): boolean {
  if (!response.success && !response.error) {
    return false;
  }

  if (response.success && !response.result) {
    return false;
  }

  if (response.result) {
    if (!response.result.content || !response.result.metadata) {
      return false;
    }

    if (!Array.isArray(response.result.sources)) {
      return false;
    }
  }

  return true;
}
