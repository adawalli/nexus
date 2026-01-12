/**
 * Response formatting and parsing optimization utilities
 * Provides high-performance response processing with minimal memory allocation
 */

import type { ChatCompletionResponse } from '../types/openrouter.js';
import type {
  SearchResponse,
  SearchResult,
  SearchSource,
  SearchMetadata,
} from '../types/search.js';
import type { CostTier, SearchType } from '../constants/models.js';

// Performance API declarations for Node.js
declare const performance: {
  now(): number;
};

// Pre-compiled regex patterns for better performance
const URL_REGEX = /https?:\/\/[^\s\]]+/g;
const CITATION_REGEX = /\[(\d+)\]:\s*(https?:\/\/[^\s\]]+)(?:\s+"([^"]*)")?/g;
const DOMAIN_REGEX = /^https?:\/\/([^/]+)/;

// Pre-allocated string patterns for optimization
const SOURCE_TITLE_PREFIX = 'Source ';
const REFERENCE_PREFIX = 'Reference from ';

/**
 * Performance metrics for response processing
 */
export interface ResponseProcessingMetrics {
  /** Time spent parsing response JSON */
  parseTime: number;
  /** Time spent extracting sources */
  sourceExtractionTime: number;
  /** Time spent validating response */
  validationTime: number;
  /** Time spent creating final object */
  formattingTime: number;
  /** Total processing time */
  totalTime: number;
  /** Number of sources extracted */
  sourceCount: number;
  /** Content length processed */
  contentLength: number;
  /** Memory usage estimate (bytes) */
  estimatedMemoryUsage: number;
}

/**
 * Optimized source extraction result
 */
interface SourceExtractionResult {
  sources: SearchSource[];
  processedContent: string;
  extractionTime: number;
}

/**
 * Additional metadata options for response formatting
 */
export interface ResponseMetadataOptions {
  /** Effective timeout applied in milliseconds */
  timeout?: number;
  /** Cost tier classification */
  costTier?: CostTier;
  /** Search type classification (realtime or training-data) */
  searchType?: SearchType;
}

/**
 * High-performance response formatter with optimization features
 */
export class ResponseOptimizer {
  private static instance: ResponseOptimizer | null = null;

  // Reusable objects for memory efficiency
  private readonly urlMatchArray: RegExpMatchArray[] = [];
  private readonly citationMatchArray: RegExpMatchArray[] = [];

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance for memory efficiency
   */
  static getInstance(): ResponseOptimizer {
    if (!ResponseOptimizer.instance) {
      ResponseOptimizer.instance = new ResponseOptimizer();
    }
    return ResponseOptimizer.instance;
  }

  /**
   * Optimized response formatting with performance metrics
   */
  formatSearchResponseOptimized(
    apiResponse: ChatCompletionResponse,
    query: string,
    startTime: number,
    temperature?: number,
    maxTokens?: number,
    metadataOptions?: ResponseMetadataOptions
  ): { response: SearchResponse; metrics: ResponseProcessingMetrics } {
    const processingStartTime = performance.now();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Parse content with optimization
    const parseStartTime = performance.now();
    const mainContent = this.extractContentOptimized(apiResponse);
    const parseTime = performance.now() - parseStartTime;

    // Extract sources with optimization
    const sourceExtractionResult = this.extractSourcesOptimized(mainContent);

    // Validate with optimization
    const validationStartTime = performance.now();
    const isValidResponse = this.validateApiResponseOptimized(apiResponse);
    const validationTime = performance.now() - validationStartTime;

    // Format final response
    const formattingStartTime = performance.now();
    const searchResult = this.createSearchResultOptimized(
      mainContent,
      sourceExtractionResult.sources,
      apiResponse,
      query,
      endTime,
      temperature,
      maxTokens,
      responseTime,
      metadataOptions
    );

    const searchResponse: SearchResponse = {
      success: isValidResponse,
      result: isValidResponse ? searchResult : undefined,
      requestId: apiResponse.id,
    };
    const formattingTime = performance.now() - formattingStartTime;

    const totalTime = performance.now() - processingStartTime;

    // Calculate metrics
    const metrics: ResponseProcessingMetrics = {
      parseTime,
      sourceExtractionTime: sourceExtractionResult.extractionTime,
      validationTime,
      formattingTime,
      totalTime,
      sourceCount: sourceExtractionResult.sources.length,
      contentLength: mainContent.length,
      estimatedMemoryUsage: this.estimateMemoryUsage(searchResponse),
    };

    return { response: searchResponse, metrics };
  }

