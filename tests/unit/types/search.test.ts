import { describe, it, expect } from 'bun:test';

import type { ChatCompletionResponse } from '../../../src/types/openrouter';
import {
  formatSearchResponse,
  createErrorResponse,
  validateSearchResponse,
  type SearchResponse,
  type SearchSource,
  type SearchMetadata,
} from '../../../src/types/search';

describe('Search Types', () => {
  describe('formatSearchResponse', () => {
    const mockApiResponse: ChatCompletionResponse = {
      id: 'test-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              'This is a test response with a source https://example.com/test',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };

    it('should format a successful response correctly', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      const query = 'test query';
      const temperature = 0.3;
      const maxTokens = 1000;

      const result = formatSearchResponse(
        mockApiResponse,
        query,
        startTime,
        temperature,
        maxTokens
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.requestId).toBe('test-123');
      expect(result.result).toBeDefined();

      const searchResult = result.result!;
      expect(searchResult.content).toBe(
        'This is a test response with a source https://example.com/test'
      );
      expect(searchResult.metadata.query).toBe(query);
      expect(searchResult.metadata.model).toBe(mockApiResponse.model);
      expect(searchResult.metadata.temperature).toBe(temperature);
      expect(searchResult.metadata.maxTokens).toBe(maxTokens);
      expect(searchResult.metadata.usage).toEqual(mockApiResponse.usage);
      expect(searchResult.metadata.responseTime).toBeGreaterThan(0);
      expect(searchResult.sources).toHaveLength(1);
      expect(searchResult.sources[0].url).toBe('https://example.com/test');
    });

    it('should extract multiple sources from content', () => {
      const responseWithMultipleSources: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'Check https://example.com and https://test.org for more info',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = formatSearchResponse(
        responseWithMultipleSources,
        'test',
        Date.now()
      );

      expect(result.result!.sources).toHaveLength(2);
      expect(result.result!.sources[0].url).toBe('https://example.com');
      expect(result.result!.sources[1].url).toBe('https://test.org');
    });

    it('should handle response with no sources', () => {
      const responseWithoutSources: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a response without any URLs',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = formatSearchResponse(
        responseWithoutSources,
        'test',
        Date.now()
      );

      expect(result.result!.sources).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const responseWithEmptyContent: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = formatSearchResponse(
        responseWithEmptyContent,
        'test',
        Date.now()
      );

      expect(result.result!.content).toBe('');
      expect(result.result!.sources).toHaveLength(0);
    });

    it('should handle missing choices', () => {
      const responseWithoutChoices: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [],
      };

      const result = formatSearchResponse(
        responseWithoutChoices,
        'test',
        Date.now()
      );

      // With optimized formatter, invalid responses are marked as unsuccessful
      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create a basic error response', () => {
      const error = 'Something went wrong';
      const result = createErrorResponse(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorType).toBe('unknown');
      expect(result.result).toBeUndefined();
    });

    it('should create an error response with specific type', () => {
      const error = 'API key invalid';
      const errorType = 'auth';
      const requestId = 'req-123';

      const result = createErrorResponse(error, errorType, requestId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.errorType).toBe(errorType);
      expect(result.requestId).toBe(requestId);
    });

    it('should handle all error types', () => {
      const errorTypes: Array<SearchResponse['errorType']> = [
        'validation',
        'api',
        'network',
        'timeout',
        'rate_limit',
        'auth',
        'unknown',
      ];

      errorTypes.forEach(errorType => {
        const result = createErrorResponse('test error', errorType);
        expect(result.errorType).toBe(errorType);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateSearchResponse', () => {
    it('should validate a successful response', () => {
      const validResponse: SearchResponse = {
        success: true,
        result: {
          content: 'test content',
          sources: [],
          metadata: {
            model: 'test-model',
            timestamp: Date.now(),
            query: 'test query',
          },
        },
        requestId: 'test-123',
      };

      expect(validateSearchResponse(validResponse)).toBe(true);
    });

    it('should validate an error response', () => {
      const validErrorResponse: SearchResponse = {
        success: false,
        error: 'test error',
        errorType: 'api',
      };

      expect(validateSearchResponse(validErrorResponse)).toBe(true);
    });

    it('should reject response with success=false but no error', () => {
      const invalidResponse = {
        success: false,
      } as SearchResponse;

      expect(validateSearchResponse(invalidResponse)).toBe(false);
    });

    it('should reject response with success=true but no result', () => {
      const invalidResponse = {
        success: true,
      } as SearchResponse;

      expect(validateSearchResponse(invalidResponse)).toBe(false);
    });

    it('should reject result without content', () => {
      const invalidResponse: SearchResponse = {
        success: true,
        result: {
          sources: [],
          metadata: {
            model: 'test-model',
            timestamp: Date.now(),
            query: 'test query',
          },
        } as unknown as SearchResponse['result'],
      };

      expect(validateSearchResponse(invalidResponse)).toBe(false);
    });

    it('should reject result without metadata', () => {
      const invalidResponse: SearchResponse = {
        success: true,
        result: {
          content: 'test content',
          sources: [],
        } as unknown as SearchResponse['result'],
      };

      expect(validateSearchResponse(invalidResponse)).toBe(false);
    });

    it('should reject result with non-array sources', () => {
      const invalidResponse: SearchResponse = {
        success: true,
        result: {
          content: 'test content',
          sources: 'not an array' as unknown as NonNullable<
            SearchResponse['result']
          >['sources'],
          metadata: {
            model: 'test-model',
            timestamp: Date.now(),
            query: 'test query',
          },
        },
      };

      expect(validateSearchResponse(invalidResponse)).toBe(false);
    });
  });

  describe('SearchSource interface', () => {
    it('should have required fields', () => {
      const source: SearchSource = {
        url: 'https://example.com',
        title: 'Example Site',
      };

      expect(source.url).toBe('https://example.com');
      expect(source.title).toBe('Example Site');
    });

    it('should support optional description', () => {
      const source: SearchSource = {
        url: 'https://example.com',
        title: 'Example Site',
        description: 'A test website',
      };

      expect(source.description).toBe('A test website');
    });
  });

  describe('SearchMetadata interface', () => {
    it('should have required fields', () => {
      const metadata: SearchMetadata = {
        model: 'test-model',
        timestamp: Date.now(),
        query: 'test query',
      };

      expect(metadata.model).toBe('test-model');
      expect(metadata.query).toBe('test query');
      expect(typeof metadata.timestamp).toBe('number');
    });

    it('should support all optional fields', () => {
      const metadata: SearchMetadata = {
        model: 'test-model',
        timestamp: Date.now(),
        query: 'test query',
        temperature: 0.3,
        maxTokens: 1000,
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        responseTime: 1500,
      };

      expect(metadata.temperature).toBe(0.3);
      expect(metadata.maxTokens).toBe(1000);
      expect(metadata.usage?.total_tokens).toBe(30);
      expect(metadata.responseTime).toBe(1500);
    });
  });
});