  /**
   * Optimized content extraction with minimal allocations
   */
  private extractContentOptimized(apiResponse: ChatCompletionResponse): string {
    // Direct property access without optional chaining for performance
    const choices = apiResponse.choices;
    if (!choices || choices.length === 0) return '';

    const firstChoice = choices[0];
    if (!firstChoice || !firstChoice.message) return '';

    return firstChoice.message.content || '';
  }

  /**
   * High-performance source extraction with multiple strategies
   */
  private extractSourcesOptimized(content: string): SourceExtractionResult {
    const extractionStartTime = performance.now();
    const sources: SearchSource[] = [];
    const foundUrls = new Set<string>();

    // Clear previous matches for reuse
    this.urlMatchArray.length = 0;
    this.citationMatchArray.length = 0;

    // Strategy 1: Extract citation-style references (highest priority)
    // Format: [1]: https://example.com "Title"
    let match: RegExpExecArray | null;

    // Reset regex
    CITATION_REGEX.lastIndex = 0;
    while ((match = CITATION_REGEX.exec(content)) !== null) {
      const url = match[2];
      const title =
        match[3] || this.generateOptimizedTitle(url, parseInt(match[1], 10));
      const description = this.generateOptimizedDescription(url);

      sources.push({
        url,
        title,
        description,
      });

      foundUrls.add(url);

      // Prevent infinite loop
      if (CITATION_REGEX.lastIndex === 0) break;
    }

    // Strategy 2: Extract remaining plain URLs (always run to catch all URLs)
    // Reset regex
    URL_REGEX.lastIndex = 0;
    let urlIndex = sources.length + 1;

    while ((match = URL_REGEX.exec(content)) !== null) {
      const url = match[0];

      // Avoid duplicates by checking if URL was already found
      if (!foundUrls.has(url)) {
        sources.push({
          url,
          title: SOURCE_TITLE_PREFIX + urlIndex,
          description: this.generateOptimizedDescription(url),
        });
        foundUrls.add(url);
        urlIndex++;
      }

      // Prevent infinite loop
      if (URL_REGEX.lastIndex === 0) break;
    }

    const extractionTime = performance.now() - extractionStartTime;

    return {
      sources,
      processedContent: content,
      extractionTime,
    };
  }

  /**
   * Optimized title generation with minimal string operations
   */
  private generateOptimizedTitle(url: string, index: number): string {
    // Try to extract domain for a better title
    const domainMatch = DOMAIN_REGEX.exec(url);
    if (domainMatch && domainMatch[1]) {
      const domain = domainMatch[1];
      // Remove www. prefix if present
      const cleanDomain = domain.startsWith('www.') ? domain.slice(4) : domain;
      return `${cleanDomain} (${index})`;
    }

    return SOURCE_TITLE_PREFIX + index;
  }

  /**
   * Optimized description generation
   */
  private generateOptimizedDescription(url: string): string {
    const domainMatch = DOMAIN_REGEX.exec(url);
    if (domainMatch && domainMatch[1]) {
      return REFERENCE_PREFIX + domainMatch[1];
    }
    return REFERENCE_PREFIX + 'unknown source';
  }

  /**
   * Fast API response validation
   */
  private validateApiResponseOptimized(
    response: ChatCompletionResponse
  ): boolean {
    // Quick property existence checks
    return !!(
      response &&
      response.id &&
      response.choices &&
      response.choices.length > 0 &&
      response.choices[0] &&
      response.choices[0].message
    );
  }

  /**
   * Optimized search result creation with minimal object allocation
   */
  private createSearchResultOptimized(
    content: string,
    sources: SearchSource[],
    apiResponse: ChatCompletionResponse,
    query: string,
    timestamp: number,
    temperature?: number,
    maxTokens?: number,
    responseTime?: number,
    metadataOptions?: ResponseMetadataOptions
  ): SearchResult {
    // Create metadata object with direct property assignment
    const metadata: SearchMetadata = {
      model: apiResponse.model,
      timestamp,
      query,
    };

    // Add optional properties only if defined (avoid undefined assignments)
    if (temperature !== undefined) metadata.temperature = temperature;
    if (maxTokens !== undefined) metadata.maxTokens = maxTokens;
    if (apiResponse.usage) metadata.usage = apiResponse.usage;
    if (responseTime !== undefined) metadata.responseTime = responseTime;

    // Add new metadata fields from options
    if (metadataOptions?.timeout !== undefined) {
      metadata.timeout = metadataOptions.timeout;
    }
    if (metadataOptions?.costTier !== undefined) {
      metadata.costTier = metadataOptions.costTier;
    }
    if (metadataOptions?.searchType !== undefined) {
      metadata.searchType = metadataOptions.searchType;
    }

    return {
      content,
      sources,
      metadata,
    };
  }

  /**
   * Estimate memory usage for performance monitoring
   */
  private estimateMemoryUsage(response: SearchResponse): number {
    let size = 0;

    // Rough estimation based on string lengths and object overhead
    if (response.result) {
      size += response.result.content.length * 2; // UTF-16 encoding
      size += response.result.sources.reduce((acc, source) => {
        return (
          acc +
          source.url.length * 2 +
          source.title.length * 2 +
          (source.description?.length || 0) * 2
        );
      }, 0);
      size += 200; // Object overhead estimation
    }

    if (response.error) {
      size += response.error.length * 2;
    }

    if (response.requestId) {
      size += response.requestId.length * 2;
    }

    size += 100; // Base object overhead

    return size;
  }

  /**
   * Batch process multiple responses for improved performance
   */
  batchFormatResponses(
    responses: Array<{
      apiResponse: ChatCompletionResponse;
      query: string;
      startTime: number;
      temperature?: number;
      maxTokens?: number;
      metadataOptions?: ResponseMetadataOptions;
    }>
  ): Array<{ response: SearchResponse; metrics: ResponseProcessingMetrics }> {
    return responses.map(item =>
      this.formatSearchResponseOptimized(
        item.apiResponse,
        item.query,
        item.startTime,
        item.temperature,
        item.maxTokens,
        item.metadataOptions
      )
    );
  }

  /**
   * Clear internal caches for memory management
   */
  clearCache(): void {
    this.urlMatchArray.length = 0;
    this.citationMatchArray.length = 0;
  }
}

/**
 * Streaming response processor for handling large responses efficiently
 */
export class StreamingResponseProcessor {
  private buffer = '';
  private foundUrls = new Set<string>();
  private contentLength = 0;

  /**
   * Process response chunks as they arrive
   */
  processChunk(chunk: string): void {
    this.buffer += chunk;
    this.contentLength += chunk.length;
  }

  /**
   * Finalize the streaming response and extract all sources
   */
  finalize(): {
    content: string;
    sources: SearchSource[];
    contentLength: number;
  } {
    const sources: SearchSource[] = [];

    // Extract all URLs from the complete buffer
    URL_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    let urlIndex = 1;

    while ((match = URL_REGEX.exec(this.buffer)) !== null) {
      const url = match[0];

      // Avoid duplicates
      if (!this.foundUrls.has(url)) {
        this.foundUrls.add(url);

        try {
          const urlObj = new globalThis.URL(url);
          sources.push({
            url,
            title: `Source ${urlIndex}`,
            description: `Reference from ${urlObj.hostname}`,
          });
          urlIndex++;
        } catch {
          // Invalid URL, skip it
        }
      }

      if (URL_REGEX.lastIndex === 0) break;
    }

    return {
      content: this.buffer,
      sources,
      contentLength: this.contentLength,
    };
  }

  /**
   * Reset the processor for reuse
   */
  reset(): void {
    this.buffer = '';
    this.foundUrls.clear();
    this.contentLength = 0;
  }
}

/**
 * Factory function for creating optimized formatters
 */
export function createOptimizedFormatter(): ResponseOptimizer {
  return ResponseOptimizer.getInstance();
}

/**
 * Utility function for quick response formatting without metrics
 */
export function formatResponseQuick(
  apiResponse: ChatCompletionResponse,
  query: string,
  startTime: number,
  temperature?: number,
  maxTokens?: number,
  metadataOptions?: ResponseMetadataOptions
): SearchResponse {
  const optimizer = ResponseOptimizer.getInstance();
  const result = optimizer.formatSearchResponseOptimized(
    apiResponse,
    query,
    startTime,
    temperature,
    maxTokens,
    metadataOptions
  );
  return result.response;
}
